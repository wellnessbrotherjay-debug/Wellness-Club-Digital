import { Resend } from 'resend';
import { supabase } from './supabase.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { period } = req.body; // 'daily' or 'weekly'
        
        const daysToSubtract = period === 'weekly' ? 7 : 1;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - daysToSubtract);
        targetDate.setHours(0, 0, 0, 0);

        const { data: redemptions, error: fetchError } = await supabase
            .from('redemptions')
            .select('*')
            .gte('timestamp', targetDate.toISOString())
            .order('timestamp', { ascending: false });

        if (fetchError) {
            console.error('Failed to fetch redemptions:', fetchError);
            return res.status(500).json({ error: 'Failed to fetch redemption data.' });
        }

        const total = redemptions.length;
        const byService = {};
        
        redemptions.forEach(r => {
            const service = r.service_type || 'Unknown';
            byService[service] = (byService[service] || 0) + 1;
        });

        const serviceHtml = Object.entries(byService)
            .map(([service, count]) => `<li style="margin-bottom: 5px;"><strong>${service}:</strong> ${count}</li>`)
            .join('');

        if (process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const periodStr = period === 'weekly' ? 'Weekly' : 'Daily';

            await resend.emails.send({
                from: 'No.1 Wellness <notifications@resend.dev>',
                to: ['wellnessbrotherjay@gmail.com'],
                subject: `${periodStr} Wellness Report: ${total} Redemptions`,
                html: `
                     <div style="font-family: sans-serif; color: #2c2420; max-width: 600px; margin: 0 auto;">
                         <div style="text-align: center; padding: 20px 0;">
                             <img src="https://wellness-club-digital.vercel.app/htf-logo.png" alt="No.1 Wellness" style="height: 50px;" />
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
                             <a href="https://wellness-club-digital.vercel.app/admin/analytics" style="background-color: #2c2420; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Analytics Board</a>
                         </div>
                     </div>
                 `
            });
            console.log(`${periodStr} report sent successfully.`);
        } else {
            console.warn('RESEND_API_KEY is missing, skipping email.');
        }

        return res.status(200).json({ status: 'success', message: 'Report processed' });

    } catch (err) {
        console.error('Unhandled server error in send-report:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
}
