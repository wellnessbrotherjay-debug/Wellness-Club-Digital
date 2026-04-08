export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
        status: 'ok',
        service: 'Wellness Club API',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
    });
}
