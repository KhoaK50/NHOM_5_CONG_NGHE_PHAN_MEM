/**
 * ============================================================================
 * TẦNG DATA ACCESS: QUẢN LÝ KẾT NỐI POSTGRESQL (SUPABASE POOLER)
 * DỰ ÁN: 5SHARE — HỆ THỐNG QUẢN LÝ & CHIA SẺ HỌC LIỆU SPTH (HCMUE)
 * ============================================================================
 */

const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl:
        connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false }
    })
  : null;

if (pool) {
  pool.on('error', (err) => {
    console.error('[5share DB Pool] Lỗi kết nối không mong muốn:', err.message);
  });
}

/**
 * Thực thi truy vấn SQL có tham số hóa (chống SQL Injection 100%)
 */
async function query(text, params = []) {
  if (!pool) {
    throw new Error('DATABASE_URL chưa được cấu hình trong server/.env');
  }
  return pool.query(text, params);
}

/**
 * Lấy 1 client riêng để thực thi Transaction (BEGIN / COMMIT / ROLLBACK)
 */
async function getClient() {
  if (!pool) {
    throw new Error('DATABASE_URL chưa được cấu hình trong server/.env');
  }
  return pool.connect();
}

module.exports = {
  pool,
  query,
  getClient
};
