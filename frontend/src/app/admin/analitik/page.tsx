"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SalesData {
  date: string;
  orders: number;
  revenue: number;
  items_sold: number;
}

interface TopProduct {
  id: number;
  name: string;
  price: number;
  total_sold: number;
  total_revenue: number;
  order_count: number;
}

interface StockData {
  id: number;
  name: string;
  stock: number;
  price: number;
  category_name: string;
  stock_status: string;
}

interface PriceStats {
  total_products: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  total_value: number;
}

interface PriceRange {
  price_range: string;
  count: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function AdminAnalytics() {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [priceStats, setPriceStats] = useState<PriceStats | null>(null);
  const [priceRanges, setPriceRanges] = useState<PriceRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const router = useRouter();

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        router.push("/admin/giris");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      // Fetch all analytics data in parallel
      const [salesRes, topProductsRes, stockRes, priceRes] = await Promise.all([
        fetch(`/api/admin/analytics/sales-trend?period=${period}&days=30`, {
          headers,
        }),
        fetch("/api/admin/analytics/top-products?limit=10&days=30", {
          headers,
        }),
        fetch("/api/admin/analytics/stock-levels?threshold=10", { headers }),
        fetch("/api/admin/analytics/price-analysis", { headers }),
      ]);

      if (salesRes.status === 401 || topProductsRes.status === 401) {
        localStorage.removeItem("adminToken");
        router.push("/admin/giris");
        return;
      }

      const [salesData, topProductsData, stockData, priceData] =
        await Promise.all([
          salesRes.json(),
          topProductsRes.json(),
          stockRes.json(),
          priceRes.json(),
        ]);

      if (salesData.success) {
        setSalesData(salesData.data.salesData);
      }

      if (topProductsData.success) {
        setTopProducts(topProductsData.data.topProducts);
      }

      if (stockData.success) {
        setStockData(stockData.data.stockData);
      }

      if (priceData.success) {
        setPriceStats(priceData.data.priceStats);
        setPriceRanges(priceData.data.priceRanges);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Analitik ve Raporlar
        </h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setPeriod("daily")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              period === "daily"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Günlük
          </button>
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              period === "monthly"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Aylık
          </button>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Satış Trendleri</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                name === "revenue" ? `₺${value}` : value,
                name === "revenue"
                  ? "Gelir"
                  : name === "orders"
                  ? "Sipariş"
                  : "Satılan Ürün",
              ]}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              stackId="1"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.6}
              animationDuration={1000}
            />
            <Area
              type="monotone"
              dataKey="orders"
              stackId="2"
              stroke="#82ca9d"
              fill="#82ca9d"
              fillOpacity={0.6}
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">En Çok Satan Ürünler</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [
                  name === "total_sold"
                    ? `${value} adet`
                    : name === "total_revenue"
                    ? `₺${value}`
                    : value,
                  name === "total_sold" ? "Satılan Adet" : "Toplam Gelir",
                ]}
              />
              <Legend />
              <Bar
                dataKey="total_sold"
                fill="#8884d8"
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Price Analysis Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Fiyat Dağılımı</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={priceRanges.map((range) => ({
                  name: range.price_range,
                  value: range.count,
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                animationDuration={1000}
              >
                {priceRanges.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stock Levels Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Stok Seviyeleri</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stockData.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                name === "stock" ? `${value} adet` : `₺${value}`,
                name === "stock" ? "Stok" : "Fiyat",
              ]}
            />
            <Legend />
            <Bar dataKey="stock" fill="#82ca9d" animationDuration={1000} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Price Statistics Cards */}
      {priceStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Toplam Ürün</h3>
            <p className="text-3xl font-bold text-blue-600">
              {priceStats.total_products}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">
              Ortalama Fiyat
            </h3>
            <p className="text-3xl font-bold text-green-600">
              ₺{priceStats.avg_price?.toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">
              En Düşük Fiyat
            </h3>
            <p className="text-3xl font-bold text-yellow-600">
              ₺{priceStats.min_price?.toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">
              En Yüksek Fiyat
            </h3>
            <p className="text-3xl font-bold text-red-600">
              ₺{priceStats.max_price?.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Top Products Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">En Çok Satan Ürünler Detay</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ürün Adı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Birim Fiyat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Satılan Adet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Toplam Gelir
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sipariş Sayısı
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₺{product.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.total_sold || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₺{(product.total_revenue || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.order_count || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
