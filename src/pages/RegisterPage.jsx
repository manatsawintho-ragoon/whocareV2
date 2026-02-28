import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { apiRegister } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TOTAL_STEPS = 4;

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState('thai');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    titleTh: '',
    firstNameTh: '',
    lastNameTh: '',
    thaiId: '',
    titleEn: '',
    firstNameEn: '',
    lastNameEn: '',
    passport: '',
    nationality: '',
    birthDate: '',
    bloodType: '',
    allergies: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const isThai = userType === 'thai';
  const thTitles = ['นาย', 'นาง', 'นางสาว'];
  const enTitles = ['Mr.', 'Mrs.', 'Ms.'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  const formatThaiId = (value) => {
    const d = value.replace(/\D/g, '').slice(0, 13);
    if (d.length <= 1) return d;
    if (d.length <= 5) return `${d[0]}-${d.slice(1)}`;
    if (d.length <= 10) return `${d[0]}-${d.slice(1, 5)}-${d.slice(5)}`;
    if (d.length <= 12) return `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10)}`;
    return `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d[12]}`;
  };

  const handleThaiIdChange = (e) => {
    setForm((prev) => ({ ...prev, thaiId: formatThaiId(e.target.value) }));
    setError('');
  };

  /* ===== Step validation ===== */
  const validateStep = (s) => {
    // Step 1: user type — always valid (just a selection)
    if (s === 2) {
      if (!form.email) return isThai ? 'กรุณากรอกอีเมล' : 'Email is required';
      if (!/\S+@\S+\.\S+/.test(form.email)) return isThai ? 'รูปแบบอีเมลไม่ถูกต้อง' : 'Invalid email format';
      if (!form.password) return isThai ? 'กรุณากรอกรหัสผ่าน' : 'Password is required';
      if (form.password.length < 8) return isThai ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' : 'Password must be at least 8 characters';
      if (form.password !== form.confirmPassword) return isThai ? 'รหัสผ่านไม่ตรงกัน' : 'Passwords do not match';
    }
    if (s === 3) {
      if (isThai) {
        if (!form.titleTh) return 'กรุณาเลือกคำนำหน้า';
        if (!form.firstNameTh) return 'กรุณากรอกชื่อ';
        if (!form.lastNameTh) return 'กรุณากรอกนามสกุล';
      } else {
        if (!form.titleEn) return 'Please select a title';
        if (!form.firstNameEn) return 'First name is required';
        if (!form.lastNameEn) return 'Last name is required';
      }
      if (!form.birthDate) return isThai ? 'กรุณาเลือกวันเกิด' : 'Date of birth is required';
    }
    if (s === 4) {
      if (!form.phone) return isThai ? 'กรุณากรอกเบอร์โทรศัพท์' : 'Phone number is required';
      if (!form.agreeTerms) return isThai ? 'กรุณายอมรับข้อกำหนดการใช้งาน' : 'You must agree to the terms';
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const prevStep = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  /* ===== Submit ===== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError('');

    const confirm = await Swal.fire({
      title: isThai ? 'ยืนยันการสมัครสมาชิก' : 'Confirm Registration',
      text: isThai ? 'กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนดำเนินการ' : 'Please verify your information before proceeding',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: isThai ? 'ยืนยัน' : 'Confirm',
      cancelButtonText: isThai ? 'ยกเลิก' : 'Cancel',
    });
    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      // Auto-derive gender from title prefix
      let autoGender = '';
      const title = isThai ? form.titleTh : form.titleEn;
      if (['นาย', 'Mr.'].includes(title)) autoGender = isThai ? 'ชาย' : 'Male';
      else if (['นาง', 'นางสาว', 'Mrs.', 'Ms.'].includes(title)) autoGender = isThai ? 'หญิง' : 'Female';

      const result = await apiRegister({ userType, ...form, gender: autoGender });

      if (result.success) {
        login(result.data.user);
        await Swal.fire({
          title: isThai ? 'สมัครสมาชิกสำเร็จ!' : 'Registration Successful!',
          text: isThai ? 'ยินดีต้อนรับสู่ Whocare Hospital' : 'Welcome to Whocare Hospital',
          icon: 'success',
          confirmButtonColor: '#3b82f6',
          confirmButtonText: isThai ? 'เข้าสู่หน้าหลัก' : 'Go to Home',
          timer: 3000,
          timerProgressBar: true,
        });
        navigate('/');
      } else {
        Swal.fire({
          title: isThai ? 'สมัครไม่สำเร็จ' : 'Registration Failed',
          text: result.message || (isThai ? 'เกิดข้อผิดพลาด' : 'An error occurred'),
          icon: 'error',
          confirmButtonColor: '#3b82f6',
        });
      }
    } catch {
      Swal.fire({
        title: isThai ? 'ไม่สามารถเชื่อมต่อได้' : 'Connection Failed',
        text: isThai ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่' : 'Unable to connect to server. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3b82f6',
      });
    } finally {
      setLoading(false);
    }
  };

  /* ===== Step config for progress bar ===== */
  const steps = [
    { icon: 'fa-globe', label: isThai ? 'ประเภทผู้ใช้' : 'User Type' },
    { icon: 'fa-envelope', label: isThai ? 'บัญชีผู้ใช้' : 'Account' },
    { icon: 'fa-user', label: isThai ? 'ข้อมูลส่วนตัว' : 'Personal' },
    { icon: 'fa-heart-pulse', label: isThai ? 'ข้อมูลเพิ่มเติม' : 'Additional' },
  ];

  return (
    <div className="min-h-screen bg-section dark:bg-darkmode flex items-center justify-center px-4 py-28">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="bg-white dark:bg-darklight rounded-2xl shadow-deatail_shadow border border-border dark:border-dark_border overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-4">
            <h1 className="text-2xl font-bold text-midnight_text dark:text-white text-center">
              {isThai ? 'สมัครสมาชิก' : 'Create Account'}
            </h1>
            <p className="text-grey dark:text-white/50 text-sm text-center mt-1.5">
              {isThai ? 'กรอกข้อมูลเพื่อลงทะเบียนใช้บริการ Whocare Hospital' : 'Register to use Whocare Hospital services'}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="px-8 pb-6 pt-2">
            <div className="flex items-center justify-between">
              {steps.map((s, i) => {
                const stepNum = i + 1;
                const isActive = step === stepNum;
                const isDone = step > stepNum;
                return (
                  <div key={stepNum} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                          isDone
                            ? 'bg-green-500 text-white'
                            : isActive
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'bg-section dark:bg-darkmode text-grey dark:text-white/40 border border-border dark:border-dark_border'
                        }`}
                      >
                        {isDone ? (
                          <i className="fa-solid fa-check" />
                        ) : (
                          <i className={`fa-solid ${s.icon}`} />
                        )}
                      </div>
                      <span
                        className={`text-[11px] mt-1.5 font-medium transition-colors ${
                          isActive ? 'text-primary' : isDone ? 'text-green-500' : 'text-grey dark:text-white/40'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {stepNum < TOTAL_STEPS && (
                      <div className="flex-1 mx-2 mt-[-18px]">
                        <div className="h-0.5 bg-border dark:bg-dark_border rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isDone ? 'w-full bg-green-500' : 'w-0 bg-primary'
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-6 space-y-5">
            {/* ===== STEP 1: User Type ===== */}
            {step === 1 && (
              <div className="space-y-5 animate-fadeIn">
                <SectionLabel icon="fa-globe" label={isThai ? 'เลือกประเภทผู้ใช้' : 'Select User Type'} />

                <p className="text-sm text-grey dark:text-white/50 text-center">
                  {isThai ? 'กรุณาเลือกสัญชาติของคุณเพื่อดำเนินการต่อ' : 'Please select your nationality to continue'}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setUserType('thai')}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                      isThai
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-lg shadow-primary/15'
                        : 'border-border dark:border-dark_border bg-section dark:bg-darkmode hover:border-primary/40'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all ${
                      isThai ? 'bg-primary text-white' : 'bg-border dark:bg-dark_border text-grey dark:text-white/40'
                    }`}>
                      <i className="fa-solid fa-id-card" />
                    </div>
                    <div className="text-center">
                      <p className={`font-semibold text-sm ${
                        isThai ? 'text-primary' : 'text-midnight_text dark:text-white/70'
                      }`}>คนไทย</p>
                      <p className="text-xs text-grey dark:text-white/40 mt-0.5">Thai Citizen</p>
                    </div>
                    {isThai && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <i className="fa-solid fa-check text-white text-[10px]" />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserType('foreign')}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                      !isThai
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-lg shadow-primary/15'
                        : 'border-border dark:border-dark_border bg-section dark:bg-darkmode hover:border-primary/40'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all ${
                      !isThai ? 'bg-primary text-white' : 'bg-border dark:bg-dark_border text-grey dark:text-white/40'
                    }`}>
                      <i className="fa-solid fa-passport" />
                    </div>
                    <div className="text-center">
                      <p className={`font-semibold text-sm ${
                        !isThai ? 'text-primary' : 'text-midnight_text dark:text-white/70'
                      }`}>Foreigner</p>
                      <p className="text-xs text-grey dark:text-white/40 mt-0.5">ชาวต่างชาติ</p>
                    </div>
                    {!isThai && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <i className="fa-solid fa-check text-white text-[10px]" />
                      </div>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ===== STEP 2: Account ===== */}
            {step === 2 && (
              <div className="space-y-5 animate-fadeIn">
                <SectionLabel icon="fa-envelope" label={isThai ? 'อีเมลและรหัสผ่าน' : 'Email & Password'} />

                <FormInput
                  label={isThai ? 'อีเมล' : 'Email'}
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder={isThai ? 'example@email.com' : 'your@email.com'}
                  icon="fa-envelope"
                  autoFocus
                />

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-midnight_text dark:text-white/80 mb-1.5">
                    {isThai ? 'รหัสผ่าน' : 'Password'}
                  </label>
                  <div className="relative">
                    <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-grey dark:text-white/40 text-sm" />
                    <input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder={isThai ? 'อย่างน้อย 8 ตัวอักษร' : 'At least 8 characters'}
                      className="w-full pl-10 pr-4 py-3 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white placeholder:text-grey/50 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-midnight_text dark:text-white/80 mb-1.5">
                    {isThai ? 'ยืนยันรหัสผ่าน' : 'Confirm Password'}
                  </label>
                  <div className="relative">
                    <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-grey dark:text-white/40 text-sm" />
                    <input
                      name="confirmPassword"
                      type="password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder={isThai ? 'กรอกรหัสผ่านอีกครั้ง' : 'Re-enter password'}
                      className="w-full pl-10 pr-4 py-3 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white placeholder:text-grey/50 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ===== STEP 3: Personal Info ===== */}
            {step === 3 && (
              <div className="space-y-3.5 animate-fadeIn">
                <SectionLabel icon="fa-user" label={isThai ? 'ข้อมูลส่วนตัว' : 'Personal Information'} />

                {/* Title + First Name */}
                <div className="grid grid-cols-3 gap-3">
                  <FormSelect
                    label={isThai ? 'คำนำหน้า' : 'Title'}
                    name={isThai ? 'titleTh' : 'titleEn'}
                    value={isThai ? form.titleTh : form.titleEn}
                    onChange={handleChange}
                    options={isThai ? thTitles : enTitles}
                  />
                  <div className="col-span-2">
                    <FormInput
                      label={isThai ? 'ชื่อ' : 'First Name'}
                      name={isThai ? 'firstNameTh' : 'firstNameEn'}
                      value={isThai ? form.firstNameTh : form.firstNameEn}
                      onChange={handleChange}
                      placeholder={isThai ? 'ชื่อจริง' : 'First name'}
                      icon="fa-user"
                    />
                  </div>
                </div>

                {/* Last Name + ID (same row) */}
                {isThai ? (
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput
                      label="นามสกุล"
                      name="lastNameTh"
                      value={form.lastNameTh}
                      onChange={handleChange}
                      placeholder="นามสกุล"
                      icon="fa-user"
                    />
                    <FormInput
                      label="เลขบัตรประชาชน"
                      name="thaiId"
                      value={form.thaiId}
                      onChange={handleThaiIdChange}
                      placeholder="X-XXXX-XXXXX-XX-X"
                      maxLength={17}
                      icon="fa-address-card"
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <FormInput
                        label="Last Name"
                        name="lastNameEn"
                        value={form.lastNameEn}
                        onChange={handleChange}
                        placeholder="Last name"
                        icon="fa-user"
                      />
                      <FormInput
                        label="Passport Number"
                        name="passport"
                        value={form.passport}
                        onChange={handleChange}
                        placeholder="e.g. AB1234567"
                        icon="fa-passport"
                      />
                    </div>
                    <FormInput
                      label="Nationality"
                      name="nationality"
                      value={form.nationality}
                      onChange={handleChange}
                      placeholder="e.g. Japanese, American"
                      icon="fa-flag"
                    />
                  </>
                )}

                {/* Birth Date */}
                <div>
                  <div>
                    <label className="block text-sm font-medium text-midnight_text dark:text-white/80 mb-1.5">
                      {isThai ? 'วันเกิด' : 'Date of Birth'}
                    </label>
                    <div className="relative">
                      <i className="fa-solid fa-calendar absolute left-3.5 top-1/2 -translate-y-1/2 text-grey dark:text-white/40 text-sm z-10" />
                      <DatePicker
                        selected={form.birthDate ? new Date(form.birthDate + 'T00:00:00') : null}
                        onChange={(date) => {
                          if (date) {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            setForm((prev) => ({ ...prev, birthDate: `${y}-${m}-${d}` }));
                          } else {
                            setForm((prev) => ({ ...prev, birthDate: '' }));
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        maxDate={new Date()}
                        placeholderText={isThai ? 'วว/ดด/ปปปป' : 'DD/MM/YYYY'}
                        className="w-full pl-10 pr-4 py-3 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white placeholder:text-grey/50 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        wrapperClassName="w-full"
                        popperClassName="datepicker-popper"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== STEP 4: Medical + Contact + Terms ===== */}
            {step === 4 && (
              <div className="space-y-5 animate-fadeIn">
                <SectionLabel icon="fa-heart-pulse" label={isThai ? 'ข้อมูลทางการแพทย์' : 'Medical Information'} />

                <div className="grid grid-cols-2 gap-3">
                  <FormSelect
                    label={isThai ? 'กรุ๊ปเลือด' : 'Blood Type'}
                    name="bloodType"
                    value={form.bloodType}
                    onChange={handleChange}
                    options={['A', 'B', 'AB', 'O', isThai ? 'ไม่ทราบ' : 'Unknown']}
                    icon="fa-droplet"
                  />
                  <FormInput
                    label={isThai ? 'ยาที่แพ้' : 'Drug Allergies'}
                    name="allergies"
                    value={form.allergies}
                    onChange={handleChange}
                    placeholder={isThai ? 'ถ้าไม่มี เว้นว่าง' : 'None if N/A'}
                    icon="fa-triangle-exclamation"
                  />
                </div>

                <SectionLabel icon="fa-phone" label={isThai ? 'ข้อมูลการติดต่อ' : 'Contact Information'} />

                <FormInput
                  label={isThai ? 'เบอร์โทรศัพท์' : 'Phone Number'}
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder={isThai ? '0XX-XXX-XXXX' : '+XX-XXX-XXX-XXXX'}
                  icon="fa-phone"
                />

                {/* Terms */}
                <label className="flex items-start gap-3 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={form.agreeTerms}
                    onChange={handleChange}
                    className="w-4 h-4 mt-0.5 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-grey dark:text-white/60 leading-relaxed">
                    {isThai ? (
                      <>
                        ข้าพเจ้ายอมรับ{' '}
                        <a href="#" className="text-primary hover:underline font-medium">ข้อกำหนดการใช้งาน</a>{' '}
                        และ{' '}
                        <a href="#" className="text-primary hover:underline font-medium">นโยบายความเป็นส่วนตัว</a>{' '}
                        ของ Whocare Hospital
                      </>
                    ) : (
                      <>
                        I agree to the{' '}
                        <a href="#" className="text-primary hover:underline font-medium">Terms of Service</a>{' '}
                        and{' '}
                        <a href="#" className="text-primary hover:underline font-medium">Privacy Policy</a>{' '}
                        of Whocare Hospital
                      </>
                    )}
                  </span>
                </label>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                <i className="fa-solid fa-circle-exclamation shrink-0" />
                {error}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 pt-1">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 py-3.5 border border-border dark:border-dark_border text-midnight_text dark:text-white rounded-xl font-semibold text-sm hover:bg-section dark:hover:bg-darkmode active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-arrow-left text-xs" />
                  {isThai ? 'ย้อนกลับ' : 'Back'}
                </button>
              )}

              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/25 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isThai ? 'ถัดไป' : 'Next'}
                  <i className="fa-solid fa-arrow-right text-xs" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!form.agreeTerms || loading}
                  className="flex-1 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <i className="fa-solid fa-spinner fa-spin" />
                  ) : (
                    <i className="fa-solid fa-user-plus" />
                  )}
                  {loading
                    ? (isThai ? 'กำลังสมัคร...' : 'Creating account...')
                    : (isThai ? 'สมัครสมาชิก' : 'Create Account')
                  }
                </button>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8">
            <p className="text-center text-sm text-grey dark:text-white/50">
              {isThai ? (
                <>
                  มีบัญชีอยู่แล้ว?{' '}
                  <Link to="/login" className="text-primary font-semibold hover:underline">
                    เข้าสู่ระบบ
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary font-semibold hover:underline">
                    Sign In
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===== Section Label ===== */
const SectionLabel = ({ icon, label }) => (
  <div className="flex items-center gap-2 pt-2">
    <i className={`fa-solid ${icon} text-primary text-xs`} />
    <span className="text-xs font-semibold text-primary uppercase tracking-wider">{label}</span>
    <div className="flex-1 h-px bg-border dark:bg-dark_border" />
  </div>
);

/* ===== Reusable Input ===== */
const FormInput = ({ label, icon, className = '', ...props }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-midnight_text dark:text-white/80 mb-1.5">
      {label}
    </label>
    <div className="relative">
      {icon && (
        <i className={`fa-solid ${icon} absolute left-3.5 top-1/2 -translate-y-1/2 text-grey dark:text-white/40 text-sm`} />
      )}
      <input
        {...props}
        className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white placeholder:text-grey/50 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all`}
      />
    </div>
  </div>
);

/* ===== Reusable Select ===== */
const FormSelect = ({ label, name, value, onChange, options, icon, className = '' }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-midnight_text dark:text-white/80 mb-1.5">
      {label}
    </label>
    <div className="relative">
      {icon && (
        <i className={`fa-solid ${icon} absolute left-3.5 top-1/2 -translate-y-1/2 text-grey dark:text-white/40 text-sm`} />
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-8 py-3 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer`}
      >
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-grey dark:text-white/40 text-xs pointer-events-none" />
    </div>
  </div>
);

export default RegisterPage;
