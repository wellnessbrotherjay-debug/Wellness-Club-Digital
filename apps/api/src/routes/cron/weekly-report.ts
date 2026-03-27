import { Hono } from 'hono';
import { supabaseAdmin } from '../../db.js';
import { Resend } from 'resend';

const app = new Hono();

function buildWeeklyReportHtml(total: number, serviceHtml: string): string {
    const appUrl = process.env.APP_URL || 'https://voucher.htf.solutions';
    return `
        <div style="font-family: sans-serif; color: #2c2420; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; padding: 20px 0;">
                <img src="${appUrl}/htf-logo.png" alt="No.1 Wellness" style="height: 50px;" />
            </div>
            <h1 style="color: #2c2420; text-align: center;">Weekly Redemption Update</h1>
            <p style="text-align: center; color: #666;">Summary for the past 7 days</p>
            <div style="background: #f8f8f8; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center;">
                <div style="font-size: 48px; font-weight: bold; color: #c5a572; margin-bottom: 10px;">${total}</div>
                <div style="font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #999;">Total Redemptions</div>
            </div>
            <div style="margin-top: 30px;">
                <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">Service Breakdown</h3>
                <ul style="list-style: none; padding: 0;">${serviceHtml || '<li style="color: #999; font-style: italic;">No redemptions this week.</li>'}</ul>
            </div>
            <div style="margin-top: 40px; text-align: center;">
                <a href="${appUrl}/admin/analytics" style="background-color: #2c2420; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Analytics Board</a>
            </div>
            <p style="margin-top: 40px; text-align: center; font-size: 12px; color: #ccc;">
                Sent automatically by Wellness Club Digital
            </p>
        </div>
    `;
}

/**
 * GET /api/cron/weekly-report
 * Called by a cron scheduler (Vercel Cron, Railway, etc.) weekly.
 */
app.get('/', async (c) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const { data: recentRedemptions, error } = await supabaseAdmin
            .from('redemptions')
            .select('*')
            .gte('redeemed_at', sevenDaysAgo.toISOString())
            .order('redeemed_at', { ascending: false });

        if (error) throw error;

        const total = (recentRedemptions ?? []).length;
        const byService: Record<string, number> = {};
        (recentRedemptions ?? []).forEach((r: any) => {
            const service = r.service_type || 'Unknown';
            byService[service] = (byService[service] || 0) + 1;
        });

        const serviceHtml = Object.entries(byService)
            .map(([service, count]) => `<li style="margin-bottom:5px;"><strong>${service}:</strong> ${count}</li>`)
            .join('');

        if (process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: 'No.1 Wellness <notifications@resend.dev>',
                to: ['wellnessbrotherjay@gmail.com'],
                subject: `Weekly Wellness Report: ${total} Redemptions`,
                html: buildWeeklyReportHtml(total, serviceHtml),
            });
            console.log('[cron/weekly-report] Weekly report sent.');
        } else {
            console.log('[cron/weekly-report] Skipping: RESEND_API_KEY not set.');
        }

        return c.json({ success: true, count: total, breakdown: byService });
    } catch (err: any) {
        console.error('[cron/weekly-report] Error:', err.message);
        return c.json({ error: err.message }, 500);
    }
});

export default app;
