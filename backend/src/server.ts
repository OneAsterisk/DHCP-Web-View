import express from 'express';
import dotenv from 'dotenv';
import SSH2Promise from 'ssh2-promise';
import fs from 'fs/promises';
import path from 'path';
// @ts-ignore
import dhcpdLeases from 'dhcpd-leases';

interface ServerSSHConfig {
    host: string;
    username: string;
    password: string;
    port: number;
}


const app = express();
app.use(express.json());

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

async function runSSHCommand(auth: any, command: string){
    const sshConfig = {
        host: auth.host,
        username: auth.username,
        password: auth.password,
        port: 22
    };
    
    // @ts-ignore
    const ssh = new SSH2Promise(sshConfig);
    try {
        console.log(`Attempting SSH connection to ${auth.host} with user ${auth.username}`);
        await ssh.connect();
        console.log('SSH connection successful');
        const result = await ssh.exec(command);
        console.log('Command executed successfully');
        return result;
    } catch (error) {
        console.error('Error executing SSH command:', error);
        throw error;
    } finally {
        ssh.close();
    }
}

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
});
