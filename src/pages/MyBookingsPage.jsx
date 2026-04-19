import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import {
  apiGetMyBookings, apiGetBalance, apiDeposit, apiGetTransactions,
  apiUserRescheduleBooking, apiRequestRefund, apiGetBookingSlots, apiGetMyCalendarBookings
} from '../services/api';
import Footer from '../components/Footer';

const STATUS_MAP = {
  pending: { label: 'รอยืนยัน', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10', icon: 'mdi:clock-outline' },
  confirmed: { label: 'ยืนยันแล้ว', color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/10', icon: 'mdi:check-circle' },
  completed: { label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-600 dark:bg-green-500/10', icon: 'mdi:check-all' },
  cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-500 dark:bg-red-500/10', icon: 'mdi:close-circle' },
};

const REFUND_MAP = {
  pending: { label: 'รอคืนเงิน', color: 'bg-amber-100 text-amber-600' },
  approved: { label: 'คืนเงินแล้ว', color: 'bg-green-100 text-green-600' },
  rejected: { label: 'ไม่อนุมัติคืนเงิน', color: 'bg-red-100 text-red-500' },
};

const getBangkokDate = () => { const n = new Date(); return new Date(n.getTime() + (7 * 60 + n.getTimezoneOffset()) * 60000); };
const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const formatThaiDate = (s) => s ? new Date(s + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' }) : '-';
const formatDateTime = (s) => s ? new Date(s).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
const formatPrice = (v) => { const n = parseFloat(v); return (!n && n !== 0) ? '0' : n.toLocaleString('th-TH'); };
const getDayName = (ds) => new Date(ds + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'short' });
const getDayNum = (ds) => parseInt(ds.split('-')[2]);
const getMonthName = (ds) => new Date(ds + 'T00:00:00').toLocaleDateString('th-TH', { month: 'short' });
const isWeekendDate = (ds) => { const d = new Date(ds + 'T00:00:00'); return d.getDay() === 0 || d.getDay() === 6; };
const generate7Days = () => { const t = getBangkokDate(); return Array.from({ length: 7 }, (_, i) => { const d = new Date(t); d.setDate(t.getDate() + i); return toDateStr(d); }); };

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('bookings'); // bookings | wallet | calendar
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);

  // Calendar state
  const [calViewMonth, setCalViewMonth] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() + 1 }; });
  const [calBookings, setCalBookings] = useState([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calSelectedDate, setCalSelectedDate] = useState(null);

  // Reschedule modal state
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const rescheduleDates = useRef(generate7Days());

  useEffect(() => { if (!authLoading && !user) navigate('/login'); }, [authLoading, user, navigate]);
  useEffect(() => { if (user) loadAll(); }, [user]);
  useEffect(() => { if (tab === 'calendar' && user) loadMyCalendar(); }, [tab, calViewMonth]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [bRes, balRes, txRes] = await Promise.all([apiGetMyBookings(), apiGetBalance(), apiGetTransactions({ limit: 20 })]);
      if (bRes.success) setBookings(bRes.data);
      if (balRes.success) setBalance(balRes.data.balance);
      if (txRes.success) setTransactions(txRes.data.transactions || txRes.data);
    } catch {} finally { setLoading(false); }
  };

  const loadMyCalendar = async () => {
    setCalLoading(true);
    try {
      const r = await apiGetMyCalendarBookings(calViewMonth.y, calViewMonth.m);
      if (r.success) setCalBookings(r.data);
    } catch { setCalBookings([]); }
    finally { setCalLoading(false); }
  };

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt < 1) { Swal.fire({ icon: 'warning', title: 'กรุณาระบุจำนวนเงิน', text: 'ขั้นต่ำ 1 บาท', confirmButtonColor: '#3b82f6' }); return; }
    setDepositing(true);
    try {
      const r = await apiDeposit(amt);
      if (r.success) {
        Swal.fire({ icon: 'success', title: 'เติมเงินสำเร็จ', text: `เติมเงิน ฿${formatPrice(amt)} แล้ว`, confirmButtonColor: '#3b82f6', timer: 2000, showConfirmButton: false });
        setDepositAmount(''); loadAll();
      } else {
        Swal.fire({ icon: 'error', title: 'เติมเงินไม่สำเร็จ', text: r.message, confirmButtonColor: '#3b82f6' });
      }
    } catch { Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', confirmButtonColor: '#3b82f6' }); }
    finally { setDepositing(false); }
  };

  // Refund request
  const handleRefund = async (booking) => {
    const depAmt = Math.ceil(parseFloat(booking.price || 0) / 2);
    const { isConfirmed, value: reason } = await Swal.fire({
      icon: 'warning', title: 'ขอคืนเงิน',
      html: `ยกเลิกการจอง <b>${booking.service_name}</b><br>มัดจำ ฿${formatPrice(depAmt)} จะได้คืนเมื่อเจ้าหน้าที่อนุมัติ`,
      input: 'textarea', inputPlaceholder: 'เหตุผลในการขอคืนเงิน...', inputAttributes: { required: true },
      confirmButtonText: 'ยืนยันยกเลิก', cancelButtonText: 'ปิด', showCancelButton: true,
      confirmButtonColor: '#ef4444', inputValidator: (v) => !v && 'กรุณาระบุเหตุผล',
    });
    if (!isConfirmed) return;
    try {
      const r = await apiRequestRefund({ booking_id: booking.id, reason, amount: depAmt });
      if (r.success) { Swal.fire({ icon: 'success', title: 'ส่งคำขอแล้ว', text: 'รอเจ้าหน้าที่อนุมัติ', confirmButtonColor: '#3b82f6', timer: 2000, showConfirmButton: false }); loadAll(); }
      else Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: r.message, confirmButtonColor: '#3b82f6' });
    } catch { Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', confirmButtonColor: '#3b82f6' }); }
  };

  // Reschedule modal
  const openReschedule = (b) => { setRescheduleBooking(b); setRescheduleDate(''); setRescheduleTime(''); setRescheduleSlots([]); rescheduleDates.current = generate7Days(); };
  const closeReschedule = () => { setRescheduleBooking(null); };

  const loadRescheduleSlots = async (date) => {
    if (!rescheduleBooking) return;
    setRescheduleSlotsLoading(true);
    try {
      const r = await apiGetBookingSlots(rescheduleBooking.service_id, date);
      if (r.success) setRescheduleSlots(r.data.slots);
    } catch { setRescheduleSlots([]); }
    finally { setRescheduleSlotsLoading(false); }
  };

  const handleRescheduleDate = (d) => { setRescheduleDate(d); setRescheduleTime(''); loadRescheduleSlots(d); };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleDate || !rescheduleTime) { Swal.fire({ icon: 'warning', title: 'เลือกวันและเวลาใหม่', confirmButtonColor: '#3b82f6' }); return; }
    setRescheduling(true);
    try {
      const r = await apiUserRescheduleBooking(rescheduleBooking.id, { booking_date: rescheduleDate, booking_time: rescheduleTime });
      if (r.success) { Swal.fire({ icon: 'success', title: 'เลื่อนนัดสำเร็จ', confirmButtonColor: '#3b82f6', timer: 2000, showConfirmButton: false }); closeReschedule(); loadAll(); }
      else Swal.fire({ icon: 'error', title: 'เลื่อนนัดไม่สำเร็จ', text: r.message, confirmButtonColor: '#3b82f6' });
    } catch { Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', confirmButtonColor: '#3b82f6' }); }
    finally { setRescheduling(false); }
  };

  const slotStyle = (time, status) => {
    if (time === rescheduleTime) return 'bg-linear-to-r from-primary to-blue-400 text-white border-transparent shadow-lg scale-105';
    if (status === 'available' || status === 'my_lock') return 'bg-white dark:bg-darkmode text-gray-700 dark:text-white border-gray-200 hover:border-blue-400 cursor-pointer';
    return 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 cursor-not-allowed';
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-indigo-50 dark:bg-darkmode">
      <Icon icon="mdi:loading" width="40" className="text-primary animate-spin" />
    </div>
  );

  const activeBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed');
  const pastBookings = bookings.filter(b => b.status === 'cancelled' || b.status === 'completed');

  return (
    <>
      <main className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 dark:bg-darkmode">
        <div className="container mx-auto max-w-4xl px-4 pt-28 pb-20">

          {/* Wallet strip */}
          <div className="bg-linear-to-r from-primary to-blue-500 rounded-2xl p-5 mb-6 shadow-lg shadow-blue-200/40 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Icon icon="mdi:wallet" width="28" />
                </div>
                <div>
                  <p className="text-white/70 text-xs">ยอดเงินคงเหลือ</p>
                  <p className="text-3xl font-bold">฿{formatPrice(balance)}</p>
                </div>
              </div>
              <button onClick={() => setTab('wallet')} className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur text-sm font-semibold transition cursor-pointer">
                <Icon icon="mdi:plus" width="16" className="inline mr-1" />เติมเงิน
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {[['bookings', 'การจองของฉัน', 'mdi:calendar-check'], ['calendar', 'ปฏิทิน', 'mdi:calendar-month'], ['wallet', 'กระเป๋าเงิน', 'mdi:wallet']].map(([k, l, ic]) => (
              <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${tab === k ? 'bg-linear-to-r from-primary to-blue-400 text-white shadow-md' : 'bg-white dark:bg-darklight text-gray-500 border border-gray-200 dark:border-dark_border hover:border-blue-300'}`}>
                <Icon icon={ic} width="16" />{l}
              </button>
            ))}
          </div>

          {/* BOOKINGS TAB */}
          {tab === 'bookings' && (
            <div className="space-y-6">
              {bookings.length === 0 ? (
                <div className="bg-white dark:bg-darklight rounded-2xl border border-blue-100 dark:border-dark_border p-10 text-center">
                  <Icon icon="mdi:calendar-blank" width="48" className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">ยังไม่มีการจอง</p>
                  <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 rounded-xl bg-linear-to-r from-primary to-blue-400 text-white text-sm font-semibold cursor-pointer">จองบริการ</button>
                </div>
              ) : (
                <>
                  {/* Active */}
                  {activeBookings.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Icon icon="mdi:clock-outline" width="14" />การจองที่กำลังดำเนินการ ({activeBookings.length})
                      </h3>
                      <div className="space-y-3">
                        {activeBookings.map(b => <BookingCard key={b.id} b={b} onReschedule={openReschedule} onRefund={handleRefund} />)}
                      </div>
                    </div>
                  )}

                  {/* Past */}
                  {pastBookings.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Icon icon="mdi:history" width="14" />ประวัติ ({pastBookings.length})
                      </h3>
                      <div className="space-y-3">
                        {pastBookings.map(b => <BookingCard key={b.id} b={b} isPast />)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* WALLET TAB */}
          {tab === 'wallet' && (
            <div className="space-y-5">
              {/* Deposit */}
              <div className="bg-white dark:bg-darklight rounded-2xl border border-blue-100 dark:border-dark_border p-5">
                <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-linear-to-br from-green-400 to-emerald-500 flex items-center justify-center"><Icon icon="mdi:plus" width="14" className="text-white" /></div>
                  เติมเงิน
                </h3>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[100, 500, 1000, 5000].map(a => (
                    <button key={a} onClick={() => setDepositAmount(String(a))} className={`py-2 rounded-xl text-sm font-semibold border-2 transition cursor-pointer ${depositAmount === String(a) ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>฿{a.toLocaleString()}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="จำนวนเงิน (บาท)" className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark_border bg-white dark:bg-darkmode text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/40 text-gray-700 dark:text-white" />
                  <button onClick={handleDeposit} disabled={depositing} className="px-6 py-2.5 rounded-xl bg-linear-to-r from-green-500 to-emerald-500 text-white font-semibold text-sm cursor-pointer disabled:opacity-50">
                    {depositing ? <Icon icon="mdi:loading" width="18" className="animate-spin" /> : 'เติมเงิน'}
                  </button>
                </div>
              </div>

              {/* Transaction history */}
              <div className="bg-white dark:bg-darklight rounded-2xl border border-blue-100 dark:border-dark_border p-5">
                <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-linear-to-br from-indigo-500 to-blue-500 flex items-center justify-center"><Icon icon="mdi:history" width="14" className="text-white" /></div>
                  ประวัติธุรกรรม
                </h3>
                {transactions.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">ยังไม่มีธุรกรรม</p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-dark_border">
                    {transactions.map(tx => {
                      const isPlus = tx.type === 'deposit' || tx.type === 'refund';
                      return (
                        <div key={tx.id} className="flex items-center gap-3 py-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isPlus ? 'bg-green-100 dark:bg-green-500/10' : 'bg-red-100 dark:bg-red-500/10'}`}>
                            <Icon icon={isPlus ? 'mdi:arrow-down' : 'mdi:arrow-up'} width="16" className={isPlus ? 'text-green-500' : 'text-red-500'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-white truncate">{tx.description || tx.type}</p>
                            <p className="text-[10px] text-gray-400">{formatDateTime(tx.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${isPlus ? 'text-green-500' : 'text-red-500'}`}>{isPlus ? '+' : '-'}฿{formatPrice(Math.abs(parseFloat(tx.amount)))}</p>
                            <p className="text-[10px] text-gray-400">฿{formatPrice(tx.balance_after)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CALENDAR TAB */}
          {tab === 'calendar' && (
            <div className="bg-white dark:bg-darklight rounded-2xl border border-blue-100 dark:border-dark_border p-5">
              <div className="flex items-center justify-between mb-5">
                <button onClick={() => setCalViewMonth(p => p.m === 1 ? { y: p.y - 1, m: 12 } : { y: p.y, m: p.m - 1 })} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-darkmode cursor-pointer">
                  <Icon icon="mdi:chevron-left" width="20" className="text-gray-400" />
                </button>
                <h3 className="text-base font-bold text-gray-800 dark:text-white">
                  {new Date(calViewMonth.y, calViewMonth.m - 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => setCalViewMonth(p => p.m === 12 ? { y: p.y + 1, m: 1 } : { y: p.y, m: p.m + 1 })} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-darkmode cursor-pointer">
                  <Icon icon="mdi:chevron-right" width="20" className="text-gray-400" />
                </button>
              </div>
              {calLoading ? (
                <div className="flex justify-center py-12"><Icon icon="mdi:loading" width="32" className="text-primary animate-spin" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['อา','จ','อ','พ','พฤ','ศ','ส'].map(d => (
                      <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
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
                              ${isSel ? 'bg-linear-to-r from-primary to-blue-400 text-white shadow-lg' : isToday ? 'bg-blue-50 dark:bg-blue-500/10 text-primary ring-1 ring-primary/30' : 'hover:bg-gray-50 dark:hover:bg-darkmode text-gray-700 dark:text-white'}`}>
                            <span>{d}</span>
                            <div className="flex flex-wrap justify-center gap-0.5">
                              {db.slice(0, 4).map((bk, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${bk.status === 'pending' ? (isSel ? 'bg-yellow-200' : 'bg-yellow-400') : bk.status === 'confirmed' ? (isSel ? 'bg-blue-200' : 'bg-blue-500') : (isSel ? 'bg-green-200' : 'bg-green-500')}`} />
                              ))}
                              {db.length > 4 && <span className={`text-[8px] leading-none ${isSel ? 'text-white/80' : 'text-gray-400'}`}>+{db.length - 4}</span>}
                            </div>
                          </button>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-dark_border">
                    <span className="flex items-center gap-1.5 text-xs text-gray-400"><div className="w-2 h-2 rounded-full bg-yellow-400" />รอยืนยัน</span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-400"><div className="w-2 h-2 rounded-full bg-blue-500" />ยืนยันแล้ว</span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-400"><div className="w-2 h-2 rounded-full bg-green-500" />เสร็จสิ้น</span>
                  </div>
                  {calSelectedDate && (() => {
                    const db = calBookings.filter(b => b.booking_date === calSelectedDate);
                    const STATUS_COLORS_PATIENT = { pending: 'bg-yellow-100 text-yellow-600', confirmed: 'bg-blue-100 text-blue-600', completed: 'bg-green-100 text-green-600' };
                    return (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark_border">
                        <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                          <Icon icon="mdi:calendar-check" width="16" className="text-primary" />
                          {new Date(calSelectedDate + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          <span className="text-xs text-gray-400 font-normal">({db.length} นัด)</span>
                        </h4>
                        {db.length === 0 ? (
                          <p className="text-center text-gray-400 text-sm py-4">ไม่มีนัดหมาย</p>
                        ) : (
                          <div className="space-y-2">
                            {db.map(b => (
                              <div key={b.id} className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-500/5 rounded-xl">
                                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-blue-400 flex items-center justify-center shrink-0">
                                  <Icon icon="mdi:clock" width="18" className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-primary">{b.booking_time} น.</p>
                                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{b.service_name}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${STATUS_COLORS_PATIENT[b.status] || 'bg-gray-100 text-gray-500'}`}>
                                  {STATUS_MAP[b.status]?.label || b.status}
                                </span>
                              </div>
                            ))}
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

        {/* Reschedule modal */}
        {rescheduleBooking && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeReschedule}>
            <div className="bg-white dark:bg-darklight rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-100 dark:border-dark_border flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <Icon icon="mdi:calendar-edit" width="20" className="text-primary" />เลื่อนนัด
                </h3>
                <button onClick={closeReschedule} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-darkmode flex items-center justify-center cursor-pointer">
                  <Icon icon="mdi:close" width="18" className="text-gray-400" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Current info */}
                <div className="bg-red-50 dark:bg-red-500/5 rounded-xl p-3 text-sm">
                  <p className="text-red-500 font-semibold text-xs mb-1">นัดปัจจุบัน</p>
                  <p className="text-gray-700 dark:text-white">{rescheduleBooking.service_name} — {formatThaiDate(rescheduleBooking.booking_date)} {rescheduleBooking.booking_time} น.</p>
                </div>
                <p className="text-xs text-gray-400"><Icon icon="mdi:information" width="12" className="inline mr-1" />คุณเลื่อนนัดได้ 1 ครั้ง (ภายใน 7 วันจากวันนี้)</p>

                {/* Date picker */}
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-white/70 mb-2">เลือกวันใหม่</p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {rescheduleDates.current.map(date => {
                      const sel = rescheduleDate === date;
                      const today = date === toDateStr(getBangkokDate());
                      return (
                        <button key={date} onClick={() => handleRescheduleDate(date)} className={`flex flex-col items-center py-2 rounded-lg border-2 transition-all cursor-pointer ${sel ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-dark_border hover:border-blue-300'}`}>
                          <span className="text-[9px] text-gray-400">{getDayName(date)}</span>
                          <span className={`text-base font-bold ${sel ? 'text-primary' : 'text-gray-700 dark:text-white'}`}>{getDayNum(date)}</span>
                          <span className="text-[9px] text-gray-400">{getMonthName(date)}</span>
                          {today && <span className="text-[8px] px-1 rounded-full bg-blue-100 text-primary font-semibold">วันนี้</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Timeslots */}
                {rescheduleDate && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-white/70 mb-2">
                      เลือกเวลาใหม่ <span className="text-gray-400 font-normal text-xs">{isWeekendDate(rescheduleDate) ? '(11:00–20:00)' : '(10:00–20:00)'}</span>
                    </p>
                    {rescheduleSlotsLoading ? (
                      <div className="flex justify-center py-6"><Icon icon="mdi:loading" width="24" className="text-primary animate-spin" /></div>
                    ) : (
                      <div className="grid grid-cols-5 gap-1.5">
                        {rescheduleSlots.map(({ time, status }) => (
                          <button key={time} onClick={() => (status === 'available' || status === 'my_lock') && setRescheduleTime(time)} disabled={status !== 'available' && status !== 'my_lock'} className={`py-2 rounded-lg text-xs font-semibold border-2 transition-all ${slotStyle(time, status)}`}>{time}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-gray-100 dark:border-dark_border flex justify-end gap-2">
                <button onClick={closeReschedule} className="px-5 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 cursor-pointer">ยกเลิก</button>
                <button onClick={handleRescheduleSubmit} disabled={!rescheduleDate || !rescheduleTime || rescheduling} className="px-5 py-2 rounded-xl bg-linear-to-r from-primary to-blue-400 text-white text-sm font-semibold cursor-pointer disabled:opacity-50">
                  {rescheduling ? <Icon icon="mdi:loading" width="16" className="animate-spin" /> : 'ยืนยันเลื่อนนัด'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

// Booking card sub-component
const BookingCard = ({ b, onReschedule, onRefund, isPast }) => {
  const st = STATUS_MAP[b.status] || STATUS_MAP.pending;
  const refSt = b.refund_status ? REFUND_MAP[b.refund_status] : null;
  const canReschedule = !isPast && (b.status === 'pending' || b.status === 'confirmed') && (b.reschedule_count || 0) < 1;
  const canRefund = !isPast && (b.status === 'pending' || b.status === 'confirmed') && !b.refund_status;
  const depositAmt = Math.ceil(parseFloat(b.price || 0) / 2);

  return (
    <div className="bg-white dark:bg-darklight rounded-2xl border border-blue-100/50 dark:border-dark_border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex">
        {/* Image */}
        <div className="w-24 sm:w-28 shrink-0 bg-linear-to-br from-blue-100 to-indigo-100 dark:from-blue-500/10 dark:to-indigo-500/10 relative">
          {b.service_image ? <img src={b.service_image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Icon icon="mdi:spa" width="28" className="text-blue-300" /></div>}
          <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${st.color}`}>
            <Icon icon={st.icon} width="10" className="inline mr-0.5" />{st.label}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{b.service_name || 'บริการ'}</p>
              <p className="text-xs text-gray-400 mt-0.5">#{b.id}</p>
            </div>
            <p className="text-sm font-bold text-primary shrink-0">฿{formatPrice(b.price)}</p>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Icon icon="mdi:calendar" width="12" className="text-blue-400" />{formatThaiDate(b.booking_date)}</span>
            <span className="flex items-center gap-1"><Icon icon="mdi:clock" width="12" className="text-indigo-400" />{b.booking_time} น.</span>
            {b.doctor_name && <span className="flex items-center gap-1"><Icon icon="mdi:doctor" width="12" className="text-teal-400" />{b.doctor_name}</span>}
          </div>

          {/* Refund badge */}
          {refSt && (
            <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${refSt.color}`}>
              <Icon icon="mdi:cash-refund" width="10" />{refSt.label}
            </span>
          )}

          {/* Action buttons */}
          {(canReschedule || canRefund) && (
            <div className="flex gap-2 mt-3">
              {canReschedule && (
                <button onClick={() => onReschedule(b)} className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 text-[11px] font-semibold hover:bg-blue-100 transition cursor-pointer flex items-center gap-1">
                  <Icon icon="mdi:calendar-edit" width="12" />เลื่อนนัด
                </button>
              )}
              {canRefund && (
                <button onClick={() => onRefund(b)} className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 text-[11px] font-semibold hover:bg-red-100 transition cursor-pointer flex items-center gap-1">
                  <Icon icon="mdi:cash-refund" width="12" />ขอคืนเงิน
                </button>
              )}
            </div>
          )}

          {b.reschedule_count >= 1 && !isPast && (
            <p className="text-[10px] text-gray-400 mt-1"><Icon icon="mdi:information" width="10" className="inline mr-0.5" />เลื่อนนัดแล้ว 1 ครั้ง (ไม่สามารถเลื่อนเพิ่ม)</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyBookingsPage;
