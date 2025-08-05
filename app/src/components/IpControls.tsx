import React from 'react';
import type { Subnet } from '../pages/Dashboard';

type Props = {
  selectedType: string;
  setSelectedType: (v: string) => void;
  typeDescriptions: string[];
  selectedSubnet: Subnet | null;
  onRefresh: () => void;
  isLoadingConfig: boolean;
  isLoggedIn: boolean;
  fixedCount: number;
  ipCount: number;
  onSearch: (query: string) => void;
  searchQuery: string;
};

const IpControls: React.FC<Props> = ({ selectedType, setSelectedType, typeDescriptions, selectedSubnet, onRefresh, isLoadingConfig, isLoggedIn, fixedCount, ipCount, onSearch, searchQuery }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">IP Address Management</h2>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label htmlFor="device-type" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Device Type</label>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Range in: {selectedSubnet?.ipPrefix}.X.0-255</div>
          <select
            id="device-type"
            className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">Select a device type...</option>
            {typeDescriptions.filter(type => type !== '').map((type) => (
              <option key={type} value={type}>{`${type} (${selectedSubnet?.typeDescriptions[type]})`}</option>
            ))}
          </select>
        </div>

        <div>
            <label htmlFor="host-search" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Search All Hosts</label>
            <input
                type="text"
                id="host-search"
                className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
                placeholder="Search by hostname, IP, or MAC..."
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                disabled={!isLoggedIn}
            />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoadingConfig || !isLoggedIn}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded text-sm"
          >
            {isLoadingConfig ? 'Loading…' : 'Refresh IPs'}
          </button>
          <div className='text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/60 px-3 py-2 rounded-lg flex space-x-4'>
            <div>Fixed IPs: <span className="font-semibold">{fixedCount}</span></div>
            <div className="hidden sm:block">Current Type: <span className="font-semibold">{selectedType || 'None'}</span></div>
            <div>IPs in Range: <span className="font-semibold">{ipCount}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IpControls;