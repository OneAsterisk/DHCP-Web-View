import express from 'express';
import dotenv from 'dotenv';
import SSH2Promise from 'ssh2-promise';
import fs from 'fs/promises';
import path from 'path';
import { NodeSSH } from 'node-ssh';
// @ts-ignore
import dhcpdLeases from 'dhcpd-leases';
import { logActivity } from './logger';

// Middleware to decode Base64 password from the request body
const decodePassword = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.body && req.body.auth && req.body.auth.password) {
        try {
            const decodedPassword = Buffer.from(req.body.auth.password, 'base64').toString('utf8');
            req.body.auth.password = decodedPassword;
        } catch (e) {
            // This will catch errors from invalid Base64 strings
            return res.status(400).json({ error: 'Invalid password encoding in request.' });
        }
    }
    next();
};

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

app.post('/api/login', decodePassword, async (req, res) => {
    const { auth } = req.body;
    try {
        // Run a simple, non-destructive command to validate credentials
        await runSSHCommand(auth, 'echo "Login successful"');
        await logActivity(auth.username, `Logged in to server ${auth.host}`);
        res.json({ message: 'Login successful' });
    } catch (error: any) {
        console.error('Login failed:', error.message);
        await logActivity(auth.username, `Failed login attempt to server ${auth.host}`);
        res.status(401).json({ error: 'Authentication failed. Please check your credentials.' });
    }
});

app.post('/api/dhcpd-conf', decodePassword, async (req, res) => {
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

app.post('/api/update-dhcpd-conf', decodePassword, async (req, res) => {
    const { auth, dhcpdConf, action, details } = req.body;
  
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

      // Detailed logging
      const logMessage = `${action}, Details: ${JSON.stringify(details)}`;
      await logActivity(auth.username, `${logMessage} on ${auth.host}`);
  
      await runSSHCommand(auth, 'sudo -S systemctl restart isc-dhcp-server');
  
      res.json({ message: 'DHCP configuration updated successfully' });
    } catch (error: any) {
      console.error('Error updating DHCP configuration:', error);
      res.status(500).json({ error: 'Failed to update DHCP configuration' });
    }
});

app.post('/api/status', decodePassword, async (req, res) => {
const { auth, command } = req.body;
    try {
        const result = await runSSHCommand(auth, command);
        await logActivity(auth.username, `Checked server status on ${auth.host}`);
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

app.get('/api/logs', async (req, res) => {
    try {
        const filePath = path.join(__dirname, '..', 'logs', 'activity.log');
        const fileContent = await fs.readFile(filePath, 'utf-8');
        res.type('text/plain').send(fileContent);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, which is not an error in this case
            res.type('text/plain').send('No activity has been logged yet.');
        } else {
            console.error('Error reading log file:', error);
            res.status(500).json({ error: 'Failed to read log file' });
        }
    }
});

app.post('/api/leases', decodePassword, async (req, res) => {
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
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '0.0.0.0'; // Listen on all network interfaces

// Start the server
app.listen(PORT, HOST, () => {
    console.log(`🚀 DHCP Web View Backend server is running!`);
    console.log(`   - Local:   http://localhost:${PORT}`);
    console.log(`   - Network: http://<YOUR_LOCAL_IP>:${PORT}`); // Replace <YOUR_LOCAL_IP> with your actual IP
    console.log(`📡 API endpoints available:`);
    console.log(`   GET  /api/servers`);
    console.log(`   POST /api/login`);
    console.log(`   POST /api/status`);
    console.log(`   POST /api/leases`);
    console.log(`   POST /api/dhcpd-conf`);
    console.log(`   POST /api/update-dhcpd-conf`);
    console.log(`   GET  /api/logs`);
    console.log(`⚠️ POST /api/delete-dhcp-entry //in progress ⚠️`); 
});
