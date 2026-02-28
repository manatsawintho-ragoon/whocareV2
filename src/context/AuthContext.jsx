import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getStoredUser, setStoredUser, clearTokens, apiLogout as apiLogoutService, apiGetProfile } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// How often to auto-sync user data from server (ms)
const SYNC_INTERVAL = 30_000; // 30 seconds

// Role definitions with Thai labels, icons, and colors
export const ROLE_CONFIG = {
  super_admin: {
    label: 'Super Admin',
    labelTh: 'ผู้ดูแลระบบ',
    icon: 'mdi:shield-crown',
    color: 'red',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
    borderColor: 'border-red-500/30',
  },
  doctor: {
    label: 'Doctor',
    labelTh: 'แพทย์',
    icon: 'mdi:stethoscope',
    color: 'blue',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/30',
  },
  nurse: {
    label: 'Nurse',
    labelTh: 'พยาบาล',
    icon: 'mdi:medical-bag',
    color: 'green',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
    borderColor: 'border-green-500/30',
  },
  reception: {
    label: 'Reception',
    labelTh: 'เจ้าหน้าที่ต้อนรับ',
    icon: 'mdi:desk',
    color: 'purple',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-500',
    borderColor: 'border-purple-500/30',
  },
  accountant: {
    label: 'Accountant',
    labelTh: 'ฝ่ายการเงิน',
    icon: 'mdi:calculator-variant',
    color: 'amber',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-500/30',
  },
  manager: {
    label: 'Manager',
    labelTh: 'ผู้จัดการคลินิก',
    icon: 'mdi:chart-bar',
    color: 'indigo',
    bgColor: 'bg-indigo-500/10',
    textColor: 'text-indigo-500',
    borderColor: 'border-indigo-500/30',
  },
  patient: {
    label: 'Patient',
    labelTh: 'ผู้ป่วย',
    icon: 'mdi:account',
    color: 'sky',
    bgColor: 'bg-sky-500/10',
    textColor: 'text-sky-500',
    borderColor: 'border-sky-500/30',
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const syncTimerRef = useRef(null);

  // Sync user data from server (fetches latest profile including role)
  const syncUser = useCallback(async () => {
    try {
      const result = await apiGetProfile();
      if (result.success && result.data?.user) {
        const freshUser = result.data.user;
        setStoredUser(freshUser);
        setUser((prev) => {
          // Only update state if data actually changed
          if (JSON.stringify(prev) !== JSON.stringify(freshUser)) {
            return freshUser;
          }
          return prev;
        });
      }
    } catch {
      // ignore — network error or not logged in
    }
  }, []);

  // Start periodic sync
  const startSync = useCallback(() => {
    stopSync();
    syncTimerRef.current = setInterval(syncUser, SYNC_INTERVAL);
  }, [syncUser]);

  // Stop periodic sync
  const stopSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  // Load user from localStorage on mount, then sync from server
  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      // Immediately sync fresh data from server
      syncUser();
    }
    setLoading(false);
  }, []);

  // Manage sync lifecycle based on user state
  useEffect(() => {
    if (user) {
      startSync();

      // Sync on window focus (user switches back to tab)
      const handleFocus = () => syncUser();
      // Sync when page becomes visible again
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') syncUser();
      };

      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        stopSync();
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    } else {
      stopSync();
    }
  }, [user?.id, startSync, stopSync, syncUser]);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    stopSync();
    await apiLogoutService();
    setUser(null);
  };

  const updateUser = (userData) => {
    setStoredUser(userData);
    setUser(userData);
  };

  // Derive display name from user object
  const getDisplayName = () => {
    if (!user) return '';
    if (user.user_type === 'thai') {
      return `${user.first_name_th || ''} ${user.last_name_th || ''}`.trim();
    }
    return `${user.first_name_en || ''} ${user.last_name_en || ''}`.trim();
  };

  // Role helpers
  const getUserRole = () => user?.role || 'patient';

  const getRoleConfig = () => ROLE_CONFIG[getUserRole()] || ROLE_CONFIG.patient;

  const hasRole = (...roles) => {
    const currentRole = getUserRole();
    return currentRole === 'super_admin' || roles.includes(currentRole);
  };

  const isStaff = () => {
    return hasRole('doctor', 'nurse', 'reception', 'accountant', 'manager');
  };

  const isAdmin = () => {
    return hasRole('super_admin', 'manager');
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      updateUser,
      getDisplayName,
      getUserRole,
      getRoleConfig,
      hasRole,
      isStaff,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

