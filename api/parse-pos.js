import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse-new');
import { createClient } from '@supabase/supabase-js';

// Initialize outside but check inside to avoid cold-start crashes if env vars are weird
let supabase;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('[Parse POS] Start', { method: req.method });
        const { fileUrl, date } = req.body;
        console.log('[Parse POS] Params:', { fileUrl, date });

        if (!supabase) {
            console.log('[Parse POS] Initializing Supabase client');
            supabase = createClient(
                process.env.VITE_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );
        }

        // 1. Download file from Supabase Storage
        console.log('[Parse POS] Downloading file:', fileUrl);
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('pos-reports')
            .download(fileUrl);

        if (downloadError) {
            console.error('[Parse POS] Download error:', downloadError);
            throw downloadError;
        }
        console.log('[Parse POS] Download successful, size:', fileData.size);

        // 2. Parse PDF
        console.log('[Parse POS] Parsing PDF...');
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let text = '';
        try {
            const pdfData = await pdf(buffer);
            text = pdfData.text;
        } catch (pdfErr) {
            console.error('[Parse POS] PDF Parse library error:', pdfErr);
            throw new Error(`PDF Parsing failed: ${pdfErr.message}`);
        }
        console.log('[Parse POS] PDF parsed, text preview:', text.substring(0, 50));

        // 3. Extract Transactions
        const transactions = parseTextToTransactions(text, date);
        console.log('[Parse POS] Extracted transactions count:', transactions.length);

        // 4. Match to Stays
        console.log('[Parse POS] Matching to stays...');
        const matchedTransactions = await matchTransactionsToStays(transactions);

        // 5. Store in Supabase
        console.log('[Parse POS] Inserting into DB, count:', matchedTransactions.length);
        const { error: insertError } = await supabase
            .from('pos_transactions')
            .insert(matchedTransactions);

        if (insertError) {
            console.error('[Parse POS] DB Insert error:', insertError);
            throw insertError;
        }

        console.log('[Parse POS] Success');
        return res.status(200).json({
            message: 'Processing complete',
            count: matchedTransactions.length,
            transactions: matchedTransactions
        });

    } catch (error) {
        console.error('[Parse POS Error]:', error);
        // Ensure we always return JSON even on failure to avoid FUNCTION_INVOCATION_FAILED screen
        return res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

function parseTextToTransactions(text, date) {
    const lines = text.split('\n');
    const transactions = [];

    // V1 MOCK PARSING LOGIC - Searches for patterns like "Room 123", "Amount: 50.00"
    // Real implementation will depend on PDF layout.
    for (const line of lines) {
        const roomMatch = line.match(/Room\s*(\d+)/i);
        const amountMatch = line.match(/(\d+\.?\d*)\s*(?:IDR|USD|$)/i);

        if (roomMatch && amountMatch) {
            transactions.push({
                transaction_date: date,
                room_number: roomMatch[1],
                gross_amount: parseFloat(amountMatch[1]),
                bill_number: `BILL-${Math.random().toString(36).substr(2, 9)}`,
                venue: 'spa', // Default for V1 or extracted from context
                raw_json: { raw_line: line }
            });
        }
    }

    return transactions;
}

async function matchTransactionsToStays(transactions) {
    const enriched = [];

    for (const tx of transactions) {
        // Look for active stay for this room and date
        const { data: stay, error } = await supabase
            .from('stays')
            .select('id, guest_name')
            .eq('room_number', tx.room_number)
            .lte('check_in', tx.transaction_date)
            .gte('check_out', tx.transaction_date)
            .single();

        if (stay) {
            tx.stay_id = stay.id;
            tx.guest_name = stay.guest_name;
        } else {
            tx.source = 'unmatched_room_transaction';
        }
        enriched.push(tx);
    }

    return enriched;
}
