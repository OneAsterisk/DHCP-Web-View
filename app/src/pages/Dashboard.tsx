import { useEffect, useMemo, useState } from 'react'
import '../App.css'
import { createLeaseArray, createVOIPLeaseArray, calculateVOIPPages, deleteHostEntry, parseDHCPDConf, updateHostEntry, type FixedIp, type LeaseArray } from '../helpers/fixed-ip-helper';
import AddEntryModal from '../components/AddEntryModal';
import { Toaster, toast } from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';

type Subnet = {
  name: string;
  ipPrefix: string;
  typeDescriptions: {[key: string]: number[]};
}

type Server = {
  name: string;
  host: string;
  ipPrefix?: string; // Optional for backward compatibility
  typeDescriptions?: {[key: string]: number[]}; // Optional for backward compatibility
  subnets?: Subnet[]; // New subnet structure
}

interface DHCPEntry {
  hostname: string;
  macAddress: string;
  ipAddress: string;
}

function Dashboard() {

  const [servers, setServers] = useState<Server[]>([]);
  const [serviceStatus, setServiceStatus] = useState<string>('Not Checked');
  const [, setOutput] = useState<string>('Click the button to get server status');
  const [selectedServer, setSelectedServer] = useState<Server>({} as Server);
  const [selectedSubnet, setSelectedSubnet] = useState<Subnet | null>(null);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMessage, setModalMessage] = useState<string>('');
  const [dhcpdConf, setDhcpdConf] = useState<FixedIp[]>([]);
  const [dhcpdConfString, setDhcpdConfString] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [leaseArray, setLeaseArray] = useState<LeaseArray[]>([]);
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState<boolean>(false);
  const [selectedIpForEntry, setSelectedIpForEntry] = useState<string>('');
  const [currentHostname, setCurrentHostname] = useState<string>('');
  const [currentMacAddress, setCurrentMacAddress] = useState<string>('');
  const [, setIsEditMode] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [hostnameToDelete, setHostnameToDelete] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLargeRange, setIsLargeRange] = useState<boolean>(false);
  const [isLoadingIPs, setIsLoadingIPs] = useState<boolean>(false);
  
  // Loading states
  const [isLoadingServers, setIsLoadingServers] = useState<boolean>(true);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(false);
  const [isUpdatingConfig, setIsUpdatingConfig] = useState<boolean>(false);

const typeDescriptions = useMemo(() => {
  // Check if we have a selected subnet, otherwise fall back to server-level typeDescriptions
  const descriptions = selectedSubnet?.typeDescriptions || selectedServer?.typeDescriptions;
  if (!descriptions) {
    return [];
  }
  return Object.keys(descriptions);
}, [selectedServer, selectedSubnet]);

const availableSubnets = useMemo(() => {
  if (!selectedServer?.subnets) {
    return [];
  }
  return selectedServer.subnets;
}, [selectedServer]);

  const openModal = (message: string) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };
  
  useEffect(() => {
  const fetchServers = async () => {
    setIsLoadingServers(true);
    try {
      const response = await fetch('/api/servers');
      if (response.ok) {
        const data = await response.json();
        setServers(data);
        if( data.length > 0) {
          setSelectedServer(data[0]);
          // Auto-select first subnet if available
          if (data[0].subnets && data[0].subnets.length > 0) {
            setSelectedSubnet(data[0].subnets[0]);
          } else {
            setSelectedSubnet(null);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching servers:', error);
    } finally {
      setIsLoadingServers(false);
    }
  }
   fetchServers();
}, []);

// Reset subnet selection when server changes
useEffect(() => {
  if (selectedServer.subnets && selectedServer.subnets.length > 0) {
    setSelectedSubnet(selectedServer.subnets[0]);
  } else {
    setSelectedSubnet(null);
  }
  // Clear selected type when server/subnet changes
  setSelectedType('');
}, [selectedServer]);

// Reset pagination when type changes
useEffect(() => {
  setCurrentPage(1);
}, [selectedType]);

useEffect(() => {
  // Only fetch dhcpd.conf if user is logged in and has credentials
  if (isLoggedIn && selectedServer.host && username && password) {
    fetchDhcpdConf();
  }
}, [selectedServer, isLoggedIn, username, password]);

useEffect(() => {
  if (selectedType && selectedType !== '') {
    setIsLoadingIPs(true);
    
    const descriptions = selectedSubnet?.typeDescriptions || selectedServer?.typeDescriptions;
    const ipPrefix = selectedSubnet?.ipPrefix || selectedServer?.ipPrefix;
    
    if (descriptions && ipPrefix) {
      const typeNumbers = descriptions[selectedType];
      if (typeNumbers && typeNumbers.length > 0) {
        // Check if this is a large range (more than 50 type numbers)
        const isLargeRange = typeNumbers.length > 50;
        setIsLargeRange(isLargeRange);
        
        if (isLargeRange) {
          // For large ranges, use pagination
          const totalPages = calculateVOIPPages(typeNumbers, itemsPerPage);
          setTotalPages(totalPages);
          
          // Generate only the current page of IPs
          const leases = createVOIPLeaseArray(dhcpdConf, ipPrefix, typeNumbers, currentPage, itemsPerPage);
          setLeaseArray(leases);
        } else {
          // For normal ranges, generate all IPs
          const allLeases: LeaseArray[] = [];
          typeNumbers.forEach(typeNumber => {
            const leases = createLeaseArray(dhcpdConf, typeNumber, ipPrefix);
            allLeases.push(...leases);  // Spread operator to combine arrays
          });
          setLeaseArray(allLeases);
          setTotalPages(1);
        }
      }
    }
    
    setIsLoadingIPs(false);
  } else {
    // Reset pagination when no type is selected
    setCurrentPage(1);
    setTotalPages(1);
    setIsLargeRange(false);
    setLeaseArray([]);
  }
}, [selectedType, dhcpdConf, selectedServer, selectedSubnet, currentPage, itemsPerPage]);

const fetchDhcpdConf = async () => {
if(!selectedServer) {
  toast.error('Please select a server');
  return;
}
if(!isLoggedIn) {
  toast.error('Please login to fetch the dhcpd.conf');
  return;
}
if(!username || !password) {
  toast.error('Please provide your server credentials to fetch the dhcpd.conf');
  return;
}
  setIsLoadingConfig(true);
  try {
    const auth = {
      host: selectedServer.host,
      username: username,
      password: btoa(password), // Encode password
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
      toast.error(`Error fetching dhcpd.conf: ${errorMessage}`);
      return;
    }
    const data = await response.json(); 
    
    // Get the current server's type descriptions for context
    const currentTypeDescriptions = selectedSubnet?.typeDescriptions || selectedServer?.typeDescriptions || {};
    
    setDhcpdConf(parseDHCPDConf(data.output, currentTypeDescriptions));
    setDhcpdConfString(data.output);
  } catch (error) {
    console.error('Error fetching dhcpd.conf:', error);
    toast.error('Error: Network request failed. Check if backend is running.');
  } finally {
    setIsLoadingConfig(false);
  }
}

const checkStatus = async () => {
  if (!isLoggedIn || !selectedServer || !username || !password) {
    toast.error('Please provide your server credentials to check the service status');
    return;
  }
  setIsCheckingStatus(true);
  setOutput('Loading...');
  const auth = {
    host: selectedServer.host,
    username: username,
    password: btoa(password), // Encode password
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
  } finally {
    setIsCheckingStatus(false);
  }
};

const handleLogin = async () => {
  if (!username || !password) {
    toast.error('Please enter both username and password.');
    return;
  }
  try {
    const auth = {
      host: selectedServer.host,
      username: username,
      password: btoa(password), // Encode password
    };
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth }),
    });

    if (response.ok) {
      setIsLoggedIn(true);
      toast.success('Login successful!');
    } else {
      const errorData = await response.json();
      toast.error(errorData.error || 'Login failed.');
      setIsLoggedIn(false);
    }
  } catch (error) {
    toast.error('An error occurred during login.');
    setIsLoggedIn(false);
  }
};

const handleAddEntry = async (entry: DHCPEntry) => {
  if (!isLoggedIn || !selectedServer.host || !username || !password) {
    toast.error('Please provide your server credentials to add an entry');
    return;
  }

  setIsUpdatingConfig(true);
  try {
    const auth = {
      host: selectedServer.host,
      username: username,
      password: btoa(password), // Encode password
    };

    // Get the current server's type descriptions for context
    const currentTypeDescriptions = selectedSubnet?.typeDescriptions || selectedServer?.typeDescriptions || {};
    
    const isEditMode = !!currentHostname;
    const action = isEditMode ? 'Edit Entry' : 'Add Entry';
    const details = {
      ipAddress: entry.ipAddress,
      hostname: entry.hostname,
      macAddress: entry.macAddress,
      previousHostname: isEditMode ? currentHostname : undefined,
    };
    
    const updatedDhcpdConf = updateHostEntry(dhcpdConfString, currentHostname, entry.ipAddress, entry.macAddress, entry.hostname, currentTypeDescriptions);
    
    const response = await fetch('/api/update-dhcpd-conf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth, dhcpdConf: updatedDhcpdConf, action, details }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
      toast.error(`Error updating DHCP configuration: ${errorMessage}`);
      return;
    }
    
    toast.success(`Successfully updated entry for ${entry.hostname}`);
    fetchDhcpdConf();
    resetAddEntryModal();
    checkStatus();
  } catch (error) {
    console.error('Error updating DHCP configuration:', error);
    toast.error('Error: Network request failed. Check if backend is running.');
  } finally {
    setIsUpdatingConfig(false);
  }
};

const resetAddEntryModal = () => {
  setIsAddEntryModalOpen(false);
  setCurrentHostname('');
  setCurrentMacAddress('');
  setSelectedIpForEntry('');
  setSelectedType('');
  setIsEditMode(false);
}

const handleEditEntry = (entry: any) => {
  setIsEditMode(true);
  setCurrentHostname(entry.hostname);
  setCurrentMacAddress(entry.HWAddress?.toUpperCase() || '');
  setSelectedIpForEntry(entry.ip);
  setSelectedType(entry.type.split(" ")[0]);
  setIsAddEntryModalOpen(true);
};

const handleDeleteEntry = async (hostname: string)=> {
  setHostnameToDelete(hostname);
  setIsConfirmModalOpen(true);
}

const confirmDelete = async ()=> {
    if (!hostnameToDelete) return;

    const updatedDhcpdConf = deleteHostEntry(dhcpdConfString, hostnameToDelete);
    const auth = {
      host: selectedServer.host,
      username: username,
      password: btoa(password), // Encode password
    };
    const action = 'Delete Entry';
    const details = { hostname: hostnameToDelete };

    try {
      const response = await fetch('/api/update-dhcpd-conf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth, dhcpdConf: updatedDhcpdConf, action, details }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
        toast.error(`Error updating DHCP configuration: ${errorMessage}`);
        return;
      }
    } catch (error) {
    console.error('Error updating DHCP configuration:', error);
    toast.error('Error: Network request failed. Check if backend is running.');
    }
    toast.success(`Successfully deleted entry for ${hostnameToDelete}`);
    fetchDhcpdConf();
    resetAddEntryModal();
    checkStatus();
    setIsConfirmModalOpen(false);
    setHostnameToDelete('');
    return;

  }

  const handleOpenAddEntryModal = (ip: string, type: string, hostname?: string, macAddress?: string) => {
    if (hostname && macAddress) {
      handleEditEntry({ hostname, HWAddress: macAddress, ip, type });
    } else {
      setIsEditMode(false);
      setSelectedIpForEntry(ip);
      setSelectedType(type.split(" ")[0]);
      setIsAddEntryModalOpen(true);
    }
  };

  return (
      <>
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Server Configuration Card */}
            <div className="lg:col-span-3 order-1 lg:order-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Server Configuration</h2>
                </div>
                <div className="p-6">
                  {isLoadingServers ? (
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  ) : (
                    <form className="space-y-4">
                      <div>
                        <label htmlFor="server-select" className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'>Select Server:</label>
                        <select
                          id="server-select"
                          value={selectedServer.host}
                          onChange={(e) => setSelectedServer(servers.find(server => server.host === e.target.value) || {} as Server)}
                          className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
                        >
                          {servers.map((server) => (
                            <option key={server.host} value={server.host}>
                              {server.name} ({server.host})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Subnet Selection - only show if server has subnets */}
                      {availableSubnets.length > 0 && (
                        <div>
                          <label htmlFor="subnet-select" className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'>Select Subnet:</label>
                          <select
                            id="subnet-select"
                            value={selectedSubnet?.name || ''}
                            onChange={(e) => {
                              const subnet = availableSubnets.find(s => s.name === e.target.value);
                              setSelectedSubnet(subnet || null);
                              setSelectedType(''); // Reset type selection when subnet changes
                            }}
                            className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
                          >
                            {availableSubnets.map((subnet) => (
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

              {/* Authentication Card */}
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Authentication</h2>
                </div>
                <div className="p-6">
                  <form className="space-y-4">
                    <div>
                      <label htmlFor="username" className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'>Username:</label>
                      <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'>Password:</label>
                      <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
                        placeholder="Enter password"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${isLoggedIn ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {isLoggedIn ? 'Logged in' : 'Not logged in'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogin}
                        disabled={!username || !password}
                        className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-1.5 px-3 sm:py-2 sm:px-4 rounded text-xs sm:text-sm"
                      >
                        Login
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3 order-1 lg:order-2 space-y-4 sm:space-y-6">
              {/* Server Status Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">DHCP Server Status</h2>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400 mr-3'>Service Status:</span>
                      <div className={`w-4 h-4 rounded-full mr-2 ${serviceStatus === 'active' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></div>
                      <span className={`text-sm font-semibold ${serviceStatus === 'active' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {serviceStatus}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={checkStatus}
                      disabled={isCheckingStatus || !isLoggedIn}
                      className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-1.5 px-3 sm:py-2 sm:px-4 rounded text-xs sm:text-sm flex items-center"
                    >
                      {isCheckingStatus ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Checking...
                        </>
                      ) : (
                        'Check Status'
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {/* IP Management Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">IP Address Management</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="device-type" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Device Type:</label>
                      <select 
                        id="device-type"
                        className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                      >
                        <option value="">Select a device type...</option>
                        {typeDescriptions.filter(type => type !== '').map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={fetchDhcpdConf}
                        disabled={isLoadingConfig || !isLoggedIn}
                        className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-1.5 px-3 sm:py-2 sm:px-4 rounded text-xs sm:text-sm flex items-center"
                      >
                        {isLoadingConfig ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Loading...
                          </>
                        ) : (
                          'Refresh IPs'
                        )}
                      </button>
                      
                      <div className='text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg'>
                        <div>Fixed IPs: {dhcpdConf.length}</div>
                        <div className="hidden sm:block">Current Type: {selectedType || 'None selected'}</div>
                        <div>IPs in Range: {leaseArray.length}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* IP Table Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">IP Address Table</h2>
                </div>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">IP Address</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Status</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Hostname</th>
                        <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      {isLoadingIPs ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-300">
                            <div className="flex justify-center items-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                              <span className="ml-2">Loading IP addresses...</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        leaseArray.map((item, index) => (
                        <tr key={index} className={item.status === 'Free' ? 'bg-green-50 dark:bg-green-900' : ''}>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-300">{item.ip}</td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                              item.status === 'Free' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-300">
                            {item.status === 'Taken' ? (item.hostname || 'Unknown') : '-'}
                          </td>
                          <td className="px-3 sm:px-6 py-2 text-center sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                            {item.status === 'Free' && isLoggedIn ? (
                              <button
                                onClick={() => handleOpenAddEntryModal(item.ip, selectedType)}
                                disabled={isUpdatingConfig}
                                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-2 py-1 sm:px-3 rounded text-xs"
                              >
                                Add Entry
                              </button>
                            ) : (
                              <div className="flex justify-center mt-2 space-x-2">
                                {item.status === 'Taken' && (
                                  <>
                                    <button 
                                      onClick={() => handleEditEntry({ hostname: item.hostname, HWAddress: item.HWAddress, ip: item.ip, type: selectedType })} 
                                      disabled={isUpdatingConfig}
                                      className="px-1.5 sm:px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs"
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteEntry(item.hostname ?? '')} 
                                      disabled={isUpdatingConfig}
                                      className="px-1.5 sm:px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                  </div>
                  
                  {leaseArray.length === 0 && selectedType && !isLoadingIPs && (
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
                
                {/* Pagination Controls for Large Ranges */}
                {isLargeRange && totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-center items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || isLoadingIPs}
                        className="px-2 sm:px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </button>
                      
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        Page {currentPage} of {totalPages}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || isLoadingIPs}
                        className="px-2 sm:px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 text-xs sm:text-sm"
                      >
                        Next
                      </button>
                    </div>
                    
                    {/* Info about pagination for large ranges */}
                    <div className="text-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Showing {itemsPerPage} IPs per page for large IP range ({leaseArray.length} IPs shown)
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div
              className="p-4 sm:p-6 rounded-lg text-white max-w-sm w-full"
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
          onDelete={handleDeleteEntry}
          ipAddress={selectedIpForEntry}
          currentHostname={currentHostname}
          currentMacAddress={currentMacAddress}
        />
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={confirmDelete}
          title="Confirm Deletion"
          message={`Are you sure you want to delete the entry for ${hostnameToDelete}? This action cannot be undone.`}
        />
      </>
  )
}

export default Dashboard 