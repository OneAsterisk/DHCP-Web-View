import React, { useState } from 'react';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entry: DHCPEntry) => void;
  onDelete: (hostname: string) => void;
  ipAddress: string;
  currentHostname?: string;
  currentMacAddress?: string;
}

interface DHCPEntry {
  hostname: string;
  macAddress: string;
  ipAddress: string;
}

const AddEntryModal: React.FC<AddEntryModalProps> = ({ isOpen, onClose, onSubmit, ipAddress, currentHostname, currentMacAddress, onDelete }) => {
  const [hostname, setHostname] = useState(currentHostname || '');
  const [macAddress, setMacAddress] = useState(currentMacAddress || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostname || !macAddress) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate MAC address format
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(macAddress)) {
      alert('Please enter a valid MAC address (e.g., 00:01:e6:7d:2e:8f)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        hostname,
        macAddress,
        ipAddress
      });
      // Reset form
      setHostname('');
      setMacAddress('');
      onClose();
    } catch (error) {
      console.error('Error adding entry:', error);
      alert('Error adding entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setHostname('');
    setMacAddress('');
    onClose();
  };

  const handleDelete = () => {
    onDelete(currentHostname || '');
    onClose();
  }
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Add New DHCP Entry
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              IP Address
            </label>
            <input
              type="text"
              value={ipAddress}
              readOnly
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {currentHostname ? 'Current Hostname: ' + currentHostname : 'Hostname *'}
            </label>
            <input
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="e.g., lab4200"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {currentMacAddress ? 'Current MAC Address: ' + currentMacAddress : 'MAC Address *'}
            </label>
            <input
              type="text"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
              placeholder="e.g., 00:01:e6:7d:2e:8f"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
            >
              {isSubmitting ? 'Adding...' : currentHostname ? 'Update Entry' : 'Add Entry'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-red-300"
            >
              Delete Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEntryModal; 
