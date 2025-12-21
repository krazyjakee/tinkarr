import axios, { type AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  AuthResponse,
  Indexer,
  CreateIndexerRequest,
  Setting,
  TestIndexerRequest,
  TestIndexerResponse,
  AutoDetectResponse,
  FlaresolverrTestResponse,
  AutoConfigureResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage
    this.token = localStorage.getItem('auth_token');
    if (this.token) {
      this.setAuthHeader(this.token);
    }

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          this.clearAuth();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private setAuthHeader(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  private clearAuthHeader() {
    delete this.client.defaults.headers.common['Authorization'];
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    this.setAuthHeader(token);
  }

  clearAuth() {
    this.token = null;
    localStorage.removeItem('auth_token');
    this.clearAuthHeader();
  }

  getToken(): string | null {
    return this.token;
  }

  // Auth endpoints
  async register(username: string, password: string): Promise<AuthResponse> {
    const { data } = await this.client.post<AuthResponse>('/auth/register', {
      username,
      password,
    });
    this.setToken(data.token);
    return data;
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const { data } = await this.client.post<AuthResponse>('/auth/login', {
      username,
      password,
    });
    this.setToken(data.token);
    return data;
  }

  async logout(): Promise<void> {
    this.clearAuth();
  }

  async getMe(): Promise<User> {
    const { data } = await this.client.get<User>('/auth/me');
    return data;
  }

  async regenerateApiKey(): Promise<{ apiKey: string }> {
    const { data } = await this.client.post<{ apiKey: string }>(
      '/auth/regenerate-api-key'
    );
    return data;
  }

  // Indexer endpoints
  async getIndexers(): Promise<Indexer[]> {
    const { data } = await this.client.get<Indexer[]>('/indexers');
    return data;
  }

  async getIndexer(id: number): Promise<Indexer> {
    const { data } = await this.client.get<Indexer>(`/indexers/${id}`);
    return data;
  }

  async createIndexer(indexer: CreateIndexerRequest): Promise<Indexer> {
    const { data } = await this.client.post<Indexer>('/indexers', indexer);
    return data;
  }

  async updateIndexer(
    id: number,
    indexer: Partial<CreateIndexerRequest>
  ): Promise<Indexer> {
    const { data } = await this.client.put<Indexer>(`/indexers/${id}`, indexer);
    return data;
  }

  async deleteIndexer(id: number): Promise<void> {
    await this.client.delete(`/indexers/${id}`);
  }

  async toggleIndexer(id: number): Promise<Indexer> {
    const { data } = await this.client.post<Indexer>(`/indexers/${id}/toggle`);
    return data;
  }

  async testIndexer(
    id: number,
    request: TestIndexerRequest
  ): Promise<TestIndexerResponse> {
    const { data } = await this.client.post<TestIndexerResponse>(
      `/indexers/${id}/test`,
      request
    );
    return data;
  }

  async autoDetectIndexer(id: number): Promise<AutoDetectResponse> {
    const { data } = await this.client.post<AutoDetectResponse>(
      `/indexers/${id}/auto-detect`
    );
    return data;
  }

  async autoConfigureFromUrl(
    url: string,
    useFlaresolverr: boolean = false
  ): Promise<AutoConfigureResponse> {
    const { data } = await this.client.post<AutoConfigureResponse>(
      '/indexers/auto-configure',
      { url, useFlaresolverr }
    );
    return data;
  }

  // Settings endpoints
  async getSettings(): Promise<Setting[]> {
    const { data } = await this.client.get<Setting[]>('/settings');
    return data;
  }

  async getSetting(key: string): Promise<Setting> {
    const { data } = await this.client.get<Setting>(`/settings/${key}`);
    return data;
  }

  async updateSettings(settings: Record<string, string>): Promise<Setting[]> {
    const { data } = await this.client.put<Setting[]>('/settings', settings);
    return data;
  }

  async updateSetting(key: string, value: string): Promise<Setting> {
    const { data } = await this.client.put<Setting>(`/settings/${key}`, {
      value,
    });
    return data;
  }

  async deleteSetting(key: string): Promise<void> {
    await this.client.delete(`/settings/${key}`);
  }

  async testFlaresolverr(url?: string): Promise<FlaresolverrTestResponse> {
    const { data } = await this.client.post<FlaresolverrTestResponse>(
      '/settings/flaresolverr/test',
      { url }
    );
    return data;
  }

  // User management endpoints
  async getAllUsers(): Promise<User[]> {
    const { data } = await this.client.get<User[]>('/auth/users');
    return data;
  }

  async getUserById(id: number): Promise<User> {
    const { data } = await this.client.get<User>(`/auth/users/${id}`);
    return data;
  }

  async deleteUser(id: number): Promise<{ message: string }> {
    const { data } = await this.client.delete<{ message: string }>(
      `/auth/users/${id}`
    );
    return data;
  }

  async resetUserPassword(
    id: number,
    newPassword: string
  ): Promise<{ message: string }> {
    const { data } = await this.client.post<{ message: string }>(
      `/auth/users/${id}/reset-password`,
      { newPassword }
    );
    return data;
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const { data } = await this.client.post<{ message: string }>(
      '/auth/change-password',
      { currentPassword, newPassword }
    );
    return data;
  }
}

export const apiClient = new ApiClient();
