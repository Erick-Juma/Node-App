import dotenv from 'dotenv'

dotenv.config()

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

if (allowedOrigins.length === 0) {
    console.warn('ALLOWED_ORIGINS is not set — all cross-origin requests will be blocked.');
}

export const config = {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    allowedOrigins,
};