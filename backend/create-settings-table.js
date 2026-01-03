const db = require('./db');

async function createSettingsTable() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        type TEXT DEFAULT 'string',
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Settings table created successfully');
    
    // Add default settings
    const defaultSettings = [
      { key: 'siteName', value: 'AURA E-Commerce', type: 'string', description: 'Site adı' },
      { key: 'siteDescription', value: 'Modern ve şık alışveriş deneyimi', type: 'string', description: 'Site açıklaması' },
      { key: 'contactEmail', value: 'info@aura.com', type: 'string', description: 'İletişim e-postası' },
      { key: 'phoneNumber', value: '+90 555 000 0000', type: 'string', description: 'Telefon numarası' },
      { key: 'address', value: 'İstanbul, Türkiye', type: 'string', description: 'Adres' },
      { key: 'currency', value: 'TRY', type: 'string', description: 'Para birimi' },
      { key: 'taxRate', value: '18', type: 'number', description: 'Vergi oranı (%)' },
      { key: 'shippingCost', value: '25', type: 'number', description: 'Kargo ücreti' },
      { key: 'freeShippingThreshold', value: '500', type: 'number', description: 'Ücretsiz kargo limiti' }
      ,{ key: 'autoDeactivateZeroStockVariant', value: 'true', type: 'boolean', description: 'Varyant stok 0 olduğunda otomatik pasif et' }
    ];
    
    for (const setting of defaultSettings) {
      await db.run(`
        INSERT OR IGNORE INTO settings (key, value, type, description)
        VALUES (?, ?, ?, ?)
      `, [setting.key, setting.value, setting.type, setting.description]);
    }
    
    console.log('Default settings added');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createSettingsTable();
