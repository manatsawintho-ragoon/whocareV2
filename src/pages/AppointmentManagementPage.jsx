import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth } from '../context/AuthContext';
import { apiGetAllBookings, apiGetBookingStats, apiUpdateBookingStatus, apiRescheduleBooking, apiGetBookingSlots, apiGetCalendarBookings, apiGetDoctors } from '../services/api';

const STATUS_MAP = {
  pending: { label: 'รอยืนยัน', color: 'yellow', icon: 'mdi:clock' },
  confirmed: { label: 'ยืนยันแล้ว', color: 'blue', icon: 'mdi:check-circle' },
  completed: { label: 'เสร็จสิ้น', color: 'green', icon: 'mdi:check-all' },
  cancelled: { label: 'ยกเลิก', color: 'red', icon: 'mdi:close-circle' },
};

const STATUS_COLORS = {
  yellow: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600',
  blue: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600',
  green: 'bg-green-100 dark:bg-green-500/10 text-green-600',
  red: 'bg-red-100 dark:bg-red-500/10 text-red-500',
};

const AppointmentManagementPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, hasRole, getUserRole } = useAuth();
  const role = getUserRole();

  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [activeView, setActiveView] = useState('list'); // list | calendar

  // Calendar view state
  const [calViewMonth, setCalViewMonth] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() + 1 }; });
  const [calBookings, setCalBookings] = useState([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calSelectedDate, setCalSelectedDate] = useState(null);

  // Reschedule calendar modal state
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  // Allowed roles
  const canManage = hasRole('reception', 'manager', 'super_admin');
  const canLimitedManage = hasRole('nurse');
  const isDoctor = role === 'doctor';

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (!hasRole('reception', 'nurse', 'manager', 'doctor', 'super_admin')) {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [user, authLoading]);

  useEffect(() => {
    if (activeView === 'calendar' && user) loadCalendar();
  }, [activeView, calViewMonth]);

  const loadData = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (filterStatus) params.status = filterStatus;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      if (search) params.search = search;

      const [bookingsRes, statsRes] = await Promise.all([
        apiGetAllBookings(params),
        apiGetBookingStats(),
      ]);

      if (bookingsRes.success) {
        setBookings(bookingsRes.data.bookings);
        setPagination(bookingsRes.data.pagination);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadCalendar = async () => {
    setCalLoading(true);
    try {
      const r = await apiGetCalendarBookings(calViewMonth.y, calViewMonth.m);
      if (r.success) setCalBookings(r.data);
    } catch { setCalBookings([]); }
    finally { setCalLoading(false); }
  };

  const loadDoctors = async (params = {}) => {
    try {
      const result = await apiGetDoctors(params);
      if (result.success) {
        return result.data || [];
      }
    } catch {
      // ignore
    }
    return [];
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadData(1);
  };

  const handleFilter = () => {
    loadData(1);
  };

  const formatPrice = (val) => {
    const num = parseFloat(val);
    if (!num && num !== 0) return '-';
    return num.toLocaleString('th-TH');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return '-';
    const d = new Date(dtStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Status change
  const handleStatusChange = async (booking, newStatus) => {
    const statusInfo = STATUS_MAP[newStatus];
    const requiresDoctorSelection = newStatus === 'confirmed' && !isDoctor && (canManage || canLimitedManage);
    const availableDoctors = requiresDoctorSelection
      ? await loadDoctors({
          service_id: booking.service_id,
          branch: booking.branch || '',
          date: booking.booking_date,
          time: booking.booking_time,
          exclude_booking_id: booking.id,
        })
      : [];

    if (requiresDoctorSelection && availableDoctors.length === 0) {
      await Swal.fire({
        icon: 'error',
        title: 'ไม่มีแพทย์ว่าง',
        text: 'ไม่พบแพทย์ที่รับบริการนี้และว่างในวันเวลาที่เลือก',
        confirmButtonColor: '#3b82f6',
      });
      return;
    }

    const doctorOptions = availableDoctors.reduce((acc, doctor) => {
      acc[String(doctor.id)] = doctor.name;
      return acc;
    }, {});
    const confirm = await Swal.fire({
      title: `เปลี่ยนสถานะเป็น "${statusInfo.label}"`,
      html: `การจอง #${booking.id} — ${booking.contact_name}`,
      icon: 'question',
      input: requiresDoctorSelection ? 'select' : undefined,
      inputOptions: requiresDoctorSelection ? doctorOptions : undefined,
      inputPlaceholder: requiresDoctorSelection ? 'เลือกแพทย์ผู้รับเคส' : undefined,
      inputValue: requiresDoctorSelection && booking.doctor_id ? String(booking.doctor_id) : undefined,
      inputLabel: requiresDoctorSelection ? 'เลือกแพทย์ที่สามารถรับนัดนี้' : undefined,
      inputValidator: requiresDoctorSelection ? (value) => {
        if (!value) return 'กรุณาเลือกแพทย์';
        return undefined;
      } : undefined,
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });

    if (confirm.isConfirmed) {
      const doctorId = requiresDoctorSelection ? parseInt(confirm.value, 10) : null;
      const result = await apiUpdateBookingStatus(booking.id, newStatus, doctorId);
      if (result.success) {
        Swal.fire({ icon: 'success', title: 'สำเร็จ', timer: 1500, showConfirmButton: false });
        loadData(pagination.page);
      } else {
        Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: result.message, confirmButtonColor: '#3b82f6' });
      }
    }
  };

  // Reschedule — open calendar modal
  const handleReschedule = (booking) => {
    const now = new Date();
    setRescheduleTarget(booking);
    setCalMonth({ y: now.getFullYear(), m: now.getMonth() });
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleSlots([]);
  };

  const closeRescheduleModal = () => { setRescheduleTarget(null); };

  // Calendar helper: build days for month grid
  const buildCalDays = () => {
    const { y, m } = calMonth;
    const firstDay = new Date(y, m, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);
    const maxDate = new Date(); maxDate.setFullYear(maxDate.getFullYear() + 1);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(y, m, d);
      const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isPast = dt < today;
      const isFuture = dt > maxDate;
      days.push({ day: d, dateStr, disabled: isPast || isFuture });
    }
    return days;
  };
  const calMonthLabel = new Date(calMonth.y, calMonth.m).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  const prevMonth = () => setCalMonth(p => p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 });
  const nextMonth = () => setCalMonth(p => p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 });

  const handleCalDateSelect = async (dateStr) => {
    setRescheduleDate(dateStr); setRescheduleTime('');
    if (!rescheduleTarget) return;
    setRescheduleSlotsLoading(true);
    try {
      const r = await apiGetBookingSlots(rescheduleTarget.service_id, dateStr);
      if (r.success) setRescheduleSlots(r.data.slots);
    } catch { setRescheduleSlots([]); }
    finally { setRescheduleSlotsLoading(false); }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleDate || !rescheduleTime || !rescheduleTarget) return;
    setRescheduling(true);
    try {
      const result = await apiRescheduleBooking(rescheduleTarget.id, { booking_date: rescheduleDate, booking_time: rescheduleTime });
      if (result.success) {
        Swal.fire({ icon: 'success', title: 'เลื่อนนัดสำเร็จ', timer: 1500, showConfirmButton: false });
        closeRescheduleModal(); loadData(pagination.page);
      } else {
        Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: result.message, confirmButtonColor: '#3b82f6' });
      }
    } catch { Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', confirmButtonColor: '#3b82f6' }); }
    finally { setRescheduling(false); }
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
              <Icon icon="mdi:calendar-clock" width="28" className="text-primary" />
              {isDoctor ? 'นัดหมายของฉัน' : 'จัดการนัดหมาย'}
            </h1>
            <p className="text-sm text-grey dark:text-white/50 mt-1">
              {isDoctor ? 'รับนัด (pending ทั้งหมด) + จัดการนัดที่คุณรับไว้แล้ว' : 'จัดการนัดหมาย สร้าง แก้ไข เลื่อน ยกเลิก'}
              {' '}({pagination.total} รายการ)
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveView('list')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${activeView === 'list' ? 'bg-primary text-white shadow' : 'bg-white dark:bg-darklight border border-border dark:border-dark_border text-grey dark:text-white/60 hover:border-primary'}`}>
              <Icon icon="mdi:format-list-bulleted" width="16" />รายการ
            </button>
            <button onClick={() => setActiveView('calendar')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${activeView === 'calendar' ? 'bg-primary text-white shadow' : 'bg-white dark:bg-darklight border border-border dark:border-dark_border text-grey dark:text-white/60 hover:border-primary'}`}>
              <Icon icon="mdi:calendar-month" width="16" />ปฏิทิน
            </button>
          </div>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-darklight rounded-xl border border-border dark:border-dark_border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Icon icon="mdi:calendar-today" width="20" className="text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-midnight_text dark:text-white">{stats.today}</p>
                  <p className="text-[11px] text-grey dark:text-white/40">นัดวันนี้</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-darklight rounded-xl border border-border dark:border-dark_border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Icon icon="mdi:clock" width="20" className="text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-midnight_text dark:text-white">{stats.pending}</p>
                  <p className="text-[11px] text-grey dark:text-white/40">รอยืนยัน</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-darklight rounded-xl border border-border dark:border-dark_border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Icon icon="mdi:check-circle" width="20" className="text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-midnight_text dark:text-white">{stats.confirmed}</p>
                  <p className="text-[11px] text-grey dark:text-white/40">ยืนยันแล้ว</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-darklight rounded-xl border border-border dark:border-dark_border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon icon="mdi:calendar-multiple-check" width="20" className="text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-midnight_text dark:text-white">{stats.total}</p>
                  <p className="text-[11px] text-grey dark:text-white/40">ทั้งหมด</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-darklight rounded-2xl shadow-sm border border-border dark:border-dark_border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Icon icon="mdi:magnify" width="20" className="absolute left-3 top-1/2 -translate-y-1/2 text-grey" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, เบอร์โทร, บริการ..."
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
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setTimeout(() => handleFilter(), 0); }}
              className="px-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm cursor-pointer"
            >
              <option value="">สถานะทั้งหมด</option>
              <option value="pending">รอยืนยัน</option>
              <option value="confirmed">ยืนยันแล้ว</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
            <div className="relative">
              <Icon icon="mdi:calendar" width="18" className="absolute left-3 top-1/2 -translate-y-1/2 text-grey dark:text-white/40 z-10" />
              <DatePicker
                selected={filterDateFrom ? new Date(filterDateFrom + 'T00:00:00') : null}
                onChange={(date) => {
                  if (date) {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    setFilterDateFrom(`${y}-${m}-${d}`);
                  } else {
                    setFilterDateFrom('');
                  }
                }}
                dateFormat="dd/MM/yyyy"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                isClearable
                placeholderText="จากวันที่"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                wrapperClassName="w-full min-w-[160px]"
                popperClassName="datepicker-popper"
              />
            </div>
            <div className="relative">
              <Icon icon="mdi:calendar" width="18" className="absolute left-3 top-1/2 -translate-y-1/2 text-grey dark:text-white/40 z-10" />
              <DatePicker
                selected={filterDateTo ? new Date(filterDateTo + 'T00:00:00') : null}
                onChange={(date) => {
                  if (date) {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    setFilterDateTo(`${y}-${m}-${d}`);
                  } else {
                    setFilterDateTo('');
                  }
                }}
                dateFormat="dd/MM/yyyy"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                isClearable
                placeholderText="ถึงวันที่"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-section dark:bg-darkmode text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                wrapperClassName="w-full min-w-[160px]"
                popperClassName="datepicker-popper"
              />
            </div>
            <button onClick={handleFilter} className="px-4 py-2.5 bg-section dark:bg-darkmode rounded-xl border border-border dark:border-dark_border text-midnight_text dark:text-white hover:bg-border dark:hover:bg-dark_border cursor-pointer text-sm">
              <Icon icon="mdi:filter" width="18" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-darklight rounded-2xl shadow-sm border border-border dark:border-dark_border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-section dark:bg-darkmode border-b border-border dark:border-dark_border">
                  <th className="text-left pl-4 pr-2 py-3 font-semibold text-midnight_text dark:text-white w-[50px]">#</th>
                  <th className="text-left px-2 py-3 font-semibold text-midnight_text dark:text-white">ผู้จอง</th>
                  <th className="text-left px-2 py-3 font-semibold text-midnight_text dark:text-white hidden md:table-cell">บริการ</th>
                  <th className="text-center px-2 py-3 font-semibold text-midnight_text dark:text-white">วันนัด</th>
                  <th className="text-center px-2 py-3 font-semibold text-midnight_text dark:text-white">เวลา</th>
                  <th className="text-right px-2 py-3 font-semibold text-midnight_text dark:text-white hidden sm:table-cell">มัดจำ</th>
                  <th className="text-center px-2 py-3 font-semibold text-midnight_text dark:text-white">สถานะ</th>
                  {(canManage || canLimitedManage || isDoctor) && (
                    <th className="text-center pr-4 pl-2 py-3 font-semibold text-midnight_text dark:text-white">จัดการ</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={canManage || canLimitedManage || isDoctor ? 8 : 7} className="text-center py-12 text-grey dark:text-white/40">
                      <Icon icon="mdi:calendar-blank" width="48" className="mx-auto mb-2 opacity-30" />
                      <p>ไม่พบนัดหมาย</p>
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => {
                    const st = STATUS_MAP[b.status] || STATUS_MAP.pending;
                    return (
                      <tr key={b.id} className="border-b border-border dark:border-dark_border hover:bg-section/50 dark:hover:bg-darkmode/50 transition-colors">
                        <td className="pl-4 pr-2 py-3 text-grey dark:text-white/40 text-xs">{b.id}</td>
                        <td className="px-2 py-3">
                          <p className="font-semibold text-midnight_text dark:text-white text-sm">{b.contact_name}</p>
                          <p className="text-[11px] text-grey dark:text-white/40">{b.contact_phone}</p>
                        </td>
                        <td className="px-2 py-3 hidden md:table-cell">
                          <p className="text-midnight_text dark:text-white text-xs truncate max-w-[200px]">{b.service_name || '-'}</p>
                          {b.branch && <p className="text-[10px] text-grey dark:text-white/40">{b.branch}</p>}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className="text-xs font-medium text-midnight_text dark:text-white">{formatDate(b.booking_date)}</span>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className="text-xs font-bold text-primary">{b.booking_time}</span>
                        </td>
                        <td className="px-2 py-3 text-right hidden sm:table-cell">
                          <span className="text-xs font-semibold text-midnight_text dark:text-white">฿{formatPrice(b.deposit_amount)}</span>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[st.color]}`}>
                            <Icon icon={st.icon} width="12" />
                            {st.label}
                          </span>
                        </td>
                        {(canManage || canLimitedManage || isDoctor) && (
                          <td className="pr-4 pl-2 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {/* Doctor: รับนัด (accept unassigned pending) */}
                              {isDoctor && b.status === 'pending' && !b.doctor_id && (
                                <button
                                  onClick={() => handleStatusChange(b, 'confirmed')}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 text-[11px] font-semibold transition cursor-pointer"
                                  title="รับนัด"
                                >
                                  <Icon icon="mdi:hand-back-right" width="14" />รับนัด
                                </button>
                              )}
                              {/* Doctor: complete their own confirmed booking */}
                              {isDoctor && b.status === 'confirmed' && b.doctor_id && (
                                <button
                                  onClick={() => handleStatusChange(b, 'completed')}
                                  className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-500 transition-colors cursor-pointer"
                                  title="เสร็จสิ้น"
                                >
                                  <Icon icon="mdi:check-all" width="16" />
                                </button>
                              )}
                              {/* Staff: Confirm */}
                              {b.status === 'pending' && (canManage || canLimitedManage) && (
                                <button
                                  onClick={() => handleStatusChange(b, 'confirmed')}
                                  className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500 transition-colors cursor-pointer"
                                  title="ยืนยัน"
                                >
                                  <Icon icon="mdi:check" width="16" />
                                </button>
                              )}
                              {/* Staff: Complete */}
                              {b.status === 'confirmed' && canManage && (
                                <button
                                  onClick={() => handleStatusChange(b, 'completed')}
                                  className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-500 transition-colors cursor-pointer"
                                  title="เสร็จสิ้น"
                                >
                                  <Icon icon="mdi:check-all" width="16" />
                                </button>
                              )}
                              {/* Reschedule */}
                              {canManage && b.status !== 'cancelled' && b.status !== 'completed' && (
                                <button
                                  onClick={() => handleReschedule(b)}
                                  className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-500 transition-colors cursor-pointer"
                                  title="เลื่อนนัด"
                                >
                                  <Icon icon="mdi:calendar-edit" width="16" />
                                </button>
                              )}
                              {/* Cancel */}
                              {canManage && b.status !== 'cancelled' && b.status !== 'completed' && (
                                <button
                                  onClick={() => handleStatusChange(b, 'cancelled')}
                                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer"
                                  title="ยกเลิก"
                                >
                                  <Icon icon="mdi:close" width="16" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border dark:border-dark_border">
              <p className="text-xs text-grey dark:text-white/40">
                หน้า {pagination.page} / {pagination.totalPages} (ทั้งหมด {pagination.total})
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => loadData(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-border dark:border-dark_border text-sm disabled:opacity-30 hover:bg-section dark:hover:bg-darkmode cursor-pointer"
                >
                  <Icon icon="mdi:chevron-left" width="18" />
                </button>
                <button
                  onClick={() => loadData(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border dark:border-dark_border text-sm disabled:opacity-30 hover:bg-section dark:hover:bg-darkmode cursor-pointer"
                >
                  <Icon icon="mdi:chevron-right" width="18" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent activity */}
        {stats && stats.recent && stats.recent.length > 0 && (
          <div className="bg-white dark:bg-darklight rounded-2xl shadow-sm border border-border dark:border-dark_border p-5 mt-6">
            <h3 className="text-sm font-bold text-midnight_text dark:text-white mb-3 flex items-center gap-2">
              <Icon icon="mdi:history" width="18" className="text-primary" />
              การจองล่าสุด
            </h3>
            <div className="space-y-2">
              {stats.recent.map((r) => {
                const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
                return (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-border dark:border-dark_border last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[st.color]}`}>
                        <Icon icon={st.icon} width="10" />{st.label}
                      </span>
                      <div>
                        <span className="text-xs font-medium text-midnight_text dark:text-white">{r.contact_name}</span>
                        <span className="text-[10px] text-grey dark:text-white/40 ml-2">{r.service_name}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-grey dark:text-white/40">{formatDateTime(r.created_at)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Calendar View */}
        {activeView === 'calendar' && (
          <div className="bg-white dark:bg-darklight rounded-2xl shadow-sm border border-border dark:border-dark_border p-5">
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setCalViewMonth(p => p.m === 1 ? { y: p.y - 1, m: 12 } : { y: p.y, m: p.m - 1 })} className="p-2 rounded-lg hover:bg-section dark:hover:bg-darkmode cursor-pointer">
                <Icon icon="mdi:chevron-left" width="20" className="text-grey" />
              </button>
              <h3 className="text-base font-bold text-midnight_text dark:text-white">
                {new Date(calViewMonth.y, calViewMonth.m - 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={() => setCalViewMonth(p => p.m === 12 ? { y: p.y + 1, m: 1 } : { y: p.y, m: p.m + 1 })} className="p-2 rounded-lg hover:bg-section dark:hover:bg-darkmode cursor-pointer">
                <Icon icon="mdi:chevron-right" width="20" className="text-grey" />
              </button>
            </div>
            {calLoading ? (
              <div className="flex justify-center py-12"><Icon icon="mdi:loading" width="32" className="text-primary animate-spin" /></div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['อา','จ','อ','พ','พฤ','ศ','ส'].map(d => (
                    <div key={d} className="text-center text-[11px] font-semibold text-grey py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const { y, m } = calViewMonth;
                    const firstDay = new Date(y, m - 1, 1).getDay();
                    const daysInMonth = new Date(y, m, 0).getDate();
                    const todayStr = new Date().toISOString().split('T')[0];
                    const bookingsByDate = {};
                    calBookings.forEach(b => {
                      if (!bookingsByDate[b.booking_date]) bookingsByDate[b.booking_date] = [];
                      bookingsByDate[b.booking_date].push(b);
                    });
                    const cells = [];
                    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
                    for (let d = 1; d <= daysInMonth; d++) {
                      const ds = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                      const db = bookingsByDate[ds] || [];
                      const isToday = ds === todayStr;
                      const isSel = calSelectedDate === ds;
                      cells.push(
                        <button key={ds} onClick={() => setCalSelectedDate(isSel ? null : ds)}
                          className={`relative p-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[56px] flex flex-col items-center gap-0.5
                            ${isSel ? 'bg-primary text-white shadow-lg ring-2 ring-primary/30' : isToday ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'hover:bg-section dark:hover:bg-darkmode text-midnight_text dark:text-white'}`}>
                          <span>{d}</span>
                          <div className="flex flex-wrap justify-center gap-0.5">
                            {db.slice(0, 4).map((bk, i) => (
                              <div key={i} className={`w-1.5 h-1.5 rounded-full ${bk.status === 'pending' ? (isSel ? 'bg-yellow-200' : 'bg-yellow-400') : bk.status === 'confirmed' ? (isSel ? 'bg-blue-200' : 'bg-blue-500') : (isSel ? 'bg-green-200' : 'bg-green-500')}`} />
                            ))}
                            {db.length > 4 && <span className={`text-[8px] leading-none ${isSel ? 'text-white/80' : 'text-grey'}`}>+{db.length - 4}</span>}
                          </div>
                        </button>
                      );
                    }
                    return cells;
                  })()}
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-border dark:border-dark_border">
                  <span className="flex items-center gap-1.5 text-xs text-grey"><div className="w-2 h-2 rounded-full bg-yellow-400" />รอยืนยัน</span>
                  <span className="flex items-center gap-1.5 text-xs text-grey"><div className="w-2 h-2 rounded-full bg-blue-500" />ยืนยันแล้ว</span>
                  <span className="flex items-center gap-1.5 text-xs text-grey"><div className="w-2 h-2 rounded-full bg-green-500" />เสร็จสิ้น</span>
                  {isDoctor && <span className="text-xs text-grey ml-auto"><Icon icon="mdi:information" width="12" className="inline mr-1" />ผู้ที่ต้องรับ = การจองใหม่(ยังไม่มีแพทย์) + นัดของคุณ</span>}
                </div>
                {calSelectedDate && (() => {
                  const db = calBookings.filter(b => b.booking_date === calSelectedDate);
                  return (
                    <div className="mt-4 pt-4 border-t border-border dark:border-dark_border">
                      <h4 className="text-sm font-bold text-midnight_text dark:text-white mb-3 flex items-center gap-2">
                        <Icon icon="mdi:calendar-check" width="16" className="text-primary" />
                        {new Date(calSelectedDate + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        <span className="text-xs text-grey font-normal">({db.length} นัด)</span>
                      </h4>
                      {db.length === 0 ? (
                        <p className="text-center text-grey text-sm py-4">ไม่มีนัดหมาย</p>
                      ) : (
                        <div className="space-y-2">
                          {db.map(b => {
                            const st = STATUS_MAP[b.status] || STATUS_MAP.pending;
                            return (
                              <div key={b.id} className="flex items-center gap-3 p-3 bg-section dark:bg-darkmode rounded-xl">
                                <span className="text-sm font-bold text-primary w-12 shrink-0">{b.booking_time}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-midnight_text dark:text-white truncate">{b.contact_name}</p>
                                  <p className="text-xs text-grey truncate">{b.service_name}</p>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${STATUS_COLORS[st.color]}`}>
                                  <Icon icon={st.icon} width="10" />{st.label}
                                </span>
                                {isDoctor && b.status === 'pending' && !b.doctor_id && (
                                  <button onClick={() => { handleStatusChange(b, 'confirmed'); loadCalendar(); }}
                                    className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 text-[11px] font-semibold hover:bg-teal-500/20 cursor-pointer shrink-0">
                                    รับนัด
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>

      {/* Reschedule Calendar Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeRescheduleModal}>
          <div className="bg-white dark:bg-darklight rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-border dark:border-dark_border flex items-center justify-between">
              <h3 className="text-lg font-bold text-midnight_text dark:text-white flex items-center gap-2">
                <Icon icon="mdi:calendar-edit" width="20" className="text-primary" />เลื่อนนัด #{rescheduleTarget.id}
              </h3>
              <button onClick={closeRescheduleModal} className="w-8 h-8 rounded-lg hover:bg-section dark:hover:bg-darkmode flex items-center justify-center cursor-pointer">
                <Icon icon="mdi:close" width="18" className="text-grey" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Booking info */}
              <div className="bg-section dark:bg-darkmode rounded-xl p-3 text-sm">
                <p className="text-grey text-xs mb-1">นัดปัจจุบัน</p>
                <p className="text-midnight_text dark:text-white font-medium">{rescheduleTarget.contact_name} — {rescheduleTarget.service_name}</p>
                <p className="text-primary font-bold text-xs mt-0.5">{rescheduleTarget.booking_date} {rescheduleTarget.booking_time} น.</p>
              </div>
              <p className="text-xs text-grey"><Icon icon="mdi:information" width="12" className="inline mr-1" />เจ้าหน้าที่สามารถเลื่อนได้ถึง 1 ปีข้างหน้า</p>

              {/* Calendar */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-section dark:hover:bg-darkmode cursor-pointer"><Icon icon="mdi:chevron-left" width="20" className="text-grey" /></button>
                  <span className="text-sm font-semibold text-midnight_text dark:text-white">{calMonthLabel}</span>
                  <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-section dark:hover:bg-darkmode cursor-pointer"><Icon icon="mdi:chevron-right" width="20" className="text-grey" /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['อา','จ','อ','พ','พฤ','ศ','ส'].map(d => <span key={d} className="text-[10px] font-medium text-grey py-1">{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {buildCalDays().map((d, i) => d ? (
                    <button key={i} disabled={d.disabled} onClick={() => !d.disabled && handleCalDateSelect(d.dateStr)}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer
                        ${d.dateStr === rescheduleDate ? 'bg-primary text-white shadow-md' : d.disabled ? 'text-grey/30 cursor-not-allowed' : 'text-midnight_text dark:text-white hover:bg-primary/10'}`}>
                      {d.day}
                    </button>
                  ) : <span key={i} />)}
                </div>
              </div>

              {/* Timeslots */}
              {rescheduleDate && (
                <div>
                  <p className="text-sm font-semibold text-midnight_text dark:text-white mb-2">เลือกเวลาใหม่</p>
                  {rescheduleSlotsLoading ? (
                    <div className="flex justify-center py-6"><Icon icon="mdi:loading" width="24" className="text-primary animate-spin" /></div>
                  ) : rescheduleSlots.length === 0 ? (
                    <p className="text-grey text-xs text-center py-4">ไม่มีช่วงเวลาสำหรับวันนี้</p>
                  ) : (
                    <div className="grid grid-cols-5 gap-1.5">
                      {rescheduleSlots.map(({ time, status }) => {
                        const sel = time === rescheduleTime;
                        const ok = status === 'available' || status === 'my_lock';
                        return (
                          <button key={time} onClick={() => ok && setRescheduleTime(time)} disabled={!ok}
                            className={`py-2 rounded-lg text-xs font-semibold border-2 transition-all
                              ${sel ? 'bg-primary text-white border-primary shadow-md' : ok ? 'border-border dark:border-dark_border text-midnight_text dark:text-white hover:border-primary cursor-pointer' : 'bg-section dark:bg-darkmode text-grey/40 border-transparent cursor-not-allowed'}`}>
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-border dark:border-dark_border flex justify-end gap-2">
              <button onClick={closeRescheduleModal} className="px-5 py-2 rounded-xl border border-border text-grey text-sm font-medium hover:bg-section cursor-pointer">ยกเลิก</button>
              <button onClick={handleRescheduleSubmit} disabled={!rescheduleDate || !rescheduleTime || rescheduling}
                className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold cursor-pointer disabled:opacity-50 hover:bg-blue-700">
                {rescheduling ? <Icon icon="mdi:loading" width="16" className="animate-spin" /> : 'ยืนยันเลื่อนนัด'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentManagementPage;
