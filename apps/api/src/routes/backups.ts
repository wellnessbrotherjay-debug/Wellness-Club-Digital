import { Hono } from 'hono';
import * as fs from 'fs';
import * as path from 'path';

const app = new Hono();
const BACKUP_DIR = path.join(process.cwd(), 'backups');

app.get('/', async (c) => {
  if (!fs.existsSync(BACKUP_DIR)) {
    return c.json({ files: [] });
  }

  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const stats = fs.statSync(path.join(BACKUP_DIR, file));
        return {
          filename: file,
          size: stats.size,
          created_at: stats.birthtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return c.json({ files });
  } catch (err: any) {
    return c.json({ error: 'Failed to read backups directory', details: err.message }, 500);
  }
});

app.get('/:filename', async (c) => {
  const filename = c.req.param('filename');
  
  // Basic security to prevent directory traversal
  if (!filename || filename.includes('..') || !filename.endsWith('.json')) {
    return c.json({ error: 'Invalid filename' }, 400);
  }

  const filePath = path.join(BACKUP_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return c.json({ error: 'File not found' }, 404);
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    c.header('Content-Type', 'application/json');
    c.header('Content-Disposition', `attachment; filename="${filename}"`);
    return c.body(fileContent);
  } catch (err: any) {
    return c.json({ error: 'Failed to read backup file' }, 500);
  }
});

export default app;
