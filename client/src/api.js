import axios from 'axios';

const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

export const api = axios.create({
  baseURL: base,
});

export function imageUrl(path) {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
  if (apiBase) {
    return `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return path;
}
