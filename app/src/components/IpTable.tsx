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

    // Internal pagination component
    const PaginationControls: React.FC<{ position?: 'top' | 'bottom' | 'sticky' }> = ({ position = 'bottom' }) => {
        if (subnetOctets.length <= 1) return null;
        
        const isSticky = position === 'sticky';
        
        return (
            <div className={`px-6 py-4 flex justify-between items-center border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 ${
                position === 'top' ? 'border-b' : position === 'bottom' ? 'border-t' : ''
            } ${
                isSticky ? 'sticky top-0 z-10 shadow-sm' : ''
            }`}>
                <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 0}
                    className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300"
                >
                    Previous
                </button>
                
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    
                    <select 
                        onChange={handleSubnetChange} 
                        value={currentPage}
                        className="mx-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {subnetOctets.map((octet, index) => (
                            <option key={index} value={index}>{`Subnet ${props.selectedSubnet?.ipPrefix}.${octet}.x`}</option>
                        ))}
                    </select>
                    <span className="text-xs ml-2 text-gray-500">
                        (Page {currentPage + 1} of {subnetOctets.length})
                    </span>
                </span>
                
                <button
                    onClick={handleNextPage}
                    disabled={currentPage >= subnetOctets.length - 1}
                    className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300"
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

    const currentPageData = createLeaseArray();
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">IP Address Table</h2>
            </div>
            <PaginationControls position="sticky" />
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
                      {props.isLoadingIPs ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-300">
                            <div className="flex justify-center items-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                              <span className="ml-2">Loading IP addresses...</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        currentPageData.map((item, index) => (
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
                            {item.status === 'Free' && props.isLoggedIn ? (
                              <button
                                onClick={() => props.handleOpenAddEntryModal(item.ip, props.selectedType)}
                                disabled={props.isUpdatingConfig}
                                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-2 py-1 sm:px-3 rounded text-xs"
                              >
                                Add Entry
                              </button>
                            ) : (
                              <div className="flex justify-center mt-2 space-x-2">
                                {item.status === 'Taken' && (
                                  <>
                                    <button 
                                      onClick={() => props.handleEditEntry({ hostname: item.hostname, HWAddress: item.HWAddress, ip: item.ip, type: props.selectedType })} 
                                      disabled={props.isUpdatingConfig}
                                      className="px-1.5 sm:px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs"
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      onClick={() => props.handleDeleteEntry(item.hostname ?? '')} 
                                      disabled={props.isUpdatingConfig}
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
                  
                  {props.leaseArray.length === 0 && props.selectedType && !props.isLoadingIPs && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-300">
                      No IP addresses found for {props.selectedType}
                    </div>
                  )}
                  
                  {!props.selectedType && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-300">
                      Please select a device type to view available IP addresses
                    </div>
                  )}
                </div>
            </div>
        )
    }

export default IPTable;