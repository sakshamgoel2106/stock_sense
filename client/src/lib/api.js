import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
});

// Interceptor to attach JWT token and active company header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const companyId = localStorage.getItem('companyId');
  if (companyId && /^[0-9a-fA-F]{24}$/.test(companyId)) {
    config.headers['x-company-id'] = companyId;
  } else if (companyId) {
    localStorage.removeItem('companyId');
  }
  return config;
});

export default api;
