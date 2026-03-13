import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../context/AuthContext';
import { apiGetAuditLogs } from '../services/api';

const ACTION_LABELS = {
  change_role: { label: 'เปลี่ยน Role', icon: 'mdi:shield-edit', color: 'text-blue-500' },
  activate_user: { label: 'เปิดใช้งานผู้ใช้', icon: 'mdi:account-check', color: 'text-green-500' },
  deactivate_user: { label: 'ปิดใช้งานผู้ใช้', icon: 'mdi:account-off', color: 'text-red-500' },
};

const AuditLogsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, hasRole } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (!hasRole('super_admin')) { navigate('/dashboard'); return; }
    fetchLogs();
  }, [user, authLoading]);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const result = await apiGetAuditLogs({ page, limit: 30 });
      if (result.success) {
        setLogs(result.data.logs);
        setPagination(result.data.pagination);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-section dark:bg-darkmode pt-32 pb-16 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-midnight_text dark:text-white flex items-center gap-2">
              <Icon icon="mdi:file-document-outline" width="28" className="text-primary" />
              Audit Log
            </h1>
            <p className="text-sm text-grey dark:text-white/50 mt-1">
              ประวัติการเปลี่ยนแปลงในระบบ
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border dark:border-dark_border text-midnight_text dark:text-white text-sm font-medium hover:bg-section dark:hover:bg-darkmode transition-colors cursor-pointer"
          >
            <Icon icon="mdi:arrow-left" width="18" />
            กลับ Dashboard
          </button>
        </div>

        {/* Logs list */}
        <div className="bg-white dark:bg-darklight rounded-2xl shadow-deatail_shadow border border-border dark:border-dark_border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Icon icon="mdi:loading" width="36" className="text-primary animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20">
              <Icon icon="mdi:text-box-search-outline" width="48" className="text-grey/30 mx-auto mb-3" />
              <p className="text-grey dark:text-white/50">ยังไม่มีบันทึกกิจกรรม</p>
            </div>
          ) : (
            <div className="divide-y divide-border dark:divide-dark_border">
              {logs.map((log) => {
                const actionInfo = ACTION_LABELS[log.action] || {
                  label: log.action,
                  icon: 'mdi:information',
                  color: 'text-grey',
                };
                return (
                  <div key={log.id} className="px-5 py-4 hover:bg-section/50 dark:hover:bg-darkmode/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon icon={actionInfo.icon} width="18" className={actionInfo.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-midnight_text dark:text-white">
                          {actionInfo.label}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <span className="text-xs text-grey dark:text-white/40">
                            ตาราง: {log.target_table || '-'}
                          </span>
                          <span className="text-xs text-grey dark:text-white/40">
                            ID: {log.target_id || '-'}
                          </span>
                          {log.old_value && (
                            <span className="text-xs text-red-400">
                              เดิม: {JSON.stringify(log.old_value)}
                            </span>
                          )}
                          {log.new_value && (
                            <span className="text-xs text-green-500">
                              ใหม่: {JSON.stringify(log.new_value)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-grey/60 dark:text-white/30 mt-1">
                          ดำเนินการโดย: #{log.actor_id} • IP: {log.ip_address || '-'} • {formatDate(log.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 px-4 py-4 border-t border-border dark:border-dark_border">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg text-sm border border-border dark:border-dark_border disabled:opacity-30 hover:bg-section dark:hover:bg-darkmode transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Icon icon="mdi:chevron-left" width="18" />
              </button>
              <span className="text-sm text-grey dark:text-white/50">
                หน้า {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg text-sm border border-border dark:border-dark_border disabled:opacity-30 hover:bg-section dark:hover:bg-darkmode transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Icon icon="mdi:chevron-right" width="18" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPage;
