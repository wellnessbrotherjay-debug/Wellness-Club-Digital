import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://bwndbccgzjdgtcyornwn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey!);

function parseDDMMYYYY(dateStr: string) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        // Returns YYYY-MM-DD
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return null;
}

// Simple CSV parser ignoring quotes for now, assuming comma delimiter
function parseCSV(content: string) {
    const lines = content.trim().split('\n').filter(l => l.trim().length > 0);
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
        const cols = [];
        let inQuotes = false;
        let buf = '';
        for(let i = 0; i < line.length; i++) {
            if(line[i] === '"') inQuotes = !inQuotes;
            else if(line[i] === ',' && !inQuotes) { cols.push(buf); buf = ''; }
            else buf += line[i];
        }
        cols.push(buf);
        
        return {
            createdDate: cols[0]?.trim(),
            arrival: cols[1]?.trim(),
            depart: cols[2]?.trim(),
            guestName: cols[3]?.trim() || '',
            roomNumber: cols[4]?.trim() || '',
            link: cols[8]?.trim() || '',
            voucherId: cols[9]?.trim() || ''
        };
    });
}

async function run() {
    console.log('Fetching unknown guests from DB...');
    const { data: vouchers, error } = await supabase
        .from('vouchers')
        .select('*');
        
    if (error) {
        console.error('Error fetching vouchers:', error);
        return;
    }

    const unknowns = vouchers.filter(v => 
        !v.guest_name || 
        v.guest_name.trim() === '' || 
        v.guest_name === 'Unknown Guest' ||
        v.guest_name.toLowerCase().includes('unknown')
    );
    
    console.log(`Found ${unknowns.length} vouchers with unknown guest in DB`);
    if (unknowns.length === 0) return;

    const csvData = fs.readFileSync('voucher - Front Data back up- GRO only .csv', 'utf8');
    const groRecords = parseCSV(csvData).filter(r => r.guestName && r.roomNumber);
    console.log(`Parsed ${groRecords.length} usable records from GRO CSV`);

    let updatedCount = 0;
    console.log("DB Voucher IDs Sample:", unknowns.slice(0, 5).map(v => `'${v.voucher_code}'`).join(', '));
    console.log("CSV Voucher IDs Sample:", groRecords.slice(0, 5).map(r => `'${r.voucherId}'`).join(', '));
    console.log("CSV Links Sample:", groRecords.slice(0, 5).map(r => `'${r.link}'`).join(', '));

    for (const voucher of unknowns) {
        let dbRoom = String(voucher.room_number || '').trim();
        const dbDateMatch = voucher.created_at ? voucher.created_at.substring(0, 10) : null;
        
        let foundMatch = null;

        for (const r of groRecords) {
            // First check by Voucher ID/Link (strongest match)
            if (r.voucherId && voucher.voucher_code && r.voucherId === voucher.voucher_code) {
                foundMatch = r;
                break;
            }
            if (r.link && voucher.voucher_code && r.link.includes(voucher.voucher_code)) {
                foundMatch = r;
                break;
            }

            // Fallback: Room + Date match
            if (dbRoom) {
                const roomMatch = String(r.roomNumber).trim() === dbRoom;
                if (roomMatch) {
                    let rDate = parseDDMMYYYY(r.createdDate) || parseDDMMYYYY(r.arrival);
                    if (rDate === dbDateMatch) {
                        foundMatch = r;
                        break;
                    }
                }
            }
        }

        if (foundMatch && foundMatch.guestName) {
            console.log(`Found match for VOUCHER ${voucher.voucher_code} (Room ${dbRoom}): Update name to '${foundMatch.guestName}'`);
            
            const { error: updateError } = await supabase
                .from('vouchers')
                .update({ guest_name: foundMatch.guestName })
                .eq('voucher_code', voucher.voucher_code);
                
            if (updateError) {
                console.error(`Error updating ${voucher.voucher_code}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }
    
    console.log(`\nUpdates complete. Updated ${updatedCount} vouchers.`);
}

run().catch(console.error);
