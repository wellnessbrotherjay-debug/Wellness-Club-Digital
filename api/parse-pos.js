import pdf from 'pdf-parse';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for DB writes
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { fileUrl, date } = req.body;

        // 1. Download file from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('pos-reports')
            .download(fileUrl);

        if (downloadError) throw downloadError;

        // 2. Parse PDF
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const pdfData = await pdf(buffer);
        const text = pdfData.text;

        // 3. Extract Transactions (Simplified regex-based logic for V1)
        // This part will need careful tuning once a sample PDF is provided.
        const transactions = parseTextToTransactions(text, date);

        // 4. Match to Stays
        const matchedTransactions = await matchTransactionsToStays(transactions);

        // 5. Store in Supabase
        const { error: insertError } = await supabase
            .from('pos_transactions')
            .insert(matchedTransactions);

        if (insertError) throw insertError;

        return res.status(200).json({
            message: 'Processing complete',
            count: matchedTransactions.length,
            transactions: matchedTransactions
        });

    } catch (error) {
        console.error('[Parse POS Error]:', error);
        return res.status(500).json({ error: error.message });
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
