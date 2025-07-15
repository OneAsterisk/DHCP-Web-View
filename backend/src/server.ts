import express from 'express';
import dotenv from 'dotenv';
import SSH2Promise from 'ssh2-promise';
import fs from 'fs/promises';
import path from 'path';
import { NodeSSH } from 'node-ssh';
// @ts-ignore
import dhcpdLeases from 'dhcpd-leases';

interface ServerSSHConfig {
    host: string;
    username: string;
    password: string;
    port: number;
}


const app = express();
app.use(express.json({limit: '50mb'}));


async function writeFileOverSSH(
    auth: { host: string; username: string; password: string },
    remotePath: string,
    content: string,
  ): Promise<void> {
    const ssh = new NodeSSH();
    try {
      await ssh.connect({
        host: auth.host,
        username: auth.username,
        password: auth.password,
        port: 22,
      });
  
      // Get an SFTP session
      const sftp = await ssh.requestSFTP();
      // Write the buffer directly
      await new Promise<void>((resolve, reject) => {
        sftp.writeFile(remotePath, Buffer.from(content, 'utf8'), (err: any) =>
          err ? reject(err) : resolve(),
        );
      });
    } finally {
      ssh.dispose();
    }
  }
  

app.get('/api/servers', async (req, res) => {
    try {
        const filePath = path.join(__dirname, '..', 'servers.json');
        const fileContent = await fs.readFile(filePath, 'utf-8');
        res.json(JSON.parse(fileContent));
    } catch (error) {
        console.error('Error reading servers.json:', error);
        res.status(500).json({ error: 'Failed to read servers configuration' });
    }
});

app.post('/api/dhcpd-conf', async (req, res) => {
    const { auth, command } = req.body;
    try {
        const result = await runSSHCommand(auth, command);
        res.json({output: result.toString()});
    }
    catch (error) {
        console.error('Error reading dhcpd.conf:', error);
        res.status(500).json({ error: 'Failed to read dhcpd.conf' });
    }
});

export async function runSSHCommand(
    auth: { host: string; username: string; password: string },
    cmd: string,
  ): Promise<string> {
    const ssh = new NodeSSH();
    await ssh.connect({
      host: auth.host,
      username: auth.username,
      password: auth.password,
      port: 22,
    });
  
    const fullCmd = `printf '%s\\n' '${auth.password}' | ${cmd}`;
    const { stdout, stderr } = await ssh.execCommand(fullCmd);
    if (stderr && stderr.includes('sudo:')) throw new Error(stderr);
    return stdout;
  }

app.post('/api/update-dhcpd-conf', async (req, res) => {
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
});

app.post('/api/status', async (req, res) => {
const { auth, command } = req.body;
    try {
        const result = await runSSHCommand(auth, command);
        res.json({output: result.toString()});
    } catch (error: any) {
        console.error('SSH command failed:', error.message);
        
        // Provide more specific error messages based on the error type
        let errorMessage = 'Failed to execute command';
        if (error.message.includes('All configured authentication methods failed')) {
            errorMessage = 'Authentication failed. Please check your username and password.';
        } else if (error.message.includes('connect ECONNREFUSED') || error.message.includes('getaddrinfo ENOTFOUND')) {
            errorMessage = 'Cannot connect to server. Please check the server address.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Connection timeout. Please check your network connection.';
        }
        
        res.status(500).json({ error: errorMessage });
    }
});

app.post('/api/leases', async (req, res) => {
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
        if (error.message.includes('All configured authentication methods failed')) {
            errorMessage = 'Authentication failed. Please check your username and password.';
        } else if (error.message.includes('connect ECONNREFUSED') || error.message.includes('getaddrinfo ENOTFOUND')) {
            errorMessage = 'Cannot connect to server. Please check the server address.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Connection timeout. Please check your network connection.';
        }
        
        res.status(500).json({ error: errorMessage });
    }
});
// Load environment variables
dotenv.config();

// Set the port from environment variable or default to 3001
const PORT = process.env.PORT || 3001;

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 DHCP Web View Backend server is running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints available:`);
    console.log(`   GET  /api/servers`);
    console.log(`   POST /api/status`);
    console.log(`   POST /api/leases`);
    console.log(`   POST /api/add-dhcp-entry`);
    console.log(`   POST /api/dhcpd-conf`);
    console.log(`   POST /api/update-dhcpd-conf`);
});
