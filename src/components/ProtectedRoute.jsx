import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from '@iconify/react';

/**
 * ProtectedRoute - guards routes by authentication and role
 * @param {string[]} roles - allowed roles (empty = any authenticated user)
 */
const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-section dark:bg-darkmode">
        <Icon icon="mdi:loading" width="40" className="text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !hasRole(...roles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-section dark:bg-darkmode px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <Icon icon="mdi:shield-lock" width="40" className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-midnight_text dark:text-white mb-2">
            ไม่มีสิทธิ์เข้าถึง
          </h1>
          <p className="text-grey dark:text-white/50 mb-6">
            คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบ
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            <Icon icon="mdi:home" width="20" />
            กลับหน้าหลัก
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
