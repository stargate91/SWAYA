import { API_BASE } from './backend';

export const fetchJson = async (path, options = {}) => {
  let adjustedPath = path;
  if (adjustedPath.startsWith('/api/')) {
    adjustedPath = '/api/v1/' + adjustedPath.slice(5);
  }
  const response = await fetch(`${API_BASE}${adjustedPath}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    if (data?.detail) {
      if (Array.isArray(data.detail)) {
        message = data.detail.map(d => d.msg || JSON.stringify(d)).join(', ');
      } else if (typeof data.detail === 'object') {
        message = data.detail.message || JSON.stringify(data.detail);
      } else {
        message = String(data.detail);
      }
    } else if (data?.message) {
      message = String(data.message);
    } else if (data?.error) {
      message = String(data.error);
    }
    throw new Error(message);
  }

  return data;
};
