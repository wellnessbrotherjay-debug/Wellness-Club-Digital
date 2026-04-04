import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { corsMiddleware } from './middleware/cors.js';
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
import dailyBackupRoute from './routes/cron/daily-backup.js';
import sheetsExportRoute from './routes/cron/sheets-export.js';
import backupsRoute from './routes/backups.js';

const app = new Hono({ strict: false });

// Global middleware
app.use('*', logger());
app.use('*', corsMiddleware);

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

app.get('/health', (c) => {
    return c.json({ status: 'ok' });
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
app.route('/api/cron/daily-backup', dailyBackupRoute);
app.route('/api/cron/sheets-export', sheetsExportRoute);
app.route('/api/admin/backups', backupsRoute);

export default app;
