import { Router } from 'express';
import pool from '../database/db.js';
import { requireRole } from '../middleware/roleAuth.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

// Helper: generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u0E00-\u0E7F-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200);
};

// Helper: ensure unique slug
const ensureUniqueSlug = async (slug, excludeId = null) => {
  let candidate = slug;
  let counter = 1;
  while (true) {
    const params = [candidate];
    let where = 'slug = $1';
    if (excludeId) {
      where += ' AND id != $2';
      params.push(excludeId);
    }
    const [rows] = await pool.query(`SELECT id FROM news_articles WHERE ${where}`, params);
    if (rows.length === 0) return candidate;
    candidate = `${slug}-${counter++}`;
  }
};

// Helper: get author display name
const AUTHOR_NAME_SQL = `
  CASE WHEN u.user_type = 'thai'
    THEN COALESCE(u.first_name_th, '') || ' ' || COALESCE(u.last_name_th, '')
    ELSE COALESCE(u.first_name_en, '') || ' ' || COALESCE(u.last_name_en, '')
  END AS author_name
`;

// ============================================================
// PUBLIC ROUTES (no auth required)
// ============================================================

// GET /api/news — List published articles/news
router.get('/', async (req, res) => {
  try {
    const { category, tag, search, sort = 'latest', page = 1, limit = 12, content_type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["a.status = 'published'"];
    const params = [];
    let idx = 1;

    if (content_type && ['article', 'news'].includes(content_type)) {
      conditions.push(`a.content_type = $${idx++}`);
      params.push(content_type);
    }
    if (category) {
      conditions.push(`c.slug = $${idx++}`);
      params.push(category);
    }
    if (tag) {
      conditions.push(`EXISTS (SELECT 1 FROM news_tags_map tm JOIN news_tags t ON t.id = tm.tag_id WHERE tm.article_id = a.id AND t.slug = $${idx++})`);
      params.push(tag);
    }
    if (search) {
      conditions.push(`(a.title ILIKE $${idx} OR a.excerpt ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const orderBy = sort === 'popular' ? 'a.view_count DESC' : 'a.is_pinned DESC, a.published_at DESC';
    const whereSQL = conditions.join(' AND ');

    // Count total
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM news_articles a LEFT JOIN news_categories c ON c.id = a.category_id WHERE ${whereSQL}`,
      params
    );
    const total = parseInt(countRows[0].total);

    // Fetch articles
    params.push(parseInt(limit), offset);
    const [articles] = await pool.query(
      `SELECT a.id, a.title, a.slug, a.excerpt, a.cover_image,
              a.is_featured, a.is_pinned, a.view_count, a.published_at, a.created_at,
              a.content_type,
              c.name_th as category_name, c.slug as category_slug, c.icon as category_icon,
              ${AUTHOR_NAME_SQL}, u.role as author_role
       FROM news_articles a
       LEFT JOIN news_categories c ON c.id = a.category_id
       LEFT JOIN users u ON u.id = a.author_id
       WHERE ${whereSQL}
       ORDER BY ${orderBy}
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    // Fetch content_type for public listing
    // (content_type is already part of 'a' — just include it in SELECT)

    // Fetch tags for each article
    const articleIds = articles.map(a => a.id);
    let tagsMap = {};
    if (articleIds.length > 0) {
      const [tags] = await pool.query(
        `SELECT tm.article_id, t.name, t.slug FROM news_tags_map tm JOIN news_tags t ON t.id = tm.tag_id WHERE tm.article_id = ANY($1)`,
        [articleIds]
      );
      tags.forEach(t => {
        if (!tagsMap[t.article_id]) tagsMap[t.article_id] = [];
        tagsMap[t.article_id].push({ name: t.name, slug: t.slug });
      });
    }

    const data = articles.map(a => ({ ...a, tags: tagsMap[a.id] || [] }));

    res.json({
      success: true,
      data: {
        articles: data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// GET /api/news/categories — List active categories
router.get('/categories', async (_req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT id, name_th, name_en, slug, icon, sort_order FROM news_categories WHERE is_active = TRUE ORDER BY sort_order ASC'
    );
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// GET /api/news/tags — List all tags
router.get('/tags', async (_req, res) => {
  try {
    const [tags] = await pool.query(
      `SELECT t.id, t.name, t.slug, COUNT(tm.article_id) as article_count
       FROM news_tags t
       LEFT JOIN news_tags_map tm ON tm.tag_id = t.id
       LEFT JOIN news_articles a ON a.id = tm.article_id AND a.status = 'published'
       GROUP BY t.id ORDER BY article_count DESC`
    );
    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// GET /api/news/featured — Get featured published articles
router.get('/featured', async (req, res) => {
  try {
    const { content_type } = req.query;
    const conditions = ["a.status = 'published'", 'a.is_featured = TRUE'];
    const params = [];
    let idx = 1;
    if (content_type && ['article', 'news'].includes(content_type)) {
      conditions.push(`a.content_type = $${idx++}`);
      params.push(content_type);
    }
    params.push(5);
    const [articles] = await pool.query(
      `SELECT a.id, a.title, a.slug, a.excerpt, a.cover_image, a.published_at, a.view_count,
              a.content_type, c.name_th as category_name, c.slug as category_slug
       FROM news_articles a
       LEFT JOIN news_categories c ON c.id = a.category_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.published_at DESC LIMIT $${idx}`,
      params
    );
    res.json({ success: true, data: articles });
  } catch (error) {
    console.error('Get featured error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// GET /api/news/detail/:slug — Get single published article by slug
router.get('/detail/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const [articles] = await pool.query(
      `SELECT a.*, a.content_type, c.name_th as category_name, c.slug as category_slug, c.icon as category_icon,
              ${AUTHOR_NAME_SQL}, u.role as author_role
       FROM news_articles a
       LEFT JOIN news_categories c ON c.id = a.category_id
       LEFT JOIN users u ON u.id = a.author_id
       WHERE a.slug = $1 AND a.status = 'published'`,
      [slug]
    );

    if (articles.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบบทความ' });
    }

    const article = articles[0];

    // Increment view count (fire-and-forget)
    pool.query('UPDATE news_articles SET view_count = view_count + 1 WHERE id = $1', [article.id]);

    // Get tags
    const [tags] = await pool.query(
      'SELECT t.name, t.slug FROM news_tags_map tm JOIN news_tags t ON t.id = tm.tag_id WHERE tm.article_id = $1',
      [article.id]
    );

    // Get related articles (same category, exclude current)
    const [related] = await pool.query(
      `SELECT a.id, a.title, a.slug, a.excerpt, a.cover_image, a.published_at,
              c.name_th as category_name, c.slug as category_slug
       FROM news_articles a
       LEFT JOIN news_categories c ON c.id = a.category_id
       WHERE a.status = 'published' AND a.category_id = $1 AND a.id != $2
       ORDER BY a.published_at DESC LIMIT 3`,
      [article.category_id, article.id]
    );

    res.json({ success: true, data: { article: { ...article, tags }, related } });
  } catch (error) {
    console.error('Get news detail error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// ADMIN ROUTES (auth + role required)
// ============================================================

// GET /api/news/admin/stats — Dashboard stats
router.get('/admin/stats', authMiddleware, requireRole('doctor', 'manager', 'super_admin'), async (_req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'published') as published_count,
        COUNT(*) FILTER (WHERE status = 'archived') as archived_count,
        COUNT(*) as total_count,
        COALESCE(SUM(view_count), 0) as total_views
      FROM news_articles
    `);
    res.json({ success: true, data: stats[0] });
  } catch (error) {
    console.error('Get news stats error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// GET /api/news/admin/list — List all articles (admin)
router.get('/admin/list', authMiddleware, requireRole('doctor', 'manager', 'super_admin'), async (req, res) => {
  try {
    const { status, category, search, content_type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (content_type && ['article', 'news'].includes(content_type)) {
      conditions.push(`a.content_type = $${idx++}`);
      params.push(content_type);
    }
    if (status) {
      conditions.push(`a.status = $${idx++}`);
      params.push(status);
    }
    if (category) {
      conditions.push(`a.category_id = $${idx++}`);
      params.push(parseInt(category));
    }
    if (search) {
      conditions.push(`(a.title ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereSQL = conditions.join(' AND ');

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM news_articles a WHERE ${whereSQL}`,
      params
    );
    const total = parseInt(countRows[0].total);

    params.push(parseInt(limit), offset);
    const [articles] = await pool.query(
      `SELECT a.id, a.title, a.slug, a.status, a.is_featured, a.is_pinned,
              a.view_count, a.published_at, a.scheduled_at, a.created_at, a.updated_at,
              a.cover_image, a.content_type,
              c.name_th as category_name,
              ${AUTHOR_NAME_SQL}
       FROM news_articles a
       LEFT JOIN news_categories c ON c.id = a.category_id
       LEFT JOIN users u ON u.id = a.author_id
       WHERE ${whereSQL}
       ORDER BY a.updated_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      success: true,
      data: {
        articles,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (error) {
    console.error('Admin list news error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// GET /api/news/admin/:id — Get single article for editing
router.get('/admin/:id', authMiddleware, requireRole('doctor', 'manager', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const [articles] = await pool.query('SELECT * FROM news_articles WHERE id = $1', [id]);
    if (articles.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบบทความ' });
    }

    const [tags] = await pool.query(
      'SELECT t.id, t.name, t.slug FROM news_tags_map tm JOIN news_tags t ON t.id = tm.tag_id WHERE tm.article_id = $1',
      [id]
    );

    res.json({ success: true, data: { article: { ...articles[0], tags } } });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// POST /api/news/admin — Create article
router.post('/admin', authMiddleware, requireRole('doctor', 'manager', 'super_admin'), async (req, res) => {
  try {
    const { title, excerpt, content, cover_image, category_id, tags, is_featured, is_pinned, seo_title, seo_description, scheduled_at, status, content_type } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกหัวข้อ' });
    }

    const validContentType = ['article', 'news'].includes(content_type) ? content_type : 'article';
    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueSlug(baseSlug || `article-${Date.now()}`);
    const finalStatus = status === 'pending' ? 'pending' : 'draft';

    const [insertResult] = await pool.query(
      `INSERT INTO news_articles (title, slug, excerpt, content, cover_image, category_id, author_id, is_featured, is_pinned, seo_title, seo_description, scheduled_at, status, content_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [title.trim(), slug, excerpt || '', content || '', cover_image || '', category_id || null, req.user.id, is_featured || false, is_pinned || false, seo_title || '', seo_description || '', scheduled_at || null, finalStatus, validContentType]
    );
    const articleId = insertResult[0].id;

    // Save tags
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const trimmed = tagName.trim();
        if (!trimmed) continue;
        const tagSlug = generateSlug(trimmed) || `tag-${Date.now()}`;
        // Upsert tag
        const [tagRows] = await pool.query(
          `INSERT INTO news_tags (name, slug) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
          [trimmed, tagSlug]
        );
        await pool.query('INSERT INTO news_tags_map (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [articleId, tagRows[0].id]);
      }
    }

    res.status(201).json({ success: true, message: 'สร้างบทความสำเร็จ', data: { id: articleId, slug } });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// PUT /api/news/admin/:id — Update article
router.put('/admin/:id', authMiddleware, requireRole('doctor', 'manager', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, excerpt, content, cover_image, category_id, tags, is_featured, is_pinned, seo_title, seo_description, scheduled_at, content_type } = req.body;

    // Check article exists
    const [existing] = await pool.query('SELECT id, author_id, status FROM news_articles WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบบทความ' });
    }

    // Doctors can only edit their own drafts/pending
    const article = existing[0];
    if (req.user.role === 'doctor' && article.author_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์แก้ไขบทความนี้' });
    }

    let slug;
    if (title) {
      const baseSlug = generateSlug(title);
      slug = await ensureUniqueSlug(baseSlug || `article-${Date.now()}`, parseInt(id));
    }

    const validContentType = content_type && ['article', 'news'].includes(content_type) ? content_type : null;

    await pool.query(
      `UPDATE news_articles SET
        title = COALESCE($1, title),
        slug = COALESCE($2, slug),
        excerpt = COALESCE($3, excerpt),
        content = COALESCE($4, content),
        cover_image = COALESCE($5, cover_image),
        category_id = COALESCE($6, category_id),
        is_featured = COALESCE($7, is_featured),
        is_pinned = COALESCE($8, is_pinned),
        seo_title = COALESCE($9, seo_title),
        seo_description = COALESCE($10, seo_description),
        scheduled_at = $11,
        content_type = COALESCE($12, content_type),
        updated_at = NOW()
       WHERE id = $13`,
      [title || null, slug || null, excerpt, content, cover_image, category_id || null, is_featured, is_pinned, seo_title, seo_description, scheduled_at || null, validContentType, id]
    );

    // Re-sync tags
    if (tags !== undefined) {
      await pool.query('DELETE FROM news_tags_map WHERE article_id = $1', [id]);
      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          const trimmed = tagName.trim();
          if (!trimmed) continue;
          const tagSlug = generateSlug(trimmed) || `tag-${Date.now()}`;
          const [tagRows] = await pool.query(
            `INSERT INTO news_tags (name, slug) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
            [trimmed, tagSlug]
          );
          await pool.query('INSERT INTO news_tags_map (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [parseInt(id), tagRows[0].id]);
        }
      }
    }

    res.json({ success: true, message: 'อัปเดตบทความสำเร็จ' });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// PUT /api/news/admin/:id/status — Change article status (approve/reject/publish/archive)
router.put('/admin/:id/status', authMiddleware, requireRole('manager', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validTransitions = {
      draft: ['pending', 'published'],
      pending: ['approved', 'published', 'draft'],
      approved: ['published'],
      published: ['archived'],
      archived: ['draft'],
    };

    const [existing] = await pool.query('SELECT status FROM news_articles WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบบทความ' });
    }

    const currentStatus = existing[0].status;
    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
      return res.status(400).json({ success: false, message: `ไม่สามารถเปลี่ยนสถานะจาก ${currentStatus} เป็น ${status}` });
    }

    const updates = [`status = $1`, `updated_at = NOW()`];
    const params = [status];
    let idx = 2;

    if (status === 'approved') {
      updates.push(`approved_by = $${idx++}`, `approved_at = NOW()`);
      params.push(req.user.id);
    }
    if (status === 'published') {
      updates.push(`published_at = NOW()`);
    }

    params.push(parseInt(id));
    await pool.query(`UPDATE news_articles SET ${updates.join(', ')} WHERE id = $${idx}`, params);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, old_value, new_value, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, `news_${status}`, 'news_articles', parseInt(id), JSON.stringify({ status: currentStatus }), JSON.stringify({ status, note: note || '' }), req.ip]
    );

    const statusLabels = { draft: 'แบบร่าง', pending: 'รอตรวจสอบ', approved: 'อนุมัติ', published: 'เผยแพร่', archived: 'เก็บถาวร' };
    res.json({ success: true, message: `เปลี่ยนสถานะเป็น "${statusLabels[status] || status}" สำเร็จ` });
  } catch (error) {
    console.error('Change status error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// PUT /api/news/admin/:id/submit — Author submits draft for review
router.put('/admin/:id/submit', authMiddleware, requireRole('doctor', 'manager', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT status, author_id FROM news_articles WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบบทความ' });
    }
    if (existing[0].status !== 'draft') {
      return res.status(400).json({ success: false, message: 'เฉพาะบทความแบบร่างเท่านั้นที่ส่งตรวจสอบได้' });
    }
    if (req.user.role === 'doctor' && existing[0].author_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ส่งบทความนี้' });
    }

    await pool.query(
      "UPDATE news_articles SET status = 'pending', updated_at = NOW() WHERE id = $1",
      [id]
    );

    res.json({ success: true, message: 'ส่งบทความเพื่อตรวจสอบสำเร็จ' });
  } catch (error) {
    console.error('Submit article error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// DELETE /api/news/admin/:id — Delete article (super_admin only)
router.delete('/admin/:id', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id, title FROM news_articles WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบบทความ' });
    }

    await pool.query('DELETE FROM news_articles WHERE id = $1', [id]);

    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, old_value, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'news_delete', 'news_articles', parseInt(id), JSON.stringify({ title: existing[0].title }), req.ip]
    );

    res.json({ success: true, message: 'ลบบทความสำเร็จ' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// ADMIN: Category management
// ============================================================
router.post('/admin/categories', authMiddleware, requireRole('manager', 'super_admin'), async (req, res) => {
  try {
    const { name_th, name_en, icon } = req.body;
    if (!name_th) return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อหมวดหมู่' });
    const slug = generateSlug(name_th) || `cat-${Date.now()}`;
    const [catRows] = await pool.query(
      'INSERT INTO news_categories (name_th, name_en, slug, icon) VALUES ($1, $2, $3, $4) RETURNING *',
      [name_th, name_en || '', slug, icon || 'mdi:folder']
    );
    res.status(201).json({ success: true, message: 'สร้างหมวดหมู่สำเร็จ', data: catRows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'หมวดหมู่นี้มีอยู่แล้ว' });
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

router.get('/admin/categories', authMiddleware, requireRole('doctor', 'manager', 'super_admin'), async (_req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM news_categories ORDER BY sort_order ASC');
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Get admin categories error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

router.delete('/admin/categories/:id', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM news_categories WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'ลบหมวดหมู่สำเร็จ' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ============================================================
// ADMIN: Tag management
// ============================================================
router.get('/admin/tags', authMiddleware, requireRole('doctor', 'manager', 'super_admin'), async (_req, res) => {
  try {
    const [tags] = await pool.query('SELECT * FROM news_tags ORDER BY name ASC');
    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('Get admin tags error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

router.delete('/admin/tags/:id', authMiddleware, requireRole('manager', 'super_admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM news_tags WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'ลบแท็กสำเร็จ' });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

export default router;
