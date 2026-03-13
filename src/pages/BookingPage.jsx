import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { apiGetPublicServiceById, apiCreateBooking, apiGetBookingSlots, apiLockSlot, apiUnlockSlot, apiGetDoctors, apiGetBalance } from '../services/api';
import Footer from '../components/Footer';

const TOTAL_STEPS = 3;

const getBangkokDate = () => {
  const now = new Date();
  return new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
};
const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const getDayName = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'short' });
const getDayNum = (dateStr) => parseInt(dateStr.split('-')[2]);
const getMonthName = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', { month: 'short' });
const formatThaiDate = (dateStr) => dateStr ? new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';
const formatPrice = (val) => { const n = parseFloat(val); return (!n && n !== 0) ? '-' : n.toLocaleString('th-TH'); };
const generate7Days = () => { const t = getBangkokDate(); return Array.from({ length: 7 }, (_, i) => { const d = new Date(t); d.setDate(t.getDate() + i); return toDateStr(d); }); };
const isWeekendDate = (dateStr) => { const d = new Date(dateStr + 'T00:00:00'); return d.getDay() === 0 || d.getDay() === 6; };

const BookingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bookingResult, setBookingResult] = useState(null);

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactId, setContactId] = useState('');
  const [contactIdLabel, setContactIdLabel] = useState('');
  const [contactNationality, setContactNationality] = useState('');
  const [note, setNote] = useState('');

  const bookableDates = useRef(generate7Days());
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [balance, setBalance] = useState(0);

  const lockIntervalRef = useRef(null);
  const currentLockRef = useRef(null);

  useEffect(() => { if (!authLoading && !user) navigate(`/login?redirect=/booking/${id}`); }, [authLoading, user, navigate, id]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchService(); fetchDoctors(); fetchBalance();
    return () => clearLockInterval();
  }, [id]);

  useEffect(() => {
    if (user) {
      const dn = user.user_type === 'thai'
        ? `${user.title_th || ''} ${user.first_name_th || ''} ${user.last_name_th || ''}`.trim()
        : `${user.title_en || ''} ${user.first_name_en || ''} ${user.last_name_en || ''}`.trim();
      setContactName(dn); setContactPhone(user.phone || ''); setContactEmail(user.email || '');
      if (user.user_type === 'thai') {
        setContactId(user.thai_id || '-');
        setContactIdLabel('เลขบัตรประชาชน');
      } else {
        setContactId(user.passport || '-');
        setContactIdLabel('Passport');
        setContactNationality(user.nationality || '-');
      }
    }
  }, [user]);

  useEffect(() => { if (selectedDate && service) fetchSlots(selectedDate); }, [selectedDate]);

  const fetchService = async () => { setLoading(true); try { const r = await apiGetPublicServiceById(id); if (r.success) setService(r.data); else navigate('/'); } catch { navigate('/'); } finally { setLoading(false); } };
  const fetchDoctors = async () => { try { const r = await apiGetDoctors(); if (r.success) setDoctors(r.data); } catch {} };
  const fetchBalance = async () => { try { const r = await apiGetBalance(); if (r.success) setBalance(r.data.balance); } catch {} };
  const fetchSlots = async (date) => { setSlotsLoading(true); try { const r = await apiGetBookingSlots(id, date); if (r.success) setSlots(r.data.slots); } catch { setSlots([]); } finally { setSlotsLoading(false); } };

  const clearLockInterval = () => { if (lockIntervalRef.current) { clearInterval(lockIntervalRef.current); lockIntervalRef.current = null; } };
  const releaseLock = useCallback(async () => { if (currentLockRef.current) { try { await apiUnlockSlot(currentLockRef.current); } catch {} currentLockRef.current = null; } clearLockInterval(); }, []);

  const lockSlot = useCallback(async (date, time) => {
    await releaseLock();
    const ld = { service_id: parseInt(id), booking_date: date, booking_time: time };
    const r = await apiLockSlot(ld);
    if (r.success) {
      currentLockRef.current = ld;
      lockIntervalRef.current = setInterval(async () => { try { await apiLockSlot(ld); } catch {} }, 3 * 60 * 1000);
      return true;
    }
    if (r.code === 'SLOT_BOOKED') setError('เวลานี้ถูกจองแล้ว');
    else if (r.code === 'SLOT_LOCKED') setError('มีคนกำลังจองเวลานี้');
    fetchSlots(date); return false;
  }, [id, releaseLock]);

  const handleSelectTime = async (time, status) => {
    if (status !== 'available' && status !== 'my_lock') return;
    setError(''); setSelectedTime(time);
    if (!(await lockSlot(selectedDate, time))) setSelectedTime('');
  };

  const handleSelectDate = (date) => { setError(''); setSelectedDate(date); setSelectedTime(''); releaseLock(); };

  const validateStep = (s) => { if (s === 2) { if (!selectedDate) return 'กรุณาเลือกวัน'; if (!selectedTime) return 'กรุณาเลือกเวลา'; } return null; };
  const nextStep = () => { const e = validateStep(step); if (e) { setError(e); return; } setError(''); setStep(s => Math.min(s + 1, TOTAL_STEPS)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const prevStep = () => { setError(''); setStep(s => Math.max(s - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      const sp = parseFloat(service?.price) || 0;
      const dep = Math.ceil(sp / 2);
      if (balance < dep) {
        Swal.fire({ icon: 'warning', title: 'ยอดเงินไม่เพียงพอ', html: `ต้องการ <b>฿${formatPrice(dep)}</b> — คงเหลือ <b>฿${formatPrice(balance)}</b><br>กรุณาเติมเงินก่อน`, confirmButtonText: 'เติมเงิน', confirmButtonColor: '#3b82f6', showCancelButton: true, cancelButtonText: 'ยกเลิก' }).then(r => { if (r.isConfirmed) navigate('/my-bookings'); });
        setSubmitting(false); return;
      }
      const result = await apiCreateBooking({ service_id: parseInt(id), booking_date: selectedDate, booking_time: selectedTime, branch: service?.branch || '', contact_name: contactName, contact_phone: contactPhone, contact_email: contactEmail, note, price: sp, doctor_id: selectedDoctor?.id || null });
      if (result.success) { setBookingResult(result.data); clearLockInterval(); currentLockRef.current = null; setStep(TOTAL_STEPS + 1); }
      else {
        if (result.code === 'INSUFFICIENT_BALANCE') Swal.fire({ icon: 'warning', title: 'ยอดเงินไม่เพียงพอ', text: result.message, confirmButtonColor: '#3b82f6' });
        else Swal.fire({ icon: 'error', title: 'จองไม่สำเร็จ', text: result.message, confirmButtonColor: '#3b82f6' });
        if (result.message?.includes('ถูกจองแล้ว')) { fetchSlots(selectedDate); setSelectedTime(''); }
      }
    } catch { Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', confirmButtonColor: '#3b82f6' }); }
    finally { setSubmitting(false); }
  };

  useEffect(() => () => releaseLock(), [releaseLock]);

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-indigo-50 dark:bg-darkmode">
      <Icon icon="mdi:loading" width="40" className="text-primary animate-spin" />
    </div>
  );
  if (!service) return null;

  const currPrice = parseFloat(service.price || 0);
  const origPrice = parseFloat(service.original_price || 0);
  const discountPct = service.is_promotion && origPrice > currPrice ? Math.round((1 - currPrice / origPrice) * 100) : null;
  const depositAmount = Math.ceil(currPrice / 2);
  const doctorName = selectedDoctor?.name || 'ไม่ระบุ (แพทย์เวร)';

  const slotStyle = (time, status) => {
    if (time === selectedTime) return 'bg-linear-to-r from-primary to-blue-400 text-white border-transparent shadow-lg ring-2 ring-blue-300/40 scale-105';
    if (status === 'available' || status === 'my_lock') return 'bg-white dark:bg-darklight text-gray-700 dark:text-white border-gray-200 dark:border-dark_border hover:border-blue-400 hover:text-primary hover:shadow-md cursor-pointer';
    if (status === 'booked') return 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed line-through';
    if (status === 'locking') return 'bg-amber-50 dark:bg-amber-500/5 text-amber-500 border-amber-200 dark:border-amber-500/20 cursor-not-allowed';
    return 'bg-gray-50 dark:bg-gray-800/50 text-gray-300 border-gray-100 dark:border-gray-800 cursor-not-allowed';
  };
  const slotLabel = (status) => ({ booked: 'จองแล้ว', locking: 'กำลังจอง', past: 'ผ่านไปแล้ว' }[status] || null);

  // SUCCESS
  if (step > TOTAL_STEPS) return (
    <>
      <main className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 dark:bg-darkmode">
        <div className="container mx-auto max-w-xl px-4 pt-28 pb-20">
          <div className="bg-white dark:bg-darklight rounded-3xl shadow-xl p-8 md:p-10 text-center border border-blue-100 dark:border-dark_border">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-200">
              <Icon icon="mdi:check" width="40" className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">จองสำเร็จแล้ว!</h1>
            <p className="text-gray-500 text-sm mb-6">หักมัดจำจากกระเป๋าเงินเรียบร้อย</p>
            <div className="bg-gray-50 dark:bg-darkmode rounded-2xl p-5 text-left mb-6 space-y-3">
              {[['หมายเลข', `#${bookingResult?.id}`], ['บริการ', service.name], ['แพทย์', doctorName], ['วันที่', formatThaiDate(selectedDate)], ['เวลา', `${selectedTime} น.`]].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm"><span className="text-gray-400">{l}</span><span className="font-semibold text-gray-700 dark:text-white">{v}</span></div>
              ))}
              <div className="border-t border-gray-200 dark:border-dark_border pt-3 flex justify-between text-sm">
                <span className="text-gray-400">หักมัดจำ</span><span className="text-lg font-bold text-primary">฿{formatPrice(depositAmount)}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate('/')} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 cursor-pointer text-sm">กลับหน้าหลัก</button>
              <button onClick={() => navigate('/my-bookings')} className="flex-1 py-3 rounded-xl bg-linear-to-r from-primary to-blue-400 text-white font-semibold hover:shadow-lg cursor-pointer text-sm">การจองของฉัน</button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );

  return (
    <>
      <main className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 dark:bg-darkmode">
        <div className="container mx-auto max-w-3xl px-4 pt-28 pb-20">
          <button onClick={() => { releaseLock(); step > 1 ? prevStep() : navigate(-1); }} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary transition-colors mb-5 group cursor-pointer">
            <Icon icon="mdi:arrow-left" width="18" className="group-hover:-translate-x-1 transition-transform" />{step > 1 ? 'ย้อนกลับ' : 'กลับ'}
          </button>

          {/* Service card */}
          <div className="bg-white dark:bg-darklight rounded-2xl shadow-sm border border-blue-100 dark:border-dark_border p-4 mb-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-linear-to-br from-blue-100 to-indigo-100">
              {service.image_url ? <img src={service.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Icon icon="mdi:spa" width="22" className="text-blue-300" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-800 dark:text-white text-sm truncate">{service.name}</h2>
              {service.branch && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Icon icon="mdi:map-marker" width="11" className="text-blue-400" />{service.branch}</p>}
            </div>
            <div className="text-right shrink-0">
              {discountPct && <p className="text-xs text-gray-400 line-through">฿{formatPrice(origPrice)}</p>}
              <p className="text-lg font-bold bg-linear-to-r from-primary to-blue-400 bg-clip-text text-transparent">฿{formatPrice(currPrice)}</p>
              <p className="text-[10px] text-gray-400">มัดจำ ฿{formatPrice(depositAmount)}</p>
            </div>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-1 mb-6">
            {[{ n: 1, l: 'ข้อมูลผู้จอง', ic: 'mdi:account' }, { n: 2, l: 'วันเวลา & แพทย์', ic: 'mdi:calendar-clock' }, { n: 3, l: 'ยืนยัน & ชำระ', ic: 'mdi:check-circle' }].map((s, i) => (
              <div key={s.n} className="flex items-center flex-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${step >= s.n ? 'bg-linear-to-r from-primary to-blue-400 text-white shadow-md shadow-blue-200/50' : 'bg-gray-100 dark:bg-darkmode text-gray-400'}`}>
                  {step > s.n ? <Icon icon="mdi:check" width="16" /> : <Icon icon={s.ic} width="16" />}
                </div>
                <span className={`ml-2 text-xs font-medium hidden sm:block ${step >= s.n ? 'text-gray-700 dark:text-white' : 'text-gray-400'}`}>{s.l}</span>
                {i < 2 && <div className={`flex-1 h-0.5 mx-2 rounded-full ${step > s.n ? 'bg-linear-to-r from-blue-400 to-indigo-400' : 'bg-gray-200 dark:bg-dark_border'}`} />}
              </div>
            ))}
          </div>

          {error && <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 mb-4 flex items-center gap-2"><Icon icon="mdi:alert-circle" width="18" className="text-red-500 shrink-0" /><span className="text-sm text-red-600 dark:text-red-400">{error}</span></div>}

          <div className="bg-white dark:bg-darklight rounded-3xl shadow-sm border border-blue-100/50 dark:border-dark_border p-6 md:p-8">

            {/* STEP 1: Contact */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-blue-400 flex items-center justify-center"><Icon icon="mdi:account" width="16" className="text-white" /></div>
                    ข้อมูลผู้จอง
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 ml-10">ข้อมูลจากโปรไฟล์ (ไม่สามารถเปลี่ยนแปลงได้)</p>
                </div>

                {[['ชื่อ-นามสกุล', contactName], ['เบอร์โทรศัพท์', contactPhone], ['อีเมล', contactEmail], [contactIdLabel, contactId], ...(contactNationality ? [['สัญชาติ', contactNationality]] : [])].map(([label, val]) => (
                  <div key={label}>
                    <label className="block text-sm font-semibold text-gray-600 dark:text-white/70 mb-1.5">{label}</label>
                    <input type="text" disabled value={val || '-'} className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-darkmode border border-gray-200 dark:border-dark_border text-gray-400 dark:text-white/40 text-sm cursor-not-allowed" />
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-white/70 mb-1.5">หมายเหตุ <span className="text-gray-400 font-normal text-xs">(ไม่บังคับ)</span></label>
                  <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น อาการ, ความต้องการพิเศษ, แพ้ยา..." rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark_border bg-white dark:bg-darkmode text-gray-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-400 resize-none" />
                </div>

                <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-500/5 dark:to-indigo-500/5 rounded-xl p-4 flex items-center gap-3 border border-blue-200/50 dark:border-blue-500/20">
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-blue-400 flex items-center justify-center shadow-md shadow-blue-200"><Icon icon="mdi:wallet" width="20" className="text-white" /></div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">ยอดเงินในกระเป๋า</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">฿{formatPrice(balance)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">มัดจำ</p>
                    <p className={`text-sm font-bold ${balance >= depositAmount ? 'text-green-500' : 'text-red-500'}`}>฿{formatPrice(depositAmount)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Date + Time + Doctor */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-500/5 dark:to-indigo-500/5 rounded-xl p-4 flex items-start gap-3 border border-blue-200/50 dark:border-blue-500/20">
                  <Icon icon="mdi:clock-outline" width="20" className="text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-gray-600 dark:text-white/60 space-y-0.5">
                    <p className="font-semibold text-sm text-blue-600 dark:text-blue-400 mb-1">เวลาทำการ Whocare Clinic</p>
                    <p>จันทร์–ศุกร์: 10:00 – 20:00 น. | เสาร์–อาทิตย์: 11:00 – 20:00 น. | พัก 12:00–12:30</p>
                  </div>
                </div>

                {/* Doctor */}
                <div>
                  <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-linear-to-br from-teal-400 to-emerald-500 flex items-center justify-center"><Icon icon="mdi:doctor" width="14" className="text-white" /></div>
                    เลือกแพทย์
                  </h3>
                  <div className="relative">
                    <Icon icon="mdi:doctor" width="18" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                    <select
                      value={selectedDoctor ? String(selectedDoctor.id) : ''}
                      onChange={(e) => {
                        if (!e.target.value) { setSelectedDoctor(null); return; }
                        const doc = doctors.find(d => String(d.id) === e.target.value);
                        setSelectedDoctor(doc || null);
                      }}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-darkmode text-sm text-gray-700 dark:text-white appearance-none cursor-pointer focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all"
                    >
                      <option value="">ไม่ระบุ (ทางคลินิคเลือกให้)</option>
                      {doctors.map(doc => (
                        <option key={doc.id} value={String(doc.id)}>
                          {doc.name}
                        </option>
                      ))}
                    </select>
                    <Icon icon="mdi:chevron-down" width="20" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-linear-to-br from-primary to-blue-400 flex items-center justify-center"><Icon icon="mdi:calendar" width="14" className="text-white" /></div>
                    เลือกวัน
                  </h3>
                  <div className="grid grid-cols-7 gap-2">
                    {bookableDates.current.map(date => {
                      const sel = selectedDate === date;
                      const today = date === toDateStr(getBangkokDate());
                      return (
                        <button key={date} onClick={() => handleSelectDate(date)} className={`flex flex-col items-center py-3 rounded-xl border-2 transition-all cursor-pointer ${sel ? 'border-blue-400 bg-linear-to-b from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 shadow-md' : 'border-gray-200 dark:border-dark_border hover:border-blue-300 bg-white dark:bg-darkmode'}`}>
                          <span className={`text-[10px] font-medium ${sel ? 'text-primary' : 'text-gray-400'}`}>{getDayName(date)}</span>
                          <span className={`text-lg font-bold mt-0.5 ${sel ? 'text-primary' : 'text-gray-700 dark:text-white'}`}>{getDayNum(date)}</span>
                          <span className={`text-[10px] ${sel ? 'text-blue-400' : 'text-gray-400'}`}>{getMonthName(date)}</span>
                          {today && <span className="text-[9px] mt-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-primary font-semibold">วันนี้</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time */}
                {selectedDate && (
                  <div>
                    <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-linear-to-br from-indigo-500 to-blue-500 flex items-center justify-center"><Icon icon="mdi:clock" width="14" className="text-white" /></div>
                      เลือกเวลา
                    </h3>
                    <p className="text-xs text-gray-400 mb-3 ml-9">{isWeekendDate(selectedDate) ? 'เสาร์–อาทิตย์: 11:00–20:00' : 'จันทร์–ศุกร์: 10:00–20:00'} (พัก 12:00–12:30)</p>
                    {slotsLoading ? (
                      <div className="flex justify-center py-8"><Icon icon="mdi:loading" width="28" className="text-primary animate-spin" /></div>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {slots.map(({ time, status }) => (
                          <div key={time} className="relative">
                            <button onClick={() => handleSelectTime(time, status)} disabled={status === 'booked' || status === 'locking' || status === 'past'} className={`w-full py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${slotStyle(time, status)}`}>{time}</button>
                            {slotLabel(status) && <span className={`block text-center text-[9px] mt-0.5 font-medium ${status === 'booked' ? 'text-gray-400' : 'text-amber-500'}`}>{slotLabel(status)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-gray-200 bg-white"></span>ว่าง</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-linear-to-r from-primary to-blue-400"></span>เลือกแล้ว</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span>กำลังจอง</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200"></span>จองแล้ว</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Confirm */}
            {step === 3 && (
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-linear-to-br from-green-400 to-emerald-500 flex items-center justify-center"><Icon icon="mdi:check-circle" width="16" className="text-white" /></div>
                  ตรวจสอบและยืนยัน
                </h3>

                <div className="bg-gray-50 dark:bg-darkmode rounded-xl p-4 space-y-2.5">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider"><Icon icon="mdi:spa" width="12" className="inline mr-1" />บริการ</h4>
                  {[['บริการ', service.name], ['แพทย์', doctorName], service.branch && ['สาขา', service.branch]].filter(Boolean).map(([l, v]) => (
                    <div key={l} className="flex justify-between text-sm"><span className="text-gray-400">{l}</span><span className="font-semibold text-gray-700 dark:text-white text-right max-w-[60%]">{v}</span></div>
                  ))}
                </div>

                <div className="bg-gray-50 dark:bg-darkmode rounded-xl p-4 space-y-2.5">
                  <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider"><Icon icon="mdi:calendar-clock" width="12" className="inline mr-1" />วันเวลา</h4>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">วันที่</span><span className="font-semibold text-gray-700 dark:text-white">{formatThaiDate(selectedDate)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">เวลา</span><span className="font-bold text-primary">{selectedTime} น.</span></div>
                </div>

                <div className="bg-gray-50 dark:bg-darkmode rounded-xl p-4 space-y-2.5">
                  <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-wider"><Icon icon="mdi:account" width="12" className="inline mr-1" />ผู้จอง</h4>
                  {[['ชื่อ', contactName], ['เบอร์โทร', contactPhone], contactEmail && ['อีเมล', contactEmail], note && ['หมายเหตุ', note]].filter(Boolean).map(([l, v]) => (
                    <div key={l} className="flex justify-between text-sm"><span className="text-gray-400 shrink-0">{l}</span><span className="text-gray-700 dark:text-white text-right max-w-[60%]">{v}</span></div>
                  ))}
                </div>

                <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-500/5 dark:to-indigo-500/5 rounded-xl p-4 space-y-2.5 border border-blue-200/50">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider"><Icon icon="mdi:wallet" width="12" className="inline mr-1" />การชำระเงิน</h4>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">ราคา</span><span>฿{formatPrice(currPrice)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">มัดจำ 50%</span><span className="text-lg font-bold text-primary">฿{formatPrice(depositAmount)}</span></div>
                  <div className="flex justify-between text-sm border-t border-blue-200/30 pt-2.5"><span className="text-gray-400">คงเหลือหลังหัก</span><span className={`font-bold ${balance >= depositAmount ? 'text-green-500' : 'text-red-500'}`}>฿{formatPrice(balance - depositAmount)}</span></div>
                  <p className="text-[11px] text-gray-400">ชำระส่วนที่เหลือ ฿{formatPrice(currPrice - depositAmount)} ณ วันรับบริการ</p>
                </div>
              </div>
            )}

            {/* Nav */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-dark_border">
              {step > 1 ? <button onClick={prevStep} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 cursor-pointer"><Icon icon="mdi:arrow-left" width="16" />ย้อนกลับ</button> : <div />}
              {step < TOTAL_STEPS ? (
                <button onClick={nextStep} className="inline-flex items-center gap-2 bg-linear-to-r from-primary to-blue-400 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md shadow-blue-200/50 cursor-pointer text-sm">ถัดไป<Icon icon="mdi:arrow-right" width="16" /></button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting || balance < depositAmount} className="inline-flex items-center gap-2 bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-green-200/50 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting ? <><Icon icon="mdi:loading" width="18" className="animate-spin" />กำลังจอง...</> : <><Icon icon="mdi:wallet-plus" width="18" />ยืนยัน — หักมัดจำ ฿{formatPrice(depositAmount)}</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default BookingPage;
