import { Router } from 'express';
import pool from '../database/db.js';
import authMiddleware from '../middleware/auth.js';
import { requireRole } from '../middleware/roleAuth.js';

const router = Router();

// ============================================================
// GET /api/finance/doctors — List all doctors (public for booking)
// ============================================================
router.get('/doctors', authMiddleware, async (req, res) => {
  try {
    const [docs] = await pool.query(
      `SELECT id, user_type,
        CASE WHEN user_type = 'thai' THEN title_th ELSE title_en END as title,
        CASE WHEN user_type = 'thai' THEN first_name_th ELSE first_name_en END as first_name,
        CASE WHEN user_type = 'thai' THEN last_name_th ELSE last_name_en END as last_name
       FROM users WHERE role = 'doctor' AND is_active = TRUE
       ORDER BY CASE WHEN user_type = 'thai' THEN first_name_th ELSE first_name_en END`
    );
    const doctors = docs.map((d) => ({
      id: d.id,
      name: `${d.title || ''} ${d.first_name || ''} ${d.last_name || ''}`.trim(),
    }));
    res.json({ success: true, data: doctors });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/finance/balance — Get current user balance
// ============================================================
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT balance FROM user_balances WHERE user_id = $1`, [userId]
    );
    const balance = rows.length > 0 ? parseFloat(rows[0].balance) : 0;
    res.json({ success: true, data: { balance } });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// POST /api/finance/deposit — Top up balance (with DB transaction)
// ============================================================
router.post('/deposit', authMiddleware, async (req, res) => {
  const client = await pool.getConnection();
  try {
    const { amount } = req.body;
    const depositAmount = parseFloat(amount);
    if (!depositAmount || depositAmount <= 0 || depositAmount > 1000000) {
      client.release();
      return res.status(400).json({ success: false, message: 'จำนวนเงินไม่ถูกต้อง (1 - 1,000,000 บาท)' });
    }

    const userId = req.user.id;

    await client.query('BEGIN');

    // Upsert balance with row-level lock
    const balResult = await client.query(
      `INSERT INTO user_balances (user_id, balance, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET balance = user_balances.balance + $2, updated_at = NOW()
       RETURNING balance`,
      [userId, depositAmount]
    );
    const newBalance = parseFloat(balResult.rows[0].balance);

    // Record transaction
    await client.query(
      `INSERT INTO balance_transactions (user_id, type, amount, balance_after, description) VALUES ($1, 'deposit', $2, $3, $4)`,
      [userId, depositAmount, newBalance, `เติมเงิน ฿${depositAmount.toLocaleString()}`]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: { balance: newBalance }, message: `เติมเงินสำเร็จ ฿${depositAmount.toLocaleString()}` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Deposit error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  } finally {
    client.release();
  }
});

// ============================================================
// POST /api/finance/withdraw — Request withdrawal to bank account (with DB transaction)
// ============================================================
router.post('/withdraw', authMiddleware, async (req, res) => {
  const client = await pool.getConnection();
  try {
    const { amount, bank_name, account_name, account_number } = req.body;
    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0 || withdrawAmount > 1000000) {
      client.release();
      return res.status(400).json({ success: false, message: 'จำนวนเงินไม่ถูกต้อง (1 - 1,000,000 บาท)' });
    }
    if (!bank_name || !account_name || !account_number) {
      client.release();
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลธนาคารให้ครบถ้วน' });
    }

    const userId = req.user.id;

    await client.query('BEGIN');

    // Check balance with row-level lock
    const balRows = await client.query(
      `SELECT balance FROM user_balances WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    const currentBalance = balRows.rows.length > 0 ? parseFloat(balRows.rows[0].balance) : 0;

    if (currentBalance < withdrawAmount) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ success: false, message: 'ยอดเงินไม่เพียงพอ' });
    }

    // Deduct balance
    const updResult = await client.query(
      `UPDATE user_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2 RETURNING balance`,
      [withdrawAmount, userId]
    );
    const newBalance = parseFloat(updResult.rows[0].balance);

    // Record transaction
    await client.query(
      `INSERT INTO balance_transactions (user_id, type, amount, balance_after, description) VALUES ($1, 'withdraw', $2, $3, $4)`,
      [userId, withdrawAmount, newBalance, `ถอนเงิน ฿${withdrawAmount.toLocaleString()} → ${bank_name} ${account_number}`]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: { balance: newBalance }, message: `ถอนเงินสำเร็จ ฿${withdrawAmount.toLocaleString()}` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Withdraw error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  } finally {
    client.release();
  }
});

// ============================================================
// GET /api/finance/transactions — User's transaction history
// ============================================================
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [countRes] = await pool.query(
      `SELECT COUNT(*) as total FROM balance_transactions WHERE user_id = $1`, [userId]
    );
    const total = parseInt(countRes[0].total);

    const [transactions] = await pool.query(
      `SELECT bt.*, b.booking_date, b.booking_time, s.name as service_name
       FROM balance_transactions bt
       LEFT JOIN bookings b ON b.id = bt.booking_id
       LEFT JOIN services s ON s.id = b.service_id
       WHERE bt.user_id = $1
       ORDER BY bt.created_at DESC LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), offset]
    );

    res.json({ success: true, data: { transactions, pagination: { page: parseInt(page), total, totalPages: Math.ceil(total / parseInt(limit)) } } });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// POST /api/finance/refund-request — User requests a refund (with DB transaction)
// ============================================================
router.post('/refund-request', authMiddleware, async (req, res) => {
  const client = await pool.getConnection();
  try {
    const { booking_id, reason } = req.body;
    const userId = req.user.id;

    await client.query('BEGIN');

    // Lock booking row
    const bResult = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2 FOR UPDATE`, [booking_id, userId]
    );
    if (bResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ success: false, message: 'ไม่พบการจอง' });
    }
    const booking = bResult.rows[0];

    if (booking.status === 'completed') {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ success: false, message: 'ไม่สามารถขอคืนเงินสำหรับบริการที่เสร็จสิ้นแล้ว' });
    }

    // Check existing pending refund
    const existResult = await client.query(
      `SELECT id FROM refund_requests WHERE booking_id = $1 AND status = 'pending'`, [booking_id]
    );
    if (existResult.rows.length > 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ success: false, message: 'มีคำขอคืนเงินที่รออยู่แล้ว' });
    }

    const refundAmount = parseFloat(booking.deposit_amount) || 0;

    const insResult = await client.query(
      `INSERT INTO refund_requests (booking_id, user_id, amount, reason) VALUES ($1, $2, $3, $4) RETURNING *`,
      [booking_id, userId, refundAmount, reason || '']
    );

    // Cancel the booking
    await client.query(`UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [booking_id]);

    await client.query('COMMIT');
    client.release();
    res.json({ success: true, data: insResult.rows[0], message: 'ส่งคำขอคืนเงินสำเร็จ รอการอนุมัติ' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    console.error('Refund request error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/finance/refund-requests — Staff: list all refund requests
// ============================================================
router.get('/refund-requests', requireRole('accountant', 'reception', 'manager', 'super_admin'), async (req, res) => {
  try {
    const { status = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = '';
    const params = [];
    let idx = 1;
    if (status) { where = `WHERE rr.status = $${idx++}`; params.push(status); }

    const [countRes] = await pool.query(
      `SELECT COUNT(*) as total FROM refund_requests rr ${where}`, params
    );
    const total = parseInt(countRes[0].total);

    const [requests] = await pool.query(
      `SELECT rr.*, b.contact_name, b.booking_date, b.booking_time, b.deposit_amount, s.name as service_name
       FROM refund_requests rr
       LEFT JOIN bookings b ON b.id = rr.booking_id
       LEFT JOIN services s ON s.id = b.service_id
       ${where}
       ORDER BY rr.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, data: { requests, pagination: { page: parseInt(page), total, totalPages: Math.ceil(total / parseInt(limit)) } } });
  } catch (error) {
    console.error('Get refund requests error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// PUT /api/finance/refund-requests/:id/approve — Staff approves their part (with DB transaction)
// ============================================================
router.put('/refund-requests/:id/approve', requireRole('accountant', 'reception', 'manager', 'super_admin'), async (req, res) => {
  const client = await pool.getConnection();
  try {
    const { id } = req.params;
    const staffRole = req.user.role;
    const staffId = req.user.id;

    await client.query('BEGIN');

    // Lock the refund request row to prevent concurrent approvals
    const rrResult = await client.query(`SELECT * FROM refund_requests WHERE id = $1 FOR UPDATE`, [id]);
    if (rrResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ success: false, message: 'ไม่พบคำขอ' });
    }
    const rr = rrResult.rows[0];

    if (rr.status !== 'pending') {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ success: false, message: 'คำขอนี้ไม่อยู่ในสถานะรอดำเนินการ' });
    }

    // Update appropriate approval field
    const updates = {};
    if (staffRole === 'accountant' || staffRole === 'super_admin') {
      updates.approved_by_accountant = staffId;
      updates.approved_at_accountant = 'NOW()';
    }
    if (staffRole === 'reception' || staffRole === 'super_admin') {
      updates.approved_by_reception = staffId;
      updates.approved_at_reception = 'NOW()';
    }
    if (staffRole === 'manager' || staffRole === 'super_admin') {
      updates.approved_by_manager = staffId;
      updates.approved_at_manager = 'NOW()';
    }

    // Build dynamic update
    const setClauses = [];
    const updateParams = [];
    let pIdx = 1;
    for (const [col, val] of Object.entries(updates)) {
      if (val === 'NOW()') {
        setClauses.push(`${col} = NOW()`);
      } else {
        setClauses.push(`${col} = $${pIdx++}`);
        updateParams.push(val);
      }
    }

    if (setClauses.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ success: false, message: 'บทบาทของคุณไม่สามารถอนุมัติได้' });
    }

    await client.query(
      `UPDATE refund_requests SET ${setClauses.join(', ')} WHERE id = $${pIdx}`,
      [...updateParams, id]
    );

    // Re-read to check if all 3 approvals are done
    const updResult = await client.query(`SELECT * FROM refund_requests WHERE id = $1`, [id]);
    const u = updResult.rows[0];
    const allApproved = u.approved_by_accountant && u.approved_by_reception && u.approved_by_manager;

    if (allApproved) {
      // Complete refund — credit back to user balance atomically
      await client.query(`UPDATE refund_requests SET status = 'approved', completed_at = NOW() WHERE id = $1`, [id]);

      const refundAmount = parseFloat(u.amount);

      // Lock user balance row and credit
      const balResult = await client.query(
        `INSERT INTO user_balances (user_id, balance, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET balance = user_balances.balance + $2, updated_at = NOW()
         RETURNING balance`,
        [u.user_id, refundAmount]
      );

      await client.query(
        `INSERT INTO balance_transactions (user_id, type, amount, balance_after, description, booking_id) VALUES ($1, 'refund', $2, $3, $4, $5)`,
        [u.user_id, refundAmount, parseFloat(balResult.rows[0].balance), `คืนเงินมัดจำ #${u.booking_id}`, u.booking_id]
      );

      await client.query('COMMIT');
      client.release();
      return res.json({ success: true, message: 'อนุมัติครบทุกฝ่ายแล้ว — คืนเงินเข้ากระเป๋าเรียบร้อย', data: { fully_approved: true } });
    }

    await client.query('COMMIT');

    // Count remaining approvals
    const remaining = [];
    if (!u.approved_by_accountant) remaining.push('ฝ่ายการเงิน');
    if (!u.approved_by_reception) remaining.push('ฝ่ายต้อนรับ');
    if (!u.approved_by_manager) remaining.push('ผู้จัดการ');

    client.release();
    res.json({ success: true, message: `อนุมัติสำเร็จ — รออีก ${remaining.length} ฝ่าย (${remaining.join(', ')})`, data: { fully_approved: false, remaining } });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    console.error('Approve refund error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// PUT /api/finance/refund-requests/:id/reject — Staff rejects refund (with DB transaction)
// ============================================================
router.put('/refund-requests/:id/reject', requireRole('accountant', 'reception', 'manager', 'super_admin'), async (req, res) => {
  const client = await pool.getConnection();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const rrResult = await client.query(`SELECT * FROM refund_requests WHERE id = $1 AND status = 'pending' FOR UPDATE`, [id]);
    if (rrResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ success: false, message: 'ไม่พบคำขอ' });
    }

    await client.query(`UPDATE refund_requests SET status = 'rejected', completed_at = NOW() WHERE id = $1`, [id]);
    // Restore booking status to pending (un-cancel)
    await client.query(`UPDATE bookings SET status = 'pending', updated_at = NOW() WHERE id = $1`, [rrResult.rows[0].booking_id]);

    await client.query('COMMIT');
    client.release();
    res.json({ success: true, message: 'ปฏิเสธคำขอคืนเงินเรียบร้อย' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    console.error('Reject refund error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// ============================================================
// GET /api/finance/dashboard — Financial overview for staff
// ============================================================
router.get('/dashboard', requireRole('accountant', 'manager', 'super_admin'), async (req, res) => {
  try {
    const [totalDeposits] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM balance_transactions WHERE type = 'deposit'`
    );
    const [totalPayments] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM balance_transactions WHERE type = 'payment'`
    );
    const [totalRefunds] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM balance_transactions WHERE type = 'refund'`
    );
    const [pendingRefunds] = await pool.query(
      `SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as amount FROM refund_requests WHERE status = 'pending'`
    );
    const [totalBookingRevenue] = await pool.query(
      `SELECT COALESCE(SUM(deposit_amount), 0) as total FROM bookings WHERE status NOT IN ('cancelled')`
    );
    const [recentTx] = await pool.query(
      `SELECT bt.*, b.contact_name FROM balance_transactions bt LEFT JOIN bookings b ON b.id = bt.booking_id ORDER BY bt.created_at DESC LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        totalDeposits: parseFloat(totalDeposits[0].total),
        totalPayments: parseFloat(totalPayments[0].total),
        totalRefunds: parseFloat(totalRefunds[0].total),
        pendingRefundCount: parseInt(pendingRefunds[0].total),
        pendingRefundAmount: parseFloat(pendingRefunds[0].amount),
        totalBookingRevenue: parseFloat(totalBookingRevenue[0].total),
        recentTransactions: recentTx,
      },
    });
  } catch (error) {
    console.error('Finance dashboard error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
