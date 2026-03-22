import { Router } from 'express';
import pool from '../database/db.js';
import { requireRole } from '../middleware/roleAuth.js';

const router = Router();

// ============================================================
// GET /api/services — Public: List active services
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { category, recommended, promotion } = req.query;
    let where = ['is_active = TRUE'];
    const params = [];
    let idx = 1;

    if (category) {
      where.push(`category = $${idx++}`);
      params.push(category);
    }
    if (recommended === 'true') {
      where.push('is_recommended = TRUE');
    }
    if (promotion === 'true') {
      where.push('is_promotion = TRUE');
    }

    const [services] = await pool.query(
      `SELECT * FROM services WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, created_at DESC`,
      params
    );

    res.json({ success: true, data: services });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// GET /api/services/admin — Admin: List all services (inc. inactive)
// ============================================================
router.get('/admin', requireRole('super_admin', 'manager'), async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = ['1=1'];
    const params = [];
    let idx = 1;

    if (search) {
      where.push(`(name ILIKE $${idx} OR description ILIKE $${idx} OR branch ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (category) {
      where.push(`category = $${idx}`);
      params.push(category);
      idx++;
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM services WHERE ${where.join(' AND ')}`,
      params
    );
    const total = parseInt(countResult[0].total);

    const [services] = await pool.query(
      `SELECT * FROM services WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: {
        services,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin list services error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// GET /api/services/:id — Public: Get single service by id
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM services WHERE id = $1 AND is_active = TRUE',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบบริการนี้' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Get service by id error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// POST /api/services — Admin: Create service
// ============================================================
router.post('/', requireRole('super_admin', 'manager'), async (req, res) => {
  try {
    const { name, description, image_url, original_price, price, category, branch, is_recommended, is_promotion, sort_order } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อบริการและราคา' });
    }

    const [result] = await pool.query(
      `INSERT INTO services (name, description, image_url, original_price, price, category, branch, is_recommended, is_promotion, sort_order, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        name,
        description || '',
        image_url || '',
        original_price || 0,
        price,
        category || 'general',
        branch || '',
        is_recommended || false,
        is_promotion || false,
        sort_order || 0,
        req.user.id,
      ]
    );

    res.status(201).json({ success: true, data: result[0], message: 'เพิ่มบริการสำเร็จ' });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// PUT /api/services/:id — Admin: Update service
// ============================================================
router.put('/:id', requireRole('super_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image_url, original_price, price, category, branch, is_recommended, is_promotion, is_active, sort_order } = req.body;

    const [existing] = await pool.query('SELECT id FROM services WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบบริการนี้' });
    }

    const [result] = await pool.query(
      `UPDATE services SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        image_url = COALESCE($3, image_url),
        original_price = COALESCE($4, original_price),
        price = COALESCE($5, price),
        category = COALESCE($6, category),
        branch = COALESCE($7, branch),
        is_recommended = COALESCE($8, is_recommended),
        is_promotion = COALESCE($9, is_promotion),
        is_active = COALESCE($10, is_active),
        sort_order = COALESCE($11, sort_order),
        updated_at = NOW()
       WHERE id = $12 RETURNING *`,
      [name, description, image_url, original_price, price, category, branch, is_recommended, is_promotion, is_active, sort_order, id]
    );

    res.json({ success: true, data: result[0], message: 'อัปเดตบริการสำเร็จ' });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// DELETE /api/services/:id — Admin: Delete service
// ============================================================
router.delete('/:id', requireRole('super_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id FROM services WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบบริการนี้' });
    }

    await pool.query('DELETE FROM services WHERE id = $1', [id]);
    res.json({ success: true, message: 'ลบบริการสำเร็จ' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

export default router;
