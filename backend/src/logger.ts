import fs from 'fs/promises';
import path from 'path';

const logFilePath = path.join(__dirname, '..', 'logs', 'activity.log');

export const logActivity = async (username: string, action: string) => {
  const timestamp = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
  const logEntry = `${timestamp} - User: ${username}, Action: ${action}\n`;

  try {
    // Ensure the log directory exists before trying to write the file
    await fs.mkdir(path.dirname(logFilePath), { recursive: true });
    // Append the log entry. This will create the file if it doesn't exist.
    await fs.appendFile(logFilePath, logEntry);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}; 