import React, { useState, useEffect } from 'react';
import { Calendar, Phone, Bell, Users, Settings, Send, Eye, AlertCircle } from 'lucide-react';
import { apiService, Schedule, ReminderSettings, User } from './services/apiService';

interface Employee {
  name: string;
  phone: string;
}

interface PhoneDutySchedulerProps {
  currentUser?: User | null;
}

const PhoneDutyScheduler: React.FC<PhoneDutySchedulerProps> = ({ currentUser }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Record<string, Schedule>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [showApiPanel, setShowApiPanel] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    enabled: true,
    hours_before: 2,
    webhook_url: ''
  });
  const [apiResponse, setApiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  // Employee management state
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Employee>({ name: '', phone: '' });
  const [employeeAddStatus, setEmployeeAddStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  // Add employee handler
  const handleAddEmployee = async () => {
    if (!newEmployee.name || !/^\d{9}$/.test(newEmployee.phone)) {
      alert('Wprowadź poprawne dane pracownika (imię i nazwisko oraz 9-cyfrowy numer telefonu).');
      return;
    }
    setEmployeeAddStatus('saving');
    try {
      // Assuming apiService.addEmployee exists and returns { success: boolean }
      const response = await apiService.addEmployee(newEmployee);
      if (response.success) {
        setEmployeeAddStatus('success');
        setTimeout(() => {
          setShowAddEmployee(false);
          setEmployeeAddStatus('idle');
          setNewEmployee({ name: '', phone: '' });
        }, 1000);
      } else {
        setEmployeeAddStatus('error');
      }
    } catch (e) {
      setEmployeeAddStatus('error');
    }
  };

  // Load schedules from Firestore on component mount
  useEffect(() => {
    loadSchedulesFromFirestore();
    checkApiConnection();
  }, []);

  const checkApiConnection = async () => {
    try {
      setConnectionStatus('checking');
      await apiService.healthCheck();
      setConnectionStatus('connected');
    } catch (error) {
      console.error('API connection failed:', error);
      setConnectionStatus('disconnected');
    }
  };

  const loadSchedulesFromFirestore = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getAllSchedules();
      if (response.success && response.data) {
        setSchedules(response.data);
      }
    } catch (error) {
      console.error('Failed to load schedules from Firestore:', error);
      // Fallback to localStorage if available
      const savedSchedules = localStorage.getItem('phone-duty-schedules');
      if (savedSchedules) {
        setSchedules(JSON.parse(savedSchedules));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveScheduleToFirestore = async (schedule: Schedule) => {
    try {
      const response = await apiService.createSchedule(schedule);
      return response.success;
    } catch (error) {
      console.error('Failed to save schedule to Firestore:', error);
      return false;
    }
  };

  const updateScheduleInFirestore = async (date: string, schedule: Omit<Schedule, 'date'>) => {
    try {
      const response = await apiService.updateSchedule(date, schedule);
      return response.success;
    } catch (error) {
      console.error('Failed to update schedule in Firestore:', error);
      return false;
    }
  };

  const deleteScheduleFromFirestore = async (date: string) => {
    try {
      const response = await apiService.deleteSchedule(date);
      return response.success;
    } catch (error) {
      console.error('Failed to delete schedule from Firestore:', error);
      return false;
    }
  };

  // Save to localStorage as backup
  useEffect(() => {
    localStorage.setItem('phone-duty-schedules', JSON.stringify(schedules));
  }, [schedules]);

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
    // Use local timezone to avoid date shifting issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    const dateKey = formatDate(date);
    
    if (multiSelectMode) {
      const newSelectedDates = new Set(selectedDates);
      if (newSelectedDates.has(dateKey)) {
        newSelectedDates.delete(dateKey);
      } else {
        newSelectedDates.add(dateKey);
      }
      setSelectedDates(newSelectedDates);
      
      // If no dates selected, clear form
      if (newSelectedDates.size === 0) {
        setPhoneNumber('');
        setEmployeeName('');
      }
    } else {
      setSelectedDate(date);
      const schedule = schedules[dateKey];
      if (schedule) {
        setPhoneNumber(schedule.phone);
        setEmployeeName(schedule.name);
      } else {
        setPhoneNumber('');
        setEmployeeName('');
      }
    }
  };

  const handleSaveSchedule = async () => {
    if (employeeName && /^\d{9}$/.test(phoneNumber)) {
      setIsLoading(true);
      try {
        if (multiSelectMode && selectedDates.size > 0) {
          // Save schedule for all selected dates
          const savePromises = Array.from(selectedDates).map(async (dateKey) => {
            const schedule: Schedule = {
              phone: phoneNumber,
              name: employeeName,
              date: dateKey
            };
            
            const existingSchedule = schedules[dateKey];
            if (existingSchedule) {
              return await updateScheduleInFirestore(dateKey, { phone: phoneNumber, name: employeeName });
            } else {
              return await saveScheduleToFirestore(schedule);
            }
          });
          
          const results = await Promise.all(savePromises);
          const allSuccessful = results.every(result => result);
          
          if (allSuccessful) {
            setSchedules(prev => {
              const newSchedules = { ...prev };
              selectedDates.forEach(dateKey => {
                newSchedules[dateKey] = {
                  phone: phoneNumber,
                  name: employeeName,
                  date: dateKey
                };
              });
              return newSchedules;
            });
          } else {
            alert('Some schedules failed to save. Please try again.');
          }
          
          setSelectedDates(new Set());
        } else if (!multiSelectMode && selectedDate) {
          // Save schedule for single selected date
          const dateKey = formatDate(selectedDate);
          const schedule: Schedule = {
            phone: phoneNumber,
            name: employeeName,
            date: dateKey
          };
          
          const existingSchedule = schedules[dateKey];
          let success;
          
          if (existingSchedule) {
            success = await updateScheduleInFirestore(dateKey, { phone: phoneNumber, name: employeeName });
          } else {
            success = await saveScheduleToFirestore(schedule);
          }
          
          if (success) {
            setSchedules(prev => ({
              ...prev,
              [dateKey]: schedule
            }));
          } else {
            alert('Failed to save schedule. Please try again.');
          }
          
          setSelectedDate(null);
        }
        setPhoneNumber('');
        setEmployeeName('');
      } catch (error) {
        console.error('Error saving schedule:', error);
        alert('Failed to save schedule. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      alert('Numer telefonu musi składać się z dokładnie 9 cyfr.');
    }
  };

  const handleDeleteSchedule = async () => {
    setIsLoading(true);
    try {
      if (multiSelectMode && selectedDates.size > 0) {
        // Delete schedules for all selected dates
        const deletePromises = Array.from(selectedDates).map(dateKey => 
          schedules[dateKey] ? deleteScheduleFromFirestore(dateKey) : Promise.resolve(true)
        );
        
        const results = await Promise.all(deletePromises);
        const allSuccessful = results.every(result => result);
        
        if (allSuccessful) {
          setSchedules(prev => {
            const newSchedules = { ...prev };
            selectedDates.forEach(dateKey => {
              delete newSchedules[dateKey];
            });
            return newSchedules;
          });
        } else {
          alert('Some schedules failed to delete. Please try again.');
        }
        
        setSelectedDates(new Set());
      } else if (!multiSelectMode && selectedDate) {
        // Delete schedule for single selected date
        const dateKey = formatDate(selectedDate);
        
        if (schedules[dateKey]) {
          const success = await deleteScheduleFromFirestore(dateKey);
          
          if (success) {
            setSchedules(prev => {
              const newSchedules = { ...prev };
              delete newSchedules[dateKey];
              return newSchedules;
            });
          } else {
            alert('Failed to delete schedule. Please try again.');
          }
        }
        
        setSelectedDate(null);
      }
      setPhoneNumber('');
      setEmployeeName('');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const toggleMultiSelectMode = () => {
    setMultiSelectMode(prev => !prev);
    // Clear all selections when switching modes
    setSelectedDate(null);
    setSelectedDates(new Set());
    setPhoneNumber('');
    setEmployeeName('');
  };

  const clearAllSelections = () => {
    setSelectedDate(null);
    setSelectedDates(new Set());
    setPhoneNumber('');
    setEmployeeName('');
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
    
    if (reminderSettings.webhook_url) {
      await simulateWebhook(reminderData);
    }
  };

  const monthNames = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];

  const dayNames = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];

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
                <h1 className="text-2xl font-bold">Dyżury Telefoniczne</h1>
                <p className="text-blue-100">Zarządzaj przydziałami telefonów dyżurnych</p>
              </div>
            </div>
            <div className="flex space-x-2">
              {/* Connection Status Indicator */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
                connectionStatus === 'connected' 
                  ? 'bg-green-100 text-green-800' 
                  : connectionStatus === 'disconnected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' 
                    ? 'bg-green-500' 
                    : connectionStatus === 'disconnected'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
                }`}></div>
                <span>
                  {connectionStatus === 'connected' ? 'Połączono' 
                   : connectionStatus === 'disconnected' ? 'Offline' 
                   : 'Łączenie...'}
                </span>
              </div>
              {currentUser?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setShowApiPanel(!showApiPanel)}
                    className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>API i Ustawienia</span>
                  </button>
                  <button
                    onClick={() => setShowAddEmployee(true)}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors text-white ml-2"
                  >
                    <Users className="h-4 w-4" />
                    <span>Dodaj pracownika</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      {/* Add Employee Modal */}
      {showAddEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => { setShowAddEmployee(false); setEmployeeAddStatus('idle'); setNewEmployee({ name: '', phone: '' }); }}
              aria-label="Zamknij"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">Dodaj pracownika</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Imię i nazwisko</label>
              <input
                type="text"
                value={newEmployee.name}
                onChange={e => setNewEmployee(emp => ({ ...emp, name: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Wpisz imię i nazwisko"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Numer telefonu</label>
              <input
                type="tel"
                value={newEmployee.phone}
                onChange={e => setNewEmployee(emp => ({ ...emp, phone: e.target.value.replace(/\D/g, '') }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Wpisz numer telefonu"
                maxLength={9}
                minLength={9}
                pattern="[0-9]{9}"
                required
              />
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                onClick={handleAddEmployee}
                disabled={employeeAddStatus === 'saving'}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {employeeAddStatus === 'saving' ? 'Zapisywanie...' : 'Dodaj pracownika'}
              </button>
              <button
                onClick={() => { setShowAddEmployee(false); setEmployeeAddStatus('idle'); setNewEmployee({ name: '', phone: '' }); }}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Anuluj
              </button>
            </div>
            {employeeAddStatus === 'success' && (
              <div className="mt-3 text-green-700">Pracownik dodany!</div>
            )}
            {employeeAddStatus === 'error' && (
              <div className="mt-3 text-red-700">Błąd podczas dodawania pracownika.</div>
            )}
          </div>
        </div>
      )}

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

            {/* Mode Toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleMultiSelectMode}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    multiSelectMode 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>{multiSelectMode ? 'Tryb wielokrotnego wyboru' : 'Tryb pojedynczego wyboru'}</span>
                </button>
                {(selectedDate || selectedDates.size > 0) && (
                  <button
                    onClick={clearAllSelections}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Wyczyść wybór
                  </button>
                )}
              </div>
              {multiSelectMode && selectedDates.size > 0 && (
                <span className="text-sm text-gray-600">
                  Wybrano dni: {selectedDates.size}
                </span>
              )}
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
                const dateKey = formatDate(date);
                const isSelected = multiSelectMode 
                  ? selectedDates.has(dateKey)
                  : selectedDate && formatDate(selectedDate) === dateKey;
                
                return (
                  <div
                    key={index}
                    onClick={() => handleDateClick(date)}
                    className={`
                      p-3 min-h-[80px] border cursor-pointer transition-all duration-200
                      ${isCurrentMonth(date) ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                      ${isToday(date) ? 'ring-2 ring-blue-500' : ''}
                      ${isSelected ? 'bg-blue-100 ring-2 ring-blue-300' : ''}
                      ${schedule ? 'bg-green-50 border-green-200' : 'border-gray-200'}
                      hover:bg-gray-50 hover:shadow-md rounded-lg
                      ${multiSelectMode && isSelected ? 'bg-blue-200 border-blue-400' : ''}
                    `}
                  >
                    <div className="font-semibold flex justify-between items-center">
                      <span>{date.getDate()}</span>
                      {multiSelectMode && isSelected && (
                        <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
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
            {((multiSelectMode && selectedDates.size > 0) || (!multiSelectMode && selectedDate)) && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-3">
                  {multiSelectMode 
                    ? `Grafik dla ${selectedDates.size} wybranych dni`
                    : `Grafik dla ${selectedDate?.toLocaleDateString()}`
                  }
                </h3>
                
                {multiSelectMode && selectedDates.size > 0 && (
                  <div className="mb-3 p-2 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800 font-medium mb-1">Wybrane daty:</p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(selectedDates).map(dateKey => (
                        <span key={dateKey} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {new Date(dateKey).toLocaleDateString()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Imię i nazwisko pracownika</label>
                    <input
                      type="text"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Wpisz imię i nazwisko"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Numer telefonu</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        // Only allow digits
                        const val = e.target.value.replace(/\D/g, '');
                        setPhoneNumber(val);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Wpisz numer telefonu"
                      maxLength={9}
                      minLength={9}
                      pattern="[0-9]{9}"
                      required
                    />
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={handleSaveSchedule}
                    disabled={isLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Zapisywanie...' : multiSelectMode ? `Zapisz grafik dla ${selectedDates.size} dni` : 'Zapisz grafik'}
                  </button>
                  {((multiSelectMode && Array.from(selectedDates).some(dateKey => schedules[dateKey])) || 
                    (!multiSelectMode && selectedDate && hasSchedule(selectedDate))) && (
                    <button
                      onClick={handleDeleteSchedule}
                      disabled={isLoading}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Usuwanie...' : multiSelectMode ? 'Usuń wybrane grafiki' : 'Usuń grafik'}
                    </button>
                  )}
                  <button
                    onClick={clearAllSelections}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Anuluj
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
                <h3 className="font-semibold">API i Ustawienia</h3>
              </div>

              {/* Reminder Settings */}
              <div className="mb-6">
                <h4 className="font-medium mb-3 flex items-center">
                  <Bell className="h-4 w-4 mr-2" />
                  Ustawienia przypomnień
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={reminderSettings.enabled}
                      onChange={(e) => setReminderSettings(prev => ({...prev, enabled: e.target.checked}))}
                      className="mr-2"
                    />
                    Włącz przypomnienia
                  </label>
                  <div>
                    <label className="block text-sm font-medium mb-1">Godzin przed dyżurem</label>
                    <input
                      type="number"
                      value={reminderSettings.hours_before}
                      onChange={(e) => setReminderSettings(prev => ({...prev, hours_before: parseInt(e.target.value)}))}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      min="1"
                      max="24"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Adres webhooka</label>
                    <input
                      type="url"
                      value={reminderSettings.webhook_url}
                      onChange={(e) => setReminderSettings(prev => ({...prev, webhook_url: e.target.value}))}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      placeholder="https://your-webhook.com/endpoint"
                    />
                  </div>
                </div>
              </div>

              {/* API Endpoints */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Endpointy API</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-white rounded border">
                    <code className="text-blue-600">GET /api/schedule/:date</code>
                    <p className="text-gray-600 mt-1">Pobierz grafik na wybrany dzień</p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <code className="text-green-600">POST /api/schedule</code>
                    <p className="text-gray-600 mt-1">Utwórz nowy grafik</p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <code className="text-orange-600">PUT /api/schedule/:date</code>
                    <p className="text-gray-600 mt-1">Aktualizuj istniejący grafik</p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <code className="text-red-600">DELETE /api/schedule/:date</code>
                    <p className="text-gray-600 mt-1">Usuń grafik</p>
                  </div>
                </div>
              </div>

              {/* Test API */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Testuj API</h4>
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
                    Pobierz dzisiejszy grafik
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
                    Pobierz wszystkie grafiki
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
                    Wyślij testowe przypomnienie
                  </button>
                </div>
              </div>

              {/* API Response */}
              {apiResponse && (
                <div>
                  <h4 className="font-medium mb-2">Odpowiedź API</h4>
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