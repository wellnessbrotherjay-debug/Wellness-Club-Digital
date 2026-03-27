import { cors } from 'hono/cors';

const allowedOrigins = [
    'https://voucher.htf.solutions',
    'https://wellness-club-digital.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
];

export const corsMiddleware = cors({
    origin: (origin) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return origin;
        }
        return allowedOrigins[0]; // Fallback to main production domain
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
