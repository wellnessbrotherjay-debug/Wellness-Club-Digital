export const API_BASE_URL =
  import.meta.env.VITE_API_URL || window.location.origin;

// Diagnostic log for production troubleshooting
console.log('--- [API CONFIG] ---');
console.log('Origin:', window.location.origin);
console.log('Env URL:', import.meta.env.VITE_API_URL);
console.log('Target:', API_BASE_URL);
console.log('--------------------');

export const getApiUrl = (path: string) => {
  // Ensure we don't end up with double slashes
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};
