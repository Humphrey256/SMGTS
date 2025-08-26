// Environment configuration
const rawApiUrl = import.meta.env.VITE_API_URL;
const isProd = import.meta.env.PROD;

if (isProd && !rawApiUrl) {
  // Fail fast during production builds/deploys so Render won't produce a bundle that points to localhost
  throw new Error('VITE_API_URL is not set. Set VITE_API_URL to your backend URL before building for production.');
}

export const config = {
  apiUrl: rawApiUrl || 'http://localhost:5000',
  isDevelopment: import.meta.env.DEV,
  isProduction: isProd,
};
