import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runSSHCommand } from './_utils/ssh.js';
// @ts-ignore
import dhcpdLeases from 'dhcpd-leases';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const { auth, command } = req.body;
  try {
    const result = await runSSHCommand(auth, command);
    const leasesContent = result.toString();
    const parsedLeases = dhcpdLeases(leasesContent);
    res.json(parsedLeases);
  } catch (error: any) {
    console.error('SSH command failed:', error.message);

    // Provide more specific error messages based on the error type
    let errorMessage = 'Failed to execute command';
    if (
      error.message.includes('All configured authentication methods failed')
    ) {
      errorMessage =
        'Authentication failed. Please check your username and password.';
    } else if (
      error.message.includes('connect ECONNREFUSED') ||
      error.message.includes('getaddrinfo ENOTFOUND')
    ) {
      errorMessage =
        'Cannot connect to server. Please check the server address.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Connection timeout. Please check your network connection.';
    }

    res.status(500).json({ error: errorMessage });
  }
} 