/**
 * ============================================================================
 * SCRIPT TỰ ĐỘNG KHỞI TẠO LƯỢC ĐỒ (16 BẢNG) & NẠP DỮ LIỆU MẪU (SEED DATA)
 * DỰ ÁN: 5SHARE — HỆ THỐNG QUẢN LÝ & CHIA SẺ HỌC LIỆU SPTH (HCMUE)
 * ============================================================================
 * Cách chạy:
 *   1. Đặt biến DATABASE_URL trong file `server/.env` rồi chạy:
 *      npm run db:push
 *   2. Hoặc truyền trực tiếp Connection String (Supabase / Neon / TablePlus):
 *      node db/migrate_and_seed.js "postgresql://postgres:password@host:5432/postgres"
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigrationAndSeed() {
  const connectionString = process.argv[2] || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('\n❌ Thiếu chuỗi kết nối DATABASE_URL!');
    console.error('👉 Cách 1: Thêm DATABASE_URL="postgresql://..." vào file server/.env rồi chạy: npm run db:push');
    console.error('👉 Cách 2: Chạy trực tiếp kèm URL:');
    console.error('   node server/db/migrate_and_seed.js "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"\n');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '..', 'schema_5share.sql');
  const seedPath = path.join(__dirname, '..', 'seed_5share.sql');

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Đang kết nối tới PostgreSQL (Supabase / Neon / TablePlus)...');
    await client.connect();
    console.log('✅ Kết nối thành công!\n');

    console.log('📐 [1/2] Đang thực thi lược đồ 16 bảng từ server/schema_5share.sql (kèm GRANT Supabase 30/10)...');
    await client.query(schemaSql);
    console.log('✅ Đã khởi tạo thành công 16 bảng chuẩn hóa!\n');

    console.log('🌱 [2/2] Đang nạp dữ liệu mẫu Sư phạm Tin học HCMUE từ server/seed_5share.sql...');
    await client.query(seedSql);
    console.log('✅ Đã nạp dữ liệu mẫu hoàn tất!\n');

    const tables = [
      'users',
      'login_history',
      'password_reset',
      'account_activation',
      'courses',
      'documents',
      'bookmarks',
      'moderation_logs',
      'user_document_history',
      'document_access_logs',
      'ratings',
      'document_comments',
      'comment_upvotes',
      'document_reports',
      'notifications',
      'admin_logs'
    ];

    console.log('📊 THỐNG KÊ SỐ BẢN GHI TRÊN 16 BẢNG (PUBLIC SCHEMA):');
    console.log('----------------------------------------------------');
    for (const tbl of tables) {
      const res = await client.query(`SELECT COUNT(*)::int AS cnt FROM public.${tbl}`);
      console.log(`  • ${tbl.padEnd(24, ' ')} : ${res.rows[0].cnt} dòng`);
    }
    console.log('----------------------------------------------------');
    console.log('🎉 Hoàn tất! Bạn có thể bấm Ctrl + R trong TablePlus để xem toàn bộ 16 bảng và dữ liệu.');
  } catch (err) {
    console.error('❌ Lỗi khi thực thi SQL:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrationAndSeed();
