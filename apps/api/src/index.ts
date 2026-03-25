import { serve } from '@hono/node-server';
import app from './app.js';
import { runDailyBackup } from './routes/cron/daily-backup.js';

const port = parseInt(process.env.PORT || '3001', 10);

// --- Automated Disaster Recovery Cron ---
const ONE_MINUTE = 60 * 1000;
setInterval(() => {
    const now = new Date();
    // Trigger at 00:00 server time
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        console.log('[CRON] Midnight reached. Triggering automated backup...');
        runDailyBackup().catch(err => console.error('[CRON] Backup failed:', err));
    }
}, ONE_MINUTE);

serve(
    {
        fetch: app.fetch,
        port,
    },
    (info) => {
        console.log(`🚀 Wellness Club API running on http://localhost:${info.port}`);
    }
);

export default app;
