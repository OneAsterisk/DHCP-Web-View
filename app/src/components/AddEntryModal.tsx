import React, { useState, useEffect } from 'react';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entry: { hostname: string; macAddress: string; ipAddress: string }) => void;
  onDelete?: (hostname: string) => void;
  ipAddress: string;
  currentHostname?: string;
  currentMacAddress?: string;
}

const AddEntryModal: React.FC<AddEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ipAddress,
  currentHostname = '',
  currentMacAddress = '',
}) => {
  const [hostname, setHostname] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [errors, setErrors] = useState<{ hostname?: string; macAddress?: string }>({});

  const isEditMode = !!currentHostname;

  useEffect(() => {
    if (isOpen) {
      setHostname(currentHostname);
      setMacAddress(currentMacAddress);
      setErrors({}); // Reset errors when modal opens
    }
  }, [isOpen, currentHostname, currentMacAddress]);

  const validate = () => {
    const newErrors: { hostname?: string; macAddress?: string } = {};
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

    if (!hostname) {
      newErrors.hostname = 'Hostname is required.';
    }

    if (!macAddress) {
      newErrors.macAddress = 'MAC address is required.';
    } else if (!macRegex.test(macAddress)) {
      newErrors.macAddress = 'Invalid MAC address format. Use XX:XX:XX:XX:XX:XX.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ hostname, macAddress, ipAddress });
      onClose(); // Close modal on successful submission
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {isEditMode ? 'Edit DHCP Entry' : 'Add New DHCP Entry'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              IP Address: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{ipAddress}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="hostname" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Hostname</label>
                <input
                  type="text"
                  id="hostname"
                  value={hostname}
                  onChange={(e) => {
                    setHostname(e.target.value);
                    if (errors.hostname) validate(); // Re-validate on change if there was an error
                  }}
                  className={`bg-gray-50 border text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:text-white ${
                    errors.hostname ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="e.g., my-device"
                />
                {errors.hostname && <p className="mt-2 text-sm text-red-600 dark:text-red-500">{errors.hostname}</p>}
              </div>

              <div>
                <label htmlFor="macAddress" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">MAC Address</label>
                <input
                  type="text"
                  id="macAddress"
                  value={macAddress}
                  onChange={(e) => {
                    setMacAddress(e.target.value.toUpperCase());
                    if (errors.macAddress) validate(); // Re-validate on change if there was an error
                  }}
                  className={`bg-gray-50 border text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:text-white font-mono ${
                    errors.macAddress ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="e.g., 00:1B:44:11:3A:B7"
                />
                {errors.macAddress && <p className="mt-2 text-sm text-red-600 dark:text-red-500">{errors.macAddress}</p>}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end items-center space-x-3 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isEditMode ? 'Save Changes' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEntryModal; 
