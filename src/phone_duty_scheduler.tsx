import React, { useState, useEffect } from 'react';
import { Calendar, Phone, Bell, Users, Settings, Send, Eye, AlertCircle } from 'lucide-react';

interface Schedule {
  phone: string;
  name: string;
  date: string;
}

interface ReminderSettings {
  enabled: boolean;
  hoursBefore: number;
  webhookUrl: string;
}

const PhoneDutyScheduler = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Record<string, Schedule>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [showApiPanel, setShowApiPanel] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    enabled: true,
    hoursBefore: 2,
    webhookUrl: ''
  });
  const [apiResponse, setApiResponse] = useState('');

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const hasSchedule = (date: Date): Schedule | undefined => {
    return schedules[formatDate(date)];
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const schedule = schedules[formatDate(date)];
    if (schedule) {
      setPhoneNumber(schedule.phone);
      setEmployeeName(schedule.name);
    } else {
      setPhoneNumber('');
      setEmployeeName('');
    }
  };

  const handleSaveSchedule = () => {
    if (selectedDate && phoneNumber && employeeName) {
      const dateKey = formatDate(selectedDate);
      setSchedules(prev => ({
        ...prev,
        [dateKey]: {
          phone: phoneNumber,
          name: employeeName,
          date: dateKey
        }
      }));
      setSelectedDate(null);
      setPhoneNumber('');
      setEmployeeName('');
    }
  };

  const handleDeleteSchedule = () => {
    if (selectedDate) {
      const dateKey = formatDate(selectedDate);
      setSchedules(prev => {
        const newSchedules = { ...prev };
        delete newSchedules[dateKey];
        return newSchedules;
      });
      setSelectedDate(null);
      setPhoneNumber('');
      setEmployeeName('');
    }
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  // API Functions
  const getScheduleByDate = (date: string): Schedule | null => {
    return schedules[date] || null;
  };

  const getAllSchedules = (): Record<string, Schedule> => {
    return schedules;
  };

  const simulateWebhook = async (data: any) => {
    // Simulate API call
    const response = {
      status: 'success',
      message: 'Webhook called successfully',
      data: data,
      timestamp: new Date().toISOString()
    };
    setApiResponse(JSON.stringify(response, null, 2));
  };

  const sendReminder = async (schedule: Schedule) => {
    const reminderData = {
      type: 'reminder',
      schedule: schedule,
      message: `Reminder: ${schedule.name} is on phone duty tonight. Contact: ${schedule.phone}`,
      sentAt: new Date().toISOString()
    };
    
    if (reminderSettings.webhookUrl) {
      await simulateWebhook(reminderData);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = generateCalendarDays();

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Phone className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">Phone Duty Scheduler</h1>
                <p className="text-blue-100">Manage night duty phone assignments</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowApiPanel(!showApiPanel)}
                className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>API & Settings</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Calendar Section */}
          <div className="flex-1 p-6">
            {/* Calendar Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ←
              </button>
              <h2 className="text-xl font-semibold">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                →
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {dayNames.map(day => (
                <div key={day} className="p-3 text-center font-semibold text-gray-600">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((date, index) => {
                const schedule = hasSchedule(date);
                return (
                  <div
                    key={index}
                    onClick={() => handleDateClick(date)}
                    className={`
                      p-3 min-h-[80px] border cursor-pointer transition-all duration-200
                      ${isCurrentMonth(date) ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                      ${isToday(date) ? 'ring-2 ring-blue-500' : ''}
                      ${selectedDate && formatDate(selectedDate) === formatDate(date) ? 'bg-blue-100 ring-2 ring-blue-300' : ''}
                      ${schedule ? 'bg-green-50 border-green-200' : 'border-gray-200'}
                      hover:bg-gray-50 hover:shadow-md rounded-lg
                    `}
                  >
                    <div className="font-semibold">{date.getDate()}</div>
                    {schedule && (
                      <div className="mt-1">
                        <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {schedule.name}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {schedule.phone}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Schedule Form */}
            {selectedDate && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-3">
                  Schedule for {selectedDate.toLocaleDateString()}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Employee Name</label>
                    <input
                      type="text"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter employee name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={handleSaveSchedule}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Save Schedule
                  </button>
                  {hasSchedule(selectedDate) && (
                    <button
                      onClick={handleDeleteSchedule}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                    >
                      Delete Schedule
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* API Panel */}
          {showApiPanel && (
            <div className="w-96 bg-gray-50 p-6 border-l">
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="h-5 w-5" />
                <h3 className="font-semibold">API & Settings</h3>
              </div>

              {/* Reminder Settings */}
              <div className="mb-6">
                <h4 className="font-medium mb-3 flex items-center">
                  <Bell className="h-4 w-4 mr-2" />
                  Reminder Settings
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={reminderSettings.enabled}
                      onChange={(e) => setReminderSettings(prev => ({...prev, enabled: e.target.checked}))}
                      className="mr-2"
                    />
                    Enable reminders
                  </label>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hours before duty</label>
                    <input
                      type="number"
                      value={reminderSettings.hoursBefore}
                      onChange={(e) => setReminderSettings(prev => ({...prev, hoursBefore: parseInt(e.target.value)}))}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      min="1"
                      max="24"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Webhook URL</label>
                    <input
                      type="url"
                      value={reminderSettings.webhookUrl}
                      onChange={(e) => setReminderSettings(prev => ({...prev, webhookUrl: e.target.value}))}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      placeholder="https://your-webhook.com/endpoint"
                    />
                  </div>
                </div>
              </div>

              {/* API Endpoints */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">API Endpoints</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-white rounded border">
                    <code className="text-blue-600">GET /api/schedule/:date</code>
                    <p className="text-gray-600 mt-1">Get schedule for specific date</p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <code className="text-green-600">POST /api/schedule</code>
                    <p className="text-gray-600 mt-1">Create new schedule</p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <code className="text-orange-600">PUT /api/schedule/:date</code>
                    <p className="text-gray-600 mt-1">Update existing schedule</p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <code className="text-red-600">DELETE /api/schedule/:date</code>
                    <p className="text-gray-600 mt-1">Delete schedule</p>
                  </div>
                </div>
              </div>

              {/* Test API */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Test API</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const today = formatDate(new Date());
                      const schedule = getScheduleByDate(today);
                      setApiResponse(JSON.stringify({
                        endpoint: `/api/schedule/${today}`,
                        method: 'GET',
                        response: schedule || { message: 'No schedule found' }
                      }, null, 2));
                    }}
                    className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Eye className="h-4 w-4 inline mr-2" />
                    Get Today's Schedule
                  </button>
                  <button
                    onClick={() => {
                      setApiResponse(JSON.stringify({
                        endpoint: '/api/schedules',
                        method: 'GET',
                        response: getAllSchedules()
                      }, null, 2));
                    }}
                    className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                  >
                    <Users className="h-4 w-4 inline mr-2" />
                    Get All Schedules
                  </button>
                  <button
                    onClick={() => {
                      const today = formatDate(new Date());
                      const schedule = getScheduleByDate(today);
                      if (schedule) {
                        sendReminder(schedule);
                      } else {
                        setApiResponse(JSON.stringify({
                          error: 'No schedule found for today'
                        }, null, 2));
                      }
                    }}
                    className="w-full bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 transition-colors text-sm"
                  >
                    <Send className="h-4 w-4 inline mr-2" />
                    Send Test Reminder
                  </button>
                </div>
              </div>

              {/* API Response */}
              {apiResponse && (
                <div>
                  <h4 className="font-medium mb-2">API Response</h4>
                  <pre className="bg-gray-900 text-green-400 p-3 rounded-md text-xs overflow-auto max-h-48">
                    {apiResponse}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhoneDutyScheduler;