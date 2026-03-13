import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth, ROLE_CONFIG } from '../context/AuthContext';
import { apiGetUsers, apiUpdateUserRole, apiToggleUserStatus, apiGetUserDetail, apiAdminUpdateUser } from '../services/api';

const VALID_ROLES = ['super_admin', 'doctor', 'nurse', 'reception', 'accountant', 'manager', 'patient'];

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [roleCounts, setRoleCounts] = useState({});
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (!hasRole('super_admin', 'manager')) { navigate('/dashboard'); return; }
    fetchUsers();
  }, [user, authLoading, filterRole]);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filterRole) params.role = filterRole;
      if (search) params.search = search;
      const result = await apiGetUsers(params);
      if (result.success) {
        setUsers(result.data.users);
        setPagination(result.data.pagination);
        setRoleCounts(result.data.roleCounts || {});
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleChangeRole = async (targetUser) => {
    const currentRole = targetUser.role || 'patient';
    const { value: newRole } = await Swal.fire({
      title: 'เปลี่ยน Role',
      html: `
        <p class="text-sm text-gray-500 mb-3">
          ${targetUser.first_name_th || targetUser.first_name_en || ''} ${targetUser.last_name_th || targetUser.last_name_en || ''}
        </p>
      `,
      input: 'select',
      inputOptions: VALID_ROLES.reduce((acc, r) => {
        const rc = ROLE_CONFIG[r];
        acc[r] = `${rc?.labelTh || r} (${r})`;
        return acc;
      }, {}),
      inputValue: currentRole,
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      inputValidator: (value) => {
        if (!value) return 'กรุณาเลือก Role';
      },
    });

    if (newRole && newRole !== currentRole) {
      try {
        const result = await apiUpdateUserRole(targetUser.id, newRole);
        if (result.success) {
          Swal.fire({
            title: 'สำเร็จ',
            text: result.message,
            icon: 'success',
            confirmButtonColor: '#3b82f6',
            timer: 2000,
            timerProgressBar: true,
          });
          fetchUsers(pagination.page);
        } else {
          Swal.fire({ title: 'เกิดข้อผิดพลาด', text: result.message, icon: 'error', confirmButtonColor: '#3b82f6' });
        }
      } catch {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเปลี่ยน Role ได้', icon: 'error', confirmButtonColor: '#3b82f6' });
      }
    }
  };

  const handleToggleStatus = async (targetUser) => {
    const action = targetUser.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน';
    const confirm = await Swal.fire({
      title: `${action}ผู้ใช้`,
      text: `ต้องการ${action}ผู้ใช้นี้หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: targetUser.is_active ? '#ef4444' : '#22c55e',
      cancelButtonColor: '#6b7280',
      confirmButtonText: action,
      cancelButtonText: 'ยกเลิก',
    });

    if (confirm.isConfirmed) {
      try {
        const result = await apiToggleUserStatus(
          targetUser.id,
          !targetUser.is_active
        );
        if (result.success) {
          Swal.fire({ title: 'สำเร็จ', text: result.message, icon: 'success', confirmButtonColor: '#3b82f6', timer: 2000, timerProgressBar: true });
          fetchUsers(pagination.page);
        }
      } catch {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', icon: 'error', confirmButtonColor: '#3b82f6' });
      }
    }
  };

  const getUserDisplayName = (u) => {
    if (u.user_type === 'thai') {
      return `${u.title_th || ''} ${u.first_name_th || ''} ${u.last_name_th || ''}`.trim();
    }
    return `${u.title_en || ''} ${u.first_name_en || ''} ${u.last_name_en || ''}`.trim();
  };

  const getUserId = (u) => {
    return u.user_type === 'thai' ? u.thai_id : u.passport;
  };

  // Open user detail modal
  const openUserDetail = async (u) => {
    setDetailLoading(true);
    setDetailOpen(true);
    setEditMode(false);
    document.body.style.overflow = 'hidden';
    try {
      const result = await apiGetUserDetail(u.id);
      if (result.success) {
        const userData = result.data.user;
        if (userData.birth_date) userData.birth_date = userData.birth_date.split('T')[0];
        setSelectedUser(userData);
        setEditForm({ ...userData });
      }
    } catch {
      Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้', icon: 'error', confirmButtonColor: '#3b82f6' });
      closeDetail();
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedUser(null);
    setEditForm(null);
    setEditMode(false);
    document.body.style.overflow = '';
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveUserEdit = async () => {
    setSaving(true);
    try {
      const result = await apiAdminUpdateUser(editForm.id, editForm);
      if (result.success) {
        const updated = result.data.user;
        if (updated.birth_date) updated.birth_date = updated.birth_date.split('T')[0];
        setSelectedUser(updated);
        setEditForm({ ...updated });
        setEditMode(false);
        fetchUsers(pagination.page);
        Swal.fire({ title: 'บันทึกสำเร็จ', icon: 'success', confirmButtonColor: '#3b82f6', timer: 1500, timerProgressBar: true });
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: result.message, icon: 'error', confirmButtonColor: '#3b82f6' });
      }
    } catch {
      Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกได้', icon: 'error', confirmButtonColor: '#3b82f6' });
    } finally {
      setSaving(false);
    }
  };

  // Title options based on role
  const getTitleOptions = (role, type) => {
    if (type === 'thai') {
      if (role === 'doctor') return ['นพ.', 'พญ.', 'Dr.'];
      return ['นาย', 'นาง', 'นางสาว'];
    } else {
      if (role === 'doctor') return ['Dr.'];
      return ['Mr.', 'Mrs.', 'Ms.'];
    }
  };

  return (
    <div className="min-h-screen bg-section dark:bg-darkmode pt-32 pb-16 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-midnight_text dark:text-white flex items-center gap-2">
              <Icon icon="mdi:account-group" width="28" className="text-primary" />
              จัดการผู้ใช้งาน
            </h1>
            <p className="text-sm text-grey dark:text-white/50 mt-1">
              ทั้งหมด {pagination.total} คน
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border dark:border-dark_border text-midnight_text dark:text-white text-sm font-medium hover:bg-section dark:hover:bg-darkmode transition-colors cursor-pointer"
          >
            <Icon icon="mdi:arrow-left" width="18" />
            กลับ Dashboard
          </button>
        </div>

        {/* Role filter chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilterRole('')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              !filterRole
                ? 'bg-primary text-white'
                : 'bg-white dark:bg-darklight text-grey dark:text-white/60 border border-border dark:border-dark_border hover:bg-primary/5'
            }`}
          >
            ทั้งหมด ({Object.values(roleCounts).reduce((a, b) => a + b, 0) || pagination.total})
          </button>
          {VALID_ROLES.map((r) => {
            const rc = ROLE_CONFIG[r];
            return (
              <button
                key={r}
                onClick={() => setFilterRole(r === filterRole ? '' : r)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  filterRole === r
                    ? `${rc.bgColor} ${rc.textColor} border ${rc.borderColor}`
                    : 'bg-white dark:bg-darklight text-grey dark:text-white/60 border border-border dark:border-dark_border hover:bg-primary/5'
                }`}
              >
                <Icon icon={rc.icon} width="14" />
                {rc.labelTh} ({roleCounts[r] || 0})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative max-w-md">
            <Icon icon="mdi:magnify" width="20" className="absolute left-3 top-1/2 -translate-y-1/2 text-grey dark:text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, อีเมล, เลขบัตร..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-darklight border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white placeholder:text-grey/50 dark:placeholder:text-white/30 focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-white text-xs rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              ค้นหา
            </button>
          </div>
        </form>

        {/* Users Table */}
        <div className="bg-white dark:bg-darklight rounded-2xl shadow-deatail_shadow border border-border dark:border-dark_border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Icon icon="mdi:loading" width="36" className="text-primary animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20">
              <Icon icon="mdi:account-search" width="48" className="text-grey/30 mx-auto mb-3" />
              <p className="text-grey dark:text-white/50">ไม่พบผู้ใช้งาน</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-section dark:bg-darkmode/50 border-b border-border dark:border-dark_border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-grey dark:text-white/50 uppercase">ผู้ใช้</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-grey dark:text-white/50 uppercase hidden sm:table-cell">อีเมล</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-grey dark:text-white/50 uppercase">Role</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-grey dark:text-white/50 uppercase">สถานะ</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-grey dark:text-white/50 uppercase">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-dark_border">
                  {users.map((u, i) => {
                    const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.patient;
                    return (
                      <tr key={`${u.user_type}-${u.id}`} onClick={() => openUserDetail(u)} className="hover:bg-section/50 dark:hover:bg-darkmode/30 transition-colors cursor-pointer">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full ${rc.bgColor} flex items-center justify-center shrink-0`}>
                              <Icon icon={rc.icon} width="18" className={rc.textColor} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-midnight_text dark:text-white truncate">
                                {getUserDisplayName(u)}
                              </p>
                              <p className="text-xs text-grey dark:text-white/40 truncate">
                                {getUserId(u)} • {u.user_type === 'thai' ? 'คนไทย' : 'Foreign'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-grey dark:text-white/60 hidden sm:table-cell truncate max-w-[200px]">
                          {u.email}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${rc.bgColor} ${rc.textColor}`}>
                            <Icon icon={rc.icon} width="12" />
                            {rc.labelTh}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {hasRole('super_admin') && (
                              <>
                                <button
                                  onClick={() => handleChangeRole(u)}
                                  title="เปลี่ยน Role"
                                  className="w-8 h-8 rounded-lg hover:bg-primary/10 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <Icon icon="mdi:shield-edit" width="18" className="text-primary" />
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  title={u.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                                    u.is_active
                                      ? 'hover:bg-red-500/10 text-red-400 hover:text-red-500'
                                      : 'hover:bg-green-500/10 text-green-400 hover:text-green-500'
                                  }`}
                                >
                                  <Icon icon={u.is_active ? 'mdi:account-off' : 'mdi:account-check'} width="18" />
                                </button>
                              </>
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
            <div className="flex items-center justify-center gap-2 px-4 py-4 border-t border-border dark:border-dark_border">
              <button
                onClick={() => fetchUsers(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg text-sm border border-border dark:border-dark_border disabled:opacity-30 hover:bg-section dark:hover:bg-darkmode transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Icon icon="mdi:chevron-left" width="18" />
              </button>
              <span className="text-sm text-grey dark:text-white/50">
                หน้า {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchUsers(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg text-sm border border-border dark:border-dark_border disabled:opacity-30 hover:bg-section dark:hover:bg-darkmode transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Icon icon="mdi:chevron-right" width="18" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== User Detail / Edit Modal ===== */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeDetail} />
          <div className="relative bg-white dark:bg-darklight rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-dark_border shrink-0">
              <h2 className="text-lg font-bold text-midnight_text dark:text-white flex items-center gap-2">
                <Icon icon={editMode ? 'mdi:account-edit' : 'mdi:account-details'} width="22" className="text-primary" />
                {editMode ? 'แก้ไขข้อมูลผู้ใช้' : 'รายละเอียดผู้ใช้'}
              </h2>
              <button onClick={closeDetail} className="w-8 h-8 rounded-lg hover:bg-section dark:hover:bg-darkmode flex items-center justify-center transition-colors cursor-pointer">
                <Icon icon="mdi:close" width="20" className="text-grey dark:text-white/50" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {detailLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Icon icon="mdi:loading" width="36" className="text-primary animate-spin" />
                </div>
              ) : selectedUser && !editMode ? (
                /* ===== View Mode ===== */
                <div className="space-y-4">
                  {/* User avatar & name */}
                  <div className="text-center">
                    {(() => {
                      const rc = ROLE_CONFIG[selectedUser.role] || ROLE_CONFIG.patient;
                      return (
                        <>
                          <div className={`w-16 h-16 mx-auto rounded-full ${rc.bgColor} flex items-center justify-center mb-3`}>
                            <Icon icon={rc.icon} width="32" className={rc.textColor} />
                          </div>
                          <h3 className="text-xl font-bold text-midnight_text dark:text-white">
                            {getUserDisplayName(selectedUser)}
                          </h3>
                          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                            <span className="inline-block px-3 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {selectedUser.user_type === 'thai' ? 'คนไทย' : 'Foreign'}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold ${rc.bgColor} ${rc.textColor}`}>
                              <Icon icon={rc.icon} width="13" />
                              {rc.labelTh}
                            </span>
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${selectedUser.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {[
                      { icon: 'mdi:email', label: 'อีเมล', value: selectedUser.email },
                      { icon: 'mdi:phone', label: 'โทรศัพท์', value: selectedUser.phone || '-' },
                      {
                        icon: 'mdi:card-account-details',
                        label: selectedUser.user_type === 'thai' ? 'เลขบัตรประชาชน' : 'Passport',
                        value: selectedUser.user_type === 'thai' ? selectedUser.thai_id : selectedUser.passport,
                      },
                      { icon: 'mdi:cake-variant', label: 'วันเกิด', value: selectedUser.birth_date || '-' },
                      { icon: 'mdi:water', label: 'กรุ๊ปเลือด', value: selectedUser.blood_type || '-' },
                      { icon: 'mdi:gender-male-female', label: 'เพศ', value: selectedUser.gender || '-' },
                      { icon: 'mdi:alert-circle', label: 'ประวัติแพ้ยา', value: selectedUser.allergies || '-' },
                      { icon: 'mdi:calendar-clock', label: 'สมัครเมื่อ', value: selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('th-TH') : '-' },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 p-3 rounded-xl bg-section dark:bg-darkmode/50 ${
                          i === 6 ? 'col-span-2' : ''
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon icon={item.icon} width="14" className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-grey dark:text-white/40 leading-none mb-1">{item.label}</p>
                          <p className="text-sm font-medium text-midnight_text dark:text-white break-all">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : editForm ? (
                /* ===== Edit Mode ===== */
                <div className="space-y-3.5">
                  {editForm.user_type === 'thai' ? (
                    <div className="grid grid-cols-6 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-midnight_text dark:text-white mb-1">คำนำหน้า</label>
                        <select name="title_th" value={editForm.title_th || ''} onChange={handleEditChange}
                          className="w-full px-3 py-2.5 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
                          <option value="" disabled>-- เลือก --</option>
                          {getTitleOptions(editForm.role, 'thai').map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-midnight_text dark:text-white mb-1">ชื่อ</label>
                        <input type="text" name="first_name_th" value={editForm.first_name_th || ''} onChange={handleEditChange}
                          className="w-full px-3 py-2.5 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-midnight_text dark:text-white mb-1">นามสกุล</label>
                        <input type="text" name="last_name_th" value={editForm.last_name_th || ''} onChange={handleEditChange}
                          className="w-full px-3 py-2.5 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-6 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-midnight_text dark:text-white mb-1">Title</label>
                          <select name="title_en" value={editForm.title_en || ''} onChange={handleEditChange}
                            className="w-full px-3 py-2.5 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
                            <option value="" disabled>-- Select --</option>
                            {getTitleOptions(editForm.role, 'en').map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-midnight_text dark:text-white mb-1">First Name</label>
                          <input type="text" name="first_name_en" value={editForm.first_name_en || ''} onChange={handleEditChange}
                            className="w-full px-3 py-2.5 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-midnight_text dark:text-white mb-1">Last Name</label>
                          <input type="text" name="last_name_en" value={editForm.last_name_en || ''} onChange={handleEditChange}
                            className="w-full px-3 py-2.5 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-midnight_text dark:text-white mb-1">Nationality</label>
                        <input type="text" name="nationality" value={editForm.nationality || ''} onChange={handleEditChange}
                          className="w-full px-3 py-2.5 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                      </div>
                    </>
                  )}

                  {/* Birth Date */}
                  <div>
                    <label className="block text-xs font-semibold text-midnight_text dark:text-white mb-1">วันเกิด</label>
                    <DatePicker
                      selected={editForm.birth_date ? new Date(editForm.birth_date + 'T00:00:00') : null}
                      onChange={(date) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, '0');
                          const d = String(date.getDate()).padStart(2, '0');
                          setEditForm((prev) => ({ ...prev, birth_date: `${y}-${m}-${d}` }));
                        } else {
                          setEditForm((prev) => ({ ...prev, birth_date: '' }));
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      maxDate={new Date()}
                      placeholderText="วว/ดด/ปปปป"
                      className="w-full px-3 py-2.5 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      wrapperClassName="w-full"
                      popperClassName="datepicker-popper"
                    />
                  </div>

                  {/* Blood & Phone */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-midnight_text dark:text-white mb-1">กรุ๊ปเลือด</label>
                      <select name="blood_type" value={editForm.blood_type || ''} onChange={handleEditChange}
                        className="w-full px-3 py-2.5 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
                        <option value="">-- เลือก --</option>
                        {['A', 'B', 'AB', 'O'].map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-midnight_text dark:text-white mb-1">โทรศัพท์</label>
                      <input type="text" name="phone" value={editForm.phone || ''} onChange={handleEditChange}
                        className="w-full px-3 py-2.5 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                    </div>
                  </div>

                  {/* Allergies */}
                  <div>
                    <label className="block text-xs font-semibold text-midnight_text dark:text-white mb-1">ประวัติแพ้ยา</label>
                    <input type="text" name="allergies" value={editForm.allergies || ''} onChange={handleEditChange}
                      placeholder="เช่น แพ้เพนนิซิลิน"
                      className="w-full px-3 py-2.5 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white placeholder:text-grey/50 focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            {!detailLoading && selectedUser && (
              <div className="flex items-center gap-3 px-6 py-4 border-t border-border dark:border-dark_border shrink-0">
                {editMode ? (
                  <>
                    <button onClick={() => { setEditMode(false); setEditForm({ ...selectedUser }); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border dark:border-dark_border text-midnight_text dark:text-white font-semibold text-sm hover:bg-section dark:hover:bg-darkmode transition-colors cursor-pointer">
                      ยกเลิก
                    </button>
                    <button onClick={saveUserEdit} disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50">
                      {saving ? <Icon icon="mdi:loading" width="18" className="animate-spin" /> : <Icon icon="mdi:content-save" width="18" />}
                      บันทึกข้อมูล
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={closeDetail}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border dark:border-dark_border text-midnight_text dark:text-white font-semibold text-sm hover:bg-section dark:hover:bg-darkmode transition-colors cursor-pointer">
                      ปิด
                    </button>
                    {hasRole('super_admin') && (
                      <button onClick={() => setEditMode(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-blue-700 transition-colors cursor-pointer">
                        <Icon icon="mdi:pencil" width="18" />
                        แก้ไขข้อมูล
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
