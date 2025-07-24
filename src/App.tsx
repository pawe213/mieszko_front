// frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import PhoneDutyScheduler from './phone_duty_scheduler';
import Login from './Login';
import { apiService, User } from './services/apiService';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Check for existing login session on component mount
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        if (apiService.isAuthenticated()) {
          // Verify token is still valid by making an API call
          const user = await apiService.getCurrentUser();
          setCurrentUser(user);
          setIsLoggedIn(true);
          
          // Calculate session time left
          const expiresAt = localStorage.getItem('token_expires_at');
          if (expiresAt) {
            const timeLeft = parseInt(expiresAt) - Date.now();
            setSessionTimeLeft(Math.max(0, timeLeft));
          }
        }
      } catch (error) {
        console.log('Authentication check failed:', error);
        apiService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  // Update session timer every minute
  useEffect(() => {
    if (!isLoggedIn) return;

    const timer = setInterval(() => {
      const expiresAt = localStorage.getItem('token_expires_at');
      if (expiresAt) {
        const timeLeft = parseInt(expiresAt) - Date.now();
        
        if (timeLeft > 0) {
          setSessionTimeLeft(timeLeft);
        } else {
          // Session expired, auto logout
          handleLogout();
        }
      }
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [isLoggedIn]);

  const handleLoginSuccess = async () => {
    try {
      const user = await apiService.getCurrentUser();
      setCurrentUser(user);
      setIsLoggedIn(true);
      
      // Set session time left
      const expiresAt = localStorage.getItem('token_expires_at');
      if (expiresAt) {
        const timeLeft = parseInt(expiresAt) - Date.now();
        setSessionTimeLeft(Math.max(0, timeLeft));
      }
    } catch (error) {
      console.error('Failed to get user info after login:', error);
      apiService.logout();
    }
  };

  const handleLogout = () => {
    apiService.logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setSessionTimeLeft(0);
  };

  // Format time left as hours and minutes
  const formatTimeLeft = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (60 * 60 * 1000));
    const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
  };

  // Show loading screen while checking login status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div>
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-gray-900">Phone Duty Scheduler</h1>
          {currentUser && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Welcome, {currentUser.full_name || currentUser.username}</span>
              {currentUser.role === 'admin' && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Admin</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs text-gray-500">
            Session expires in {formatTimeLeft(sessionTimeLeft)}
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
      <PhoneDutyScheduler />
    </div>
  );
}

export default App;
