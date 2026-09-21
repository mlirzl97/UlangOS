import {
  Farm,
  Pond,
  Batch,
  Device,
  SensorReading,
  WaterTest,
  FeedLog,
  StockEvent,
  GrowthSample,
  Expense,
  Harvest,
  Sale,
  OperatingRule,
  FarmAlert,
  TestResultItem,
  WeatherData,
  CctvCamera,
} from '../types.ts';

export class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `Request failed: ${response.status} ${response.statusText || ''}`.trim();
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // fallback
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Farms
  getFarms() {
    return this.request<Farm[]>('/api/farms');
  }

  createFarm(data: { name: string; location: string; timezone?: string; responsibleOperator: string; isDemo?: boolean }) {
    return this.request<Farm>('/api/farms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  seedDemoFarm(force: boolean = false) {
    return this.request<{ farm: Farm; message: string }>(`/api/farms/seed-demo-farm?force=${force}`, {
      method: 'POST',
      body: JSON.stringify({ force }),
    });
  }

  resetFullCycle(farmId: string) {
    return this.request<{ farm: Farm; message: string }>(`/api/farms/${farmId}/reset-full-cycle`, {
      method: 'POST',
    });
  }

  getWeather(farmId: string) {
    return this.request<WeatherData>(`/api/farms/${farmId}/weather`);
  }

  getCctvFeeds(farmId: string) {
    return this.request<CctvCamera[]>(`/api/farms/${farmId}/cctv`);
  }

  // Ponds
  getPonds(farmId: string) {
    return this.request<Pond[]>(`/api/farms/${farmId}/ponds`);
  }

  createPond(farmId: string, data: Partial<Pond>) {
    return this.request<Pond>(`/api/farms/${farmId}/ponds`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Batches
  getBatches(farmId: string) {
    return this.request<Batch[]>(`/api/farms/${farmId}/batches`);
  }

  createBatch(farmId: string, data: any) {
    return this.request<Batch>(`/api/farms/${farmId}/batches`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  closeBatch(farmId: string, batchId: string, data: { finalSurvivalPercent?: number; closingNotes?: string }) {
    return this.request<Batch>(`/api/farms/${farmId}/batches/${batchId}/close`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Devices
  getDevices(farmId: string) {
    return this.request<Device[]>(`/api/farms/${farmId}/devices`);
  }

  createDevice(farmId: string, data: { deviceId: string; name: string; pondId?: string }) {
    return this.request<{ device: Device; rawApiKey: string; instructions: string }>(`/api/farms/${farmId}/devices`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  toggleDevice(farmId: string, deviceId: string, isEnabled: boolean) {
    return this.request<Device>(`/api/farms/${farmId}/devices/${deviceId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ isEnabled }),
    });
  }

  // Water Tests
  getWaterTests(farmId: string) {
    return this.request<WaterTest[]>(`/api/farms/${farmId}/water-tests`);
  }

  createWaterTest(farmId: string, data: any) {
    return this.request<WaterTest>(`/api/farms/${farmId}/water-tests`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Operations: Feed
  getFeedLogs(farmId: string) {
    return this.request<FeedLog[]>(`/api/farms/${farmId}/feed-logs`);
  }

  createFeedLog(farmId: string, data: any) {
    return this.request<FeedLog>(`/api/farms/${farmId}/feed-logs`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Stock Events
  getStockEvents(farmId: string) {
    return this.request<StockEvent[]>(`/api/farms/${farmId}/stock-events`);
  }

  createStockEvent(farmId: string, data: any) {
    return this.request<StockEvent>(`/api/farms/${farmId}/stock-events`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Growth Samples
  getGrowthSamples(farmId: string) {
    return this.request<GrowthSample[]>(`/api/farms/${farmId}/growth-samples`);
  }

  createGrowthSample(farmId: string, data: any) {
    return this.request<GrowthSample>(`/api/farms/${farmId}/growth-samples`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Finance
  getExpenses(farmId: string) {
    return this.request<Expense[]>(`/api/farms/${farmId}/expenses`);
  }

  createExpense(farmId: string, data: any) {
    return this.request<Expense>(`/api/farms/${farmId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getHarvests(farmId: string) {
    return this.request<Harvest[]>(`/api/farms/${farmId}/harvests`);
  }

  createHarvest(farmId: string, data: any) {
    return this.request<Harvest>(`/api/farms/${farmId}/harvests`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getSales(farmId: string) {
    return this.request<Sale[]>(`/api/farms/${farmId}/sales`);
  }

  createSale(farmId: string, data: any) {
    return this.request<Sale>(`/api/farms/${farmId}/sales`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getFinanceSummary(farmId: string) {
    return this.request<any>(`/api/farms/${farmId}/finance-summary`);
  }

  // Alerts & Rules
  getAlerts(farmId: string) {
    return this.request<FarmAlert[]>(`/api/farms/${farmId}/alerts`);
  }

  resolveAlert(farmId: string, alertId: string, actionTaken: string) {
    return this.request<FarmAlert>(`/api/farms/${farmId}/alerts/${alertId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ actionTaken }),
    });
  }

  evaluateRules(farmId: string) {
    return this.request<{ evaluated: boolean; newAlertsGenerated: any[] }>(`/api/farms/${farmId}/rules/evaluate`, {
      method: 'POST',
    });
  }

  getOperatingRules(farmId: string) {
    return this.request<OperatingRule[]>(`/api/farms/${farmId}/operating-rules`);
  }

  // Telemetry
  getTelemetry(farmId: string) {
    return this.request<SensorReading[]>(`/api/farms/${farmId}/telemetry`);
  }

  getDeviceFirmware(deviceId: string) {
    return this.request<{ firmwareSourceCode: string; deviceId: string }>(`/api/devices/${deviceId}/firmware`);
  }

  // AI & Reports
  getDailyAiReport(farmId: string) {
    return this.request<{ reportText: string; generatedBy: string; generatedAt: string }>(`/api/farms/${farmId}/reports/daily-ai`);
  }

  askAi(farmId: string, prompt: string) {
    return this.request<{ answer: string }>(`/api/farms/${farmId}/intelligence/ask`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  }

  // Export
  exportData(farmId: string, format: 'json' | 'csv' = 'json') {
    return `/api/farms/${farmId}/export?format=${format}`;
  }

  // System Self-Tests
  runSystemTests() {
    return this.request<{ total: number; passed: number; failed: number; durationMs: number; results: TestResultItem[] }>(
      '/api/system/run-tests',
      { method: 'POST' }
    );
  }
}

export const api = new ApiClient();
