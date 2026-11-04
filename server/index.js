const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { query } = require('./db/pool');
const authRoutes = require('./routes/authRoutes');
const documentCourseRoutes = require('./routes/documentCourseRoutes');
const interactionRoutes = require('./routes/interactionRoutes');
const notificationReportRoutes = require('./routes/notificationReportRoutes');

// Không chạy production với JWT_SECRET mặc định trong mã nguồn: ai đọc repo cũng ký được token Admin
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('Thiếu biến môi trường JWT_SECRET khi chạy production.');
}

const app = express();
const PORT = process.env.PORT || 5000;

const DEFAULT_ORIGINS =
  process.env.NODE_ENV === 'production'
    ? ['https://5share.vectoria.io.vn', 'https://5share.vercel.app']
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : DEFAULT_ORIGINS;

// Số proxy phía trước server (Render = 1) để rate limit đọc đúng IP thật
if (process.env.TRUST_PROXY_HOPS) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
}

// Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false
  })
);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);
app.use(express.json());

// Mount Auth Subsystem Routes (/api/auth/* và alias /api/* tương thích Vectoria)
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes);

// Cụm UC11–UC13: dashboard, tài liệu cá nhân, tải xuống, bookmark, đánh giá và bình luận
app.use('/api', interactionRoutes);

// Mount cụm UC08–UC10: /api/documents/* và /api/admin/*
app.use('/api', documentCourseRoutes);

// Cụm UC03 & UC04: Thông báo hệ thống và Báo cáo vi phạm (Trâm)
app.use('/api', notificationReportRoutes);

// Health check endpoint kèm kiểm tra kết nối PostgreSQL thực tế
app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await query('SELECT COUNT(*)::int AS user_count FROM public.users');
    res.status(200).json({
      status: 'success',
      service: '5share Backend API',
      database: 'connected',
      userCount: dbCheck.rows[0]?.user_count ?? 0,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(200).json({
      status: 'success',
      service: '5share Backend API',
      database: 'disconnected',
      dbError: process.env.NODE_ENV === 'production' ? undefined : err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('5share Backend Service is running.');
});

// Lỗi đọc body JSON và lỗi chưa xử lý: không trả stack trace cho client
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, code: 'INVALID_JSON', message: 'Dữ liệu JSON không hợp lệ.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, code: 'PAYLOAD_TOO_LARGE', message: 'Dữ liệu gửi lên quá lớn.' });
  }
  console.error('[5share]', err);
  return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' });
});

// Chỉ lắng nghe cổng khi chạy trực tiếp (hỗ trợ import app khi chạy test tự động)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[5share] Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
