import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    const filePath = path.join(process.cwd(), '/public/servers.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(fileContent));
  } catch (error) {
    console.error('Error reading servers.json:', error);
    res.status(500).json({ error: 'Failed to read servers configuration' });
  }
} 