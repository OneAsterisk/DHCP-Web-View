import { Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import AdminLog from './pages/AdminLog';
import { useRef } from 'react';

function App() {
  const liveRef = useRef<HTMLDivElement>(null);

  const announce = (msg: string) => {
    if (liveRef.current) {
      liveRef.current.textContent = '';
      // Force change for screen readers
      setTimeout(() => {
        if (liveRef.current) liveRef.current.textContent = msg;
      }, 10);
    }
  };

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-center" reverseOrder={false} />
      {/* Skip link */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 rounded px-3 py-2 shadow">
        Skip to main content
      </a>
      {/* Live region for announcements */}
      <div ref={liveRef} aria-live="polite" className="sr-only" />
        {/* Header */}
        <header role="banner" className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 space-y-4 sm:space-y-0">
              <div className="flex items-center justify-center sm:justify-start">
                <Link to="/" className="flex items-center space-x-2 sm:space-x-3 text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 rounded">
                  <img src="/REMC1.png" alt="REMC1" className="w-8 h-8 sm:w-10 sm:h-10" />
                  <span>DHCP Web View</span>
                </Link>
              </div>
              <nav aria-label="Primary" className="flex items-center justify-center sm:justify-end space-x-4">
                <Link to="/" className="text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 rounded px-2 py-1">
                  Dashboard
                </Link>
                <Link to="/admin" className="text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 rounded px-2 py-1">
                  Activity Log
                </Link>
              </nav>
            </div>
          </div>
        </header>

      <main id="main" role="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/admin" element={<AdminLog />} />
        </Routes>
      </main>
                </div>
  );
}

export default App;