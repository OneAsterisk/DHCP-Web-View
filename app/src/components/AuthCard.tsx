import React from 'react';

type Props = {
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout?: () => void;
};

const AuthCard: React.FC<Props> = ({ username, setUsername, password, setPassword, isLoggedIn, onLogin, onLogout }) => {
  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Authentication</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Use your server credentials to make changes.</p>
        </div>
        <div className="flex items-center">
          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${isLoggedIn ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
            <span className={`w-2 h-2 mr-2 rounded-full ${isLoggedIn ? 'bg-green-500' : 'bg-gray-400'}`} />
            {isLoggedIn ? 'Logged in' : 'Not logged in'}
          </span>
        </div>
      </div>
      <div className="p-6">
        <form className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="username" className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'>Username</label>
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
            <label htmlFor="password" className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'>Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
              placeholder="Enter password"
            />
          </div>
          <div className="flex items-end gap-2">
            {isLoggedIn ? (
              <button
                type="button"
                onClick={onLogout}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800"
              >
                Logout
              </button>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                disabled={!username || !password}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800"
              >
                Login
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthCard;