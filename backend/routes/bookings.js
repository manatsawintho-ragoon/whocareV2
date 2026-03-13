import { Router } from 'express';
import pool from '../database/db.js';
import authMiddleware from '../middleware/auth.js';
import { requireRole } from '../middleware/roleAuth.js';

const router = Router();

const LOCK_DURATION_MIN = 5;

// Helper: clean expired locks
const cleanExpiredLocks = async () => {
  await pool.query('DELETE FROM booking_locks WHERE expires_at < NOW()');
};

// Helper: generate time slots for a given date based on clinic hours
const generateTimeSlots = (date) => {
  const d = new Date(date + 'T00:00:00+07:00');
  const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const startHour = isWeekend ? 11 : 10;
  const endHour = 20;
  const slots = [];
  for (let h = startHour; h < endHour; h += 0.5) {
    if (h >= 12 && h < 12.5) continue; // lunch break 12:00-12:30
    const hour = Math.floor(h);
    const min = h % 1 === 0 ? '00' : '30';
    slots.push(`${String(hour).padStart(2, '0')}:${min}`);
  }
  return slots;
};

// ============================================================
// GET /api/bookings/slots?service_id=X&date=YYYY-MM-DD
// ============================================================
router.get('/slots', authMiddleware, async (req, res) => {
  try {
    const { service_id, date } = req.query;
    if (!service_id || !date) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ service_id และ date' });
    }

    await cleanExpiredLocks();

    const allSlots = generateTimeSlots(date);

    const [booked] = await pool.query(
      `SELECT booking_time FROM bookings WHERE service_id = $1 AND booking_date = $2 AND status NOT IN ('cancelled')`,
      [service_id, date]
    );
    const bookedTimes = new Set(booked.map((b) => b.booking_time));

    const [locks] = await pool.query(
      `SELECT booking_time, user_id FROM booking_locks WHERE service_id = $1 AND booking_date = $2 AND expires_at > NOW()`,
      [service_id, date]
    );
    const lockMap = {};
    locks.forEach((l) => { lockMap[l.booking_time] = { user_id: l.user_id }; });

    // Bangkok time
    const now = new Date();
    const bangkokNow = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
    const todayStr = bangkokNow.toISOString().split('T')[0];
    const currentMinutes = bangkokNow.getHours() * 60 + bangkokNow.getMinutes();

    const userId = req.user.id;

    const slots = allSlots.map((time) => {
      const [hh, mm] = time.split(':').map(Number);
      const slotMinutes = hh * 60 + mm;
      let status = 'available';

      if (date === todayStr && slotMinutes <= currentMinutes) {
        status = 'past';
      } else if (bookedTimes.has(time)) {
        status = 'booked';
      } else if (lockMap[time]) {
        status = (lockMap[time].user_id === userId) ? 'my_lock' : 'locking';
      }
      return { time, status };
    });

    res.json({ success: true, data: { date, slots } });
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// POST /api/bookings/lock — Lock a slot (5 min hold)
// ============================================================
router.post('/lock', authMiddleware, async (req, res) => {
  try {
    const { service_id, booking_date, booking_time } = req.body;
    if (!service_id || !booking_date || !booking_time) {
      return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบ' });
    }

    await cleanExpiredLocks();

    const [existing] = await pool.query(
      `SELECT id FROM bookings WHERE service_id = $1 AND booking_date = $2 AND booking_time = $3 AND status NOT IN ('cancelled')`,
      [service_id, booking_date, booking_time]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'เวลานี้ถูกจองแล้ว', code: 'SLOT_BOOKED' });
    }

    const [existingLock] = await pool.query(
      `SELECT id, user_id FROM booking_locks WHERE service_id = $1 AND booking_date = $2 AND booking_time = $3 AND expires_at > NOW()`,
      [service_id, booking_date, booking_time]
    );

    const userId = req.user.id;

    if (existingLock.length > 0) {
      const lock = existingLock[0];
      if (lock.user_id === userId) {
        await pool.query(`UPDATE booking_locks SET expires_at = NOW() + INTERVAL '${LOCK_DURATION_MIN} minutes', locked_at = NOW() WHERE id = $1`, [lock.id]);
        return res.json({ success: true, message: 'ล็อคเวลาสำเร็จ' });
      }
      return res.status(409).json({ success: false, message: 'มีคนกำลังจองเวลานี้อยู่', code: 'SLOT_LOCKED' });
    }

    // Release previous locks by this user for same service+date
    await pool.query(
      `DELETE FROM booking_locks WHERE user_id = $1 AND service_id = $2 AND booking_date = $3`,
      [userId, service_id, booking_date]
    );

    await pool.query(
      `INSERT INTO booking_locks (service_id, booking_date, booking_time, user_id, expires_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '${LOCK_DURATION_MIN} minutes')`,
      [service_id, booking_date, booking_time, userId]
    );

    res.json({ success: true, message: 'ล็อคเวลาสำเร็จ' });
  } catch (error) {
    console.error('Lock slot error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// POST /api/bookings/unlock — Release a slot lock
// ============================================================
router.post('/unlock', authMiddleware, async (req, res) => {
  try {
    const { service_id, booking_date, booking_time } = req.body;
    const userId = req.user.id;
    await pool.query(
      `DELETE FROM booking_locks WHERE service_id = $1 AND booking_date = $2 AND booking_time = $3 AND user_id = $4`,
      [service_id, booking_date, booking_time, userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Unlock error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// POST /api/bookings — Create a booking (with DB transaction for balance safety)
// ============================================================
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.getConnection();
  try {
    const { service_id, booking_date, booking_time, branch, contact_name, contact_phone, contact_email, note, price, doctor_id } = req.body;
    if (!service_id || !booking_date || !booking_time || !contact_name || !contact_phone) {
      client.release();
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    await client.query('BEGIN');

    // Verify service exists
    const svcResult = await client.query('SELECT id, name, price, branch FROM services WHERE id = $1 AND is_active = TRUE', [service_id]);
    if (svcResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ success: false, message: 'ไม่พบบริการนี้' });
    }
    const svc = svcResult.rows[0];

    await cleanExpiredLocks();

    // Check for duplicate booking
    const dupResult = await client.query(
      `SELECT id FROM bookings WHERE service_id = $1 AND booking_date = $2 AND booking_time = $3 AND status NOT IN ('cancelled')`,
      [service_id, booking_date, booking_time]
    );
    if (dupResult.rows.length > 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(409).json({ success: false, message: 'เวลานี้ถูกจองแล้ว กรุณาเลือกเวลาอื่น' });
    }

    const userId = req.user.id;
    const servicePrice = parseFloat(price || svc.price) || 0;
    const depositAmount = Math.ceil(servicePrice / 2);

    // Lock and check balance (SELECT FOR UPDATE prevents double-spend)
    const balResult = await client.query(
      `SELECT balance FROM user_balances WHERE user_id = $1 FOR UPDATE`, [userId]
    );
    const currentBalance = balResult.rows.length > 0 ? parseFloat(balResult.rows[0].balance) : 0;
    if (currentBalance < depositAmount) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ success: false, message: `ยอดเงินไม่เพียงพอ (ต้องการ ฿${depositAmount.toLocaleString()} มี ฿${currentBalance.toLocaleString()})`, code: 'INSUFFICIENT_BALANCE' });
    }

    // Deduct balance
    const newBalResult = await client.query(
      `UPDATE user_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2 RETURNING balance`,
      [depositAmount, userId]
    );
    const balAfter = parseFloat(newBalResult.rows[0].balance);

    // Create booking
    const bookResult = await client.query(
      `INSERT INTO bookings (user_id, service_id, booking_date, booking_time, branch, contact_name, contact_phone, contact_email, note, price, deposit_amount, doctor_id, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'balance') RETURNING *`,
      [userId, service_id, booking_date, booking_time, branch || svc.branch || '', contact_name, contact_phone, contact_email || '', note || '', servicePrice, depositAmount, doctor_id || null]
    );
    const booking = bookResult.rows[0];

    // Record payment transaction
    await client.query(
      `INSERT INTO balance_transactions (user_id, type, amount, balance_after, description, booking_id) VALUES ($1, 'payment', $2, $3, $4, $5)`,
      [userId, depositAmount, balAfter, `ชำระมัดจำ ${svc.name}`, booking.id]
    );

    // Release locks
    await client.query(
      `DELETE FROM booking_locks WHERE user_id = $1 AND service_id = $2 AND booking_date = $3`,
      [userId, service_id, booking_date]
    );

    await client.query('COMMIT');
    client.release();
    res.status(201).json({ success: true, data: booking, message: 'จองบริการสำเร็จ' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'เวลานี้ถูกจองแล้ว กรุณาเลือกเวลาอื่น' });
    }
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// GET /api/bookings/my — Get current user's bookings
// ============================================================
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [bookings] = await pool.query(
      `SELECT b.*, s.name as service_name, s.image_url as service_image, s.category as service_category,
       CASE WHEN b.doctor_id IS NOT NULL THEN
         (SELECT CASE WHEN u.user_type = 'thai' THEN CONCAT(u.title_th,' ',u.first_name_th,' ',u.last_name_th)
                      ELSE CONCAT(u.title_en,' ',u.first_name_en,' ',u.last_name_en) END FROM users u WHERE u.id = b.doctor_id)
       END as doctor_name,
       (SELECT rr.status FROM refund_requests rr WHERE rr.booking_id = b.id ORDER BY rr.created_at DESC LIMIT 1) as refund_status
       FROM bookings b LEFT JOIN services s ON s.id = b.service_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// GET /api/bookings/all — Staff: get all bookings (paginated)
// ============================================================
router.get('/all', requireRole('reception', 'nurse', 'manager', 'doctor', 'super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, date_from, date_to, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (status) { where += ` AND b.status = $${paramIdx++}`; params.push(status); }
    if (date_from) { where += ` AND b.booking_date >= $${paramIdx++}`; params.push(date_from); }
    if (date_to) { where += ` AND b.booking_date <= $${paramIdx++}`; params.push(date_to); }
    if (search) {
      where += ` AND (b.contact_name ILIKE $${paramIdx} OR b.contact_phone ILIKE $${paramIdx} OR s.name ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM bookings b LEFT JOIN services s ON s.id = b.service_id ${where}`, params
    );
    const total = parseInt(countResult[0].total);

    const [bookings] = await pool.query(
      `SELECT b.*, s.name as service_name, s.image_url as service_image, s.category as service_category
       FROM bookings b LEFT JOIN services s ON s.id = b.service_id
       ${where} ORDER BY b.booking_date DESC, b.booking_time DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: {
        bookings,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// GET /api/bookings/stats — Dashboard stats
// ============================================================
router.get('/stats', requireRole('reception', 'nurse', 'manager', 'super_admin'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [todayCount] = await pool.query(`SELECT COUNT(*) as total FROM bookings WHERE booking_date = $1 AND status NOT IN ('cancelled')`, [today]);
    const [pendingCount] = await pool.query(`SELECT COUNT(*) as total FROM bookings WHERE status = 'pending'`);
    const [confirmedCount] = await pool.query(`SELECT COUNT(*) as total FROM bookings WHERE status = 'confirmed'`);
    const [totalCount] = await pool.query(`SELECT COUNT(*) as total FROM bookings WHERE status NOT IN ('cancelled')`);
    const [recentBookings] = await pool.query(
      `SELECT b.*, s.name as service_name FROM bookings b LEFT JOIN services s ON s.id = b.service_id ORDER BY b.created_at DESC LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        today: parseInt(todayCount[0].total),
        pending: parseInt(pendingCount[0].total),
        confirmed: parseInt(confirmedCount[0].total),
        total: parseInt(totalCount[0].total),
        recent: recentBookings,
      },
    });
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// PUT /api/bookings/:id/status — Update booking status
// ============================================================
router.put('/:id/status', requireRole('reception', 'nurse', 'manager', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
    }
    if (req.user.role === 'nurse' && !['confirmed'].includes(status)) {
      return res.status(403).json({ success: false, message: 'พยาบาลสามารถเปลี่ยนสถานะเป็น "ยืนยัน" เท่านั้น' });
    }

    const [result] = await pool.query(`UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [status, id]);
    if (result.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบการจอง' });

    res.json({ success: true, data: result[0], message: 'อัปเดตสถานะสำเร็จ' });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// PUT /api/bookings/:id/reschedule — Staff reschedule (up to 1 year)
// ============================================================
router.put('/:id/reschedule', requireRole('reception', 'nurse', 'manager', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { booking_date, booking_time } = req.body;
    if (!booking_date || !booking_time) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุวันและเวลาใหม่' });
    }

    // Validate max 1 year ahead
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (new Date(booking_date) > maxDate) {
      return res.status(400).json({ success: false, message: 'ไม่สามารถเลื่อนนัดเกิน 1 ปี' });
    }

    const [booking] = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (booking.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบการจอง' });

    const [conflict] = await pool.query(
      `SELECT id FROM bookings WHERE service_id = $1 AND booking_date = $2 AND booking_time = $3 AND status NOT IN ('cancelled') AND id != $4`,
      [booking[0].service_id, booking_date, booking_time, id]
    );
    if (conflict.length > 0) return res.status(409).json({ success: false, message: 'เวลานี้ถูกจองแล้ว' });

    const [result] = await pool.query(
      `UPDATE bookings SET booking_date = $1, booking_time = $2, reschedule_count = reschedule_count + 1, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [booking_date, booking_time, id]
    );

    res.json({ success: true, data: result[0], message: 'เลื่อนนัดสำเร็จ' });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'เวลานี้ถูกจองแล้ว' });
    console.error('Reschedule error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// PUT /api/bookings/:id/user-reschedule — Patient self-reschedule (ONCE, within 7 days)
// ============================================================
router.put('/:id/user-reschedule', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { booking_date, booking_time } = req.body;
    const userId = req.user.id;
    if (!booking_date || !booking_time) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุวันและเวลาใหม่' });
    }

    const [booking] = await pool.query(
      'SELECT * FROM bookings WHERE id = $1 AND user_id = $2', [id, userId]
    );
    if (booking.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบการจอง' });
    const b = booking[0];

    if (b.status === 'completed' || b.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'ไม่สามารถเลื่อนนัดที่เสร็จสิ้นหรือยกเลิกแล้ว' });
    }

    if (b.reschedule_count >= 1) {
      return res.status(400).json({ success: false, message: 'คุณเลื่อนนัดได้สูงสุด 1 ครั้งเท่านั้น' });
    }

    // Validate: new date must be within 7 days from today
    const now = new Date();
    const bangkokNow = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
    const maxDate = new Date(bangkokNow);
    maxDate.setDate(maxDate.getDate() + 7);
    const newDate = new Date(booking_date + 'T00:00:00+07:00');
    if (newDate < bangkokNow || newDate > maxDate) {
      return res.status(400).json({ success: false, message: 'สามารถเลื่อนได้ภายใน 7 วันจากวันนี้เท่านั้น' });
    }

    const [conflict] = await pool.query(
      `SELECT id FROM bookings WHERE service_id = $1 AND booking_date = $2 AND booking_time = $3 AND status NOT IN ('cancelled') AND id != $4`,
      [b.service_id, booking_date, booking_time, id]
    );
    if (conflict.length > 0) return res.status(409).json({ success: false, message: 'เวลานี้ถูกจองแล้ว กรุณาเลือกเวลาอื่น' });

    const [result] = await pool.query(
      `UPDATE bookings SET booking_date = $1, booking_time = $2, reschedule_count = reschedule_count + 1, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [booking_date, booking_time, id]
    );

    res.json({ success: true, data: result[0], message: 'เลื่อนนัดสำเร็จ' });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'เวลานี้ถูกจองแล้ว' });
    console.error('User reschedule error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
