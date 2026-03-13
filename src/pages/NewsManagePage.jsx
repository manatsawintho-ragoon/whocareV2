import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import {
  apiGetNewsStats, apiGetAdminNews, apiGetAdminArticle, apiCreateArticle,
  apiUpdateArticle, apiChangeArticleStatus, apiSubmitArticle, apiDeleteArticle,
  apiGetAdminCategories, apiCreateCategory, apiDeleteCategory, apiDeleteTag,
} from '../services/api';

// ============================================================
// Constants
// ============================================================
const STATUS_CONFIG = {
  draft:     { label: 'แบบร่าง', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', icon: 'mdi:pencil-outline' },
  pending:   { label: 'รอตรวจสอบ', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400', icon: 'mdi:clock-outline' },
  approved:  { label: 'อนุมัติแล้ว', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', icon: 'mdi:check-circle-outline' },
  published: { label: 'เผยแพร่', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400', icon: 'mdi:earth' },
  archived:  { label: 'เก็บถาวร', color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400', icon: 'mdi:archive' },
};

const emptyForm = {
  title: '', excerpt: '', content: '', cover_image: '', category_id: '',
  tags: '', is_featured: false, is_pinned: false,
  seo_title: '', seo_description: '', scheduled_at: '',
  content_type: 'article',
};

// ============================================================
// Component
// ============================================================
const NewsManagePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, hasRole } = useAuth();

  // Tabs: 'dashboard' | 'list' | 'editor' | 'categories'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Dashboard
  const [stats, setStats] = useState(null);

  // List state
  const [articles, setArticles] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterContentType, setFilterContentType] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Editor state
  const [editorMode, setEditorMode] = useState('create'); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  // Categories
  const [categories, setCategories] = useState([]);
  const [catForm, setCatForm] = useState({ name_th: '', name_en: '', icon: 'mdi:folder' });

  const [pageLoading, setPageLoading] = useState(true);

  // ============================================================
  // Init
  // ============================================================
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (!hasRole('doctor', 'manager', 'super_admin')) { navigate('/dashboard'); return; }
    loadInitial();
  }, [user, authLoading]);

  const loadInitial = async () => {
    setPageLoading(true);
    await Promise.all([loadStats(), loadCategories()]);
    setPageLoading(false);
  };

  // ============================================================
  // Data loaders
  // ============================================================
  const loadStats = async () => {
    try {
      const res = await apiGetNewsStats();
      if (res.success) setStats(res.data);
    } catch { /* ignore */ }
  };

  const loadArticles = async (page = 1) => {
    setListLoading(true);
    try {
      const params = { page, limit: 15 };
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      if (filterContentType) params.content_type = filterContentType;
      if (search) params.search = search;
      const res = await apiGetAdminNews(params);
      if (res.success) {
        setArticles(res.data.articles);
        setPagination(res.data.pagination);
      }
    } catch { /* ignore */ }
    setListLoading(false);
  };

  const loadCategories = async () => {
    try {
      const res = await apiGetAdminCategories();
      if (res.success) setCategories(res.data);
    } catch { /* ignore */ }
  };

  // Refresh list on filter change
  useEffect(() => {
    if (activeTab === 'list') loadArticles(1);
  }, [activeTab, filterStatus, filterCategory, filterContentType]);

  // ============================================================
  // Tab switch helpers
  // ============================================================
  const goToList = (status = '') => {
    setFilterStatus(status);
    setActiveTab('list');
  };

  const goToCreate = () => {
    setEditorMode('create');
    setEditingId(null);
    setForm({ ...emptyForm });
    setPreview(false);
    setActiveTab('editor');
  };

  const goToEdit = async (id) => {
    try {
      const res = await apiGetAdminArticle(id);
      if (res.success) {
        const a = res.data.article;
        setEditorMode('edit');
        setEditingId(id);
        setForm({
          title: a.title || '',
          excerpt: a.excerpt || '',
          content: a.content || '',
          cover_image: a.cover_image || '',
          category_id: a.category_id || '',
          tags: (a.tags || []).map(t => t.name).join(', '),
          is_featured: a.is_featured || false,
          is_pinned: a.is_pinned || false,
          seo_title: a.seo_title || '',
          seo_description: a.seo_description || '',
          scheduled_at: a.scheduled_at ? a.scheduled_at.slice(0, 16) : '',
          content_type: a.content_type || 'article',
        });
        setPreview(false);
        setActiveTab('editor');
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'โหลดบทความล้มเหลว', confirmButtonColor: '#3b82f6' });
    }
  };

  // ============================================================
  // Editor actions
  // ============================================================
  const handleSave = async (submitForReview = false) => {
    if (!form.title.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกหัวข้อบทความ', confirmButtonColor: '#3b82f6' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        status: submitForReview ? 'pending' : 'draft',
        content_type: form.content_type || 'article',
      };

      let result;
      if (editorMode === 'edit') {
        result = await apiUpdateArticle(editingId, payload);
      } else {
        result = await apiCreateArticle(payload);
        if (result.success && result.data?.id) setEditingId(result.data.id);
      }

      if (result.success) {
        if (submitForReview && editorMode === 'edit') {
          await apiSubmitArticle(editingId);
        }
        Swal.fire({ icon: 'success', title: result.message || 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false });
        if (editorMode === 'create' && result.data?.id) {
          setEditorMode('edit');
          setEditingId(result.data.id);
        }
        loadStats();
      } else {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: result.message, confirmButtonColor: '#3b82f6' });
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'ไม่สามารถบันทึกได้', confirmButtonColor: '#3b82f6' });
    }
    setSaving(false);
  };

  // ============================================================
  // Status actions
  // ============================================================
  const handleSaveAndPublish = async () => {
    if (!form.title.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกหัวข้อ', confirmButtonColor: '#3b82f6' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        status: 'draft',
        content_type: form.content_type || 'article',
      };

      let articleId = editingId;
      let result;
      if (editorMode === 'edit') {
        result = await apiUpdateArticle(editingId, payload);
      } else {
        result = await apiCreateArticle(payload);
        if (result.success && result.data?.id) {
          articleId = result.data.id;
          setEditingId(articleId);
          setEditorMode('edit');
        }
      }

      if (result.success && articleId) {
        const pubRes = await apiChangeArticleStatus(articleId, 'published');
        if (pubRes.success) {
          Swal.fire({ icon: 'success', title: 'เผยแพร่สำเร็จ', timer: 1500, showConfirmButton: false });
          loadStats();
        } else {
          Swal.fire({ icon: 'error', title: 'บันทึกแล้วแต่เผยแพร่ไม่สำเร็จ', text: pubRes.message, confirmButtonColor: '#3b82f6' });
        }
      } else {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: result.message, confirmButtonColor: '#3b82f6' });
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'ไม่สามารถบันทึกได้', confirmButtonColor: '#3b82f6' });
    }
    setSaving(false);
  };

  const handleStatusChange = async (id, newStatus, label) => {
    const confirm = await Swal.fire({
      title: `เปลี่ยนสถานะเป็น "${label}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });
    if (!confirm.isConfirmed) return;

    const res = await apiChangeArticleStatus(id, newStatus);
    if (res.success) {
      Swal.fire({ icon: 'success', title: res.message, timer: 1500, showConfirmButton: false });
      loadArticles(pagination.page);
      loadStats();
    } else {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: res.message, confirmButtonColor: '#3b82f6' });
    }
  };

  const handleDelete = async (article) => {
    const confirm = await Swal.fire({
      title: 'ลบบทความ',
      html: `ต้องการลบ <strong>${article.title}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    });
    if (!confirm.isConfirmed) return;

    const res = await apiDeleteArticle(article.id);
    if (res.success) {
      Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1500, showConfirmButton: false });
      loadArticles(pagination.page);
      loadStats();
    } else {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: res.message, confirmButtonColor: '#3b82f6' });
    }
  };

  // ============================================================
  // Category actions
  // ============================================================
  const handleCreateCategory = async () => {
    if (!catForm.name_th.trim()) return;
    const res = await apiCreateCategory(catForm);
    if (res.success) {
      Swal.fire({ icon: 'success', title: 'สร้างหมวดหมู่สำเร็จ', timer: 1500, showConfirmButton: false });
      setCatForm({ name_th: '', name_en: '', icon: 'mdi:folder' });
      loadCategories();
    } else {
      Swal.fire({ icon: 'error', title: res.message, confirmButtonColor: '#3b82f6' });
    }
  };

  const handleDeleteCategory = async (cat) => {
    const confirm = await Swal.fire({
      title: `ลบหมวด "${cat.name_th}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    });
    if (!confirm.isConfirmed) return;
    const res = await apiDeleteCategory(cat.id);
    if (res.success) {
      loadCategories();
    }
  };

  // ============================================================
  // Helpers
  // ============================================================
  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const canManageStatus = hasRole('manager', 'super_admin');

  // Get available status transitions for action buttons
  const getActions = (article) => {
    const actions = [];
    if (article.status === 'draft') {
      actions.push({ status: 'pending', label: 'ส่งตรวจสอบ', icon: 'mdi:send', color: 'text-yellow-600' });
    }
    if (canManageStatus) {
      if (article.status === 'draft' || article.status === 'pending') {
        actions.push({ status: 'published', label: 'เผยแพร่ทันที', icon: 'mdi:earth', color: 'text-green-600' });
      }
      if (article.status === 'pending') {
        actions.push({ status: 'approved', label: 'อนุมัติ', icon: 'mdi:check', color: 'text-blue-600' });
        actions.push({ status: 'draft', label: 'ส่งกลับแก้ไข', icon: 'mdi:undo', color: 'text-gray-600' });
      }
      if (article.status === 'approved') {
        actions.push({ status: 'published', label: 'เผยแพร่', icon: 'mdi:earth', color: 'text-green-600' });
      }
      if (article.status === 'published') {
        actions.push({ status: 'archived', label: 'เก็บถาวร', icon: 'mdi:archive', color: 'text-red-600' });
      }
      if (article.status === 'archived') {
        actions.push({ status: 'draft', label: 'แก้ไขใหม่', icon: 'mdi:pencil', color: 'text-gray-600' });
      }
    }
    return actions;
  };

  // ============================================================
  // Render loading
  // ============================================================
  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-section dark:bg-darkmode">
        <Icon icon="mdi:loading" width="40" className="text-primary animate-spin" />
      </div>
    );
  }

  // ============================================================
  // TABS NAV
  // ============================================================
  const tabs = [
    { key: 'dashboard', label: 'ภาพรวม', icon: 'mdi:view-dashboard' },
    { key: 'list', label: 'บทความทั้งหมด', icon: 'mdi:format-list-bulleted' },
    { key: 'editor', label: editorMode === 'edit' ? 'แก้ไขบทความ' : 'สร้างบทความ', icon: 'mdi:pencil-plus' },
    { key: 'categories', label: 'หมวดหมู่', icon: 'mdi:folder-multiple' },
  ];

  return (
    <div className="min-h-screen bg-section dark:bg-darkmode pt-32 pb-16 px-4">
      <div className="container mx-auto max-w-6xl">

        {/* ====== Page Header ====== */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-midnight_text dark:text-white flex items-center gap-2">
              <Icon icon="mdi:newspaper-variant-multiple" width="28" className="text-primary" />
              จัดการบทความ & ข่าวสาร
            </h1>
            <p className="text-sm text-grey dark:text-white/50 mt-1">สร้าง แก้ไข อนุมัติ และเผยแพร่บทความ</p>
          </div>
          <button
            onClick={goToCreate}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Icon icon="mdi:plus" width="20" />
            สร้างบทความใหม่
          </button>
        </div>

        {/* ====== Tab Navigation ====== */}
        <div className="bg-white dark:bg-darklight rounded-2xl shadow-deatail_shadow border border-border dark:border-dark_border mb-6 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-border dark:border-dark_border">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); if (tab.key === 'list') loadArticles(1); if (tab.key === 'dashboard') loadStats(); }}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-grey dark:text-white/50 hover:text-midnight_text dark:hover:text-white'
                }`}
              >
                <Icon icon={tab.icon} width="18" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ====== TAB: Dashboard ====== */}
          {activeTab === 'dashboard' && stats && (
            <div className="p-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {[
                  { key: 'draft_count', label: 'แบบร่าง', icon: 'mdi:pencil-outline', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400', onClick: () => goToList('draft') },
                  { key: 'pending_count', label: 'รอตรวจสอบ', icon: 'mdi:clock-outline', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', onClick: () => goToList('pending') },
                  { key: 'approved_count', label: 'อนุมัติแล้ว', icon: 'mdi:check-circle-outline', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', onClick: () => goToList('approved') },
                  { key: 'published_count', label: 'เผยแพร่', icon: 'mdi:earth', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', onClick: () => goToList('published') },
                  { key: 'archived_count', label: 'เก็บถาวร', icon: 'mdi:archive', color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400', onClick: () => goToList('archived') },
                  { key: 'total_views', label: 'ยอดดูรวม', icon: 'mdi:eye', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
                ].map(s => (
                  <button
                    key={s.key}
                    onClick={s.onClick}
                    className={`${s.color} rounded-2xl p-4 text-center transition-transform hover:scale-[1.02] cursor-pointer`}
                  >
                    <Icon icon={s.icon} width="28" className="mx-auto mb-1" />
                    <p className="text-2xl font-bold">{Number(stats[s.key] || 0).toLocaleString()}</p>
                    <p className="text-xs mt-0.5 opacity-75">{s.label}</p>
                  </button>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button onClick={goToCreate} className="flex items-center gap-3 p-4 rounded-xl border border-border dark:border-dark_border hover:bg-section dark:hover:bg-darkmode transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Icon icon="mdi:plus" width="22" className="text-primary" /></div>
                  <div className="text-left">
                    <p className="font-semibold text-midnight_text dark:text-white text-sm">สร้างบทความใหม่</p>
                    <p className="text-xs text-grey dark:text-white/40">เขียนเนื้อหาใหม่</p>
                  </div>
                </button>
                {canManageStatus && parseInt(stats.pending_count) > 0 && (
                  <button onClick={() => goToList('pending')} className="flex items-center gap-3 p-4 rounded-xl border-2 border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-yellow-200 dark:bg-yellow-800 flex items-center justify-center"><Icon icon="mdi:clock-alert" width="22" className="text-yellow-700 dark:text-yellow-300" /></div>
                    <div className="text-left">
                      <p className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm">รออนุมัติ {stats.pending_count} บทความ</p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400/70">ตรวจสอบและอนุมัติ</p>
                    </div>
                  </button>
                )}
                <button onClick={() => goToList('')} className="flex items-center gap-3 p-4 rounded-xl border border-border dark:border-dark_border hover:bg-section dark:hover:bg-darkmode transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><Icon icon="mdi:format-list-bulleted" width="22" className="text-green-600" /></div>
                  <div className="text-left">
                    <p className="font-semibold text-midnight_text dark:text-white text-sm">ดูบทความทั้งหมด</p>
                    <p className="text-xs text-grey dark:text-white/40">{stats.total_count} บทความ</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ====== TAB: Article List ====== */}
          {activeTab === 'list' && (
            <div>
              {/* Filters */}
              <div className="p-4 border-b border-border dark:border-dark_border">
                <div className="flex flex-col sm:flex-row gap-3">
                  <form onSubmit={(e) => { e.preventDefault(); loadArticles(1); }} className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <Icon icon="mdi:magnify" width="20" className="absolute left-3 top-1/2 -translate-y-1/2 text-grey" />
                      <input
                        type="text" placeholder="ค้นหาบทความ..." value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <button type="submit" className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-blue-700 cursor-pointer">
                      <Icon icon="mdi:magnify" width="20" />
                    </button>
                  </form>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm cursor-pointer">
                    <option value="">สถานะทั้งหมด</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <select value={filterContentType} onChange={(e) => setFilterContentType(e.target.value)} className="px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm cursor-pointer">
                    <option value="">ประเภททั้งหมด</option>
                    <option value="article">บทความ</option>
                    <option value="news">ข่าวสาร</option>
                  </select>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm cursor-pointer">
                    <option value="">หมวดหมู่ทั้งหมด</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name_th}</option>)}
                  </select>
                </div>
              </div>

              {/* Article Table */}
              {listLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Icon icon="mdi:loading" width="32" className="text-primary animate-spin" />
                </div>
              ) : articles.length === 0 ? (
                <div className="text-center py-16 text-grey dark:text-white/40">
                  <Icon icon="mdi:newspaper-variant-outline" width="48" className="mx-auto mb-2 opacity-30" />
                  <p>ไม่พบบทความ</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-section dark:bg-darkmode border-b border-border dark:border-dark_border">
                        <th className="text-left px-4 py-3 font-semibold text-midnight_text dark:text-white">บทความ</th>
                        <th className="text-center px-2 py-3 font-semibold text-midnight_text dark:text-white hidden md:table-cell">หมวด</th>
                        <th className="text-center px-2 py-3 font-semibold text-midnight_text dark:text-white">สถานะ</th>
                        <th className="text-center px-2 py-3 font-semibold text-midnight_text dark:text-white hidden sm:table-cell">ดู</th>
                        <th className="text-center px-2 py-3 font-semibold text-midnight_text dark:text-white hidden lg:table-cell">วันที่</th>
                        <th className="text-center px-4 py-3 font-semibold text-midnight_text dark:text-white">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {articles.map(a => {
                        const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.draft;
                        const actions = getActions(a);
                        return (
                          <tr key={a.id} className="border-b border-border dark:border-dark_border hover:bg-section/50 dark:hover:bg-darkmode/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {a.cover_image ? (
                                  <img src={a.cover_image} alt="" className="w-12 h-8 object-cover rounded-lg shrink-0" />
                                ) : (
                                  <div className="w-12 h-8 bg-section dark:bg-darkmode rounded-lg flex items-center justify-center shrink-0">
                                    <Icon icon="mdi:image-off" width="14" className="text-grey/40" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-midnight_text dark:text-white truncate max-w-62.5">
                                    {a.is_pinned && <Icon icon="mdi:pin" width="14" className="inline text-red-500 mr-1" />}
                                    {a.is_featured && <Icon icon="mdi:star" width="14" className="inline text-amber-500 mr-1" />}
                                    {a.title}
                                  </p>
                                  <p className="text-xs text-grey dark:text-white/40 truncate">
                                    <span className={`inline-block mr-1.5 px-1.5 py-0 rounded text-[10px] font-semibold ${a.content_type === 'news' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                      {a.content_type === 'news' ? 'ข่าว' : 'บทความ'}
                                    </span>
                                    {a.author_name || '-'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-center hidden md:table-cell">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary whitespace-nowrap">
                                {a.category_name || '-'}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${sc.color}`}>
                                <Icon icon={sc.icon} width="12" />
                                {sc.label}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center hidden sm:table-cell">
                              <span className="text-xs text-grey dark:text-white/50">{(a.view_count || 0).toLocaleString()}</span>
                            </td>
                            <td className="px-2 py-3 text-center hidden lg:table-cell">
                              <span className="text-xs text-grey dark:text-white/50">{formatDate(a.published_at || a.created_at)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                <button onClick={() => goToEdit(a.id)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors cursor-pointer" title="แก้ไข">
                                  <Icon icon="mdi:pencil" width="16" />
                                </button>
                                {actions.map(act => (
                                  <button
                                    key={act.status}
                                    onClick={() => handleStatusChange(a.id, act.status, act.label)}
                                    className={`p-1.5 rounded-lg hover:bg-section dark:hover:bg-darkmode ${act.color} transition-colors cursor-pointer`}
                                    title={act.label}
                                  >
                                    <Icon icon={act.icon} width="16" />
                                  </button>
                                ))}
                                {hasRole('super_admin') && (
                                  <button onClick={() => handleDelete(a)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer" title="ลบ">
                                    <Icon icon="mdi:delete" width="16" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border dark:border-dark_border">
                  <p className="text-xs text-grey dark:text-white/40">หน้า {pagination.page} / {pagination.totalPages} (ทั้งหมด {pagination.total})</p>
                  <div className="flex gap-1">
                    <button onClick={() => loadArticles(pagination.page - 1)} disabled={pagination.page <= 1}
                      className="px-3 py-1.5 rounded-lg border border-border dark:border-dark_border text-sm disabled:opacity-30 hover:bg-section dark:hover:bg-darkmode cursor-pointer">
                      <Icon icon="mdi:chevron-left" width="18" />
                    </button>
                    <button onClick={() => loadArticles(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                      className="px-3 py-1.5 rounded-lg border border-border dark:border-dark_border text-sm disabled:opacity-30 hover:bg-section dark:hover:bg-darkmode cursor-pointer">
                      <Icon icon="mdi:chevron-right" width="18" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ====== TAB: Editor ====== */}
          {activeTab === 'editor' && (
            <div className="p-6">
              {!preview ? (
                <div className="space-y-5">
                  {/* Content Type Selector */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, content_type: 'article' })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all cursor-pointer ${
                        form.content_type === 'article'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border dark:border-dark_border text-grey dark:text-white/50 hover:border-primary/50'
                      }`}
                    >
                      <Icon icon="mdi:notebook-outline" width="20" />
                      บทความ (ความรู้ / วิเคราะห์)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, content_type: 'news' })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all cursor-pointer ${
                        form.content_type === 'news'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border dark:border-dark_border text-grey dark:text-white/50 hover:border-primary/50'
                      }`}
                    >
                      <Icon icon="mdi:bullhorn-outline" width="20" />
                      ข่าวสาร (รายงานเหตุการณ์)
                    </button>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-midnight_text dark:text-white mb-1">หัวข้อบทความ *</label>
                    <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="เช่น 5 เทคนิคดูแลผิวหลังเลเซอร์"
                      className="w-full px-4 py-3 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-primary/30 font-semibold"
                    />
                  </div>

                  {/* Row: Category + Tags */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-midnight_text dark:text-white mb-1">หมวดหมู่</label>
                      <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm cursor-pointer"
                      >
                        <option value="">เลือกหมวดหมู่</option>
                        {categories.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name_th}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-midnight_text dark:text-white mb-1">แท็ก (คั่นด้วยคอมมา)</label>
                      <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                        placeholder="เช่น skincare, เลเซอร์, ดูแลผิว"
                        className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  {/* Cover Image URL */}
                  <div>
                    <label className="block text-sm font-medium text-midnight_text dark:text-white mb-1">URL ภาพปก</label>
                    <input type="text" value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                      placeholder="https://example.com/cover.jpg"
                      className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {form.cover_image && (
                      <img src={form.cover_image} alt="Cover Preview" className="mt-2 max-w-[200px] h-auto rounded-lg border border-border" />
                    )}
                  </div>

                  {/* Excerpt */}
                  <div>
                    <label className="block text-sm font-medium text-midnight_text dark:text-white mb-1">เนื้อหาย่อ</label>
                    <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                      placeholder="สรุปเนื้อหาสั้นๆ สำหรับแสดงในหน้ารวมข่าว"
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-midnight_text dark:text-white mb-1">เนื้อหาบทความ * (รองรับ HTML)</label>
                    <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                      placeholder="เขียนเนื้อหาบทความ... รองรับ HTML เช่น <h2>, <p>, <img>, <ul>"
                      rows={12}
                      className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-mono"
                    />
                  </div>

                  {/* SEO Fields */}
                  <details className="group">
                    <summary className="flex items-center gap-2 text-sm font-medium text-grey dark:text-white/50 cursor-pointer hover:text-midnight_text dark:hover:text-white">
                      <Icon icon="mdi:search-web" width="18" />
                      ตั้งค่า SEO (ไม่บังคับ)
                      <Icon icon="mdi:chevron-down" width="18" className="group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-3 space-y-3 pl-1">
                      <input type="text" value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                        placeholder="SEO Title (ถ้าไม่ใส่จะใช้หัวข้อบทความ)"
                        className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <textarea value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                        placeholder="Meta Description"
                        rows={2}
                        className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                    </div>
                  </details>

                  {/* Schedule + Toggles */}
                  <div className="flex flex-wrap items-end gap-6">
                    <div>
                      <label className="block text-sm font-medium text-midnight_text dark:text-white mb-1">ตั้งเวลาเผยแพร่</label>
                      <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                        className="px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer pb-1">
                      <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                      <span className="text-sm text-midnight_text dark:text-white">⭐ ข่าวเด่น</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer pb-1">
                      <input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                      <span className="text-sm text-midnight_text dark:text-white">📌 ปักหมุด</span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border dark:border-dark_border">
                    <button onClick={() => handleSave(false)} disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-600 text-white font-semibold hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {saving ? <Icon icon="mdi:loading" width="18" className="animate-spin" /> : <Icon icon="mdi:content-save" width="18" />}
                      บันทึกแบบร่าง
                    </button>
                    <button onClick={() => handleSave(true)} disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Icon icon="mdi:send" width="18" />
                      บันทึก & ส่งตรวจสอบ
                    </button>
                    <button onClick={() => setPreview(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border dark:border-dark_border text-midnight_text dark:text-white font-semibold hover:bg-section dark:hover:bg-darkmode transition-colors cursor-pointer"
                    >
                      <Icon icon="mdi:eye" width="18" />
                      ตัวอย่าง
                    </button>
                  </div>
                </div>
              ) : (
                /* Preview Mode */
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-midnight_text dark:text-white flex items-center gap-2">
                      <Icon icon="mdi:eye" width="22" className="text-primary" />
                      ตัวอย่างบทความ
                    </h2>
                    <button onClick={() => setPreview(false)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border dark:border-dark_border text-midnight_text dark:text-white hover:bg-section dark:hover:bg-darkmode transition-colors cursor-pointer text-sm"
                    >
                      <Icon icon="mdi:pencil" width="16" />
                      กลับแก้ไข
                    </button>
                  </div>

                  {form.cover_image && (
                    <img src={form.cover_image} alt="Cover" className="w-full h-64 object-cover rounded-2xl mb-6" />
                  )}
                  <div className="mb-4">
                    {form.category_id && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-2">
                        {categories.find(c => c.id === parseInt(form.category_id))?.name_th || 'หมวดหมู่'}
                      </span>
                    )}
                    <h1 className="text-2xl sm:text-3xl font-bold text-midnight_text dark:text-white leading-snug">{form.title || 'ไม่มีหัวข้อ'}</h1>
                    {form.excerpt && (
                      <p className="text-grey dark:text-white/60 mt-2 text-base">{form.excerpt}</p>
                    )}
                  </div>
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-midnight_text dark:text-white/90"
                    dangerouslySetInnerHTML={{ __html: form.content || '<p class="text-grey italic">ยังไม่มีเนื้อหา</p>' }}
                  />
                  {form.tags && (
                    <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-border dark:border-dark_border">
                      {form.tags.split(',').map((t, i) => t.trim() && (
                        <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-section dark:bg-darkmode text-grey dark:text-white/60 border border-border dark:border-dark_border">
                          #{t.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ====== TAB: Categories ====== */}
          {activeTab === 'categories' && (
            <div className="p-6">
              {/* Create Category */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <input type="text" value={catForm.name_th} onChange={(e) => setCatForm({ ...catForm, name_th: e.target.value })}
                  placeholder="ชื่อหมวดหมู่ (ไทย)" className="flex-1 px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input type="text" value={catForm.name_en} onChange={(e) => setCatForm({ ...catForm, name_en: e.target.value })}
                  placeholder="Name (EN)" className="flex-1 px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input type="text" value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                  placeholder="Icon (mdi:xxx)" className="w-40 px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button onClick={handleCreateCategory}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-blue-700 cursor-pointer whitespace-nowrap"
                >
                  <Icon icon="mdi:plus" width="18" />
                  เพิ่ม
                </button>
              </div>

              {/* Categories List */}
              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border border-border dark:border-dark_border hover:bg-section/50 dark:hover:bg-darkmode/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon icon={cat.icon || 'mdi:folder'} width="20" className="text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-midnight_text dark:text-white text-sm">{cat.name_th}</p>
                        <p className="text-xs text-grey dark:text-white/40">{cat.slug} {cat.name_en && `• ${cat.name_en}`}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cat.is_active ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-500'}`}>
                        {cat.is_active ? 'เปิดใช้' : 'ปิด'}
                      </span>
                      {hasRole('super_admin') && (
                        <button onClick={() => handleDeleteCategory(cat)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 cursor-pointer">
                          <Icon icon="mdi:delete" width="16" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-center py-8 text-grey dark:text-white/40">ไม่มีหมวดหมู่</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsManagePage;
