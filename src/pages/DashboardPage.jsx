import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth, ROLE_CONFIG } from '../context/AuthContext';
import { apiGetDashboard } from '../services/api';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, getDisplayName, getUserRole, getRoleConfig, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const role = getUserRole();
  const config = getRoleConfig();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (isAdmin()) {
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadDashboard = async () => {
    try {
      const result = await apiGetDashboard();
      if (result.success) {
        setStats(result.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-section dark:bg-darkmode">
        <div className="flex flex-col items-center gap-3">
          <Icon icon="mdi:loading" width="40" className="text-primary animate-spin" />
          <p className="text-grey dark:text-white/50">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // Build menu items based on role (use exact role match to prevent duplicates)
  const getMenuItems = () => {
    const items = [];

    // Common: Profile
    items.push({
      icon: 'mdi:account-edit',
      label: 'โปรไฟล์',
      desc: 'ดูและแก้ไขข้อมูลส่วนตัว',
      to: '/profile',
      color: 'blue',
    });

    // === super_admin: sees all management items ONCE ===
    if (role === 'super_admin') {
      items.push(
        { icon: 'mdi:medical-bag', label: 'จัดการบริการ', desc: 'เพิ่ม / แก้ไข / ลบ บริการทั้งหมด', to: '/admin/services', color: 'green' },
        { icon: 'mdi:calendar-clock', label: 'จัดการนัดหมาย', desc: 'ภาพรวมนัดหมายทั้งหมด', to: '/admin/appointments', color: 'blue' },
        { icon: 'mdi:account-group', label: 'จัดการผู้ใช้', desc: 'สร้าง / แก้ไข / ลบ / กำหนด Role', to: '/admin/users', color: 'red' },
        { icon: 'mdi:finance', label: 'จัดการการเงิน', desc: 'ภาพรวมการเงิน / คืนเงิน', to: '/admin/finance', color: 'indigo' },
        { icon: 'mdi:shield-check', label: 'จัดการสิทธิ์', desc: 'Permission Matrix', to: '/admin/permissions', color: 'amber' },
        { icon: 'mdi:file-document-outline', label: 'Audit Log', desc: 'ประวัติการใช้งานระบบ', to: '/admin/audit-logs', color: 'purple' },
        { icon: 'mdi:newspaper-variant-multiple', label: 'จัดการบทความ', desc: 'เขียน / แก้ไข / เผยแพร่บทความ', to: '/admin/news', color: 'pink' },
      );
    }

    // === manager ===
    if (role === 'manager') {
      items.push(
        { icon: 'mdi:medical-bag', label: 'จัดการบริการ', desc: 'เพิ่ม / แก้ไข / ลบ บริการทั้งหมด', to: '/admin/services', color: 'green' },
        { icon: 'mdi:calendar-clock', label: 'จัดการนัดหมาย', desc: 'ภาพรวมนัดหมายทั้งหมด', to: '/admin/appointments', color: 'blue' },
        { icon: 'mdi:account-group', label: 'จัดการผู้ใช้', desc: 'สร้าง / แก้ไข / ลบ / กำหนด Role', to: '/admin/users', color: 'red' },
        { icon: 'mdi:finance', label: 'จัดการการเงิน', desc: 'ภาพรวมการเงิน / คืนเงิน', to: '/admin/finance', color: 'indigo' },
        { icon: 'mdi:newspaper-variant-multiple', label: 'จัดการบทความ', desc: 'เขียน / แก้ไข / เผยแพร่บทความ', to: '/admin/news', color: 'pink' },
      );
    }

    // === doctor ===
    if (role === 'doctor') {
      items.push(
        { icon: 'mdi:calendar-check', label: 'ตารางนัด', desc: 'ดูตารางนัดของตัวเอง', to: '/admin/appointments', color: 'purple' },
        { icon: 'mdi:newspaper-variant-multiple', label: 'จัดการบทความ', desc: 'เขียนบทความสุขภาพ', to: '/admin/news', color: 'pink' },
      );
    }

    // === nurse ===
    if (role === 'nurse') {
      items.push(
        { icon: 'mdi:calendar-clock', label: 'จัดการนัดหมาย', desc: 'ดูนัดหมายทั้งหมด', to: '/admin/appointments', color: 'blue' },
      );
    }

    // === reception ===
    if (role === 'reception') {
      items.push(
        { icon: 'mdi:calendar-edit', label: 'จัดการนัดหมาย', desc: 'สร้าง / เลื่อน / ยกเลิก', to: '/admin/appointments', color: 'blue' },
        { icon: 'mdi:finance', label: 'จัดการการเงิน', desc: 'อนุมัติคืนเงิน', to: '/admin/finance', color: 'indigo' },
      );
    }

    // === accountant ===
    if (role === 'accountant') {
      items.push(
        { icon: 'mdi:finance', label: 'จัดการการเงิน', desc: 'ภาพรวมการเงิน / คืนเงิน', to: '/admin/finance', color: 'indigo' },
      );
    }

    // === patient ===
    if (role === 'patient') {
      items.push(
        { icon: 'mdi:calendar-check', label: 'การจองของฉัน', desc: 'ดูนัดหมาย / เลื่อน / คืนเงิน', to: '/my-bookings', color: 'sky' },
      );
    }

    return items;
  };

  const colorMap = {
    red: { bg: 'bg-red-500/10 dark:bg-red-500/20', text: 'text-red-500', hover: 'hover:border-red-500/40' },
    blue: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-500', hover: 'hover:border-blue-500/40' },
    green: { bg: 'bg-green-500/10 dark:bg-green-500/20', text: 'text-green-500', hover: 'hover:border-green-500/40' },
    purple: { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-500', hover: 'hover:border-purple-500/40' },
    amber: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-500', hover: 'hover:border-amber-500/40' },
    indigo: { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-500', hover: 'hover:border-indigo-500/40' },
    sky: { bg: 'bg-sky-500/10 dark:bg-sky-500/20', text: 'text-sky-500', hover: 'hover:border-sky-500/40' },
    pink: { bg: 'bg-pink-500/10 dark:bg-pink-500/20', text: 'text-pink-500', hover: 'hover:border-pink-500/40' },
  };

  const menuItems = getMenuItems();

  return (
    <div className="min-h-screen bg-section dark:bg-darkmode pt-32 pb-16 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Welcome Card */}
        <div className="bg-white dark:bg-darklight rounded-2xl shadow-deatail_shadow border border-border dark:border-dark_border overflow-hidden mb-6">
          <div className="bg-linear-to-r from-primary to-blue-400 px-6 py-8 sm:px-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Icon icon={config.icon} width="32" className="text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  สวัสดี, {getDisplayName()}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm text-white">
                    <Icon icon={config.icon} width="14" />
                    {config.labelTh}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar for admins */}
          {stats && isAdmin() && (
            <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border dark:border-dark_border">
              <div className="px-4 py-4 text-center border-r border-b sm:border-b-0 border-border dark:border-dark_border">
                <p className="text-2xl font-bold text-primary">{stats.totalUsers}</p>
                <p className="text-xs text-grey dark:text-white/50 mt-0.5">ผู้ใช้ทั้งหมด</p>
              </div>
              <div className="px-4 py-4 text-center border-b sm:border-b-0 sm:border-r border-border dark:border-dark_border">
                <p className="text-2xl font-bold text-green-500">{stats.recentRegistrations}</p>
                <p className="text-xs text-grey dark:text-white/50 mt-0.5">สมัครใหม่ 7 วัน</p>
              </div>
              <div className="px-4 py-4 text-center border-r border-border dark:border-dark_border">
                <p className="text-2xl font-bold text-purple-500">
                  {stats.roleDistribution?.length || 0}
                </p>
                <p className="text-xs text-grey dark:text-white/50 mt-0.5">สิทธิ์ที่ใช้งาน</p>
              </div>
              <div className="px-4 py-4 text-center">
                <p className="text-2xl font-bold text-amber-500">
                  {stats.recentActivity?.length || 0}
                </p>
                <p className="text-xs text-grey dark:text-white/50 mt-0.5">กิจกรรมล่าสุด</p>
              </div>
            </div>
          )}
        </div>

        {/* Role distribution for admin */}
        {stats && isAdmin() && stats.roleDistribution && (
          <div className="bg-white dark:bg-darklight rounded-2xl shadow-deatail_shadow border border-border dark:border-dark_border p-6 mb-6">
            <h2 className="text-lg font-bold text-midnight_text dark:text-white mb-4 flex items-center gap-2">
              <Icon icon="mdi:chart-donut" width="22" className="text-primary" />
              การกระจายตัวของ Role
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stats.roleDistribution.map((item) => {
                const rc = ROLE_CONFIG[item.role] || ROLE_CONFIG.patient;
                return (
                  <div
                    key={item.role}
                    className={`flex items-center gap-3 p-3 rounded-xl ${rc.bgColor}`}
                  >
                    <Icon icon={rc.icon} width="24" className={rc.textColor} />
                    <div>
                      <p className={`text-lg font-bold ${rc.textColor}`}>{item.count}</p>
                      <p className="text-xs text-grey dark:text-white/50">{rc.labelTh}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item, i) => {
            const c = colorMap[item.color] || colorMap.blue;
            const isLink = item.to && item.to !== '#';
            const Wrapper = isLink ? Link : 'div';
            const wrapperProps = isLink ? { to: item.to } : {};

            return (
              <Wrapper
                key={i}
                {...wrapperProps}
                className={`group bg-white dark:bg-darklight rounded-2xl shadow-service border border-border dark:border-dark_border p-5 transition-all duration-200 ${c.hover} hover:shadow-lg ${isLink ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon icon={item.icon} width="24" className={c.text} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-midnight_text dark:text-white group-hover:text-primary transition-colors">
                      {item.label}
                    </p>
                    <p className="text-xs text-grey dark:text-white/40 mt-0.5">
                      {item.desc}
                    </p>
                    {!isLink && (
                      <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-section dark:bg-darkmode text-grey dark:text-white/40">
                        เร็วๆ นี้
                      </span>
                    )}
                  </div>
                  {isLink && (
                    <Icon
                      icon="mdi:chevron-right"
                      width="20"
                      className="text-grey/30 group-hover:text-primary group-hover:translate-x-1 transition-all mt-1"
                    />
                  )}
                </div>
              </Wrapper>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
