import { cors } from 'hono/cors';

const allowedOrigins = [
    'https://voucher.htf.solutions',
    'https://wellness-club-digital.vercel.app',
    // Schedule app domains
    'https://schedule.htf.solutions',
    'https://schedule-vercel.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
];

export const corsMiddleware = cors({
    origin: (origin) => {
        if (!origin) return origin; // Allow same-origin
        
        const isVercel = origin.endsWith('.vercel.app');
        const isAllowedLocal = origin === 'http://localhost:5173' || origin === 'http://localhost:3000';
        const isDefault = allowedOrigins.includes(origin);

        if (isVercel || isAllowedLocal || isDefault) {
            return origin;
        }
        
        return allowedOrigins[0];
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
        'Content-Type',
        'X-CSRF-Token',
        'X-Requested-With',
        'Accept',
        'Accept-Version',
        'Content-Length',
        'Content-MD5',
        'Date',
        'X-Api-Version',
        'X-Device-Id',
        'X-Session-Id',
    ],
    credentials: true,
});
