import React, { useState, useEffect } from 'react';
import LogEntry from '../components/LogEntry';

const AdminLog: React.FC = () => {
  const [logs, setLogs] = useState<string>('Loading logs...');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/logs');
      if (response.ok) {
        const data = await response.text();
        setLogs(data || 'No logs found.');
      } else {
        setLogs('Failed to load logs.');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs('Error: Could not connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Activity Log</h1>
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded text-sm flex items-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Refreshing...
            </>
          ) : (
            'Refresh Logs'
          )}
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {logs.split('\n').filter(log => log.trim() !== '').reverse().map((log, index) => (
          <LogEntry key={index} log={log} />
        ))}
      </div>
    </div>
  );
};

export default AdminLog; 