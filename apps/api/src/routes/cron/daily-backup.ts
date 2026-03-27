import { Hono } from 'hono';
import { supabaseAdmin } from '../../db.js';
import * as fs from 'fs';
import * as path from 'path';

const app = new Hono();
const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export async function runDailyBackup() {
  console.log('[Daily Backup] Starting database backup...');
  
  try {
    const { data: vouchers, error } = await supabaseAdmin.from('vouchers').select('*');
    if (error) throw error;

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `voucher_backup_${dateStr}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);

    fs.writeFileSync(filePath, JSON.stringify(vouchers, null, 2));
    console.log(`[Daily Backup] Completed. Saved ${vouchers.length} rows to ${fileName}`);
  } catch (err: any) {
    console.error('[Daily Backup] Failed:', err.message);
  }
}

// Scheduled endpoint (can be triggered by an external cron or internal setInterval)
app.post('/', async (c) => {
  // Add authentication check here if exposed publicly
  const authHeader = c.req.header('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'test'}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await runDailyBackup();
  return c.json({ status: 'success', message: 'Backup triggered' });
});

export default app;
