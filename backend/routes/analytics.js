const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken: auth } = require('../middleware/authMiddleware');

// Helper function for async db queries
function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// Dashboard overview stats
router.get('/dashboard', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    // Total revenue
    const revenueResult = await getAsync(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as confirmed_revenue
      FROM orders
    `);

    // Order statistics
    const orderStats = await getAsync(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_orders,
        SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped_orders,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
      FROM orders
    `);

    // Product statistics
    const productStats = await getAsync(`
      SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN is_featured IS TRUE THEN 1 ELSE 0 END) as featured_products,
        SUM(CASE WHEN is_new IS TRUE THEN 1 ELSE 0 END) as new_products,
        SUM(CASE WHEN stock_status = 'out_of_stock' THEN 1 ELSE 0 END) as out_of_stock
      FROM products
    `);

    // User statistics
    const userStats = await getAsync(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN is_admin IS TRUE THEN 1 ELSE 0 END) as admin_users
      FROM users
    `);

    // Recent orders (last 7 days)
    const recentRevenue = await getAsync(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as last_7_days_revenue
      FROM orders
      WHERE created_at >= datetime('now', '-7 days')
        AND status != 'cancelled'
    `);

    // Top selling products
    const topProducts = await allAsync(`
      SELECT 
        p.id,
        p.name,
        p.image_url,
        p.price,
        COUNT(oi.id) as order_count,
        SUM(oi.quantity) as total_sold,
        SUM(oi.quantity * oi.price) as revenue
      FROM order_items oi
      INNER JOIN products p ON oi.product_id = p.id
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    // Low stock products
    const lowStockProducts = await allAsync(`
      SELECT 
        p.id,
        p.name,
        p.stock,
        p.low_stock_threshold,
        COUNT(v.id) as variant_count,
        SUM(CASE WHEN v.stock <= 5 THEN 1 ELSE 0 END) as low_stock_variants
      FROM products p
      LEFT JOIN variants v ON p.id = v.product_id
      WHERE p.stock_alert_enabled IS TRUE 
        AND (p.stock <= p.low_stock_threshold OR v.stock <= 5)
      GROUP BY p.id
      ORDER BY p.stock ASC
      LIMIT 10
    `);

    // Review statistics
    const reviewStats = await getAsync(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        SUM(CASE WHEN is_approved IS NOT TRUE THEN 1 ELSE 0 END) as pending_reviews
      FROM reviews
    `);

    res.json({
      revenue: {
        total: revenueResult.total_revenue,
        confirmed: revenueResult.confirmed_revenue,
        last_7_days: recentRevenue.last_7_days_revenue
      },
      orders: orderStats,
      products: productStats,
      users: userStats,
      reviews: reviewStats,
      top_products: topProducts,
      low_stock_products: lowStockProducts
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'İstatistikler alınırken hata oluştu' });
  }
});

// Sales report by date range
router.get('/sales-report', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  const { start_date, end_date, group_by = 'day' } = req.query;

  try {
    let dateFormat;
    switch (group_by) {
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default: // day
        dateFormat = '%Y-%m-%d';
    }

    const query = `
      SELECT 
        strftime('${dateFormat}', created_at) as period,
        COUNT(*) as order_count,
        SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END) as revenue,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count
      FROM orders
      WHERE 1=1
        ${start_date ? `AND date(created_at) >= date(?)` : ''}
        ${end_date ? `AND date(created_at) <= date(?)` : ''}
      GROUP BY period
      ORDER BY period DESC
      LIMIT 100
    `;

    const params = [];
    if (start_date) params.push(start_date);
    if (end_date) params.push(end_date);

    const results = await allAsync(query, params);

    res.json({
      period: group_by,
      data: results
    });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ error: 'Satış raporu oluşturulurken hata oluştu' });
  }
});

// Product performance report
router.get('/product-performance', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  const { limit = 20, sort_by = 'revenue' } = req.query;

  try {
    let orderBy = 'revenue DESC';
    if (sort_by === 'quantity') {
      orderBy = 'total_sold DESC';
    } else if (sort_by === 'orders') {
      orderBy = 'order_count DESC';
    }

    const query = `
      SELECT 
        p.id,
        p.name,
        p.price,
        p.image_url,
        c.name as category_name,
        COUNT(DISTINCT oi.order_id) as order_count,
        SUM(oi.quantity) as total_sold,
        SUM(oi.quantity * oi.price) as revenue,
        AVG(r.rating) as average_rating,
        COUNT(DISTINCT r.id) as review_count
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
      LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN reviews r ON p.id = r.product_id AND r.is_approved IS TRUE
      GROUP BY p.id
      ORDER BY ${orderBy}
      LIMIT ?
    `;

    const results = await allAsync(query, [parseInt(limit)]);

    res.json({
      products: results,
      sort_by,
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Product performance error:', error);
    res.status(500).json({ error: 'Ürün performans raporu oluşturulurken hata oluştu' });
  }
});

// Customer analytics
router.get('/customer-analytics', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    // Top customers by revenue
    const topCustomers = await allAsync(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(DISTINCT o.id) as order_count,
        SUM(o.total_amount) as total_spent,
        MAX(o.created_at) as last_order_date
      FROM users u
      INNER JOIN orders o ON u.id = o.user_id
      WHERE o.status != 'cancelled'
      GROUP BY u.id
      ORDER BY total_spent DESC
      LIMIT 10
    `);

    // New vs returning customers (last 30 days)
    const customerRetention = await getAsync(`
      SELECT 
        COUNT(DISTINCT CASE WHEN order_count = 1 THEN user_id END) as new_customers,
        COUNT(DISTINCT CASE WHEN order_count > 1 THEN user_id END) as returning_customers
      FROM (
        SELECT user_id, COUNT(*) as order_count
        FROM orders
        WHERE created_at >= datetime('now', '-30 days')
          AND status != 'cancelled'
        GROUP BY user_id
      )
    `);

    res.json({
      top_customers: topCustomers,
      retention: customerRetention
    });
  } catch (error) {
    console.error('Customer analytics error:', error);
    res.status(500).json({ error: 'Müşteri analizi oluşturulurken hata oluştu' });
  }
});

// Export sales data (CSV format)
router.get('/export/sales', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  const { start_date, end_date } = req.query;

  try {
    const query = `
      SELECT 
        o.id,
        o.created_at,
        o.customer_name,
        o.customer_email,
        o.total_amount,
        o.status,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
        ${start_date ? `AND date(o.created_at) >= date(?)` : ''}
        ${end_date ? `AND date(o.created_at) <= date(?)` : ''}
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;

    const params = [];
    if (start_date) params.push(start_date);
    if (end_date) params.push(end_date);

    const orders = await allAsync(query, params);

    // Generate CSV
    const csvHeader = 'ID,Tarih,Müşteri Adı,Email,Tutar,Durum,Ürün Sayısı\n';
    const csvRows = orders.map(o => 
      `${o.id},"${o.created_at}","${o.customer_name}","${o.customer_email}",${o.total_amount},"${o.status}",${o.item_count}`
    ).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export sales error:', error);
    res.status(500).json({ error: 'Veri dışa aktarılırken hata oluştu' });
  }
});

// Cart analytics
router.get('/cart', adminAuth, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let dateFilter = '';
    if (period === '7d') {
      dateFilter = "AND created_at >= datetime('now', '-7 days')";
    } else if (period === '30d') {
      dateFilter = "AND created_at >= datetime('now', '-30 days')";
    } else if (period === '90d') {
      dateFilter = "AND created_at >= datetime('now', '-90 days')";
    }

    const cartStats = await db.get(`
      SELECT 
        COUNT(*) as total_cart_additions,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM cart_activity 
      WHERE action = 'add_to_cart' ${dateFilter}
    `);

    const dailyCartData = await db.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as additions,
        COUNT(DISTINCT user_id) as unique_users
      FROM cart_activity 
      WHERE action = 'add_to_cart' ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    const topCartProducts = await db.all(`
      SELECT 
        p.id,
        p.name,
        p.price,
        COUNT(*) as add_count,
        COUNT(DISTINCT ca.user_id) as unique_users
      FROM cart_activity ca
      JOIN products p ON ca.product_id = p.id
      WHERE ca.action = 'add_to_cart' ${dateFilter}
      GROUP BY p.id
      ORDER BY add_count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        summary: cartStats,
        daily: dailyCartData,
        topProducts: topCartProducts
      }
    });
  } catch (error) {
    console.error('Cart analytics error:', error);
    res.status(500).json({ error: 'Sepet analitikleri alınamadı' });
  }
});

module.exports = router;
