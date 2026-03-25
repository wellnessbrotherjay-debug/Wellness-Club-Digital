import 'dotenv/config';
import { runDailyBackup } from './apps/api/src/routes/cron/daily-backup.js';

console.log('--- Manual Backup Trigger (Simulation) ---');
runDailyBackup().then(() => {
    console.log('--- Backup Verification Complete ---');
    process.exit(0);
}).catch(err => {
    console.error('--- Backup Verification Failed ---', err);
    process.exit(1);
});
