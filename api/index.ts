import { handle } from 'hono/vercel';

export const config = {
  runtime: 'nodejs',
};

export default async (req: any, res: any) => {
  // Dynamic import as recommended by Vercel error for ESM compatibility
  const { default: app } = await import('../apps/api/src/app.js');
  return handle(app)(req, res);
};

