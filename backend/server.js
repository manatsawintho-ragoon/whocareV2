import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'unpkg.com', 'cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'unpkg.com', 'cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
      workerSrc: ["'self'", 'blob:'],
    },
  },
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, mobile apps)
    if (!origin) return callback(null, true);
    const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim().replace(/\/$/, ''));
    allowed.push(`http://localhost:${process.env.PORT || 5000}`);
    if (allowed.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
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
// API Documentation — allow cross-origin iframe embedding
// ============================================================
app.use('/api-doc', (req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  next();
}, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'WhocarE Hospital API — Swagger',
  customfavIcon: '',
  customCss: `
    .swagger-ui .topbar { background-color: #1a56db; padding: 8px 0; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
    .swagger-ui .info .title { font-size: 2rem; color: #1a56db; }
    .swagger-ui .info .description h3 { color: #1a56db; margin-top: 1rem; }
    .swagger-ui .info .description code { background: #f0f4ff; padding: 2px 6px; border-radius: 4px; color: #1a56db; }
    .swagger-ui .info .description pre { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 8px; overflow-x: auto; }
    .swagger-ui .opblock-tag { font-size: 1.1rem; border-bottom: 2px solid #e2e8f0; }
    .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #059669; }
    .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #1a56db; }
    .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #d97706; }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #dc2626; }
    .swagger-ui .btn.authorize { background-color: #059669; border-color: #059669; color: #fff; }
    .swagger-ui .btn.authorize svg { fill: #fff; }
    .swagger-ui .response-col_status { font-weight: 700; }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    tryItOutEnabled: true,
    filter: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tagsSorter: 'alpha',
    operationsSorter: 'method',
  },
}));

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

// Health check (with DB status)
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    if (rows.length > 0) dbStatus = 'connected';
  } catch { dbStatus = 'error'; }
  res.json({
    status: 'ok',
    database: dbStatus,
    db_host: process.env.DB_HOST || 'localhost',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Start Server
// ============================================================
const start = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n Whocare Backend API`);
    console.log(`   Server:  http://localhost:${PORT}`);
    console.log(`   Docs:    http://localhost:${PORT}/api-doc`);
    console.log(`   Health:  http://localhost:${PORT}/api/health`);
    console.log(`   Mode:    ${process.env.NODE_ENV || 'development'}\n`);
  });
};

start();
