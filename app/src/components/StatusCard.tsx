import React from 'react';

type Props = {
  serviceStatus: string;
  isCheckingStatus: boolean;
  isLoggedIn: boolean;
  onCheck: () => void;
};

const StatusCard: React.FC<Props> = ({ serviceStatus, isCheckingStatus, isLoggedIn, onCheck }) => {
  const active = serviceStatus === 'active';
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">DHCP Server Status</h2>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
            <span className={`w-2 h-2 mr-2 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`} />
            {serviceStatus}
          </span>
          <button
            type="button"
            onClick={onCheck}
            disabled={isCheckingStatus || !isLoggedIn}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded text-xs"
          >
            {isCheckingStatus ? 'Checking…' : 'Check Status'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusCard;