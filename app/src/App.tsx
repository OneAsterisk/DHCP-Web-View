import { Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import AdminLog from './pages/AdminLog';

function App() {
  return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-center" reverseOrder={false} />
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 space-y-4 sm:space-y-0">
              <div className="flex items-center justify-center sm:justify-start">
                <Link to="/" className="flex items-center space-x-2 sm:space-x-3 text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  <img src="/REMC1.png" alt="REMC1" className="w-8 h-8 sm:w-10 sm:h-10" />
                  <span>DHCP Web View</span>
                </Link>
              </div>
            <nav className="flex items-center justify-center sm:justify-end space-x-4">
              <Link to="/" className="text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                Dashboard
              </Link>
              <Link to="/admin" className="text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                Activity Log
              </Link>
            </nav>
            </div>
          </div>
        </header>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin" element={<AdminLog />} />
      </Routes>
                </div>
  );
}

export default App;