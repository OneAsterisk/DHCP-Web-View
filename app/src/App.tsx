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
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link to="/" className="text-3xl font-bold text-gray-900 dark:text-white">DHCP Web View</Link>
            </div>
            <nav className="flex items-center space-x-4">
              <Link to="/" className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                Dashboard
              </Link>
              <Link to="/admin" className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                Admin Log
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