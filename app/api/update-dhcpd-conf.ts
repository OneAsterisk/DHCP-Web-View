import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runSSHCommand, writeFileOverSSH } from './_utils/ssh.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const { auth, dhcpdConf } = req.body;

  try {
    const now = new Date();
    const stamp = now.toISOString().slice(2, 10).replace(/-/g, '-');
    console.log('Creating backup');
    await runSSHCommand(
      auth,
      `sudo -S cp /etc/dhcp/dhcpd.conf "/etc/dhcp/dhcpd.conf.backup.${stamp}"`,
    );
    console.log('Backup created');

    const tmpFile = `/tmp/dhcpd_conf_${stamp}.conf`;
    console.log('Writing new config to tmp');
    await writeFileOverSSH(auth, tmpFile, dhcpdConf);
    console.log('New config written to tmp');

    console.log('Moving to final location');
    await runSSHCommand(
      auth,
      `sudo -S mv "${tmpFile}" /etc/dhcp/dhcpd.conf`,
    );
    console.log('Moved to final location');

    await runSSHCommand(auth, 'sudo -S systemctl restart isc-dhcp-server');

    res.json({ message: 'DHCP configuration updated successfully' });
  } catch (error: any) {
    console.error('Error updating DHCP configuration:', error);
    res.status(500).json({ error: 'Failed to update DHCP configuration' });
  }
} 