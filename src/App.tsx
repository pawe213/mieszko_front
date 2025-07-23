// frontend/src/App.tsx
import React, { useState } from 'react';
import PhoneDutyScheduler from './phone_duty_scheduler';
import Login from './Login';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div>
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-2 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-900">Phone Duty Scheduler</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        >
          Logout
        </button>
      </div>
      <PhoneDutyScheduler />
    </div>
  );
}

export default App;
