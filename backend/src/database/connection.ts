import path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import bcrypt from 'bcryptjs';

let db: Database | null = null;

export async function getDB(): Promise<Database> {
  if (db) return db;

  const dbPath = path.join(__dirname, '../../database.sqlite');
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON;');
  return db;
}

export async function initDB(): Promise<Database> {
  const database = await getDB();

  // Create Users Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'employee')) NOT NULL,
      permissions TEXT, -- JSON array of permissions
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Propietarias Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS proprietarias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL
    );
  `);

  // Create Categories Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      status INTEGER DEFAULT 1 -- 1: active, 0: inactive
    );
  `);

  // Create Brands Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      status INTEGER DEFAULT 1 -- 1: active, 0: inactive
    );
  `);

  // Create Products Table (parent)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category_id INTEGER,
      brand_id INTEGER,
      owner_id INTEGER,
      status INTEGER DEFAULT 1, -- 1: active, 0: inactive
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
      FOREIGN KEY (brand_id) REFERENCES brands (id) ON DELETE SET NULL,
      FOREIGN KEY (owner_id) REFERENCES proprietarias (id) ON DELETE SET NULL
    );
  `);

  // Create Product Variants Table (child)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      sku TEXT UNIQUE,
      barcode TEXT UNIQUE,
      size TEXT,
      color TEXT,
      buy_price REAL DEFAULT 0,
      sell_price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1, -- 1: active, 0: inactive
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    );
  `);

  // Create Customers Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Sales Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      user_id INTEGER,
      total REAL NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'transfer', 'mixed')) NOT NULL,
      cash_received REAL DEFAULT 0,
      card_received REAL DEFAULT 0,
      transfer_received REAL DEFAULT 0,
      status TEXT CHECK(status IN ('completed', 'cancelled')) DEFAULT 'completed',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES customers (id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );
  `);

  // Create Sale Items Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      variant_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL DEFAULT 0,
      total REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE SET NULL
    );
  `);

  // Create Inventory Movements Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL,
      type TEXT CHECK(type IN ('input', 'output', 'adjustment', 'sale', 'return')) NOT NULL,
      quantity INTEGER NOT NULL,
      reference_id INTEGER, -- sale_id if type is 'sale' or 'return'
      notes TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );
  `);

  // Create Settings Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Create Audit Logs Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );
  `);

  // --- SEED SEED DATA ---

  // 1. Seed default admin user
  const adminExists = await database.get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    const permissions = JSON.stringify(['all']);
    await database.run(
      'INSERT INTO users (username, password_hash, role, permissions) VALUES (?, ?, ?, ?)',
      ['admin', hash, 'admin', permissions]
    );
  }

  // 2. Seed default owners (propietarias)
  const ownersCount = await database.get('SELECT COUNT(*) as count FROM proprietarias');
  if ((ownersCount as any).count === 0) {
    await database.run("INSERT INTO proprietarias (name, code) VALUES ('Propietaria A', 'PROP_A')");
    await database.run("INSERT INTO proprietarias (name, code) VALUES ('Propietaria B', 'PROP_B')");
  }

  // 3. Seed default categories
  const catCount = await database.get('SELECT COUNT(*) as count FROM categories');
  if ((catCount as any).count === 0) {
    await database.run("INSERT INTO categories (name) VALUES ('Playeras')");
    await database.run("INSERT INTO categories (name) VALUES ('Pantalones')");
    await database.run("INSERT INTO categories (name) VALUES ('Vestidos')");
    await database.run("INSERT INTO categories (name) VALUES ('Accesorios')");
  }

  // 4. Seed default brands
  const brandCount = await database.get('SELECT COUNT(*) as count FROM brands');
  if ((brandCount as any).count === 0) {
    await database.run("INSERT INTO brands (name) VALUES ('Antara')");
    await database.run("INSERT INTO brands (name) VALUES ('Nacional')");
    await database.run("INSERT INTO brands (name) VALUES ('Importado')");
  }

  // 5. Seed default settings
  const settingsKeys = [
    { key: 'store_name', value: 'ANTARA' },
    { key: 'store_phone', value: '5512345678' },
    { key: 'store_address', value: 'Av. Andrés Bello 12, Ciudad de México' },
    { key: 'store_tax_rate', value: '0.16' },
    { key: 'store_tax_included', value: 'true' },
    { key: 'allow_negative_stock', value: 'false' },
    { key: 'ticket_footer', value: '¡Gracias por su compra en ANTARA!' }
  ];

  for (const set of settingsKeys) {
    const exists = await database.get('SELECT * FROM settings WHERE key = ?', [set.key]);
    if (!exists) {
      await database.run('INSERT INTO settings (key, value) VALUES (?, ?)', [set.key, set.value]);
    }
  }

  console.log('Database initialized successfully with schema and seed data.');
  return database;
}
