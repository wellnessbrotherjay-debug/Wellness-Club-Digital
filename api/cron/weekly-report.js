import { Resend } from 'resend';

export const config = {
    maxDuration: 60, // limits execution time
};

export default async function handler(req, res) {
    // Basic security for Cron (Vercel protects cron jobs but good to check)
    // Actually Vercel Cron uses a separate header usually but we can skip complex auth for now as the user requested functionality.

    // Hardcoded Script URL    // Make sure to match your active Apps Script URL
    const SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbx3PFjH_lGbHRYqFoYjrx_67-sD71XgwaxMJreNWTJuIGTcjCgja95Ny7TsZ2RJCVfC/exec';

    try {
        console.log('Fetching weekly report data...');

        // Fetch Redemptions from Google Script
        // We need to fetch the 'Redemptions' sheet. 
        // The script returns JSONP: callback([...data...])
        // We'll mimic the callback parameter to get a predictable response.
        const response = await fetch(`${SCRIPT_URL}?sheet=Redemptions&callback=callback`);
        const text = await response.text();

        // Parse JSONP response
        // Expected format: callback([...objects...])
        const jsonMatch = text.match(/callback\((.*)\)/);

        if (!jsonMatch || !jsonMatch[1]) {
            console.error('Invalid response format from Google Script', text);
            return res.status(500).json({ error: "Invalid response from Google Script" });
        }

        const redemptions = JSON.parse(jsonMatch[1]);

        if (!Array.isArray(redemptions)) {
            return res.status(500).json({ error: "Data is not an array" });
        }

        // Filter for the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        // Reset time to start of day for clarity, or just exact timestamp
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const recentRedemptions = redemptions.filter(r => {
            const rDate = new Date(r.timestamp);
            return rDate >= sevenDaysAgo;
        });

        const total = recentRedemptions.length;

        // Generate Report Data
        const byService = {};
        recentRedemptions.forEach(r => {
            const service = r.serviceType || 'Unknown';
            byService[service] = (byService[service] || 0) + 1;
        });

        const serviceHtml = Object.entries(byService)
            .map(([service, count]) => `<li style="margin-bottom: 5px;"><strong>${service}:</strong> ${count}</li>`)
            .join('');

        console.log(`Found ${total} redemptions in the last week.`);

        // Send Email via Resend
        if (process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY);

            await resend.emails.send({
                from: 'No.1 Wellness <notifications@resend.dev>', // Update if custom domain is available
                to: ['wellnessbrotherjay@gmail.com'],
                subject: `Weekly Wellness Report: ${total} Redemptions`,
                html: `
                     <div style="font-family: sans-serif; color: #2c2420; max-width: 600px; margin: 0 auto;">
                         <div style="text-align: center; padding: 20px 0;">
                             <img src="https://wellness-club-digital.vercel.app/htf-logo.png" alt="No.1 Wellness" style="height: 50px;" />
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
                             <a href="https://wellness-club-digital.vercel.app/admin/analytics" style="background-color: #2c2420; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Analytics Board</a>
                         </div>
                         
                         <p style="margin-top: 40px; text-align: center; font-size: 12px; color: #ccc;">
                             Sent automatically by Wellness Club Digital
                         </p>
                     </div>
                 `
            });

            console.log('Weekly report sent.');
        } else {
            console.log('Skipping email: RESEND_API_KEY not found.');
        }

        return res.status(200).json({
            success: true,
            count: total,
            breakdown: byService
        });

    } catch (error) {
        console.error('Weekly Report Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
