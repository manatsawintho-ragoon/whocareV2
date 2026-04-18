const API_BASE = '/api';

// ============================================================
// Token management
// ============================================================
export const getAccessToken = () => localStorage.getItem('accessToken');
export const getRefreshToken = () => localStorage.getItem('refreshToken');

export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const getStoredUser = () => {
  const data = localStorage.getItem('user');
  return data ? JSON.parse(data) : null;
};

export const setStoredUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

// ============================================================
// Fetch wrapper with auth
// ============================================================
const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, { ...options, headers });

  // If 401 with TOKEN_EXPIRED, try refresh
  if (response.status === 401) {
    const body = await response.json().catch(() => ({}));
    if (body.code === 'TOKEN_EXPIRED') {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${getAccessToken()}`;
        response = await fetch(url, { ...options, headers });
      }
    }
  }

  return response;
};

// ============================================================
// Auth API
// ============================================================
export const apiRegister = async (data) => {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    return {
      success: false,
      message: 'เซิร์ฟเวอร์ตอบกลับผิดพลาด กรุณาลองใหม่',
      message_en: 'Invalid server response, please try again',
    };
  }

  if (result.success && result.data) {
    setTokens(result.data.accessToken, result.data.refreshToken);
    setStoredUser(result.data.user);
  }

  return result;
};

export const apiLogin = async (data) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();

  if (result.success && result.data) {
    setTokens(result.data.accessToken, result.data.refreshToken);
    setStoredUser(result.data.user);
  }

  return result;
};

export const apiLogout = async () => {
  const refreshToken = getRefreshToken();
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // ignore
  }
  clearTokens();
};

export const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const result = await response.json();

    if (result.success && result.data) {
      setTokens(result.data.accessToken, result.data.refreshToken);
      setStoredUser(result.data.user);
      return true;
    }
  } catch {
    // ignore
  }

  clearTokens();
  return false;
};

export const apiGetProfile = async () => {
  const response = await apiFetch('/auth/profile');
  return response.json();
};

export const apiUpdateProfile = async (data) => {
  const response = await apiFetch('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (result.success && result.data) {
    setStoredUser(result.data.user);
  }
  return result;
};

// ============================================================
// Admin API
// ============================================================
export const apiGetUsers = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiFetch(`/admin/users?${query}`);
  return response.json();
};

export const apiUpdateUserRole = async (userId, role) => {
  const response = await apiFetch(`/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
  return response.json();
};

export const apiToggleUserStatus = async (userId, isActive) => {
  const response = await apiFetch(`/admin/users/${userId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ is_active: isActive }),
  });
  return response.json();
};

export const apiGetUserDetail = async (userId) => {
  const response = await apiFetch(`/admin/users/${userId}`);
  return response.json();
};

export const apiAdminUpdateUser = async (userId, data) => {
  const response = await apiFetch(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.json();
};

export const apiGetAuditLogs = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiFetch(`/admin/audit-logs?${query}`);
  return response.json();
};

export const apiGetPermissions = async () => {
  const response = await apiFetch('/admin/permissions');
  return response.json();
};

export const apiUpdatePermission = async (data) => {
  const response = await apiFetch('/admin/permissions', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.json();
};

export const apiGetDashboard = async () => {
  const response = await apiFetch('/admin/dashboard');
  return response.json();
};

// ============================================================
// Services API
// ============================================================
export const apiGetPublicServices = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE}/services?${query}`);
  return response.json();
};

export const apiGetPublicServiceById = async (id) => {
  const response = await fetch(`${API_BASE}/services/${id}`);
  return response.json();
};

export const apiGetAdminServices = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiFetch(`/services/admin?${query}`);
  return response.json();
};

export const apiCreateService = async (data) => {
  const response = await apiFetch('/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
};

export const apiUpdateService = async (id, data) => {
  const response = await apiFetch(`/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.json();
};

export const apiDeleteService = async (id) => {
  const response = await apiFetch(`/services/${id}`, {
    method: 'DELETE',
  });
  return response.json();
};

// ============================================================
// Bookings API
// ============================================================
export const apiGetBookingSlots = async (serviceId, date, doctorId = null) => {
  const query = new URLSearchParams({ service_id: serviceId, date });
  if (doctorId !== null && doctorId !== undefined) query.set('doctor_id', doctorId);
  const response = await apiFetch(`/bookings/slots?${query.toString()}`);
  return response.json();
};

export const apiLockSlot = async (data) => {
  const response = await apiFetch('/bookings/lock', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
};

export const apiUnlockSlot = async (data) => {
  const response = await apiFetch('/bookings/unlock', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
};

export const apiCreateBooking = async (data) => {
  const response = await apiFetch('/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
};

export const apiGetMyBookings = async () => {
  const response = await apiFetch('/bookings/my');
  return response.json();
};

export const apiGetAllBookings = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiFetch(`/bookings/all?${query}`);
  return response.json();
};

export const apiGetBookingStats = async () => {
  const response = await apiFetch('/bookings/stats');
  return response.json();
};

export const apiUpdateBookingStatus = async (id, status, doctorId = null) => {
  const payload = { status };
  if (doctorId !== null && doctorId !== undefined) payload.doctor_id = doctorId;
  const response = await apiFetch(`/bookings/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const apiRescheduleBooking = async (id, data) => {
  const response = await apiFetch(`/bookings/${id}/reschedule`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.json();
};

export const apiUserRescheduleBooking = async (id, data) => {
  const response = await apiFetch(`/bookings/${id}/user-reschedule`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.json();
};

export const apiGetCalendarBookings = async (year, month) => {
  const response = await apiFetch(`/bookings/calendar?year=${year}&month=${month}`);
  return response.json();
};

export const apiGetMyCalendarBookings = async (year, month) => {
  const response = await apiFetch(`/bookings/my-calendar?year=${year}&month=${month}`);
  return response.json();
};

// ============================================================
// Finance API
// ============================================================
export const apiGetDoctors = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await apiFetch(`/finance/doctors${suffix}`);
  return response.json();
};

export const apiGetBalance = async () => {
  const response = await apiFetch('/finance/balance');
  return response.json();
};

export const apiDeposit = async (amount) => {
  const response = await apiFetch('/finance/deposit', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
  return response.json();
};

export const apiWithdraw = async (data) => {
  const response = await apiFetch('/finance/withdraw', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
};

export const apiGetTransactions = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiFetch(`/finance/transactions?${query}`);
  return response.json();
};

export const apiRequestRefund = async (data) => {
  const response = await apiFetch('/finance/refund-request', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
};

export const apiGetRefundRequests = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiFetch(`/finance/refund-requests?${query}`);
  return response.json();
};

export const apiApproveRefund = async (id) => {
  const response = await apiFetch(`/finance/refund-requests/${id}/approve`, { method: 'PUT' });
  return response.json();
};

export const apiRejectRefund = async (id) => {
  const response = await apiFetch(`/finance/refund-requests/${id}/reject`, { method: 'PUT' });
  return response.json();
};

export const apiGetFinanceDashboard = async () => {
  const response = await apiFetch('/finance/dashboard');
  return response.json();
};

// ============================================================
// News API (Public)
// ============================================================
export const apiGetPublicNews = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE}/news?${query}`);
  return response.json();
};

export const apiGetNewsDetail = async (slug) => {
  const response = await fetch(`${API_BASE}/news/detail/${slug}`);
  return response.json();
};

export const apiGetNewsCategories = async () => {
  const response = await fetch(`${API_BASE}/news/categories`);
  return response.json();
};

export const apiGetNewsTags = async () => {
  const response = await fetch(`${API_BASE}/news/tags`);
  return response.json();
};

export const apiGetFeaturedNews = async (contentType) => {
  const params = contentType ? `?content_type=${contentType}` : '';
  const response = await fetch(`${API_BASE}/news/featured${params}`);
  return response.json();
};

// ============================================================
// News API (Admin)
// ============================================================
export const apiGetNewsStats = async () => {
  const response = await apiFetch('/news/admin/stats');
  return response.json();
};

export const apiGetAdminNews = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiFetch(`/news/admin/list?${query}`);
  return response.json();
};

export const apiGetAdminArticle = async (id) => {
  const response = await apiFetch(`/news/admin/${id}`);
  return response.json();
};

export const apiCreateArticle = async (data) => {
  const response = await apiFetch('/news/admin', { method: 'POST', body: JSON.stringify(data) });
  return response.json();
};

export const apiUpdateArticle = async (id, data) => {
  const response = await apiFetch(`/news/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return response.json();
};

export const apiChangeArticleStatus = async (id, status, note) => {
  const response = await apiFetch(`/news/admin/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, note }) });
  return response.json();
};

export const apiSubmitArticle = async (id) => {
  const response = await apiFetch(`/news/admin/${id}/submit`, { method: 'PUT' });
  return response.json();
};

export const apiDeleteArticle = async (id) => {
  const response = await apiFetch(`/news/admin/${id}`, { method: 'DELETE' });
  return response.json();
};

export const apiGetAdminCategories = async () => {
  const response = await apiFetch('/news/admin/categories');
  return response.json();
};

export const apiCreateCategory = async (data) => {
  const response = await apiFetch('/news/admin/categories', { method: 'POST', body: JSON.stringify(data) });
  return response.json();
};

export const apiDeleteCategory = async (id) => {
  const response = await apiFetch(`/news/admin/categories/${id}`, { method: 'DELETE' });
  return response.json();
};

export const apiDeleteTag = async (id) => {
  const response = await apiFetch(`/news/admin/tags/${id}`, { method: 'DELETE' });
  return response.json();
};
