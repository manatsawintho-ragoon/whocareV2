import jwt from 'jsonwebtoken';
import pool from '../database/db.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Unified users table
const TABLE = 'users';

// Role hierarchy (higher number = more privilege)
const ROLE_HIERARCHY = {
  patient: 1,
  reception: 2,
  accountant: 2,
  nurse: 3,
  doctor: 4,
  manager: 5,
  super_admin: 6,
};

/**
 * Middleware: Authenticate + check role (fetches current role from DB)
 * @param  {...string} allowedRoles - Roles that can access this route
 */
export const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบ',
        message_en: 'Authentication required',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Fetch the user's CURRENT role from DB (not from JWT cache)
      const [users] = await pool.query(
        `SELECT id, role, is_active FROM ${TABLE} WHERE id = $1`,
        [decoded.id]
      );

      if (users.length === 0 || !users[0].is_active) {
        return res.status(403).json({
          success: false,
          message: 'บัญชีถูกปิดใช้งานหรือไม่พบผู้ใช้',
          message_en: 'Account deactivated or not found',
        });
      }

      const currentRole = users[0].role || 'patient';
      req.user = { ...decoded, role: currentRole };

      // Super admin always has access
      if (currentRole === 'super_admin') {
        return next();
      }

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(currentRole)) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้',
          message_en: 'Access denied. Insufficient permissions.',
          requiredRoles: allowedRoles,
          currentRole: currentRole,
        });
      }

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง',
          message_en: 'Session expired, please login again',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Token ไม่ถูกต้อง',
        message_en: 'Invalid token',
      });
    }
  };
};

/**
 * Middleware: Require minimum role level (fetches current role from DB)
 */
export const requireMinRole = (minRole) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบ',
        message_en: 'Authentication required',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Fetch current role from DB
      const [users] = await pool.query(
        `SELECT id, role, is_active FROM ${TABLE} WHERE id = $1`,
        [decoded.id]
      );

      if (users.length === 0 || !users[0].is_active) {
        return res.status(403).json({
          success: false,
          message: 'บัญชีถูกปิดใช้งานหรือไม่พบผู้ใช้',
          message_en: 'Account deactivated or not found',
        });
      }

      const currentRole = users[0].role || 'patient';
      req.user = { ...decoded, role: currentRole };

      const userLevel = ROLE_HIERARCHY[currentRole] || 0;
      const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้',
          message_en: 'Access denied. Insufficient permissions.',
        });
      }

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'เซสชันหมดอายุ',
          message_en: 'Session expired',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Token ไม่ถูกต้อง',
        message_en: 'Invalid token',
      });
    }
  };
};

export { ROLE_HIERARCHY };
