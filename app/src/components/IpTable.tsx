import * as React from 'react';
import { type LeaseArray } from '../helpers/fixed-ip-helper';
import type { Subnet } from '../pages/Dashboard';

export const IPTable: React.FC<{
    leaseArray: LeaseArray[];
    isLoadingIPs: boolean;
    isLoggedIn: boolean;
    selectedType: string;
    handleOpenAddEntryModal: (ip: string, type: string) => void;
    handleEditEntry: (entry: any) => void;
    handleDeleteEntry: (hostname: string) => void;
    isUpdatingConfig: boolean;
    selectedSubnet: Subnet | null;
}> = (props) => {
    type tableItem = {
        ip: string;
        status: string;
        hostname: string | null;
        HWAddress: string | null;
    }

    // QoL state: search and show MAC toggle
    const [search, setSearch] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');
    const [showMac, setShowMac] = React.useState(false);

    React.useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
        return () => clearTimeout(id);
    }, [search]);

    const liveRef = React.useRef<HTMLDivElement>(null);
    const announce = (msg: string) => {
        if (liveRef.current) {
            liveRef.current.textContent = '';
            setTimeout(() => {
                if (liveRef.current) liveRef.current.textContent = msg;
            }, 10);
        }
    };

    const copyToClipboard = async (label: string, value?: string | null) => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            announce(`${label} copied to clipboard`);
        } catch (e) {
            // no-op fallback; we purposely avoid toast dependencies
        }
    };

    // Internal pagination component
    const PaginationControls: React.FC<{ position?: 'top' | 'bottom' | 'sticky' }> = ({ position = 'bottom' }) => {
        if (subnetOctets.length <= 1) return null;
        
        const isSticky = position === 'sticky';
        
        return (
            <div className={`px-4 sm:px-6 py-3 flex justify-between items-center border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/60 backdrop-blur ${
                position === 'top' ? 'border-b' : position === 'bottom' ? 'border-t' : ''
            } ${
                isSticky ? 'sticky top-0 z-10 shadow-sm' : ''
            }`}>
                <button
                    onClick={() => { handlePreviousPage(); announce('Previous page'); }}
                    disabled={currentPage === 0}
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800"
                >
                    Previous
                </button>
                
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium flex items-center">
                    <select 
                        onChange={(e) => { handleSubnetChange(e); announce(`Changed to subnet page ${parseInt(e.target.value) + 1}`); }} 
                        value={currentPage}
                        className="mx-2 px-2 py-1 text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        aria-label="Select subnet page"
                    >
                        {subnetOctets.map((octet, index) => (
                            <option key={index} value={index}>{`Subnet ${props.selectedSubnet?.ipPrefix}.${octet}.x`}</option>
                        ))}
                    </select>
                    <span className="text-[11px] sm:text-xs ml-2 text-gray-500">
                        Page {currentPage + 1} of {subnetOctets.length}
                    </span>
                </span>
                
                <button
                    onClick={() => { handleNextPage(); announce('Next page'); }}
                    disabled={currentPage >= subnetOctets.length - 1}
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800"
                >
                    Next
                </button>
            </div>
        );
    };

    const subnetOctets: number[] = props.selectedSubnet?.typeDescriptions[props.selectedType] ?? [];
    const [currentPage, setCurrentPage] = React.useState(0);
    const handleNextPage = () => {
        if(currentPage < subnetOctets.length - 1) {
            setCurrentPage(currentPage + 1);
        }
    }

    const handlePreviousPage = () => {
        if(currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    }

    const handleSubnetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCurrentPage(parseInt(e.target.value));
    }

    const createLeaseArray = (): tableItem[] => {
        if (subnetOctets.length === 0) return [];
        
        const currentThirdOctet = subnetOctets[currentPage];
        const result: tableItem[] = [];
        
        // Generate all IPs for this third octet (1-254 for fourth octet)
        for (let fourthOctet = 1; fourthOctet <= 254; fourthOctet++) {
            const currentIP = `${props.selectedSubnet?.ipPrefix}.${currentThirdOctet}.${fourthOctet}`;
            
            const existingLease = props.leaseArray.find(item => item.ip === currentIP);
            
            if (existingLease) {
                result.push({
                    ip: currentIP,
                    status: existingLease.status,
                    hostname: existingLease.hostname ?? '',
                    HWAddress: existingLease.HWAddress ?? ''
                });
            } else {
                result.push({
                    ip: currentIP,
                    status: 'Free',
                    hostname: null,
                    HWAddress: null
                });
            }
        }
        
        return result;
    };

    const currentPageData = React.useMemo(() => {
        const base = createLeaseArray();
        if (!debouncedSearch) return base;
        return base.filter(row => {
            const q = debouncedSearch;
            return (
                row.ip.toLowerCase().includes(q) ||
                (row.hostname ?? '').toLowerCase().includes(q) ||
                (row.HWAddress ?? '').toLowerCase().includes(q)
            );
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.leaseArray, props.selectedSubnet, props.selectedType, currentPage, debouncedSearch]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">IP Address Table</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Browse available and taken IP addresses. Use the selector to switch subnets.</p>
            </div>
            <div ref={liveRef} aria-live="polite" className="sr-only" />
            <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/40">
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search IP, hostname, or MAC"
                        className="w-full sm:w-72 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Search IP, hostname, or MAC"
                    />
                </div>
                <label className="inline-flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
                    <input
                        type="checkbox"
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        checked={showMac}
                        onChange={(e) => setShowMac(e.target.checked)}
                    />
                    <span>Show MAC</span>
                </label>
            </div>
            <PaginationControls position="sticky" />
            <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <caption className="sr-only">IP addresses with status, hostname{showMac ? ', and MAC' : ''}</caption>
                    <thead className="bg-gray-50 dark:bg-gray-700/70">
                      <tr>
                        <th scope="col" className="px-3 sm:px-6 py-2.5 text-left text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-300">IP Address</th>
                        <th scope="col" className="px-3 sm:px-6 py-2.5 text-left text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-300">Status</th>
                        <th scope="col" className="px-3 sm:px-6 py-2.5 text-left text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-300">Hostname</th>
                        {showMac && (
                          <th scope="col" className="px-3 sm:px-6 py-2.5 text-left text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-300">MAC</th>
                        )}
                        <th scope="col" className="px-3 sm:px-6 py-2.5 text-center text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100 dark:bg-gray-800 dark:divide-gray-700">
                      {props.isLoadingIPs ? (
                        <tr>
                          <td colSpan={showMac ? 5 : 4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-300">
                            <div className="flex justify-center items-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                              <span className="ml-2">Loading IP addresses…</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        currentPageData.map((item, index) => (
                        <tr key={index} className={item.status === 'Free' ? 'bg-green-50/60 dark:bg-green-900/30' : ''}>
                          <td className="px-3 sm:px-6 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-300 font-medium">
                            <div className="flex items-center space-x-2">
                              <span>{item.ip}</span>
                              <button
                                onClick={() => copyToClipboard('IP', item.ip)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 rounded"
                                title="Copy IP"
                                aria-label={`Copy ${item.ip}`}
                              >
                                ⧉
                              </button>
                            </div>
                          </td>
                          <th scope="row" className="px-3 sm:px-6 py-2 whitespace-nowrap text-xs sm:text-sm">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold ${
                              item.status === 'Free' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                            }`}>
                              <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${item.status === 'Free' ? 'bg-green-600' : 'bg-red-600'}`} />
                              {item.status}
                            </span>
                          </th>
                          <td className="px-3 sm:px-6 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-300">
                            <div className="flex items-center space-x-2">
                              <span>{item.status === 'Taken' ? (item.hostname || 'Unknown') : '-'}</span>
                              {item.status === 'Taken' && item.hostname && (
                                <button
                                  onClick={() => copyToClipboard('Hostname', item.hostname!)}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 rounded"
                                  title="Copy hostname"
                                  aria-label={`Copy hostname ${item.hostname}`}
                                >
                                  ⧉
                                </button>
                              )}
                            </div>
                          </td>
                          {showMac && (
                            <td className="px-3 sm:px-6 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-300">
                              <div className="flex items-center space-x-2">
                                <span>{item.status === 'Taken' ? (item.HWAddress || '—') : '—'}</span>
                                {item.status === 'Taken' && item.HWAddress && (
                                  <button
                                    onClick={() => copyToClipboard('MAC', item.HWAddress!)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 rounded"
                                    title="Copy MAC"
                                    aria-label={`Copy MAC ${item.HWAddress}`}
                                  >
                                    ⧉
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                          <td className="px-3 sm:px-6 py-2 text-center whitespace-nowrap text-xs sm:text-sm">
                            {item.status === 'Free' && props.isLoggedIn ? (
                              <button
                                onClick={() => props.handleOpenAddEntryModal(item.ip, props.selectedType)}
                                disabled={props.isUpdatingConfig}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-2 py-1 sm:px-3 rounded text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800"
                              >
                                Add Entry
                              </button>
                            ) : (
                              <div className="flex justify-center mt-1.5 space-x-2">
                                {item.status === 'Taken' && (
                                  <>
                                    <button 
                                      onClick={() => props.handleEditEntry({ hostname: item.hostname, HWAddress: item.HWAddress, ip: item.ip, type: props.selectedType })} 
                                      disabled={props.isUpdatingConfig}
                                      className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800"
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      onClick={() => props.handleDeleteEntry(item.hostname ?? '')} 
                                      disabled={props.isUpdatingConfig}
                                      className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800"
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
                  
                  {props.leaseArray.length === 0 && props.selectedType && !props.isLoadingIPs && (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-300">
                      No IP addresses found for {props.selectedType}
                    </div>
                  )}
                  
                  {!props.selectedType && (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-300">
                      Please select a device type to view available IP addresses
                    </div>
                  )}
                </div>
            </div>
    )
}

export default IPTable;