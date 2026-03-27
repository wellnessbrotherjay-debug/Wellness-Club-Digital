export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const getApiUrl = (path: string) => {
  // Ensure we don't end up with double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};
