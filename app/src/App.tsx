import { use, useEffect, useMemo, useState } from 'react'
import './App.css'
import { createLeaseArray, parseDHCPDConf, updateHostEntry, type FixedIp, type LeaseArray } from './helpers/fixed-ip-helper';
import AddEntryModal from './components/AddEntryModal';

type Server = {
  name: string;
  host: string;
  ipPrefix: string;
  typeDescriptions: {[key: string]: number[]};
}

interface DHCPEntry {
  hostname: string;
  macAddress: string;
  ipAddress: string;
}

function App() {

  const [output, setOutput] = useState<string>('Click the button to get server status');
  const [servers, setServers] = useState<Server[]>([]);
  const [serviceStatus, setServiceStatus] = useState<string>('Not Checked');
  const [selectedServer, setSelectedServer] = useState<Server>({} as Server);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMessage, setModalMessage] = useState<string>('');
  const [leases, setLeases] = useState<any[]>([]);
  const [dhcpdConf, setDhcpdConf] = useState<FixedIp[]>([]);
  const [dhcpdConfString, setDhcpdConfString] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [leaseArray, setLeaseArray] = useState<LeaseArray[]>([]);
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState<boolean>(false);
  const [selectedIpForEntry, setSelectedIpForEntry] = useState<string>('');
  const [currentHostname, setCurrentHostname] = useState<string>('');
  const [currentMacAddress, setCurrentMacAddress] = useState<string>('');
const typeDescriptions = useMemo(() => {
  if (!selectedServer || !selectedServer.typeDescriptions) {
    return [];
  }
  return Object.keys(selectedServer.typeDescriptions);
}, [selectedServer]);

  const openModal = (message: string) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };
  useEffect(() => {
  const fetchServers = async () => {
   const response = await fetch('/api/servers');
   if (response.ok) {
     const data = await response.json();
     setServers(data);
     if( data.length > 0) {
       setSelectedServer(data[0]);
     }
   }
  }
   fetchServers();
}, []);

useEffect(() => {
  // Only fetch dhcpd.conf if user is logged in and has credentials
  if (isLoggedIn && selectedServer.host && username && password) {
    fetchDhcpdConf();
  }
}, [selectedServer, isLoggedIn, username, password]);

useEffect(() => {
  if (selectedType && selectedType !== '' && selectedServer.typeDescriptions) {
    const typeNumbers = selectedServer.typeDescriptions[selectedType];
    if (typeNumbers && typeNumbers.length > 0) {
      // Combine results from all type numbers in the range
      const allLeases: LeaseArray[] = [];
      typeNumbers.forEach(typeNumber => {
        const leases = createLeaseArray(dhcpdConf, typeNumber, selectedServer.ipPrefix);
        allLeases.push(...leases);  // Spread operator to combine arrays
      });
      setLeaseArray(allLeases);
    }
  }
}, [selectedType, dhcpdConf, selectedServer]);

const fetchDhcpdConf = async () => {
if(!selectedServer) {
  openModal('Please select a server');
  return;
}
if(!isLoggedIn) {
  openModal('Please login to fetch the dhcpd.conf');
  return;
}
if(!username || !password) {
  openModal('Please provide your server credentials to fetch the dhcpd.conf');
  return;
}
  const auth = {
    host: selectedServer.host,
    username: username,
    password: password,
  };
  const command = 'cat /etc/dhcp/dhcpd.conf';
  const response = await fetch('/api/dhcpd-conf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth, command }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
    openModal(`Error fetching dhcpd.conf: ${errorMessage}`);
    return;
  }
  const data = await response.json(); 
  setDhcpdConf(parseDHCPDConf(data.output));
  setDhcpdConfString(data.output);
}

const checkStatus = async () => {
  if (!isLoggedIn || !selectedServer || !username || !password) {
    openModal('Please provide your server credentials to check the service status');
    return;
  }
  setOutput('Loading...');
  const auth = {
    host: selectedServer.host,
    username: username,
    password: password,
  };
  const command = 'systemctl status isc-dhcp-server';

  try {
    const response = await fetch('/api/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth, command }),
    });
    
    if (!response.ok) {
      // Try to get more detailed error information
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
      setOutput(`Error: ${errorMessage}`);
      return;
    }
    
    const data = await response.json();
    setOutput(data.output);
    
    const lines = data.output.split('\n');
    const serviceStatus = lines.find((line: string) => line.trim().startsWith('Active:'));
    let status = "inactive";
    if (serviceStatus.includes('active')) {
      status = "active";
    }
    setServiceStatus(status);
  } catch (error) {
    console.error('Error checking status:', error);
    setOutput('Error: Network request failed. Check if backend is running.');
  }
};

const handleAddEntry = async (entry: DHCPEntry) => {
  if (!isLoggedIn || !selectedServer.host || !username || !password) {
    openModal('Please provide your server credentials to add an entry');
    return;
  }

  const auth = {
    host: selectedServer.host,
    username: username,
    password: password,
  };

  const updatedDhcpdConf = updateHostEntry(dhcpdConfString, currentHostname, entry.ipAddress, entry.macAddress, entry.hostname);
  try {
    const response = await fetch('/api/update-dhcpd-conf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth, dhcpdConf: updatedDhcpdConf }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
      openModal(`Error updating DHCP configuration: ${errorMessage}`);
      return;
    }
  } catch (error) {
    console.error('Error updating DHCP configuration:', error);
    openModal('Error: Network request failed. Check if backend is running.');
  }
  openModal(`Successfully updated entry for ${entry.hostname}`);
  fetchDhcpdConf();
  setIsAddEntryModalOpen(false);
  setCurrentHostname('');
  setCurrentMacAddress('');
  setSelectedIpForEntry('');
  setSelectedType('');
  setIsAddEntryModalOpen(false);
  checkStatus();
  return;
};

const openAddEntryModal = (ipAddress: string, currentHostname?: string, currentMacAddress?: string) => {
  setSelectedIpForEntry(ipAddress);
  setIsAddEntryModalOpen(true);
};

useEffect(() => {
  // Only run if user is logged in and has selected a server
  if (!isLoggedIn || !selectedServer.host || !username || !password) {
    return;
  }
  
  checkStatus();
}, [selectedServer, isLoggedIn, username, password]);


  return (
      <div className="center">
        <h1 className="text-3xl font-bold underline">DHCP Web View</h1>
        <p>Welcome to the DHCP Web View application!</p>
        <form className="max-w-lg mx-auto">
          <label htmlFor="server-select" className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'>Select Server:</label>
          <select
            id="server-select"
            value={selectedServer.host}
            onChange={(e) => setSelectedServer(servers.find(server => server.host === e.target.value) || {} as Server)}
            className='mb-4 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
          >
            {servers.map((server) => (
              <option key={server.host} value={server.host}>
                {server.name} ({server.host})
              </option>
            ))}
          </select>
          <div className='flex justify-between items-center mb-4'>
            <label htmlFor="username" className='block mb-2 mr-2 text-sm font-medium text-gray-900 dark:text-white'>Username:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className='mr-4 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
            />
            <label htmlFor="password" className='block mb-2 mr-2 text-sm font-medium text-gray-900 dark:text-white'>Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
            />
          </div>
            <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => {
              if (username && password) {
                setIsLoggedIn(true);
              }
              }}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Login
            </button>
            </div>
        </form>
        {/* Server Status */}
        <h1 className='text-2xl font-bold mt-4 underline mb-4'>DHCP Server Status</h1>
        <div className="flex justify-between items-center mx-auto max-w-lg">
          <div className="flex items-center">
            <h2 className='text-lg font-bold mr-4'>Service Status:</h2>
            <div className={`w-5 h-5 rounded-full mr-1 ${serviceStatus === 'active' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></div>
            <span className='text-lg font-bold text-center'>
              {serviceStatus}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              checkStatus();
            }}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Check Status
          </button>
        </div>
        {/* Available IPs */}
        <h1 className='text-2xl font-bold mt-4 underline mb-4'>Available IPs</h1>
        <div className="flex flex-col justify-center items-center mx-auto max-w-lg">
          <form>
            <select className='mb-4 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">Select a device type...</option>
              {typeDescriptions.filter(type => type !== '').map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </form>
          <button
            type="button"
            onClick={() => {
              fetchDhcpdConf();
            }}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Refresh IPs
          </button>
          <div className='text-sm text-gray-500 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg'>
            Fixed IPs Parsed: {dhcpdConf.length} | Current Type: {selectedType || 'None selected'} | IPs in Range: {leaseArray.length}
          </div>
        </div>

        {/* Leases Table */}
        <div className="overflow-x-auto mx-auto max-w-2xl mt-4">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Hostname</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {leaseArray.map((item, index) => (
                <tr key={index} className={item.status === 'Free' ? 'bg-green-50 dark:bg-green-900' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">{item.ip}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'Free' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                        : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {item.status === 'Taken' ? (item.hostname || 'Unknown') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.status === 'Free' && isLoggedIn ? (
                      <button
                        onClick={() => openAddEntryModal(item.ip)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                      >
                        Add Entry
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setCurrentHostname(item.hostname || '');
                          setCurrentMacAddress(item.HWAddress?.toUpperCase() || '');
                          openAddEntryModal(item.ip)}
                        }
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                      >
                        Change Entry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {leaseArray.length === 0 && selectedType && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-300">
              No IP addresses found for {selectedType}
            </div>
          )}
          
          {!selectedType && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-300">
              Please select a device type to view available IP addresses
            </div>
          )}
        </div>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div
              className="p-6 rounded-lg text-white"
              style={{
                background: 'radial-gradient(circle, #0f172a 0%, #1e293b 100%)',
              }}
            >
              <p>{modalMessage}</p>
              <button
                className="mt-4 px-4 py-2 bg-sky-600 rounded hover:bg-sky-700"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
        
        <AddEntryModal
          isOpen={isAddEntryModalOpen}
          onClose={() => setIsAddEntryModalOpen(false)}
          onSubmit={handleAddEntry}
          ipAddress={selectedIpForEntry}
          currentHostname={currentHostname}
          currentMacAddress={currentMacAddress}
        />
      </div>
  )
}

export default App