import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteDBConnection } from '@capacitor-community/sqlite';

let db: SQLiteDBConnection | null = null;

export async function getDB(): Promise<SQLiteDBConnection | null> {
  try {
    const isNative = Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios';
    if (!isNative) return null; // fallback to in-memory on web dev

    if (db) return db;

    // Some versions of @capacitor-community/sqlite have different typings. Use a defensive cast.
    const ret = (await (CapacitorSQLite as any).createConnection({
      database: 'kasse',
      version: 1,
      encrypted: false,
      mode: 'no-encryption',
    })) as SQLiteDBConnection;

    db = ret;
    await db.open();
    await ensureSchema(db);
    return db;
  } catch (e) {
    console.warn('SQLite unavailable, using memory store', e);
    return null;
  }
}

async function ensureSchema(conn: SQLiteDBConnection) {
  const stmts = `
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    status TEXT NOT NULL,
    total_cents INTEGER NOT NULL,
    vat_total_cents INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT,
    kind TEXT NOT NULL,
    qty INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    deposit_cents INTEGER NOT NULL,
    vat_rate REAL NOT NULL,
    prep_status TEXT,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    method TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    provider TEXT,
    provider_tx_id TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    sent_at TEXT
  );`;
  await conn.execute(stmts);
}

export async function run(conn: SQLiteDBConnection, sql: string, params: any[] = []) {
  return conn.run(sql, params);
}

export async function query<T = any>(conn: SQLiteDBConnection, sql: string, params: any[] = []): Promise<T[]> {
  const res = await conn.query(sql, params);
  return (res.values as T[]) || [];
}
