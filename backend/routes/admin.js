import { Router } from 'express';
import bcrypt from 'bcrypt';
import pool from '../database/db.js';
import { requireRole } from '../middleware/roleAuth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const SALT_ROUNDS = 12;
const VALID_ROLES = ['super_admin', 'doctor', 'nurse', 'reception', 'accountant', 'manager', 'patient'];

const normalizeTimeString = (time) => String(time || '').slice(0, 5);

const getActiveServices = async () => {
  const [services] = await pool.query(
    `SELECT id, name, branch
     FROM services
     WHERE is_active = TRUE
     ORDER BY branch ASC, name ASC`
  );
  return services;
};

const getDoctorProfileData = async (doctorId) => {
  const [services] = await pool.query(
    `SELECT dsa.service_id, s.name, s.branch
     FROM doctor_service_assignments dsa
     INNER JOIN services s ON s.id = dsa.service_id
     WHERE dsa.doctor_id = $1 AND dsa.is_active = TRUE
     ORDER BY s.branch ASC, s.name ASC`,
    [doctorId]
  );

  const [schedules] = await pool.query(
    `SELECT weekday, start_time::text as start_time, end_time::text as end_time
     FROM doctor_weekly_schedules
     WHERE doctor_id = $1 AND is_active = TRUE
     ORDER BY weekday ASC`,
    [doctorId]
  );

  return {
    service_ids: services.map((service) => service.service_id),
    services,
    schedules: schedules.map((schedule) => ({
      weekday: schedule.weekday,
      start_time: normalizeTimeString(schedule.start_time),
      end_time: normalizeTimeString(schedule.end_time),
      is_active: true,
    })),
  };
};

// ============================================================
// GET /api/admin/users — List all users (Super Admin, Manager)
// ============================================================
router.get('/users', requireRole('super_admin', 'manager'), async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where = ['1=1'];
    const params = [];
    let paramIdx = 1;

    if (role && VALID_ROLES.includes(role)) {
      where.push(`role = $${paramIdx}`);
      params.push(role);
      paramIdx++;
    }

    if (search) {
      where.push(`(first_name_th ILIKE $${paramIdx} OR last_name_th ILIKE $${paramIdx} OR first_name_en ILIKE $${paramIdx} OR last_name_en ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR thai_id ILIKE $${paramIdx} OR passport ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    // Get all users from unified table
    const [allUsers] = await pool.query(
      `SELECT id, user_type, title_th, first_name_th, last_name_th, thai_id, title_en, first_name_en, last_name_en, passport, nationality, email, phone, role, is_active, created_at
       FROM users WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
      params
    );

    // Paginate
    const total = allUsers.length;
    const paginated = allUsers.slice(offset, offset + parseInt(limit));

    // Get role counts
    const [roleCounts] = await pool.query(`
      SELECT role, COUNT(*) as count FROM users GROUP BY role
    `);

    res.json({
      success: true,
      data: {
        users: paginated,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
        roleCounts: roleCounts.reduce((acc, r) => {
          acc[r.role] = parseInt(r.count);
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      message_en: 'Internal server error',
    });
  }
});

// ============================================================
// PUT /api/admin/users/:userType/:id/role — Update user role
// ============================================================
router.put('/users/:id/role', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role ไม่ถูกต้อง: ${role}`,
        message_en: `Invalid role: ${role}`,
      });
    }

    // Get old role for audit log
    const [users] = await pool.query(`SELECT role, user_type FROM users WHERE id = $1`, [id]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้',
        message_en: 'User not found',
      });
    }

    const oldRole = users[0].role;

    // Update role
    await pool.query(`UPDATE users SET role = $1 WHERE id = $2`, [role, id]);

    // Write audit log
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, old_value, new_value, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user.id,
        'change_role',
        'users',
        id,
        JSON.stringify({ role: oldRole }),
        JSON.stringify({ role }),
        req.ip,
      ]
    );

    // Fetch updated user
    const [updated] = await pool.query(
      `SELECT id, email, role, user_type,
        CASE WHEN user_type = 'thai' THEN first_name_th || ' ' || last_name_th
             ELSE first_name_en || ' ' || last_name_en END as full_name
       FROM users WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: `เปลี่ยน role เป็น ${role} สำเร็จ`,
      message_en: `Role updated to ${role} successfully`,
      data: { user: updated[0] },
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      message_en: 'Internal server error',
    });
  }
});

// ============================================================
// PUT /api/admin/users/:userType/:id/status — Toggle active
// ============================================================
router.put('/users/:id/status', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    await pool.query(`UPDATE users SET is_active = $1 WHERE id = $2`, [is_active, id]);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, new_value, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, is_active ? 'activate_user' : 'deactivate_user', 'users', id, JSON.stringify({ is_active }), req.ip]
    );

    res.json({
      success: true,
      message: is_active ? 'เปิดใช้งานผู้ใช้สำเร็จ' : 'ปิดใช้งานผู้ใช้สำเร็จ',
      message_en: is_active ? 'User activated' : 'User deactivated',
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// GET /api/admin/users/:userType/:id — Get single user detail
// ============================================================
router.get('/users/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
    }

    const { password_hash, ...safeUser } = users[0];
    const data = { user: safeUser };
    if (safeUser.role === 'doctor') {
      data.doctor_profile = await getDoctorProfileData(id);
      data.available_services = await getActiveServices();
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// PUT /api/admin/users/:userType/:id — Update user profile (admin)
// ============================================================
router.put('/users/:id', requireRole('super_admin'), async (req, res) => {
  const client = await pool.getConnection();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    // Get user to determine type
    const currentUser = await client.query(`SELECT user_type, role FROM users WHERE id = $1 FOR UPDATE`, [id]);
    if (currentUser.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
    }
    const userType = currentUser.rows[0].user_type;
    const role = currentUser.rows[0].role;

    const { birth_date, blood_type, allergies, phone, doctor_service_ids, doctor_schedules } = req.body;

    if (userType === 'thai') {
      const { title_th, first_name_th, last_name_th } = req.body;
      // Auto-derive gender from title
      let autoGender = null;
      if (['นาย', 'นพ.'].includes(title_th)) autoGender = 'ชาย';
      else if (['นาง', 'นางสาว', 'พญ.'].includes(title_th)) autoGender = 'หญิง';

      await client.query(
        `UPDATE users SET title_th = $1, first_name_th = $2, last_name_th = $3, birth_date = $4, gender = $5, blood_type = $6, allergies = $7, phone = $8 WHERE id = $9`,
        [title_th || '', first_name_th, last_name_th, birth_date || null, autoGender, blood_type || null, allergies || null, phone || null, id]
      );
    } else {
      const { title_en, first_name_en, last_name_en, nationality } = req.body;
      let autoGender = null;
      if (['Mr.', 'Dr.'].includes(title_en)) autoGender = 'Male';
      else if (['Mrs.', 'Ms.'].includes(title_en)) autoGender = 'Female';

      await client.query(
        `UPDATE users SET title_en = $1, first_name_en = $2, last_name_en = $3, nationality = $4, birth_date = $5, gender = $6, blood_type = $7, allergies = $8, phone = $9 WHERE id = $10`,
        [title_en || '', first_name_en, last_name_en, nationality || null, birth_date || null, autoGender, blood_type || null, allergies || null, phone || null, id]
      );
    }

    if (role === 'doctor') {
      const parsedServiceIds = Array.isArray(doctor_service_ids)
        ? [...new Set(doctor_service_ids.map((value) => parseInt(value, 10)).filter((value) => Number.isInteger(value) && value > 0))]
        : [];

      if (parsedServiceIds.length > 0) {
        const serviceResult = await client.query(
          `SELECT COUNT(*) as total FROM services WHERE id = ANY($1::int[]) AND is_active = TRUE`,
          [parsedServiceIds]
        );
        if (parseInt(serviceResult.rows[0].total, 10) !== parsedServiceIds.length) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'มีบริการที่เลือกไม่ถูกต้องหรือถูกปิดใช้งาน' });
        }
      }

      const scheduleMap = new Map();
      if (Array.isArray(doctor_schedules)) {
        doctor_schedules.forEach((item) => {
          const weekday = parseInt(item?.weekday, 10);
          const isActive = Boolean(item?.is_active);
          const startTime = normalizeTimeString(item?.start_time);
          const endTime = normalizeTimeString(item?.end_time);

          if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !isActive) return;
          if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) return;
          if (startTime >= endTime) return;

          scheduleMap.set(weekday, { weekday, start_time: startTime, end_time: endTime, is_active: true });
        });
      }

      await client.query(`DELETE FROM doctor_service_assignments WHERE doctor_id = $1`, [id]);
      for (const serviceId of parsedServiceIds) {
        await client.query(
          `INSERT INTO doctor_service_assignments (doctor_id, service_id, is_active, created_at, updated_at)
           VALUES ($1, $2, TRUE, NOW(), NOW())`,
          [id, serviceId]
        );
      }

      await client.query(`DELETE FROM doctor_weekly_schedules WHERE doctor_id = $1`, [id]);
      for (const schedule of scheduleMap.values()) {
        await client.query(
          `INSERT INTO doctor_weekly_schedules (doctor_id, weekday, start_time, end_time, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())`,
          [id, schedule.weekday, schedule.start_time, schedule.end_time]
        );
      }
    }

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, new_value, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'edit_user_profile', 'users', id, JSON.stringify(req.body), req.ip]
    );

    await client.query('COMMIT');

    // Fetch updated user
    const [updated] = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    const { password_hash, ...safeUser } = updated[0];
    const data = { user: safeUser };
    if (safeUser.role === 'doctor') {
      data.doctor_profile = await getDoctorProfileData(id);
      data.available_services = await getActiveServices();
    }

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ',
      data,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Admin update user error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  } finally {
    client.release();
  }
});

// ============================================================
// GET /api/admin/audit-logs — Get audit logs
// ============================================================
router.get('/audit-logs', requireRole('super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;

    const [logs] = await pool.query(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM audit_logs');
    const total = parseInt(countResult[0].total);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// GET /api/admin/permissions — Get role permissions matrix
// ============================================================
router.get('/permissions', requireRole('super_admin'), async (req, res) => {
  try {
    const [permissions] = await pool.query(
      'SELECT * FROM role_permissions ORDER BY role, module'
    );
    res.json({ success: true, data: { permissions } });
  } catch (error) {
    console.error('Permissions error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// PUT /api/admin/permissions — Update permissions
// ============================================================
router.put('/permissions', requireRole('super_admin'), async (req, res) => {
  try {
    const { role, module, can_read, can_create, can_update, can_delete } = req.body;

    if (!role || !module) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ role และ module' });
    }

    await pool.query(
      `INSERT INTO role_permissions (role, module, can_read, can_create, can_update, can_delete)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (role, module) DO UPDATE SET
         can_read = $3, can_create = $4, can_update = $5, can_delete = $6, updated_at = NOW()`,
      [role, module, can_read, can_create, can_update, can_delete]
    );

    res.json({ success: true, message: 'อัปเดตสิทธิ์สำเร็จ' });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// GET /api/admin/dashboard — Dashboard stats
// ============================================================
router.get('/dashboard', requireRole('super_admin', 'manager'), async (req, res) => {
  try {
    // Total users
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE');
    const totalUsers = parseInt(userCount[0].count);

    // Role distribution
    const [roleDist] = await pool.query(`
      SELECT role, COUNT(*) as count FROM users WHERE is_active = TRUE GROUP BY role ORDER BY count DESC
    `);

    // Recent registrations (last 7 days)
    const [recentReg] = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'"
    );
    const recentRegistrations = parseInt(recentReg[0].count);

    // Recent activity (audit logs)
    const [recentLogs] = await pool.query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10'
    );

    res.json({
      success: true,
      data: {
        totalUsers,
        roleDistribution: roleDist,
        recentRegistrations,
        recentActivity: recentLogs,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

export default router;
