import { Hono } from 'hono';
import { supabaseAdmin } from '../db.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const app = new Hono();

/**
 * POST /api/parse-pos
 * Body: { fileUrl: string (path in Supabase Storage), date: string (YYYY-MM-DD) }
 */
app.post('/', async (c) => {
    let body: any;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const { fileUrl, date } = body;

    if (!fileUrl || !date) {
        return c.json({ error: 'fileUrl and date are required' }, 400);
    }

    try {
        console.log('[parse-pos] Downloading file:', fileUrl);

        const { data: fileData, error: downloadError } = await supabaseAdmin.storage
            .from('pos-reports')
            .download(fileUrl);

        if (downloadError) throw downloadError;

        console.log('[parse-pos] Download OK, parsing PDF...');
        const pdf = require('pdf-parse-new');
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfData = await pdf(buffer);
        const text: string = pdfData.text;

        console.log('[parse-pos] PDF parsed, text preview:', text.substring(0, 50));

        const transactions = parseTextToTransactions(text, date);
        console.log('[parse-pos] Extracted transactions:', transactions.length);

        const matchedTransactions = await matchTransactionsToStays(transactions);

        const { error: insertError } = await supabaseAdmin
            .from('pos_transactions')
            .insert(matchedTransactions);

        if (insertError) throw insertError;

        console.log('[parse-pos] Inserted', matchedTransactions.length, 'transactions');
        return c.json({
            message: 'Processing complete',
            count: matchedTransactions.length,
            transactions: matchedTransactions,
        });
    } catch (err: any) {
        console.error('[parse-pos] Error:', err.message);
        return c.json({ error: err.message }, 500);
    }
});

function parseTextToTransactions(text: string, date: string) {
    const lines = text.split('\n');
    const transactions: any[] = [];

    for (const line of lines) {
        const roomMatch = line.match(/Room\s*(\d+)/i);
        const amountMatch = line.match(/(\d+\.?\d*)\s*(?:IDR|USD|\$)/i);

        if (roomMatch && amountMatch) {
            transactions.push({
                transaction_date: date,
                room_number: roomMatch[1],
                gross_amount: parseFloat(amountMatch[1]),
                bill_number: `BILL-${Math.random().toString(36).substring(2, 11)}`,
                venue: 'spa',
                raw_json: { raw_line: line },
            });
        }
    }

    return transactions;
}

async function matchTransactionsToStays(transactions: any[]) {
    const enriched: any[] = [];

    for (const tx of transactions) {
        const { data: stay } = await supabaseAdmin
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

export default app;
