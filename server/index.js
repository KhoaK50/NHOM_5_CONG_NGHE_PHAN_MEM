const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { query } = require('./db/pool');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json());

// Mount Auth Subsystem Routes (/api/auth/* và alias /api/* tương thích Vectoria)
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes);

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
      dbError: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('5share Backend Service is running.');
});

// Chỉ lắng nghe cổng khi chạy trực tiếp (hỗ trợ import app khi chạy test tự động)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[5share] Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
