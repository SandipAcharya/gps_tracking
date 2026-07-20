// Centralized API client — all requests go through here
export const BASE_URL = import.meta.env.VITE_API_URL || 'https://gps-tracking-86e6.onrender.com';

const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('geo_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};

export default api;
