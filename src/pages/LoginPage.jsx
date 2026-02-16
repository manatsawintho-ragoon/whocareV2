import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { apiLogin } from '../services/api';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [userType, setUserType] = useState('thai');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    thaiId: '',
    passport: '',
    password: '',
    remember: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  // Thai ID formatting: X-XXXX-XXXXX-XX-X
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const isThai = userType === 'thai';

    try {
      const result = await apiLogin({
        userType,
        thaiId: form.thaiId,
        passport: form.passport,
        password: form.password,
      });

      if (result.success) {
        login(result.data.user);
        await Swal.fire({
          title: isThai ? 'เข้าสู่ระบบสำเร็จ' : 'Login Successful',
          text: isThai ? 'ยินดีต้อนรับกลับเข้าสู่ระบบ' : 'Welcome back!',
          icon: 'success',
          confirmButtonColor: '#3b82f6',
          timer: 2000,
          timerProgressBar: true,
        });
        navigate('/');
      } else {
        Swal.fire({
          title: isThai ? 'เข้าสู่ระบบไม่สำเร็จ' : 'Login Failed',
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

  return (
    <div className="min-h-screen bg-section dark:bg-darkmode flex items-center justify-center px-4 py-28">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-darklight rounded-2xl shadow-deatail_shadow border border-border dark:border-dark_border overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-border dark:border-dark_border">
            <h1 className="text-2xl font-bold text-midnight_text dark:text-white text-center">
              เข้าสู่ระบบ
            </h1>
            <p className="text-grey dark:text-white/50 text-sm text-center mt-2">
              กรุณาเข้าสู่ระบบเพื่อใช้บริการ Whocare Hospital
            </p>
          </div>

          {/* User type tabs */}
          <div className="flex border-b border-border dark:border-dark_border">
            <button
              type="button"
              onClick={() => setUserType('thai')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
                userType === 'thai'
                  ? 'text-primary border-primary bg-primary/5'
                  : 'text-grey dark:text-white/50 border-transparent hover:text-midnight_text dark:hover:text-white'
              }`}
            >
              <i className="fa-solid fa-id-card" />
              คนไทย
            </button>
            <button
              type="button"
              onClick={() => setUserType('foreign')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
                userType === 'foreign'
                  ? 'text-primary border-primary bg-primary/5'
                  : 'text-grey dark:text-white/50 border-transparent hover:text-midnight_text dark:hover:text-white'
              }`}
            >
              <i className="fa-solid fa-passport" />
              Foreigner
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {/* ID Field */}
            {userType === 'thai' ? (
              <div>
                <label className="block text-sm font-medium text-midnight_text dark:text-white/80 mb-1.5">
                  เลขบัตรประชาชน
                </label>
                <div className="relative">
                  <i className="fa-solid fa-address-card absolute left-3.5 top-1/2 -translate-y-1/2 text-grey dark:text-white/40 text-sm" />
                  <input
                    name="thaiId"
                    value={form.thaiId}
                    onChange={handleThaiIdChange}
                    placeholder="X-XXXX-XXXXX-XX-X"
                    maxLength={17}
                    className="w-full pl-10 pr-4 py-3 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white placeholder:text-grey/50 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-midnight_text dark:text-white/80 mb-1.5">
                  Passport Number
                </label>
                <div className="relative">
                  <i className="fa-solid fa-passport absolute left-3.5 top-1/2 -translate-y-1/2 text-grey dark:text-white/40 text-sm" />
                  <input
                    name="passport"
                    value={form.passport}
                    onChange={handleChange}
                    placeholder="e.g. AB1234567"
                    className="w-full pl-10 pr-4 py-3 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white placeholder:text-grey/50 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-midnight_text dark:text-white/80 mb-1.5">
                {userType === 'thai' ? 'รหัสผ่าน' : 'Password'}
              </label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-grey dark:text-white/40 text-sm" />
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder={userType === 'thai' ? 'กรอกรหัสผ่าน' : 'Enter password'}
                  className="w-full pl-10 pr-4 py-3 bg-section dark:bg-darkmode border border-border dark:border-dark_border rounded-xl text-sm text-midnight_text dark:text-white placeholder:text-grey/50 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-grey dark:text-white/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="remember"
                  checked={form.remember}
                  onChange={handleChange}
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
                {userType === 'thai' ? 'จดจำการเข้าใช้งาน' : 'Remember me'}
              </label>
              <a href="#" className="text-primary hover:text-blue-700 font-medium transition-colors">
                {userType === 'thai' ? 'ลืมรหัสผ่าน?' : 'Forgot password?'}
              </a>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                <i className="fa-solid fa-circle-exclamation shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/25 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <i className="fa-solid fa-spinner fa-spin" />
              ) : (
                <i className="fa-solid fa-right-to-bracket" />
              )}
              {loading
                ? (userType === 'thai' ? 'กำลังเข้าสู่ระบบ...' : 'Signing in...')
                : (userType === 'thai' ? 'เข้าสู่ระบบ' : 'Sign In')
              }
            </button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8">
            <p className="text-center text-sm text-grey dark:text-white/50">
              {userType === 'thai' ? (
                <>
                  ยังไม่มีบัญชี?{' '}
                  <Link to="/register" className="text-primary font-semibold hover:underline">
                    สมัครสมาชิก
                  </Link>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <Link to="/register" className="text-primary font-semibold hover:underline">
                    Register
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

export default LoginPage;
