import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000';

const SWAGGER_URL = `${API_BASE}/api-doc`;

const ApiDocPage = () => {
  const navigate = useNavigate();
  const { user, getUserRole } = useAuth();
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const timeoutRef = useRef(null);
  const role = getUserRole();

  // Start an 8-second timeout — if iframe hasn't fired onLoad by then, show error
  useEffect(() => {
    setIframeLoaded(false);
    setIframeError(false);
    timeoutRef.current = setTimeout(() => {
      setIframeError(true);
    }, 8000);
    return () => clearTimeout(timeoutRef.current);
  }, [retryKey]);

  const handleLoad = () => {
    clearTimeout(timeoutRef.current);
    setIframeLoaded(true);
    setIframeError(false);
  };

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-section dark:bg-darkmode">
      {/* ── Header bar ── */}
      <div className="bg-white dark:bg-white/5 border-b border-gray-200 dark:border-white/10 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <Icon icon="mdi:arrow-left" width="20" className="text-gray-600 dark:text-white/70" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                <Icon icon="mdi:api" width="18" className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-sm text-gray-900 dark:text-white leading-none">API Documentation</h1>
                <p className="text-xs text-gray-400 dark:text-white/40 leading-none mt-0.5">WhocarE Hospital v2.0</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-medium border border-green-200 dark:border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>

            {/* Open in new tab */}
            <a
              href={SWAGGER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
            >
              <Icon icon="mdi:open-in-new" width="14" />
              Open in new tab
            </a>

            {/* Dashboard */}
            {user && (
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-white/70 text-xs font-medium transition-colors"
              >
                <Icon icon="mdi:view-dashboard" width="14" />
                Dashboard
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="bg-white dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
        <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center gap-6 overflow-x-auto text-xs text-gray-500 dark:text-white/40 flex-wrap">
          {[
            { icon: 'mdi:lock-open-outline', label: '5 Auth endpoints' },
            { icon: 'mdi:account-cog', label: '6 Admin endpoints' },
            { icon: 'mdi:medical-bag', label: '5 Service endpoints' },
            { icon: 'mdi:calendar-clock', label: '7 Booking endpoints' },
            { icon: 'mdi:cash', label: '5 Finance endpoints' },
            { icon: 'mdi:newspaper', label: '6 News endpoints' },
          ].map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1 whitespace-nowrap">
              <Icon icon={item.icon} width="13" className="text-primary" />
              {item.label}
            </span>
          ))}
          <span className="ml-auto inline-flex items-center gap-1 text-primary font-medium whitespace-nowrap">
            <Icon icon="mdi:api" width="13" />
            34 total endpoints
          </span>
        </div>
      </div>

      {/* ── Iframe ── */}
      <div className="flex-1 relative">
        {/* Loading overlay */}
        {!iframeLoaded && !iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-section dark:bg-darkmode z-10 gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Icon icon="mdi:api" width="32" className="text-primary animate-pulse" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-700 dark:text-white text-sm">Loading Swagger UI…</p>
              <p className="text-xs text-gray-400 dark:text-white/40 mt-1">Connecting to backend at {API_BASE}</p>
            </div>
            <Icon icon="mdi:loading" width="22" className="text-primary animate-spin" />
          </div>
        )}

        {/* Error state */}
        {iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-section dark:bg-darkmode z-10 gap-4 px-4">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-500/10 rounded-2xl flex items-center justify-center">
              <Icon icon="mdi:connection" width="32" className="text-red-500" />
            </div>
            <div className="text-center max-w-sm">
              <p className="font-semibold text-gray-800 dark:text-white text-base">Cannot connect to backend</p>
              <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
                Make sure the backend server is running on <code className="bg-gray-100 dark:bg-white/10 px-1 rounded text-xs">{API_BASE}</code>
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={handleRetry}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
              >
                <Icon icon="mdi:refresh" width="16" />
                Retry
              </button>
              <a
                href={SWAGGER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors inline-flex items-center gap-1.5"
              >
                <Icon icon="mdi:open-in-new" width="16" />
                Open directly
              </a>
            </div>
          </div>
        )}

        <iframe
          key={retryKey}
          src={SWAGGER_URL}
          title="API Documentation"
          className="w-full border-0"
          style={{ height: 'calc(100vh - 120px)', display: iframeError ? 'none' : 'block' }}
          onLoad={handleLoad}
        />
      </div>

      <Footer />
    </div>
  );
};

export default ApiDocPage;
