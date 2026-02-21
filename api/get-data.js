
export default async function handler(req, res) {
    const { sheet } = req.query;
    const SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwmKKJQ1hNHpr5swy5yt99iAFwgFOJYttWneIfklLeYJIxz6owkDzV_xCNb6GfTOAGQ/exec';

    if (!sheet) {
        return res.status(400).json({ error: 'Sheet name is required' });
    }

    try {
        console.log(`[Proxy GET] Fetching ${sheet} from Apps Script...`);
        const response = await fetch(`${SCRIPT_URL}?sheet=${sheet}`);
        const text = await response.text();

        // Apps Script might return JSONP or JSON
        // If it starts with "cb(" or similar, it's JSONP
        // But if we call it without callback param, it *should* return JSON if handled by Apps Script correctly.
        // However, many existing GAS scripts always wrap if a param exists.

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            // Try to extract from JSONP if it returned JSONP anyway (e.g. callback wrapping)
            const match = text.match(/^[^(]*\((.*)\)[^)]*$/);
            if (match && match[1]) {
                try {
                    data = JSON.parse(match[1]);
                } catch (pe) {
                    console.error('Failed to parse inner JSONP content:', pe);
                }
            }
        }

        // Final safety check: if we didn't get an array, return an empty array or handle error
        if (!Array.isArray(data)) {
            console.warn(`[Proxy GET] Final data for ${sheet} is not an array:`, typeof data);
            // If it's an error object from GAS, return it so the frontend can show the message
            if (data && typeof data === 'object' && data.status === 'error') {
                return res.status(200).json(data);
            }
            return res.status(200).json([]);
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error(`[Proxy GET Error] ${sheet}:`, error);
        return res.status(200).json([]); // Always return valid JSON during live issues
    }
}
