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
        const { roomNumber, duration, reason, customReason, timestamp } = req.body;
        
        let finalReason = reason;
        if (reason === 'Custom' && customReason) {
            finalReason = customReason;
        }

        const { error } = await supabase.from('insights').insert([{
            room_number: roomNumber,
            duration: duration || null,
            reason: finalReason,
            timestamp: timestamp || new Date().toISOString()
        }]);

        if (error) {
            console.error('Error inserting insight to Supabase:', error);
            return res.status(500).json({ error: 'Failed to log insight', details: error.message });
        }

        return res.status(200).json({ status: 'success', message: 'Insight logged successfully' });

    } catch (err) {
        console.error('Unhandled server error in log-insight:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
}
