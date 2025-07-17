import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runSSHCommand } from './_utils/ssh.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const { auth, command } = req.body;
  try {
    const result = await runSSHCommand(auth, command);
    res.json({ output: result.toString() });
  } catch (error) {
    console.error('Error reading dhcpd.conf:', error);
    res.status(500).json({ error: 'Failed to read dhcpd.conf' });
  }
} 