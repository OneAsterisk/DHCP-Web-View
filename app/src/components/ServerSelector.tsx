import React from 'react';
import type { Server, Subnet } from '../pages/Dashboard';

type Props = {
  servers: Server[];
  selectedServer: Server;
  setSelectedServer: (s: Server) => void;
  availableSubnets: Subnet[];
  selectedSubnet: Subnet | null;
  setSelectedSubnet: (s: Subnet | null) => void;
  isLoadingServers: boolean;
  onServerChanged?: () => void;
};

const ServerSelector: React.FC<Props> = ({
  servers,
  selectedServer,
  setSelectedServer,
  availableSubnets,
  selectedSubnet,
  setSelectedSubnet,
  isLoadingServers,
  onServerChanged,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Server Configuration</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose a server and subnet to manage IPs.</p>
      </div>
      <div className="p-6">
        {isLoadingServers ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ) : (
          <form className="space-y-4">
            <div>
              <label htmlFor="server-select" className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'>Select Server</label>
              <select
                id="server-select"
                value={selectedServer?.host ?? ''}
                onChange={(e) => {
                  const newServer = servers.find(server => server.host === e.target.value);
                  if (newServer) {
                    setSelectedServer(newServer);
                    onServerChanged?.();
                  }
                }}
                className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
              >
                {servers.map(server => (
                  <option key={server.host} value={server.host}>
                    {server.name} ({server.host})
                  </option>
                ))}
              </select>
            </div>

            {availableSubnets.length > 0 && (
              <div>
                <label htmlFor="subnet-select" className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'>Select Subnet</label>
                <select
                  id="subnet-select"
                  value={selectedSubnet?.name || ''}
                  onChange={(e) => {
                    const subnet = availableSubnets.find(s => s.name === e.target.value) || null;
                    setSelectedSubnet(subnet);
                  }}
                  className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
                >
                  {availableSubnets.map(subnet => (
                    <option key={subnet.name} value={subnet.name}>
                      {subnet.name} ({subnet.ipPrefix})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default ServerSelector;