import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth, ROLE_CONFIG } from '../context/AuthContext';
import { apiGetProfile, apiUpdateProfile } from '../services/api';
import { COUNTRIES } from '../data/countries';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, updateUser, getUserRole, getRoleConfig } = useAuth();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (!form) {
      fetchProfile();
    }
  }, [user, authLoading]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const result = await apiGetProfile();
      if (result.success) {
        const u = result.data.user;
        if (u.birth_date) {
          u.birth_date = u.birth_date.split('T')[0];
        }
        setForm(u);
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: result.message, icon: 'error', confirmButtonColor: '#3b82f6' });
      }
    } catch {
      Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถโหลดข้อมูลได้', icon: 'error', confirmButtonColor: '#3b82f6' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Valid titles per role
  const doctorTitlesTh = ['นพ.', 'พญ.', 'Dr.'];
  const normalTitlesTh = ['นาย', 'นาง', 'นางสาว'];
  const doctorTitlesEn = ['Dr.'];
  const normalTitlesEn = ['Mr.', 'Mrs.', 'Ms.'];

  const openEditModal = () => {
    // Auto-correct title if it doesn't match current role's valid options
    const isDoctor = getUserRole() === 'doctor';
    const validTh = isDoctor ? doctorTitlesTh : normalTitlesTh;
    const validEn = isDoctor ? doctorTitlesEn : normalTitlesEn;

    setForm((prev) => ({
      ...prev,
      title_th: validTh.includes(prev.title_th) ? prev.title_th : '',
      title_en: validEn.includes(prev.title_en) ? prev.title_en : '',
    }));

    setEditOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeEditModal = () => {
    setEditOpen(false);
    document.body.style.overflow = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isThai) {
      if (!form.first_name_th || !form.last_name_th) {
        Swal.fire({ title: 'กรอกข้อมูลไม่ครบ', text: 'กรุณากรอกชื่อและนามสกุล', icon: 'warning', confirmButtonColor: '#3b82f6' });
        return;
      }
    } else {
      if (!form.first_name_en || !form.last_name_en) {
        Swal.fire({ title: 'กรอกข้อมูลไม่ครบ', text: 'กรุณากรอก First Name และ Last Name', icon: 'warning', confirmButtonColor: '#3b82f6' });
        return;
      }
    }

    const confirm = await Swal.fire({
      title: 'ยืนยันการแก้ไข',
      text: 'คุณต้องการบันทึกข้อมูลที่แก้ไขหรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
    });
    if (!confirm.isConfirmed) return;

    setSaving(true);
    try {
      const result = await apiUpdateProfile(form);
      if (result.success) {
        const updatedUser = result.data.user;
        if (updatedUser.birth_date) {
          updatedUser.birth_date = updatedUser.birth_date.split('T')[0];
        }
        setForm(updatedUser);
        updateUser(updatedUser);
        closeEditModal();
        await Swal.fire({
          title: 'บันทึกสำเร็จ!',
          text: 'ข้อมูลโปรไฟล์ถูกอัปเดตเรียบร้อยแล้ว',
          icon: 'success',
          confirmButtonColor: '#3b82f6',
          timer: 2000,
          timerProgressBar: true,
        });
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: result.message, icon: 'error', confirmButtonColor: '#3b82f6' });
      }
    } catch {
      Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกข้อมูลได้', icon: 'error', confirmButtonColor: '#3b82f6' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading || !form || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-section dark:bg-darkmode">
        <div className="flex flex-col items-center gap-3">
          <Icon icon="mdi:loading" width="40" className="text-primary animate-spin" />
          <p className="text-grey dark:text-white/50">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  const isThai = user.user_type === 'thai';

  const displayName = isThai
    ? `${form.title_th || ''} ${form.first_name_th || ''} ${form.last_name_th || ''}`.trim()
    : `${form.title_en || ''} ${form.first_name_en || ''} ${form.last_name_en || ''}`.trim();

  const infoItems = [
    {
      icon: 'mdi:card-account-details',
      label: isThai ? 'เลขบัตรประชาชน' : 'Passport',
      value: isThai ? (form.thai_id || '-') : (form.passport || '-'),
    },
    { icon: 'mdi:email', label: 'อีเมล', value: form.email || '-' },
    { icon: 'mdi:phone', label: 'โทรศัพท์', value: form.phone || '-' },
    { icon: 'mdi:cake-variant', label: 'วันเกิด', value: form.birth_date || '-' },
    { icon: 'mdi:water', label: 'กรุ๊ปเลือด', value: form.blood_type || '-' },
    { icon: 'mdi:alert-circle', label: 'ประวัติแพ้ยา', value: form.allergies || '-' },
  ];

  if (!isThai && form.nationality) {
    infoItems.splice(3, 0, { icon: 'mdi:flag', label: 'Nationality', value: form.nationality });
  }

  const inputClass =
    'w-full px-3 py-2.5 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-lg text-sm text-midnight_text dark:text-white placeholder:text-grey/50 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';
  const labelClass = 'block text-xs font-semibold text-midnight_text dark:text-white mb-1';

  return (
    <div className="min-h-screen bg-section dark:bg-darkmode pt-32 pb-16 px-4">
      <div className="container mx-auto max-w-lg">
        {/* Profile Card */}
        <div className="bg-white dark:bg-darklight rounded-2xl shadow-deatail_shadow border border-border dark:border-dark_border overflow-hidden">
          {/* Top banner */}
          <div className="h-24 bg-linear-to-r from-primary to-blue-400 relative">
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
              <div className="w-20 h-20 rounded-full bg-white dark:bg-darklight border-4 border-white dark:border-darklight shadow-lg flex items-center justify-center">
                <Icon icon="mdi:account" width="40" className="text-primary" />
              </div>
            </div>
          </div>

          {/* Name & type */}
          <div className="text-center pt-14 pb-4 px-6">
            <h1 className="text-xl font-bold text-midnight_text dark:text-white">{displayName}</h1>
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              <span className="inline-block px-3 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {isThai ? 'บัญชีคนไทย' : 'Foreign Account'}
              </span>
              {user.role && (
                <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-medium ${getRoleConfig().bgColor} ${getRoleConfig().textColor}`}>
                  <Icon icon={getRoleConfig().icon} width="13" />
                  {getRoleConfig().labelTh}
                </span>
              )}
            </div>
          </div>

          {/* Info grid */}
          <div className="px-6 pb-6">
            <div className="grid grid-cols-2 gap-3">
              {infoItems.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 p-3 rounded-xl bg-section dark:bg-darkmode/50 ${
                    i === infoItems.length - 1 && infoItems.length % 2 !== 0 ? 'col-span-2' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon icon={item.icon} width="16" className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-grey dark:text-white/40 leading-none mb-1">{item.label}</p>
                    <p className="text-sm font-medium text-midnight_text dark:text-white truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => navigate('/')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border dark:border-dark_border text-midnight_text dark:text-white font-semibold text-sm hover:bg-section dark:hover:bg-darkmode active:scale-[0.98] transition-all cursor-pointer"
              >
                <Icon icon="mdi:arrow-left" width="18" />
                กลับหน้าหลัก
              </button>
              <button
                onClick={openEditModal}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-primary/25 active:scale-[0.98] cursor-pointer"
              >
                <Icon icon="mdi:pencil" width="18" />
                แก้ไขโปรไฟล์
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Edit Modal ===== */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeEditModal} />

          {/* Modal */}
          <div className="relative w-full max-w-lg bg-white dark:bg-darklight rounded-2xl shadow-2xl border border-border dark:border-dark_border animate-fadeIn max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-dark_border shrink-0">
              <h2 className="text-lg font-bold text-midnight_text dark:text-white flex items-center gap-2">
                <Icon icon="mdi:account-edit" width="22" className="text-primary" />
                แก้ไขโปรไฟล์
              </h2>
              <button onClick={closeEditModal} className="w-8 h-8 rounded-lg hover:bg-section dark:hover:bg-darkmode flex items-center justify-center transition-colors cursor-pointer">
                <Icon icon="mdi:close" width="20" className="text-grey dark:text-white/50" />
              </button>
            </div>

            {/* Modal body - scrollable */}
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-4 space-y-3.5">
              {/* Name */}
              {isThai ? (
                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-2">
                    <label className={labelClass}>คำนำหน้า</label>
                    <select name="title_th" value={form.title_th || ''} onChange={handleChange} className={inputClass}>
                      <option value="" disabled>-- เลือก --</option>
                      {getUserRole() === 'doctor' ? (
                        <>
                          <option value="นพ.">นพ.</option>
                          <option value="พญ.">พญ.</option>
                          <option value="Dr.">Dr.</option>
                        </>
                      ) : (
                        <>
                          <option value="นาย">นาย</option>
                          <option value="นาง">นาง</option>
                          <option value="นางสาว">นางสาว</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>ชื่อ</label>
                    <input type="text" name="first_name_th" value={form.first_name_th || ''} onChange={handleChange} className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>นามสกุล</label>
                    <input type="text" name="last_name_th" value={form.last_name_th || ''} onChange={handleChange} className={inputClass} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-6 gap-3">
                    <div className="col-span-2">
                      <label className={labelClass}>Title</label>
                      <select name="title_en" value={form.title_en || ''} onChange={handleChange} className={inputClass}>
                        <option value="" disabled>-- Select --</option>
                        {getUserRole() === 'doctor' ? (
                          <option value="Dr.">Dr.</option>
                        ) : (
                          <>
                            <option value="Mr.">Mr.</option>
                            <option value="Mrs.">Mrs.</option>
                            <option value="Ms.">Ms.</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>First Name</label>
                      <input type="text" name="first_name_en" value={form.first_name_en || ''} onChange={handleChange} className={inputClass} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Last Name</label>
                      <input type="text" name="last_name_en" value={form.last_name_en || ''} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Nationality</label>
                    <select name="nationality" value={form.nationality || ''} onChange={handleChange} className={inputClass}>
                      <option value="">-- Select --</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Date */}
              <div>
                <label className={labelClass}>วันเกิด</label>
                <DatePicker
                  selected={form.birth_date ? new Date(form.birth_date + 'T00:00:00') : null}
                  onChange={(date) => {
                    if (date) {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const d = String(date.getDate()).padStart(2, '0');
                      setForm((prev) => ({ ...prev, birth_date: `${y}-${m}-${d}` }));
                    } else {
                      setForm((prev) => ({ ...prev, birth_date: '' }));
                    }
                  }}
                  dateFormat="dd/MM/yyyy"
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  maxDate={new Date()}
                  placeholderText="วว/ดด/ปปปป"
                  className={inputClass}
                  wrapperClassName="w-full"
                  popperClassName="datepicker-popper"
                />
              </div>

              {/* Blood & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>กรุ๊ปเลือด</label>
                  <select name="blood_type" value={form.blood_type || ''} onChange={handleChange} className={inputClass}>
                    <option value="">-- เลือก --</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>โทรศัพท์</label>
                  <input type="text" name="phone" value={form.phone || ''} onChange={handleChange} className={inputClass} placeholder="0xx-xxx-xxxx" />
                </div>
              </div>

              {/* Allergies */}
              <div>
                <label className={labelClass}>ประวัติแพ้ยา</label>
                <input type="text" name="allergies" value={form.allergies || ''} onChange={handleChange} className={inputClass} placeholder="เช่น แพ้เพนนิซิลิน" />
              </div>
            </form>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-border dark:border-dark_border shrink-0">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-5 py-2.5 rounded-xl border border-border dark:border-dark_border text-midnight_text dark:text-white font-semibold text-sm hover:bg-section dark:hover:bg-darkmode active:scale-[0.98] transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 px-5 py-2.5 bg-primary hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-primary/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving && <Icon icon="mdi:loading" width="18" className="animate-spin" />}
                {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
