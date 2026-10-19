import { v4 as uuidv4 } from 'uuid';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';

export interface AuthResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface CardState {
  cardId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string;
  updatedAt: number;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  quality: number;
  reviewedAt: number;
  deviceId?: string;
}

export interface SyncRequest {
  deviceId: string;
  cardStates: CardState[];
  reviewLogs: ReviewLog[];
}

export interface SyncResponse {
  cardStates: CardState[];
  reviewLogs: ReviewLog[];
}

export interface StatsResponse {
  totalCards: number;
  dueCards: number;
  learnedCards: number;
  averageEase: number;
  totalReviews: number;
  reviewsToday: number;
}

class ApiClient {
  private accessToken: string | null = null;

  setTokens(accessToken: string, _refreshToken: string, _userId: string) {
    this.accessToken = accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async register(email: string, password: string): Promise<AuthResponse> {
    const resp = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) throw new Error(`Auth error: ${resp.status}`);
    const data = await resp.json();
    this.setTokens(data.accessToken, data.refreshToken, data.userId);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const resp = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) throw new Error(`Auth error: ${resp.status}`);
    const data = await resp.json();
    this.setTokens(data.accessToken, data.refreshToken, data.userId);
    return data;
  }

  async logout(): Promise<void> {
    if (!this.accessToken) return;
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
    } finally {
      this.accessToken = null;
    }
  }

  async registerDevice(deviceId: string, deviceName: string): Promise<void> {
    if (!this.accessToken) throw new Error('Not authenticated');
    const resp = await fetch(`${API_BASE}/sync/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ deviceId, deviceName }),
    });
    if (!resp.ok) throw new Error(`Device register error: ${resp.status}`);
  }

  async push(syncReq: SyncRequest): Promise<void> {
    if (!this.accessToken) throw new Error('Not authenticated');
    const resp = await fetch(`${API_BASE}/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(syncReq),
    });
    if (!resp.ok) throw new Error(`Sync push error: ${resp.status}`);
  }

  async pull(since: number = 0): Promise<SyncResponse> {
    if (!this.accessToken) throw new Error('Not authenticated');
    const resp = await fetch(`${API_BASE}/sync/pull?since=${since}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!resp.ok) throw new Error(`Sync pull error: ${resp.status}`);
    return resp.json();
  }

  async getStats(): Promise<StatsResponse> {
    if (!this.accessToken) throw new Error('Not authenticated');
    const resp = await fetch(`${API_BASE}/stats`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!resp.ok) throw new Error(`Stats error: ${resp.status}`);
    return resp.json();
  }
}

export const apiClient = new ApiClient();

export function getDeviceId(): string {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}
