export default async function handler(req, res) {
    // Enable CORS for all origins (or restrict to your domain) to allow mobile browser access
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

    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwCreEUlIhlfesvLzrX-E0NoeeIiBNTreFisv067n2hHYfze1c9exXkyOFhPSUB5a72/exec';

    try {
        // Log incoming request for debugging
        console.log('Redeeming voucher:', req.body);

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow', // Important for Google Script redirects
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // Google Script often prefers this or simple text/plain
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.text();

        // Try to parse JSON response from Google Script if possible
        try {
            const jsonData = JSON.parse(data);
            return res.status(200).json(jsonData);
        } catch (e) {
            return res.status(200).json({ success: true, raw: data });
        }

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: 'Failed to redeem voucher', details: error.message });
    }
}
