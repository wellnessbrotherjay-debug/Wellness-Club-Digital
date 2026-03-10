import 'dotenv/config';
import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors.js';

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

const app = new Hono();

// Global middleware
app.use('*', corsMiddleware);

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
app.route('/api/cron/weekly-report', cronWeeklyReportRoute);

export default app;
