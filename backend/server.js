import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { testConnection } from './database/db.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import servicesRoutes from './routes/services.js';
import bookingsRoutes from './routes/bookings.js';
import financeRoutes from './routes/finance.js';
import newsRoutes from './routes/news.js';
import authMiddleware from './middleware/auth.js';
import pool from './database/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// Security Middleware
// ============================================================
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

// Rate limiting
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 50, // max 50 requests per window
//   message: {
//     success: false,
//     message: 'คำขอมากเกินไป กรุณาลองใหม่ภายหลัง',
//     message_en: 'Too many requests, please try again later',
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// const generalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// app.use('/api/', generalLimiter);
// app.use('/api/auth/', authLimiter);

// ============================================================
// Routes
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/news', newsRoutes);

// Protected route example: get current user profile
app.get('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query(`SELECT * FROM users WHERE id = $1 AND is_active = TRUE`, [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้งาน',
        message_en: 'User not found',
      });
    }
    const { password_hash, ...user } = users[0];
    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      message_en: 'Internal server error',
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================
// Start Server
// ============================================================
const start = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n Whocare Backend API`);
    console.log(`   Server:  http://localhost:${PORT}`);
    console.log(`   Health:  http://localhost:${PORT}/api/health`);
    console.log(`   Mode:    ${process.env.NODE_ENV || 'development'}\n`);
  });
};

start();
