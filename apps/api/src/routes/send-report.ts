import { Hono } from 'hono';
import { Resend } from 'resend';
import { supabaseAdmin } from '../db.js';

const app = new Hono();

export function buildWeeklyReportHtml(total: number, serviceHtml: string): string {
    return buildReportHtml('weekly', 7, total, serviceHtml);
}

function buildReportHtml(period: string, daysToSubtract: number, total: number, serviceHtml: string): string {
    const appUrl = process.env.APP_URL || 'https://voucher.htf.solutions';
    const periodStr = period === 'weekly' ? 'Weekly' : 'Daily';
    return `
        <div style="font-family: sans-serif; color: #2c2420; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; padding: 20px 0;">
                <img src="${appUrl}/htf-logo.png" alt="No.1 Wellness" style="height: 50px;" />
            </div>
            <h1 style="color: #2c2420; text-align: center;">${periodStr} Redemption Update</h1>
            <p style="text-align: center; color: #666;">Summary for the past ${daysToSubtract} day(s)</p>
            <div style="background: #f8f8f8; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center;">
                <div style="font-size: 48px; font-weight: bold; color: #c5a572; margin-bottom: 10px;">${total}</div>
                <div style="font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #999;">Total Redemptions</div>
            </div>
            <div style="margin-top: 30px;">
                <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">Service Breakdown</h3>
                <ul style="list-style: none; padding: 0;">${serviceHtml || '<li style="color: #999; font-style: italic;">No redemptions in this period.</li>'}</ul>
            </div>
            <div style="margin-top: 40px; text-align: center;">
                <a href="${appUrl}/admin/analytics" style="background-color: #2c2420; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Analytics Board</a>
            </div>
        </div>
    `;
}

/**
 * POST /api/send-report
 * Body: { period: 'daily' | 'weekly' }
 */
app.post('/', async (c) => {
    let body: any;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const { period } = body;
    const daysToSubtract = period === 'weekly' ? 7 : 1;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysToSubtract);
    targetDate.setHours(0, 0, 0, 0);

    const { data: redemptions, error: fetchError } = await supabaseAdmin
        .from('redemptions')
        .select('*')
        .gte('redeemed_at', targetDate.toISOString())
        .order('redeemed_at', { ascending: false });

    if (fetchError) {
        console.error('[send-report] Fetch error:', fetchError.message);
        return c.json({ error: 'Failed to fetch redemption data.' }, 500);
    }

    const total = (redemptions ?? []).length;
    const byService: Record<string, number> = {};
    (redemptions ?? []).forEach((r: any) => {
        const service = r.service_type || 'Unknown';
        byService[service] = (byService[service] || 0) + 1;
    });

    const serviceHtml = Object.entries(byService)
        .map(([service, count]) => `<li style="margin-bottom:5px;"><strong>${service}:</strong> ${count}</li>`)
        .join('');

    if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const periodStr = period === 'weekly' ? 'Weekly' : 'Daily';
        await resend.emails.send({
            from: 'No.1 Wellness <notifications@resend.dev>',
            to: ['wellnessbrotherjay@gmail.com'],
            subject: `${periodStr} Wellness Report: ${total} Redemptions`,
            html: buildReportHtml(period, daysToSubtract, total, serviceHtml),
        });
        console.log(`[send-report] ${periodStr} report sent.`);
    } else {
        console.warn('[send-report] RESEND_API_KEY missing, skipping email.');
    }

    return c.json({ status: 'success', message: 'Report processed', count: total });
});

export default app;
