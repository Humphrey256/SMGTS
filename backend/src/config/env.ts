import dotenv from 'dotenv';

dotenv.config();

// Support multiple client origins via env var (comma-separated) with sensible dev defaults
const DEFAULT_CLIENT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8080',
];

const parsedClientOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const singleClientOrigin = process.env.CLIENT_ORIGIN?.trim();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/sales_mgmt',
  JWT_SECRET: process.env.JWT_SECRET || 'devsecret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  // Keep old single value for backward compatibility
  CLIENT_ORIGIN: singleClientOrigin || DEFAULT_CLIENT_ORIGINS[0],
  // New: normalized list of allowed origins
  CLIENT_ORIGINS: parsedClientOrigins.length
    ? parsedClientOrigins
    : (singleClientOrigin ? [singleClientOrigin] : DEFAULT_CLIENT_ORIGINS),
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || ''
};
