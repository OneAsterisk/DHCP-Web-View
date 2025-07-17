import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.join(__dirname, 'servers.json');

    const fileContent = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(fileContent));
  } catch (error) {
    console.error('Error reading servers.json:', error);
    res.status(500).json({ error: 'Failed to read servers configuration' });
  }
} 