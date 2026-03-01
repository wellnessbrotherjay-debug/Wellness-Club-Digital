import dotenv from 'dotenv';
dotenv.config();

import handler from './api/get-data.js';

async function run() {
  const req = { query: { sheet: 'Vouchers' } };
  const res = {
    status: (code) => ({
      json: (data) => console.log(`Status ${code}`, data)
    }),
    json: (data) => console.log(`Status 200`, data)
  };
  
  await handler(req, res);
}
run();
