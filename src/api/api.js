import axios from 'axios';

const API_BASE_URL = 'https://aic-checkin-system.onrender.com';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject the auth token into requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Returns true when the current session was created by the demo bypass
const isDemoSession = () => localStorage.getItem('access_token')?.startsWith('demo-token-');

export const loginUser = async (username, password) => {
  // ── DEMO MODE ──────────────────────────────────────────────
  // Works offline when the backend host is unavailable.
  const DEMO_USERS = {
    admin: { password: 'admin123', role: 'admin' },
    volunteer: { password: 'vol123', role: 'user' },
  };
  const demo = DEMO_USERS[username.trim().toLowerCase()];
  if (demo && demo.password === password) {
    const fakeToken = `demo-token-${demo.role}-${Date.now()}`;
    localStorage.setItem('access_token', fakeToken);
    localStorage.setItem('user_role', demo.role);
    return { access_token: fakeToken, role: demo.role };
  }
  // ────────────────────────────────────────────────────────────

  try {
    const response = await apiClient.post('/login', { username, password });
    if (response.data && response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('user_role', response.data.role);
    }
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};


export const logoutUser = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_role');
};

export const getStats = async () => {
  if (isDemoSession()) return { total_registrations: 0, checked_in: 0, pending: 0, recent_checkins: [] };
  try {
    const response = await apiClient.get('/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};

export const scanParticipant = async (uid) => {
  if (isDemoSession()) return { valid: true, already_checked_in: false, participant: { uid, name: 'Demo Participant', college: 'Demo College', role: 'Student' } };
  try {
    const response = await apiClient.post('/scan', { uid });
    return response.data;
  } catch (error) {
    console.error('Error verifying scan:', error);
    return { valid: false, message: 'Network error or server unavailable' };
  }
};

export const checkinParticipant = async (uid) => {
  if (isDemoSession()) return { status: 'checked_in' };
  try {
    const response = await apiClient.post('/checkin', { uid });
    return response.data;
  } catch (error) {
    console.error('Error confirming checkin:', error);
    if (error.response && error.response.data) {
      return error.response.data;
    }
    return { status: 'error', message: 'Checkin Failed' };
  }
};

export default apiClient;
