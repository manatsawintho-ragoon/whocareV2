import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../database/db.js';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Valid roles
const VALID_ROLES = ['super_admin', 'doctor', 'nurse', 'reception', 'accountant', 'manager', 'patient'];

// Helper: generate tokens
const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    user_type: user.user_type,
    role: user.role || 'patient',
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

  return { accessToken, refreshToken };
};

// Helper: parse refresh expiry to Date
const getRefreshExpiry = () => {
  const days = parseInt(JWT_REFRESH_EXPIRES_IN) || 7;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
};

// Helper: strip sensitive fields
const sanitizeUser = (user) => {
  const { password_hash, ...safe } = user;
  return { ...safe, role: user.role || 'patient' };
};

// ============================================================
// POST /api/auth/register
// ============================================================
router.post('/register', async (req, res) => {
  try {
    let {
      userType,
      titleTh, firstNameTh, lastNameTh, thaiId,
      titleEn, firstNameEn, lastNameEn, passport, nationality,
      birthDate, gender, bloodType, allergies,
      phone, email, password,
    } = req.body;

    // Auto-derive gender from title prefix if not provided
    if (!gender) {
      const title = userType === 'thai' ? titleTh : titleEn;
      if (['นาย', 'Mr.', 'นพ.'].includes(title)) gender = userType === 'thai' ? 'ชาย' : 'Male';
      else if (['นาง', 'นางสาว', 'Mrs.', 'Ms.', 'พญ.'].includes(title)) gender = userType === 'thai' ? 'หญิง' : 'Female';
    }

    // --- Validation ---
    if (!userType || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน',
        message_en: 'Please fill in all required fields',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
        message_en: 'Password must be at least 8 characters',
      });
    }

    if (userType === 'thai') {
      if (!thaiId || !firstNameTh || !lastNameTh) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกเลขบัตรประชาชน ชื่อ และนามสกุล',
          message_en: 'Thai ID, first name, and last name are required',
        });
      }
      const digits = thaiId.replace(/\D/g, '');
      if (digits.length !== 13) {
        return res.status(400).json({
          success: false,
          message: 'เลขบัตรประชาชนไม่ถูกต้อง (ต้อง 13 หลัก)',
          message_en: 'Invalid Thai ID (must be 13 digits)',
        });
      }
    } else {
      if (!passport || !firstNameEn || !lastNameEn) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอก Passport, First Name และ Last Name',
          message_en: 'Passport, first name, and last name are required',
        });
      }
    }

    // --- Check duplicate email ---
    const [emailExists] = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailExists.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'อีเมลนี้ถูกใช้งานแล้ว',
        message_en: 'Email already registered',
      });
    }

    if (userType === 'thai' && thaiId) {
      const cleanId = thaiId.replace(/\D/g, '');
      const [existingId] = await pool.query('SELECT id FROM users WHERE thai_id = $1', [cleanId]);
      if (existingId.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'เลขบัตรประชาชนนี้ถูกลงทะเบียนแล้ว',
          message_en: 'Thai ID already registered',
        });
      }
    }

    if (userType === 'foreign' && passport) {
      const [existingPassport] = await pool.query('SELECT id FROM users WHERE passport = $1', [passport]);
      if (existingPassport.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Passport นี้ถูกลงทะเบียนแล้ว',
          message_en: 'Passport already registered',
        });
      }
    }

    // --- Hash password ---
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // --- Use transaction to ensure atomicity ---
    const connection = await pool.getConnection();
    try {
      await connection.query('BEGIN');

      // --- Insert user into unified users table ---
      let insertedId;
      if (userType === 'thai') {
        const { rows } = await connection.query(
          `INSERT INTO users (
            user_type, title_th, first_name_th, last_name_th, thai_id,
            birth_date, gender, blood_type, allergies,
            phone, email, password_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id`,
          [
            'thai',
            titleTh || '', firstNameTh, lastNameTh,
            thaiId.replace(/\D/g, ''),
            birthDate || null, gender || null, bloodType || null, allergies || null,
            phone || null, email, passwordHash,
          ]
        );
        insertedId = rows[0].id;
      } else {
        const { rows } = await connection.query(
          `INSERT INTO users (
            user_type, title_en, first_name_en, last_name_en, passport, nationality,
            birth_date, gender, blood_type, allergies,
            phone, email, password_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id`,
          [
            'foreign',
            titleEn || '', firstNameEn, lastNameEn,
            passport, nationality || null,
            birthDate || null, gender || null, bloodType || null, allergies || null,
            phone || null, email, passwordHash,
          ]
        );
        insertedId = rows[0].id;
      }

      // --- Generate tokens ---
      const newUser = { id: insertedId, email, user_type: userType };
      const { accessToken, refreshToken } = generateTokens(newUser);

      // --- Save refresh token ---
      await connection.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [insertedId, refreshToken, getRefreshExpiry()]
      );

      // --- Fetch user data ---
      const { rows: users } = await connection.query(`SELECT * FROM users WHERE id = $1`, [insertedId]);

      await connection.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'สมัครสมาชิกสำเร็จ',
        message_en: 'Registration successful',
        data: {
          user: sanitizeUser(users[0]),
          accessToken,
          refreshToken,
        },
      });
    } catch (txError) {
      await connection.query('ROLLBACK');
      throw txError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      message_en: 'Internal server error',
    });
  }
});

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { userType, thaiId, passport, password } = req.body;

    if (!userType || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        message_en: 'Please fill in all fields',
      });
    }

    let query, params;

    if (userType === 'thai') {
      if (!thaiId) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกเลขบัตรประชาชน',
          message_en: 'Thai ID is required',
        });
      }
      const cleanId = thaiId.replace(/\D/g, '');
      query = `SELECT * FROM users WHERE thai_id = $1 AND user_type = 'thai' AND is_active = TRUE`;
      params = [cleanId];
    } else {
      if (!passport) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอก Passport Number',
          message_en: 'Passport number is required',
        });
      }
      query = `SELECT * FROM users WHERE passport = $1 AND user_type = 'foreign' AND is_active = TRUE`;
      params = [passport];
    }

    const [users] = await pool.query(query, params);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง',
        message_en: 'Invalid credentials',
      });
    }

    const user = users[0];

    // --- Verify password ---
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง',
        message_en: 'Invalid credentials',
      });
    }

    // --- Generate tokens ---
    const { accessToken, refreshToken } = generateTokens(user);

    // --- Save refresh token (clean old ones first) ---
    await pool.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1 OR expires_at < NOW()',
      [user.id]
    );
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, getRefreshExpiry()]
    );

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      message_en: 'Login successful',
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      message_en: 'Internal server error',
    });
  }
});

// ============================================================
// POST /api/auth/refresh
// ============================================================
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      return res.status(403).json({
        success: false,
        message: 'Refresh token ไม่ถูกต้องหรือหมดอายุ',
        message_en: 'Invalid or expired refresh token',
      });
    }

    // Check if token exists in DB
    const [tokens] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [refreshToken, decoded.id]
    );

    if (tokens.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Refresh token ถูกเพิกถอนแล้ว',
        message_en: 'Refresh token revoked',
      });
    }

    // Get user from the correct table
    const [users] = await pool.query(`SELECT * FROM users WHERE id = $1 AND is_active = TRUE`, [decoded.id]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้งาน',
        message_en: 'User not found',
      });
    }

    const user = users[0];

    // Generate new tokens
    const newTokens = generateTokens(user);

    // Replace old refresh token
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, newTokens.refreshToken, getRefreshExpiry()]
    );

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      },
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      message_en: 'Internal server error',
    });
  }
});

// ============================================================
// GET /api/auth/profile
// ============================================================
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Token ไม่ถูกต้องหรือหมดอายุ', code: 'TOKEN_EXPIRED' });
    }

    const [users] = await pool.query(`SELECT * FROM users WHERE id = $1 AND is_active = TRUE`, [decoded.id]);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
    }

    res.json({
      success: true,
      data: { user: sanitizeUser(users[0]) },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// PUT /api/auth/profile
// ============================================================
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Token ไม่ถูกต้องหรือหมดอายุ', code: 'TOKEN_EXPIRED' });
    }

    const { birth_date, blood_type, allergies, phone } = req.body;

    // Get user to determine type
    const [currentUser] = await pool.query(`SELECT user_type FROM users WHERE id = $1`, [decoded.id]);
    if (currentUser.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
    }
    const userType = currentUser[0].user_type;

    // Auto-derive gender from title prefix
    let autoGender = null;
    if (userType === 'thai') {
      const { title_th, first_name_th, last_name_th } = req.body;
      if (['นาย', 'นพ.'].includes(title_th)) autoGender = 'ชาย';
      else if (['นาง', 'นางสาว', 'พญ.'].includes(title_th)) autoGender = 'หญิง';

      if (!first_name_th || !last_name_th) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อและนามสกุล' });
      }
      await pool.query(
        `UPDATE users SET title_th = $1, first_name_th = $2, last_name_th = $3, birth_date = $4, gender = $5, blood_type = $6, allergies = $7, phone = $8 WHERE id = $9`,
        [title_th || '', first_name_th, last_name_th, birth_date || null, autoGender, blood_type || null, allergies || null, phone || null, decoded.id]
      );
    } else {
      const { title_en, first_name_en, last_name_en, nationality } = req.body;
      if (['Mr.', 'Dr.'].includes(title_en)) autoGender = 'Male';
      else if (['Mrs.', 'Ms.'].includes(title_en)) autoGender = 'Female';

      if (!first_name_en || !last_name_en) {
        return res.status(400).json({ success: false, message: 'กรุณากรอก First Name และ Last Name' });
      }
      await pool.query(
        `UPDATE users SET title_en = $1, first_name_en = $2, last_name_en = $3, nationality = $4, birth_date = $5, gender = $6, blood_type = $7, allergies = $8, phone = $9 WHERE id = $10`,
        [title_en || '', first_name_en, last_name_en, nationality || null, birth_date || null, autoGender, blood_type || null, allergies || null, phone || null, decoded.id]
      );
    }

    // Fetch updated user
    const [users] = await pool.query(`SELECT * FROM users WHERE id = $1`, [decoded.id]);
    res.json({
      success: true,
      message: 'อัปเดตข้อมูลสำเร็จ',
      data: { user: sanitizeUser(users[0]) },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// POST /api/auth/logout
// ============================================================
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }
    res.json({
      success: true,
      message: 'ออกจากระบบสำเร็จ',
      message_en: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      message_en: 'Internal server error',
    });
  }
});

export default router;
