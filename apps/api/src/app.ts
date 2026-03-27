console.log('[API] Bootstrap v4 active');
import { Hono } from 'hono';
// Removed buggy hono/cors in favor of manual resilient implementation
// import { corsMiddleware } from './middleware/cors.js';
import { rateLimit } from './middleware/rate-limit.js';

// Route handlers
import dataRoute from './routes/data.js';
import redeemRoute from './routes/redeem.js';
import auditLogRoute from './routes/audit-log.js';
import logInsightRoute from './routes/log-insight.js';
import parseposRoute from './routes/parse-pos.js';
import reconcileRoute from './routes/reconcile.js';
import sendReportRoute from './routes/send-report.js';
import sendWhatsappRoute from './routes/send-whatsapp.js';
import cronWeeklyReportRoute from './routes/cron/weekly-report.js';
import bulkSyncRoute from './routes/bulk-sync.js';

const app = new Hono();

// --- CRITICAL COMPATIBILITY FIX FOR VERCEL NODE.JS RUNTIME ---
// Hono expects c.req.raw.headers.get to exist (Web Standards), 
// but in Node.js runtime it's a plain object.
app.use('*', async (c, next) => {
    const rawReq = c.req.raw as any;
    if (rawReq.headers && typeof rawReq.headers.get !== 'function') {
        rawReq.headers.get = (name: string) => {
            const lowName = name.toLowerCase();
            return rawReq.headers[lowName] || rawReq.headers[name];
        };
    }
    await next();
});

// --- MODERN CORS HANDLER ---
app.use('*', async (c, next) => {
    const origin = c.req.header('Origin') || '';
    const isAllowed = 
        !origin || 
        origin.endsWith('.vercel.app') || 
        origin === 'https://voucher.htf.solutions' ||
        origin.includes('localhost');

    if (isAllowed) {
        c.header('Access-Control-Allow-Origin', origin || '*');
    }
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    c.header('Access-Control-Allow-Credentials', 'true');

    if (c.req.method === 'OPTIONS') {
        return c.text('', 204);
    }
    await next();
});

// Endpoint Protection (Rate Limits)
app.use('/api/vouchers/bulk-sync', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Max 50 sync batches per IP per window
    message: 'Too many sync requests. Please wait 15 minutes.'
}));

// Health check
app.get('/', (c) => {
    return c.json({
        status: 'ok',
        service: 'Wellness Club API',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
    });
});

// API routes
app.route('/api/data', dataRoute);
app.route('/api/redeem', redeemRoute);
app.route('/api/audit-log', auditLogRoute);
app.route('/api/log-insight', logInsightRoute);
app.route('/api/parse-pos', parseposRoute);
app.route('/api/reconcile', reconcileRoute);
app.route('/api/send-report', sendReportRoute);
app.route('/api/send-whatsapp', sendWhatsappRoute);
app.route('/api/vouchers/bulk-sync', bulkSyncRoute);
app.route('/api/cron/weekly-report', cronWeeklyReportRoute);
// daily-backup and admin/backups routes disabled on Vercel (read-only filesystem)

export default app;
