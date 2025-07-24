// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Schedule {
  phone: string;
  name: string;
  date: string;
}

export interface ReminderSettings {
  enabled: boolean;
  hours_before: number;
  webhook_url?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface User {
  username: string;
  email?: string;
  full_name?: string;
  is_active: boolean;
  role: string;
  created_at?: string;
  last_login?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  full_name?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        this.logout();
        throw new Error('Authentication required');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    
    // Store token and user data
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user_data', JSON.stringify(data.user));
    localStorage.setItem('token_expires_at', (Date.now() + data.expires_in * 1000).toString());
    
    return data;
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<User>> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    return await response.json();
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<User>('/api/auth/me');
    if (response.success === false) {
      throw new Error('Failed to get user info');
    }
    return response.data || response as any; // Handle both response formats
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('token_expires_at');
    window.location.href = '/';
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    const expiresAt = localStorage.getItem('token_expires_at');
    
    if (!token || !expiresAt) {
      return false;
    }

    if (Date.now() > parseInt(expiresAt)) {
      this.logout();
      return false;
    }

    return true;
  }

  getCurrentUserData(): User | null {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  // Schedule operations (now require authentication)
  async createSchedule(schedule: Schedule): Promise<ApiResponse<Schedule>> {
    return this.request('/api/schedule', {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
  }

  async getSchedule(date: string): Promise<ApiResponse<Schedule>> {
    return this.request(`/api/schedule/${date}`);
  }

  async getAllSchedules(): Promise<ApiResponse<Record<string, Schedule>>> {
    return this.request('/api/schedules');
  }

  async getSchedulesByDateRange(
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<Record<string, Schedule>>> {
    return this.request(`/api/schedules?start_date=${startDate}&end_date=${endDate}`);
  }

  async updateSchedule(date: string, schedule: Omit<Schedule, 'date'>): Promise<ApiResponse<Schedule>> {
    return this.request(`/api/schedule/${date}`, {
      method: 'PUT',
      body: JSON.stringify(schedule),
    });
  }

  async deleteSchedule(date: string): Promise<ApiResponse<{ date: string }>> {
    return this.request(`/api/schedule/${date}`, {
      method: 'DELETE',
    });
  }

  // Reminder settings operations (now require authentication)
  async saveReminderSettings(
    userId: string,
    settings: ReminderSettings
  ): Promise<ApiResponse<ReminderSettings>> {
    return this.request(`/api/settings/reminders/${userId}`, {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  async getReminderSettings(userId: string): Promise<ApiResponse<ReminderSettings>> {
    return this.request(`/api/settings/reminders/${userId}`);
  }

  // Admin operations
  async getAllUsers(): Promise<ApiResponse<Record<string, User>>> {
    return this.request('/api/admin/users');
  }

  async updateUserStatus(username: string, isActive: boolean): Promise<ApiResponse<any>> {
    return this.request(`/api/admin/users/${username}/status`, {
      method: 'POST',
      body: JSON.stringify(isActive),
    });
  }

  async adminCreateUser(userData: RegisterRequest & { role?: string }): Promise<ApiResponse<User>> {
    return this.request('/api/admin/users/create', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Health check (public)
  async healthCheck(): Promise<ApiResponse<{ status: string; service: string }>> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  }

  // Check registration status (public)
  async getRegistrationStatus(): Promise<{ public_registration_enabled: boolean; admin_only_registration: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/registration-status`);
    return await response.json();
  }
}

export const apiService = new ApiService();
