import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';
import { useAuth, ROLE_CONFIG } from '../context/AuthContext';
import { apiGetPermissions, apiUpdatePermission } from '../services/api';

const MODULES = [
  { key: 'users', label: 'ผู้ใช้งาน', icon: 'mdi:account-group' },
  { key: 'patients', label: 'ข้อมูลคนไข้', icon: 'mdi:clipboard-account' },
  { key: 'diagnosis', label: 'การวินิจฉัย', icon: 'mdi:stethoscope' },
  { key: 'prescriptions', label: 'สั่งยา', icon: 'mdi:pill' },
  { key: 'appointments', label: 'นัดหมาย', icon: 'mdi:calendar-check' },
  { key: 'billing', label: 'การเงิน', icon: 'mdi:cash-register' },
  { key: 'reports', label: 'รายงาน', icon: 'mdi:chart-bar' },
  { key: 'settings', label: 'ตั้งค่าระบบ', icon: 'mdi:cog' },
  { key: 'audit_logs', label: 'บันทึกกิจกรรม', icon: 'mdi:file-document' },
  { key: 'permissions', label: 'สิทธิ์', icon: 'mdi:shield-check' },
];

const ROLES_ORDER = ['super_admin', 'doctor', 'nurse', 'reception', 'accountant', 'manager', 'patient'];

const PermissionsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, hasRole } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (!hasRole('super_admin')) { navigate('/dashboard'); return; }
    fetchPermissions();
  }, [user, authLoading]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const result = await apiGetPermissions();
      if (result.success) {
        setPermissions(result.data.permissions);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const getPermission = (role, module) => {
    return permissions.find(p => p.role === role && p.module === module) || {
      can_read: false, can_create: false, can_update: false, can_delete: false,
    };
  };

  const handleToggle = async (role, module, field, currentValue) => {
    if (role === 'super_admin') return; // Don't allow modifying super_admin

    const perm = getPermission(role, module);
    const newPerm = {
      role,
      module,
      can_read: perm.can_read || false,
      can_create: perm.can_create || false,
      can_update: perm.can_update || false,
      can_delete: perm.can_delete || false,
      [field]: !currentValue,
    };

    try {
      const result = await apiUpdatePermission(newPerm);
      if (result.success) {
        fetchPermissions();
      } else {
        Swal.fire({ title: 'ข้อผิดพลาด', text: result.message, icon: 'error', confirmButtonColor: '#3b82f6' });
      }
    } catch {
      Swal.fire({ title: 'ข้อผิดพลาด', icon: 'error', confirmButtonColor: '#3b82f6' });
    }
  };

  const [selectedRole, setSelectedRole] = useState('doctor');

  return (
    <div className="min-h-screen bg-section dark:bg-darkmode pt-32 pb-16 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-midnight_text dark:text-white flex items-center gap-2">
              <Icon icon="mdi:shield-check" width="28" className="text-primary" />
              Permission Matrix
            </h1>
            <p className="text-sm text-grey dark:text-white/50 mt-1">จัดการสิทธิ์การเข้าถึงแต่ละโมดูล</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border dark:border-dark_border text-midnight_text dark:text-white text-sm font-medium hover:bg-section dark:hover:bg-darkmode transition-colors cursor-pointer"
          >
            <Icon icon="mdi:arrow-left" width="18" />
            กลับ Dashboard
          </button>
        </div>

        {/* Role tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {ROLES_ORDER.map((r) => {
            const rc = ROLE_CONFIG[r];
            return (
              <button
                key={r}
                onClick={() => setSelectedRole(r)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  selectedRole === r
                    ? `${rc.bgColor} ${rc.textColor} border ${rc.borderColor}`
                    : 'bg-white dark:bg-darklight text-grey dark:text-white/60 border border-border dark:border-dark_border hover:bg-primary/5'
                }`}
              >
                <Icon icon={rc.icon} width="16" />
                {rc.labelTh}
              </button>
            );
          })}
        </div>

        {/* Permissions table */}
        <div className="bg-white dark:bg-darklight rounded-2xl shadow-deatail_shadow border border-border dark:border-dark_border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Icon icon="mdi:loading" width="36" className="text-primary animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-section dark:bg-darkmode/50 border-b border-border dark:border-dark_border">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-grey dark:text-white/50 uppercase">
                      โมดูล
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-grey dark:text-white/50 uppercase">
                      <div className="flex items-center justify-center gap-1">
                        <Icon icon="mdi:eye" width="14" />
                        อ่าน
                      </div>
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-grey dark:text-white/50 uppercase">
                      <div className="flex items-center justify-center gap-1">
                        <Icon icon="mdi:plus" width="14" />
                        สร้าง
                      </div>
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-grey dark:text-white/50 uppercase">
                      <div className="flex items-center justify-center gap-1">
                        <Icon icon="mdi:pencil" width="14" />
                        แก้ไข
                      </div>
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-grey dark:text-white/50 uppercase">
                      <div className="flex items-center justify-center gap-1">
                        <Icon icon="mdi:delete" width="14" />
                        ลบ
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-dark_border">
                  {MODULES.map((mod) => {
                    const perm = getPermission(selectedRole, mod.key);
                    const isSuperAdmin = selectedRole === 'super_admin';

                    return (
                      <tr key={mod.key} className="hover:bg-section/50 dark:hover:bg-darkmode/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                              <Icon icon={mod.icon} width="16" className="text-primary" />
                            </div>
                            <span className="font-medium text-midnight_text dark:text-white">
                              {mod.label}
                            </span>
                          </div>
                        </td>
                        {['can_read', 'can_create', 'can_update', 'can_delete'].map((field) => (
                          <td key={field} className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleToggle(selectedRole, mod.key, field, perm[field])}
                              disabled={isSuperAdmin}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all mx-auto ${
                                isSuperAdmin ? 'cursor-not-allowed' : 'cursor-pointer'
                              } ${
                                perm[field]
                                  ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                  : 'bg-red-500/5 text-red-300 hover:bg-red-500/10'
                              }`}
                            >
                              <Icon
                                icon={perm[field] ? 'mdi:check-circle' : 'mdi:close-circle'}
                                width="20"
                              />
                            </button>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 text-xs text-grey dark:text-white/40">
          <div className="flex items-center gap-1.5">
            <Icon icon="mdi:check-circle" width="16" className="text-green-500" />
            มีสิทธิ์
          </div>
          <div className="flex items-center gap-1.5">
            <Icon icon="mdi:close-circle" width="16" className="text-red-300" />
            ไม่มีสิทธิ์
          </div>
          {selectedRole === 'super_admin' && (
            <span className="text-amber-500">* Super Admin มีสิทธิ์ทั้งหมด (ไม่สามารถแก้ไขได้)</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermissionsPage;
