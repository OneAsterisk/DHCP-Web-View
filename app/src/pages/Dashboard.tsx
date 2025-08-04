import { useEffect, useMemo, useState } from 'react'
import '../App.css'
import { createLeaseArray, createVOIPLeaseArray, calculateVOIPPages, deleteHostEntry, parseDHCPDConf, updateHostEntry, type FixedIp, type LeaseArray } from '../helpers/fixed-ip-helper';
import AddEntryModal from '../components/AddEntryModal';
import { Toaster, toast } from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';
import IPTable from '../components/IpTable';
import { callApi } from '../helpers/api';
import ServerSelector from '../components/ServerSelector';
import AuthCard from '../components/AuthCard';
import StatusCard from '../components/StatusCard';
import IpControls from '../components/IpControls';
export type Subnet = {
  name: string;
  ipPrefix: string;
  typeDescriptions: {[key: string]: number[]};
} 

export type Server = {
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
  const [token, setToken] = useState<string | null>(null);
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
  
  // Rehydrate auth state from localStorage on app load
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem('dhcp-auth');
      if (savedAuth) {
        const { token: savedToken, username: savedUsername, serverHost } = JSON.parse(savedAuth);
        
        // Check if token is expired (JWT expiry is in seconds, Date.now() is in ms)
        if (savedToken) {
          const tokenPayload = JSON.parse(atob(savedToken.split('.')[1]));
          const isExpired = tokenPayload.exp * 1000 < Date.now();
          
          if (!isExpired) {
            setToken(savedToken);
            setUsername(savedUsername);
            setIsLoggedIn(true);
            console.log('Auth state restored from localStorage');
          } else {
            // Clean up expired token
            localStorage.removeItem('dhcp-auth');
            console.log('Expired token removed from localStorage');
          }
        }
      }
    } catch (error) {
      console.error('Error rehydrating auth state:', error);
      localStorage.removeItem('dhcp-auth'); // Clean up corrupted data
    }
  }, []);

  useEffect(() => {
    const fetchServers = async () => {
      setIsLoadingServers(true);
      try {
        const response = await fetch('/api/servers');
        if (response.ok) {
          const data = await response.json();
          setServers(data);
          if (data && data.length > 0) {
            setSelectedServer(data[0]);
            // Auto-select first subnet if available
            if (data[0].subnets && data[0].subnets.length > 0) {
              setSelectedSubnet(data[0].subnets[0]);
            } else {
              setSelectedSubnet(null);
            }
          }
        } else {
            // You can add a toast here if you like
            toast.error('Could not fetch server list.');
        }
      } catch (error) {
        console.error('Error fetching servers:', error);
        toast.error('Error fetching servers: Network request failed.');
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

// Auto-check status when user logs in
useEffect(() => {
  if (isLoggedIn && selectedServer.host && username && password) {
      checkStatus();
      }
}, [isLoggedIn]);

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
  if (!isLoggedIn) {
    return toast.error('Please log in to fetch the configuration.');
  }
  setIsLoadingConfig(true);
  try {
    const command = 'cat /etc/dhcp/dhcpd.conf';
    // Notice: no 'auth' object needed in the body anymore!
    const data = await callApi('dhcpd-conf', 'POST', token, { command });
    
    const currentTypeDescriptions = selectedSubnet?.typeDescriptions || selectedServer?.typeDescriptions || {};
    setDhcpdConf(parseDHCPDConf(data.output, currentTypeDescriptions));
    setDhcpdConfString(data.output);
  } catch (error) {
    // The callApi helper already shows a toast, so we just log here.
    console.error('Failed to fetch dhcpd.conf:', error);
  } finally {
    setIsLoadingConfig(false);
  }
}

const checkStatus = async () => {
  if (!isLoggedIn) {
    return toast.error('Please log in to check the service status.');
  }
  setIsCheckingStatus(true);
  try {
    const command = 'systemctl status isc-dhcp-server';
    const data = await callApi('status', 'POST', token, { command });

    setOutput(data.output);
    const lines = data.output.split('\n');
    const serviceStatus = lines.find((line: string) => line.trim().startsWith('Active:'));
    let status = serviceStatus?.includes('active') ? "active" : "inactive";
    setServiceStatus(status);
    toast.success(`Service is ${status}`);
  } catch (error) {
    console.error('Failed to check status:', error);
  } finally {
    setIsCheckingStatus(false);
  }
};

const clearAuthState = () => {
  setToken(null);
  setIsLoggedIn(false);
  setUsername('');
  setPassword('');
  localStorage.removeItem('dhcp-auth');
  console.log('Auth state cleared');
};

const handleLogout = () => {
  clearAuthState();
  toast.success('Logged out successfully');
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
      const data = await response.json();
      if(data.token) {
        setToken(data.token);
        setIsLoggedIn(true);
        
        // Persist auth state to localStorage
        try {
          const authData = {
            token: data.token,
            username: username,
            serverHost: selectedServer.host,
            loginTime: Date.now()
          };
          localStorage.setItem('dhcp-auth', JSON.stringify(authData));
          console.log('Auth state saved to localStorage');
        } catch (error) {
          console.error('Failed to save auth state to localStorage:', error);
        }
      } else {
        toast.error('Login failed: No token received');
        setIsLoggedIn(false);
      }
    } else {
      const errorData = await response.json();
      toast.error(errorData.error || 'Login failed: Network request failed');
      setIsLoggedIn(false);
    } 
  } catch (error) {
    toast.error('An error occurred during login: Network request failed');
    setIsLoggedIn(false);
  }
};

const handleAddEntry = async (entry: DHCPEntry) => {
  if (!isLoggedIn) {
    return toast.error('Please log in to add or edit an entry.');
  }

  setIsUpdatingConfig(true);
  try {
    const isEditMode = !!currentHostname;
    const action = isEditMode ? 'Edit Entry' : 'Add Entry';
    const details = {
      ipAddress: entry.ipAddress,
      hostname: entry.hostname,
      macAddress: entry.macAddress,
      previousHostname: isEditMode ? currentHostname : undefined,
    };
    
    const updatedDhcpdConf = updateHostEntry(dhcpdConfString, currentHostname, entry.ipAddress, entry.macAddress, entry.hostname, selectedSubnet?.typeDescriptions || selectedServer?.typeDescriptions || {});

    // The API call is now much simpler
    await callApi('update-dhcpd-conf', 'POST', token, {
      dhcpdConf: updatedDhcpdConf,
      action,
      details,
    });
    
    toast.success(`Successfully updated entry for ${entry.hostname}`);
    // Refresh data after successful update
    fetchDhcpdConf();
    resetAddEntryModal();
    checkStatus();

  } catch (error) {
    // The callApi helper already shows a toast
    console.error('Error updating DHCP configuration:', error);
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

const confirmDelete = async () => {
  if (!hostnameToDelete) return;

  try {
    const updatedDhcpdConf = deleteHostEntry(dhcpdConfString, hostnameToDelete);
    const action = 'Delete Entry';
    const details = { hostname: hostnameToDelete };

    // The API call is now much simpler
    await callApi('update-dhcpd-conf', 'POST', token, {
      dhcpdConf: updatedDhcpdConf,
      action,
      details,
    });
    
    toast.success(`Successfully deleted entry for ${hostnameToDelete}`);
    // Refresh data after successful deletion
    fetchDhcpdConf();
    resetAddEntryModal();
    checkStatus();
    setIsConfirmModalOpen(false);
    setHostnameToDelete('');

  } catch (error) {
    // The callApi helper already shows a toast
    console.error('Error updating DHCP configuration:', error);
    setIsConfirmModalOpen(false); // Close modal even on error
  }
};

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
            {/* Left rail: Server + Auth */}
            <div className="lg:col-span-3 order-1 lg:order-1">
              <ServerSelector
                servers={servers}
                selectedServer={selectedServer}
                setSelectedServer={(s) => {
                  setSelectedServer(s);
                  setServiceStatus('inactive');
                  setIsLoggedIn(false);
                  setToken(null);
                  // Clear localStorage when switching servers
                  localStorage.removeItem('dhcp-auth');
                }}
                availableSubnets={availableSubnets}
                selectedSubnet={selectedSubnet}
                setSelectedSubnet={(s) => {
                  setSelectedSubnet(s);
                  setSelectedType('');
                }}
                isLoadingServers={isLoadingServers}
              />

              <AuthCard
                username={username}
                setUsername={setUsername}
                password={password}
                setPassword={setPassword}
                isLoggedIn={isLoggedIn}
                onLogin={handleLogin}
                onLogout={handleLogout}
              />
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3 order-1 lg:order-2 space-y-4 sm:space-y-6">
              {/* Server Status Card */}
              <StatusCard
                serviceStatus={serviceStatus}
                isCheckingStatus={isCheckingStatus}
                isLoggedIn={isLoggedIn}
                onCheck={checkStatus}
              />

              {/* IP Controls */}
              <IpControls
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                typeDescriptions={typeDescriptions}
                selectedSubnet={selectedSubnet}
                onRefresh={fetchDhcpdConf}
                isLoadingConfig={isLoadingConfig}
                isLoggedIn={isLoggedIn}
                fixedCount={dhcpdConf.length}
                ipCount={leaseArray.length}
              />

              {/* IP Table Card */}
              <IPTable leaseArray={leaseArray} isLoadingIPs={isLoadingIPs} isLoggedIn={isLoggedIn} selectedType={selectedType} handleOpenAddEntryModal={handleOpenAddEntryModal} handleEditEntry={handleEditEntry} handleDeleteEntry={handleDeleteEntry} isUpdatingConfig={isUpdatingConfig} selectedSubnet={selectedSubnet} />
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