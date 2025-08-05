import React from 'react';
import { type FixedIp } from '../helpers/fixed-ip-helper';

type Props = {
  results: FixedIp[];
  handleEditEntry: (entry: any) => void;
  handleDeleteEntry: (hostname: string) => void;
};

const SearchResults: React.FC<Props> = ({ results, handleEditEntry, handleDeleteEntry }) => {
  if (results.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400">
        No hosts found matching your search.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Search Results</h2>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {results.map(entry => (
          <div key={entry.hostName} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">{entry.hostName}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{entry.ip}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">{entry.HWAddress}</div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleEditEntry(entry)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded text-xs"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteEntry(entry.hostName ?? '')}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
