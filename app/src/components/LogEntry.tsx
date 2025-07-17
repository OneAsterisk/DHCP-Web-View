import React, { useState } from 'react';

interface LogEntryProps {
  log: string;
}

const LogEntry: React.FC<LogEntryProps> = ({ log }) => {
  const [isHovering, setIsHovering] = useState(false);

  const parts = log.split(' - ');
  if (parts.length < 2) {
    return <div className="p-3 mb-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm">{log}</div>;
  }

  const timestampStr = parts[0];
  const rest = parts.slice(1).join(' - ');

  const userMatch = rest.match(/User: (.*?),/);
  const actionMatch = rest.match(/Action: (.*)/);

  const username = userMatch ? userMatch[1] : 'Unknown';
  let action = actionMatch ? actionMatch[1] : 'Unknown Action';
  
  const date = new Date(timestampStr);
  const formattedDate = !isNaN(date.getTime()) ? date.toLocaleString() : timestampStr;

  let details = null;
  const detailsMatch = action.match(/, Details: (.*)/);
  if (detailsMatch) {
    details = detailsMatch[1];
    action = action.substring(0, action.indexOf(', Details:'));
  }

  return (
    <div 
      className="relative flex items-center justify-between p-3 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center space-x-3">
        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
          {username}
        </span>
        <p className="text-sm text-gray-700 dark:text-gray-300">{action}</p>
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</span>

      {details && isHovering && (
        <div className="absolute bottom-full left-0 mb-2 w-full p-3 bg-gray-900 text-white rounded-lg shadow-lg z-10 text-xs font-mono">
          <h4 className="font-bold mb-1">Action Details:</h4>
          <pre>{JSON.stringify(JSON.parse(details), null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default LogEntry; 