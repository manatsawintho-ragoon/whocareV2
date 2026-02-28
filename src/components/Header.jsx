import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { menuItems } from '../data/data';
import { Icon } from '@iconify/react';
import HospitalModal from './HospitalModal';
import { useAuth, ROLE_CONFIG } from '../context/AuthContext';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, getDisplayName, getUserRole, getRoleConfig, isStaff, isAdmin } = useAuth();
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [sticky, setSticky] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [hospitalModalOpen, setHospitalModalOpen] = useState(false);
  const [mobileDropdown, setMobileDropdown] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);
  const hoverTimeout = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setSticky(window.scrollY >= 80);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (navbarOpen || hospitalModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [navbarOpen, hospitalModalOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleMenuClick = (item, index) => {
    if (item.type === 'dropdown') {
      setOpenDropdown(openDropdown === index ? null : index);
    } else if (item.type === 'hospital-modal') {
      setHospitalModalOpen(true);
    }
  };

  return (
    <>
      <header
        className={`fixed h-24 top-0 py-1 z-50 w-full transition-all ${
          sticky
            ? 'shadow-lg bg-white dark:shadow-dark-md dark:bg-darklight!'
            : 'shadow-none bg-white/80 dark:bg-transparent'
        }`}
      >
        <div className="container mx-auto max-w-6xl flex items-center justify-between p-6">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <img
              src="/images/logo/logo.svg"
              alt="Whocare Hospital"
              className="h-10 w-auto"
            />
          </a>

          {/* Desktop Navigation */}
          <nav
            className="hidden lg:flex grow items-center justify-center gap-8"
            ref={dropdownRef}
          >
            {menuItems.map((item, index) => {
              // Dropdown menu
              if (item.type === 'dropdown') {
                return (
                  <div
                    key={index}
                    className="relative cursor-pointer"
                    onMouseEnter={() => {
                      clearTimeout(hoverTimeout.current);
                      setOpenDropdown(index);
                    }}
                    onMouseLeave={() => {
                      hoverTimeout.current = setTimeout(() => {
                        setOpenDropdown(null);
                      }, 150);
                    }}
                  >
                    <button
                      onClick={() => handleMenuClick(item, index)}
                      className={`cursor-pointer text-base font-medium transition-colors hover:text-primary dark:text-white/80 dark:hover:text-primary flex items-center gap-1 ${
                        openDropdown === index
                          ? 'text-primary'
                          : 'text-midnight_text'
                      }`}
                    >
                      {item.name}
                      <Icon
                        icon="mdi:chevron-down"
                        width="20"
                        className={`transition-transform duration-300 ${
                          openDropdown === index ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Dropdown panel */}
                    <div
                      className={`absolute top-full left-1/2 -translate-x-1/2 pt-5 z-50 transition-all duration-300 ${
                        openDropdown === index
                          ? 'opacity-100 translate-y-0 visible'
                          : 'opacity-0 -translate-y-2 invisible'
                      }`}
                    >
                      {/* Arrow */}
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-darkmode border-l border-t border-border dark:border-dark_border rotate-45 z-10" />

                      <div className="w-80 bg-white dark:bg-darkmode rounded-2xl shadow-2xl border border-border dark:border-dark_border overflow-hidden">

                        {/* Items */}
                        <div className="py-2">
                          {item.children.map((child, cIndex) => (
                            <a
                              key={cIndex}
                              href={child.href}
                              onClick={() => setOpenDropdown(null)}
                              className="group flex items-center gap-3 px-5 py-3 hover:bg-linear-to-r hover:from-primary/5 hover:to-transparent dark:hover:from-primary/10 transition-all duration-200"
                            >
                              <div className="shrink-0 w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                                <Icon
                                  icon={child.icon}
                                  width="18"
                                  className="text-primary group-hover:text-white transition-colors duration-300"
                                />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-midnight_text dark:text-white group-hover:text-primary transition-colors duration-200">
                                  {child.name}
                                </p>
                                <p className="text-xs text-grey dark:text-white/40 group-hover:text-grey/80 transition-colors duration-200">
                                  {child.desc}
                                </p>
                              </div>
                              <Icon
                                icon="mdi:chevron-right"
                                width="16"
                                className="ml-auto text-transparent group-hover:text-primary transition-all duration-300 group-hover:translate-x-1"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Hospital modal trigger
              if (item.type === 'hospital-modal') {
                return (
                  <button
                    key={index}
                    onClick={() => handleMenuClick(item, index)}
                    className="cursor-pointer text-base font-medium transition-colors hover:text-primary dark:text-white/80 dark:hover:text-primary text-midnight_text flex items-center gap-1"
                  >
                    <Icon icon="mdi:store-marker" width="18" />
                    {item.name}
                  </button>
                );
              }

              // Regular link
              return (
                <a
                  key={index}
                  href={item.href}
                  className={`text-base font-medium transition-colors hover:text-primary dark:text-white/80 dark:hover:text-primary ${
                    location.pathname === item.href
                      ? 'text-primary'
                      : 'text-midnight_text'
                  }`}
                >
                  {item.name}
                </a>
              );
            })}
          </nav>

          {/* Right side buttons */}
          <div className="flex items-center gap-4">
            {/* Dark mode toggle */}
            <button
              aria-label="Toggle theme"
              onClick={toggleDarkMode}
              className="flex h-8 w-8 items-center justify-center text-body-color duration-300 dark:text-white cursor-pointer"
            >
              <svg
                viewBox="0 0 16 16"
                className="hidden h-6 w-6 fill-white dark:block"
              >
                <path d="M4.50663 3.2267L3.30663 2.03337L2.36663 2.97337L3.55996 4.1667L4.50663 3.2267ZM2.66663 7.00003H0.666626V8.33337H2.66663V7.00003ZM8.66663 0.366699H7.33329V2.33337H8.66663V0.366699V0.366699ZM13.6333 2.97337L12.6933 2.03337L11.5 3.2267L12.44 4.1667L13.6333 2.97337ZM11.4933 12.1067L12.6866 13.3067L13.6266 12.3667L12.4266 11.1734L11.4933 12.1067ZM13.3333 7.00003V8.33337H15.3333V7.00003H13.3333ZM7.99996 3.6667C5.79329 3.6667 3.99996 5.46003 3.99996 7.6667C3.99996 9.87337 5.79329 11.6667 7.99996 11.6667C10.2066 11.6667 12 9.87337 12 7.6667C12 5.46003 10.2066 3.6667 7.99996 3.6667ZM7.33329 14.9667H8.66663V13H7.33329V14.9667ZM2.36663 12.36L3.30663 13.3L4.49996 12.1L3.55996 11.16L2.36663 12.36Z" />
              </svg>
              <svg
                viewBox="0 0 23 23"
                className="h-8 w-8 fill-midnight_text dark:hidden"
              >
                <path d="M16.6111 15.855C17.591 15.1394 18.3151 14.1979 18.7723 13.1623C16.4824 13.4065 14.1342 12.4631 12.6795 10.4711C11.2248 8.47905 11.0409 5.95516 11.9705 3.84818C10.8449 3.9685 9.72768 4.37162 8.74781 5.08719C5.7759 7.25747 5.12529 11.4308 7.29558 14.4028C9.46586 17.3747 13.6392 18.0253 16.6111 15.855Z" />
              </svg>
            </button>

            {/* เข้าสู่ระบบ / สมัครสมาชิก / User menu */}
            {user ? (
              <div className="hidden lg:block relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  <Icon icon="mdi:account-circle" width="22" />
                  <span className="font-medium text-sm max-w-[140px] truncate">
                    {getDisplayName()}
                  </span>
                  <Icon
                    icon="mdi:chevron-down"
                    width="18"
                    className={`transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* User dropdown */}
                <div
                  className={`absolute right-0 top-full mt-2 w-56 bg-white dark:bg-darkmode rounded-xl shadow-xl border border-border dark:border-dark_border overflow-hidden transition-all duration-200 z-50 ${
                    userMenuOpen
                      ? 'opacity-100 translate-y-0 visible'
                      : 'opacity-0 -translate-y-2 invisible'
                  }`}
                >
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-dark_border">
                    <p className="text-sm font-semibold text-midnight_text dark:text-white truncate">
                      {getDisplayName()}
                    </p>
                    <p className="text-xs text-grey dark:text-white/50 truncate">{user.email}</p>
                    {user.role && (
                      <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${getRoleConfig().bgColor} ${getRoleConfig().textColor}`}>
                        <Icon icon={getRoleConfig().icon} width="11" />
                        {getRoleConfig().labelTh}
                      </span>
                    )}
                  </div>
                  <div className="py-1">
                    <Link
                      to="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-midnight_text dark:text-white hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                    >
                      <Icon icon="mdi:view-dashboard" width="18" />
                      แดชบอร์ด
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-midnight_text dark:text-white hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                    >
                      <Icon icon="mdi:account-edit" width="18" />
                      แก้ไขโปรไฟล์
                    </Link>
                    {isAdmin() && (
                      <Link
                        to="/admin/users"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-midnight_text dark:text-white hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                      >
                        <Icon icon="mdi:account-group" width="18" />
                        จัดการผู้ใช้
                      </Link>
                    )}
                    <button
                      onClick={async () => {
                        setUserMenuOpen(false);
                        const confirm = await Swal.fire({
                          title: 'ออกจากระบบ',
                          text: 'คุณต้องการออกจากระบบหรือไม่?',
                          icon: 'warning',
                          showCancelButton: true,
                          confirmButtonColor: '#ef4444',
                          cancelButtonColor: '#6b7280',
                          confirmButtonText: 'ออกจากระบบ',
                          cancelButtonText: 'ยกเลิก',
                        });
                        if (confirm.isConfirmed) {
                          await logout();
                          await Swal.fire({
                            title: 'ออกจากระบบสำเร็จ',
                            text: 'ขอบคุณที่ใช้บริการ',
                            icon: 'success',
                            confirmButtonColor: '#3b82f6',
                            timer: 2000,
                            timerProgressBar: true,
                          });
                          navigate('/');
                        }
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Icon icon="mdi:logout" width="18" />
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden lg:block bg-transparent border border-primary text-primary px-4 py-2 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  to="/register"
                  className="hidden lg:block bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  สมัครสมาชิก
                </Link>
              </>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setNavbarOpen(!navbarOpen)}
              className="block lg:hidden p-2 rounded-lg cursor-pointer"
              aria-label="Toggle mobile menu"
            >
              <span className="block w-6 h-0.5 bg-black dark:bg-white"></span>
              <span className="block w-6 h-0.5 bg-black dark:bg-white mt-1.5"></span>
              <span className="block w-6 h-0.5 bg-black dark:bg-white mt-1.5"></span>
            </button>
          </div>
        </div>

        {/* Mobile menu overlay */}
        {navbarOpen && (
          <div
            className="fixed top-0 left-0 w-full h-full bg-black/50 z-40"
            onClick={() => setNavbarOpen(false)}
          />
        )}

        {/* Mobile menu */}
        <div
          className={`lg:hidden fixed top-0 right-0 h-full w-full bg-white dark:bg-darkmode shadow-lg transform transition-transform duration-300 max-w-xs ${
            navbarOpen ? 'translate-x-0' : 'translate-x-full'
          } z-50 overflow-y-auto`}
        >
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-bold text-midnight_text dark:text-white">
              เมนู
            </h2>
            <button
              onClick={() => setNavbarOpen(false)}
              aria-label="Close mobile menu"
            >
              <Icon
                icon="ic:round-close"
                className="text-2xl dark:text-white"
              />
            </button>
          </div>
          <nav className="flex flex-col items-start p-4">
            {menuItems.map((item, index) => {
              // Mobile dropdown
              if (item.type === 'dropdown') {
                return (
                  <div
                    key={index}
                    className="w-full border-b border-gray-100 dark:border-dark_border"
                  >
                    <button
                      onClick={() =>
                        setMobileDropdown(
                          mobileDropdown === index ? null : index
                        )
                      }
                      className="w-full py-3 text-base font-medium text-midnight_text dark:text-white hover:text-primary flex items-center justify-between"
                    >
                      {item.name}
                      <Icon
                        icon="mdi:chevron-down"
                        width="20"
                        className={`transition-transform duration-200 ${
                          mobileDropdown === index ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        mobileDropdown === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="pl-2 pb-2 space-y-1">
                        {item.children.map((child, cIndex) => (
                          <a
                            key={cIndex}
                            href={child.href}
                            onClick={() => {
                              setNavbarOpen(false);
                              setMobileDropdown(null);
                            }}
                            className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm text-midnight_text dark:text-white/70 hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary transition-all duration-200"
                          >
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Icon icon={child.icon} width="14" className="text-primary" />
                            </div>
                            <span className="font-medium">{child.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              // Mobile hospital modal trigger
              if (item.type === 'hospital-modal') {
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setNavbarOpen(false);
                      setHospitalModalOpen(true);
                    }}
                    className="w-full py-3 text-base font-medium text-midnight_text dark:text-white hover:text-primary border-b border-gray-100 dark:border-dark_border text-left flex items-center gap-2"
                  >
                    <Icon icon="mdi:store-marker" width="18" />
                    {item.name}
                  </button>
                );
              }

              // Mobile regular link
              return (
                <a
                  key={index}
                  href={item.href}
                  onClick={() => setNavbarOpen(false)}
                  className="w-full py-3 text-base font-medium text-midnight_text dark:text-white hover:text-primary border-b border-gray-100 dark:border-dark_border"
                >
                  {item.name}
                </a>
              );
            })}
            <div className="mt-4 flex flex-col gap-4 w-full">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 rounded-lg">
                    <Icon icon="mdi:account-circle" width="28" className="text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-midnight_text dark:text-white truncate">
                        {getDisplayName()}
                      </p>
                      <p className="text-xs text-grey dark:text-white/50 truncate">{user.email}</p>
                      {user.role && (
                        <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${getRoleConfig().bgColor} ${getRoleConfig().textColor}`}>
                          <Icon icon={getRoleConfig().icon} width="11" />
                          {getRoleConfig().labelTh}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setNavbarOpen(false)}
                    className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Icon icon="mdi:view-dashboard" width="18" />
                    แดชบอร์ด
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setNavbarOpen(false)}
                    className="flex items-center justify-center gap-2 bg-primary/5 text-primary px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    <Icon icon="mdi:account-edit" width="18" />
                    แก้ไขโปรไฟล์
                  </Link>
                  {isAdmin() && (
                    <Link
                      to="/admin/users"
                      onClick={() => setNavbarOpen(false)}
                      className="flex items-center justify-center gap-2 bg-primary/5 text-primary px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      <Icon icon="mdi:account-group" width="18" />
                      จัดการผู้ใช้
                    </Link>
                  )}
                  <button
                    onClick={async () => {
                      setNavbarOpen(false);
                      const confirm = await Swal.fire({
                        title: 'ออกจากระบบ',
                        text: 'คุณต้องการออกจากระบบหรือไม่?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#ef4444',
                        cancelButtonColor: '#6b7280',
                        confirmButtonText: 'ออกจากระบบ',
                        cancelButtonText: 'ยกเลิก',
                      });
                      if (confirm.isConfirmed) {
                        await logout();
                        await Swal.fire({
                          title: 'ออกจากระบบสำเร็จ',
                          text: 'ขอบคุณที่ใช้บริการ',
                          icon: 'success',
                          confirmButtonColor: '#3b82f6',
                          timer: 2000,
                          timerProgressBar: true,
                        });
                        navigate('/');
                      }
                    }}
                    className="flex items-center justify-center gap-2 bg-red-50 dark:bg-red-500/10 text-red-500 px-4 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    <Icon icon="mdi:logout" width="18" />
                    ออกจากระบบ
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setNavbarOpen(false)}
                    className="bg-transparent border border-primary text-primary px-4 py-2 rounded-lg hover:bg-blue-600 hover:text-white text-center"
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setNavbarOpen(false)}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center"
                  >
                    สมัครสมาชิก
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hospital Modal */}
      <HospitalModal
        isOpen={hospitalModalOpen}
        onClose={() => setHospitalModalOpen(false)}
      />
    </>
  );
};

export default Header;
