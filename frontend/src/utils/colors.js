// Shared color utilities for consistent user colors across Map and Dashboard

const EMPLOYEE_PALETTE = [
  '#e11d48', '#0891b2', '#16a34a', '#ea580c',
  '#be185d', '#0284c7', '#dc2626', '#059669', '#d97706', '#7c2d12'
];

export const getEmployeeColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return EMPLOYEE_PALETTE[Math.abs(hash) % EMPLOYEE_PALETTE.length];
};

export const getUserColor = (role, name, isMe = false) => {
  if (isMe) return '#2563eb';
  if (role === 'admin') return '#7c3aed';
  return getEmployeeColor(name);
};
