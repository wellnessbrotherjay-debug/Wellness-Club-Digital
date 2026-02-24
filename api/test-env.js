
export default function handler(req, res) {
    res.status(200).json({
        message: 'Diagnostic API Active',
        env: {
            url: process.env.VITE_SUPABASE_URL ? 'PRESENT' : 'MISSING',
            key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'PRESENT' : 'MISSING',
            node: process.version,
            env: process.env.NODE_ENV
        }
    });
}
