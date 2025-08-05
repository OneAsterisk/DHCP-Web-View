import express from 'express';
import dotenv from 'dotenv';
import SSH2Promise from 'ssh2-promise';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import { NodeSSH } from 'node-ssh';
import jwt from 'jsonwebtoken';
// @ts-ignore
import dhcpdLeases from 'dhcpd-leases';
import { logActivity } from './logger';

interface AuthenticatedUserPayload {
    username: string;
    host: string;
    password: string;
    iat: number;
    exp: number;
}

interface AuthRequest extends express.Request {
    user?: AuthenticatedUserPayload;
}

const authToken = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.split(' ')[1];

    if(!token) {
        return res.status(401).json({error: 'Unauthorized'});
    }

    const jwtSecret = process.env.JWT_SECRET;
    if(!jwtSecret) {
        console.error('JWT_SECRET is not set');
        return res.status(500).json({error: 'Server Security Error'});
    }

    jwt.verify(token, jwtSecret, (err, user) => {
        if(err) {
            return res.status(401).json({error: 'Unauthorized'});
        }
        req.user = user as AuthenticatedUserPayload;
        next();
    });
}

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
    const decodedPassword = Buffer.from(auth.password, 'base64').toString('utf8');
    try {
      await ssh.connect({
        host: auth.host,
        username: auth.username,
        password: decodedPassword,
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

app.get('/', async(req, res) => {
    console.log("You've reached the api. Good for you!")
    res.json({message: "You've reached the api. Good for you!"})
})

app.post('/api/login', async (req, res) => {
    const { auth } = req.body;
    try {
        await runSSHCommand(auth, 'echo "Login successful"');

        const jwtSecret = process.env.JWT_SECRET;
        if(!jwtSecret) {
            console.error('JWT_SECRET is not set');
            return res.status(500).json({error: 'Server Security Error'});
        }
        const payload = {
            username: auth.username,
            host: auth.host,
            password: auth.password,
        };
        const token = jwt.sign(payload, jwtSecret, {expiresIn: '1h'});

        await logActivity(auth.username, `Logged in to server ${auth.host}`);
        res.json({message: 'Login successful', token: token});
    } catch (error: any) {
        console.error('Login failed:', error.message);
        await logActivity(auth.username, `Failed login attempt to server ${auth.host}`);
        res.status(401).json({ error: 'Authentication failed. Please check your credentials.' });
    }
});

app.post('/api/dhcpd-conf', authToken, async (req: AuthRequest, res) => {
    const { command } = req.body;
    const auth = req.user;

    if(!auth) {
        return res.status(401).json({error: 'Unauthorized'});
    }

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
    const decodedPassword = Buffer.from(auth.password, 'base64').toString('utf8');

    await ssh.connect({
      host: auth.host,
      username: auth.username,
      password: decodedPassword,
      port: 22,
    });
  
    const fullCmd = `printf '%s\\n' '${decodedPassword}' | ${cmd}`;
    const { stdout, stderr } = await ssh.execCommand(fullCmd);
    if (stderr && stderr.includes('sudo:')) throw new Error(stderr);
    return stdout;
  }

app.post('/api/update-dhcpd-conf', authToken, async (req: AuthRequest, res) => {
    const { dhcpdConf, action, details } = req.body;
    const auth = req.user;

    if(!auth) {
        return res.status(401).json({error: 'Unauthorized'});
    }
  
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
      console.log('Restarting service');
      await runSSHCommand(auth, 'sudo -S systemctl restart isc-dhcp-server');
      console.log('Service restarted');
      res.json({ message: 'DHCP configuration updated successfully' });
    } catch (error: any) {
      console.error('Error updating DHCP configuration:', error);
      res.status(500).json({ error: 'Failed to update DHCP configuration' });
    }
});

app.post('/api/status', authToken, async (req: AuthRequest, res) => {
    const { command } = req.body;
    const auth = req.user;
    
    try {
        if(!auth) {
            return res.status(401).json({error: 'Unauthorized'});
        }
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

app.post('/api/leases', authToken, async (req: AuthRequest, res) => {
    const { command } = req.body;
    const auth = req.user;

    if(!auth) {
        return res.status(401).json({error: 'Unauthorized'});
    }

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

app.post('/api/restart-service', authToken, async (req: AuthRequest, res) => {
    const auth = req.user;

    if(!auth) {
        return res.status(401).json({error: 'Unauthorized'});
    }

    try {
        console.log('Restarting DHCP service...');
        await runSSHCommand(auth, 'sudo -S systemctl restart isc-dhcp-server');
        console.log('DHCP service restarted successfully');
        
        await logActivity(auth.username, `Manually restarted DHCP service on ${auth.host}`);
        res.json({ message: 'DHCP service restarted successfully' });
    } catch (error: any) {
        console.error('Error restarting DHCP service:', error.message);
        
        // Provide more specific error messages based on the error type
        let errorMessage = 'Failed to restart DHCP service';
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

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '0.0.0.0'; // Listen on all network interfaces


const keyPath = path.join(__dirname, '..', 'certs', 'key.pem');
const certPath = path.join(__dirname, '..', 'certs', 'cert.pem');

const startServer = async () => {
  try {
    const [key, cert] = await Promise.all([
      fs.readFile(keyPath),
      fs.readFile(certPath),
    ]);

    const options = { key, cert };

    https.createServer(options, app).listen(PORT, HOST, () => {
      console.log(`🚀 DHCP Web View Backend server is running securely!`);
      console.log(`   - Local (HTTPS): https://localhost:${PORT}`);
      console.log(`   - Network (HTTPS): https://<YOUR_LOCAL_IP>:${PORT}`);
    });
  } catch (error: any) {
    console.error('❌ Could not start HTTPS server.', error.code === 'ENOENT' ? 'Certificate files not found.' : '');
    console.log('✅ Falling back to INSECURE HTTP mode.');
    
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Backend server is running in INSECURE HTTP mode.`);
      console.log(`   - Local (HTTP): http://localhost:${PORT}`);
    });
  }
};

startServer();
