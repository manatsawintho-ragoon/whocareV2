import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { apiGetAdminServices, apiCreateService, apiUpdateService, apiDeleteService } from '../services/api';

const CATEGORIES = [
  { value: 'general', label: 'ทั่วไป' },
  { value: 'checkup', label: 'ตรวจสุขภาพ' },
  { value: 'vaccine', label: 'วัคซีน' },
  { value: 'screening', label: 'คัดกรอง' },
  { value: 'beauty', label: 'ความงาม' },
  { value: 'dental', label: 'ทันตกรรม' },
  { value: 'rehab', label: 'กายภาพบำบัด' },
  { value: 'other', label: 'อื่นๆ' },
];

const emptyForm = {
  name: '',
  description: '',
  image_url: '',
  original_price: '',
  price: '',
  category: 'general',
  branch: '',
  is_recommended: false,
  is_promotion: false,
  is_active: true,
  sort_order: 0,
};

const ManageServicesPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, hasRole } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (!hasRole('super_admin', 'manager')) { navigate('/dashboard'); return; }
    fetchServices();
  }, [user, authLoading, filterCategory]);

  const fetchServices = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filterCategory) params.category = filterCategory;
      if (search) params.search = search;
      const result = await apiGetAdminServices(params);
      if (result.success) {
        setServices(result.data.services);
        setPagination(result.data.pagination);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchServices(1);
  };

  const openCreate = () => {
    setEditingService(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (service) => {
    setEditingService(service);
    setForm({
      name: service.name || '',
      description: service.description || '',
      image_url: service.image_url || '',
      original_price: service.original_price || '',
      price: service.price || '',
      category: service.category || 'general',
      branch: service.branch || '',
      is_recommended: service.is_recommended || false,
      is_promotion: service.is_promotion || false,
      is_active: service.is_active !== false,
      sort_order: service.sort_order || 0,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูล', text: 'ชื่อบริการและราคาจำเป็นต้องกรอก', confirmButtonColor: '#3b82f6' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price) || 0,
        original_price: parseFloat(form.original_price) || 0,
        sort_order: parseInt(form.sort_order) || 0,
      };

      let result;
      if (editingService) {
        result = await apiUpdateService(editingService.id, payload);
      } else {
        result = await apiCreateService(payload);
      }

      if (result.success) {
        Swal.fire({ icon: 'success', title: result.message || 'สำเร็จ', timer: 1500, showConfirmButton: false });
        setModalOpen(false);
        fetchServices(pagination.page);
      } else {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: result.message, confirmButtonColor: '#3b82f6' });
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกได้', confirmButtonColor: '#3b82f6' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (service) => {
    const confirm = await Swal.fire({
      title: 'ลบบริการ',
      html: `ต้องการลบ <strong>${service.name}</strong> หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    });

    if (confirm.isConfirmed) {
      const result = await apiDeleteService(service.id);
      if (result.success) {
        Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1500, showConfirmButton: false });
        fetchServices(pagination.page);
      } else {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: result.message, confirmButtonColor: '#3b82f6' });
      }
    }
  };

  const handleToggleActive = async (service) => {
    const result = await apiUpdateService(service.id, { is_active: !service.is_active });
    if (result.success) {
      fetchServices(pagination.page);
    }
  };

  const formatPrice = (val) => {
    const num = parseFloat(val);
    if (!num && num !== 0) return '-';
    return num.toLocaleString('th-TH');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-section dark:bg-darkmode">
        <Icon icon="mdi:loading" width="40" className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-section dark:bg-darkmode pt-32 pb-16 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-midnight_text dark:text-white flex items-center gap-2">
              <Icon icon="mdi:medical-bag" width="28" className="text-primary" />
              จัดการบริการ
            </h1>
            <p className="text-sm text-grey dark:text-white/50 mt-1">เพิ่ม แก้ไข ลบ บริการทั้งหมด ({pagination.total} รายการ)</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Icon icon="mdi:plus" width="20" />
            เพิ่มบริการ
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-darklight rounded-2xl shadow-deatail_shadow border border-border dark:border-dark_border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Icon icon="mdi:magnify" width="20" className="absolute left-3 top-1/2 -translate-y-1/2 text-grey" />
                <input
                  type="text"
                  placeholder="ค้นหาบริการ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button type="submit" className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-blue-700 cursor-pointer">
                <Icon icon="mdi:magnify" width="20" />
              </button>
            </form>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm cursor-pointer"
            >
              <option value="">หมวดหมู่ทั้งหมด</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-darklight rounded-2xl shadow-deatail_shadow border border-border dark:border-dark_border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-section dark:bg-darkmode border-b border-border dark:border-dark_border">
                  <th className="text-left px-4 py-3 font-semibold text-midnight_text dark:text-white">รูป</th>
                  <th className="text-left px-4 py-3 font-semibold text-midnight_text dark:text-white">ชื่อบริการ</th>
                  <th className="text-left px-4 py-3 font-semibold text-midnight_text dark:text-white hidden md:table-cell">หมวดหมู่</th>
                  <th className="text-left px-4 py-3 font-semibold text-midnight_text dark:text-white hidden sm:table-cell">สาขา</th>
                  <th className="text-right px-4 py-3 font-semibold text-midnight_text dark:text-white">ราคา</th>
                  <th className="text-center px-4 py-3 font-semibold text-midnight_text dark:text-white hidden lg:table-cell">แนะนำ</th>
                  <th className="text-center px-4 py-3 font-semibold text-midnight_text dark:text-white hidden lg:table-cell">โปรโมชั่น</th>
                  <th className="text-center px-4 py-3 font-semibold text-midnight_text dark:text-white">สถานะ</th>
                  <th className="text-center px-4 py-3 font-semibold text-midnight_text dark:text-white">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-grey dark:text-white/40">
                      <Icon icon="mdi:package-variant" width="48" className="mx-auto mb-2 opacity-30" />
                      <p>ไม่พบบริการ</p>
                    </td>
                  </tr>
                ) : (
                  services.map((s) => (
                    <tr key={s.id} className="border-b border-border dark:border-dark_border hover:bg-section/50 dark:hover:bg-darkmode/50 transition-colors">
                      <td className="px-4 py-3">
                        {s.image_url ? (
                          <img src={s.image_url} alt={s.name} className="w-14 h-14 object-cover rounded-lg" />
                        ) : (
                          <div className="w-14 h-14 bg-section dark:bg-darkmode rounded-lg flex items-center justify-center">
                            <Icon icon="mdi:image-off" width="20" className="text-grey/40" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-midnight_text dark:text-white">{s.name}</p>
                        {s.description && (
                          <p className="text-xs text-grey dark:text-white/40 mt-0.5 line-clamp-1">{s.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {CATEGORIES.find((c) => c.value === s.category)?.label || s.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-grey dark:text-white/60 hidden sm:table-cell">{s.branch || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        {s.original_price > 0 && s.original_price > s.price && (
                          <span className="text-xs text-grey line-through mr-1">{formatPrice(s.original_price)}</span>
                        )}
                        <span className="font-bold text-primary">{formatPrice(s.price)} ฿</span>
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        {s.is_recommended ? (
                          <Icon icon="mdi:check-circle" width="20" className="text-green-500 mx-auto" />
                        ) : (
                          <Icon icon="mdi:close-circle" width="20" className="text-grey/30 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        {s.is_promotion ? (
                          <Icon icon="mdi:tag-check" width="20" className="text-amber-500 mx-auto" />
                        ) : (
                          <Icon icon="mdi:tag-off" width="20" className="text-grey/30 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(s)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                            s.is_active
                              ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                              : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                          }`}
                        >
                          <Icon icon={s.is_active ? 'mdi:check-circle' : 'mdi:close-circle'} width="14" />
                          {s.is_active ? 'เปิด' : 'ปิด'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(s)}
                            className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors cursor-pointer"
                            title="แก้ไข"
                          >
                            <Icon icon="mdi:pencil" width="18" />
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer"
                            title="ลบ"
                          >
                            <Icon icon="mdi:delete" width="18" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border dark:border-dark_border">
              <p className="text-xs text-grey dark:text-white/40">
                หน้า {pagination.page} / {pagination.totalPages} (ทั้งหมด {pagination.total} รายการ)
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => fetchServices(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-border dark:border-dark_border text-sm disabled:opacity-30 hover:bg-section dark:hover:bg-darkmode cursor-pointer"
                >
                  <Icon icon="mdi:chevron-left" width="18" />
                </button>
                <button
                  onClick={() => fetchServices(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border dark:border-dark_border text-sm disabled:opacity-30 hover:bg-section dark:hover:bg-darkmode cursor-pointer"
                >
                  <Icon icon="mdi:chevron-right" width="18" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-darklight rounded-2xl shadow-2xl border border-border dark:border-dark_border w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-dark_border">
                <h2 className="text-lg font-bold text-midnight_text dark:text-white flex items-center gap-2">
                  <Icon icon={editingService ? 'mdi:pencil' : 'mdi:plus-circle'} width="22" className="text-primary" />
                  {editingService ? 'แก้ไขบริการ' : 'เพิ่มบริการใหม่'}
                </h2>
                <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-section dark:hover:bg-darkmode cursor-pointer">
                  <Icon icon="mdi:close" width="22" className="text-grey" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-midnight_text dark:text-white mb-1">ชื่อบริการ *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="เช่น โปรแกรมตรวจสุขภาพหัวใจ"
                    className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-midnight_text dark:text-white mb-1">รายละเอียด</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="อธิบายรายละเอียดของบริการ"
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium text-midnight_text dark:text-white mb-1">URL รูปภาพ</label>
                  <input
                    type="text"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {form.image_url && (
                    <img src={form.image_url} alt="Preview" className="mt-2 w-32 h-24 object-cover rounded-lg border border-border" />
                  )}
                </div>

                {/* Price row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-midnight_text dark:text-white mb-1">ราคาเดิม (THB)</label>
                    <input
                      type="number"
                      value={form.original_price}
                      onChange={(e) => setForm({ ...form, original_price: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-midnight_text dark:text-white mb-1">ราคาขาย (THB) *</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                {/* Category & Branch */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-midnight_text dark:text-white mb-1">หมวดหมู่</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm cursor-pointer"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-midnight_text dark:text-white mb-1">สาขา</label>
                    <input
                      type="text"
                      value={form.branch}
                      onChange={(e) => setForm({ ...form, branch: e.target.value })}
                      placeholder="เช่น พญาไท 1"
                      className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                {/* Sort order */}
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-midnight_text dark:text-white mb-1">ลำดับการแสดง</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_recommended}
                      onChange={(e) => setForm({ ...form, is_recommended: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="text-sm text-midnight_text dark:text-white">แนะนำบริการ</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_promotion}
                      onChange={(e) => setForm({ ...form, is_promotion: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="text-sm text-midnight_text dark:text-white">โปรโมชั่น</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="text-sm text-midnight_text dark:text-white">เปิดใช้งาน</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border dark:border-dark_border">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border dark:border-dark_border text-midnight_text dark:text-white hover:bg-section dark:hover:bg-darkmode transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <Icon icon="mdi:loading" width="18" className="animate-spin" />
                  ) : (
                    <Icon icon="mdi:check" width="18" />
                  )}
                  {editingService ? 'บันทึก' : 'เพิ่มบริการ'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ManageServicesPage;
