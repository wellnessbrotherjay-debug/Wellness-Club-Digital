export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const WA_WEBHOOK_URL = 'https://n8n-7zgtg8upx0ov.kangkung.sumopod.my.id/webhook/wa-notification';

    try {
        const response = await fetch(WA_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body),
        });

        const data = await response.text();

        if (!response.ok) {
            throw new Error(`External server error: ${response.status}`);
        }

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: 'Failed to send message', details: error.message });
    }
}
