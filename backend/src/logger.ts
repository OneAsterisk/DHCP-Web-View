import fs from 'fs/promises';
import path from 'path';

const logFilePath = path.join(__dirname, '..', 'logs', 'activity.log');

// Ensure the logs directory exists
const ensureLogDirExists = async () => {
  try {
    await fs.mkdir(path.dirname(logFilePath), { recursive: true });
  } catch (error) {
    console.error('Error creating log directory:', error);
  }
};

ensureLogDirExists();

export const logActivity = async (username: string, action: string) => {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - User: ${username}, Action: ${action}\n`;

  try {
    await fs.appendFile(logFilePath, logEntry);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}; 