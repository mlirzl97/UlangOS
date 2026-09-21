export type FarmRole = 'owner' | 'operator' | 'viewer';

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName?: string | null;
  photoUrl?: string | null;
  createdAt: string;
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  timezone: string;
  responsibleOperator: string;
  status: 'active' | 'maintenance' | 'inactive';
  isDemo: boolean;
  ownerId: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  cctvStreams?: CctvCamera[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface FarmMember {
  id: string;
  farmId: string;
  userId: string;
  userEmail: string;
  role: FarmRole;
  invitedAt: string;
}

export interface Pond {
  id: string;
  farmId: string;
  name: string;
  identifier: string;
  cultureMethod: 'extensive' | 'semi_intensive' | 'intensive';
  pondType: 'earthen_pond' | 'concrete_tank' | 'lined_pond' | 'circular_tank';
  areaSqM?: number | null;
  waterVolumeM3?: number | null;
  avgDepthM?: number | null;
  status: 'active' | 'fallow' | 'preparing' | 'harvesting' | 'maintenance';
  installationDate?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  notes?: string | null;
  createdAt: string;
}

export interface Batch {
  id: string;
  farmId: string;
  pondId: string;
  batchIdentifier: string;
  species: string;
  stockingDate: string; // YYYY-MM-DD
  initialStockQuantity: number;
  currentEstimatedSurvival: number;
  sourcePlJuveniles?: string | null;
  stockingCost: number;
  status: 'active' | 'completed' | 'terminated';
  targetHarvestDate?: string | null;
  closedAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface Device {
  id: string;
  farmId: string;
  pondId?: string | null;
  deviceId: string;
  deviceIdentifier?: string; // alias for UI display
  name: string;
  deviceType: string;
  apiKeyHash?: string;
  rawApiKey?: string; // returned only once on provisioning
  isEnabled: boolean;
  status?: 'active' | 'inactive' | 'stale' | 'offline';
  firmwareVersion?: string;
  batteryLevel?: number;
  lastSeenAt?: string | null;
  hardwareSpecs?: {
    microcontroller: string;
    sensor: string;
    dataPin: string;
    voltage: string;
    resistor: string;
    intervalSec: number;
  } | null;
  createdAt: string;
}

export interface SensorReading {
  id: string;
  farmId: string;
  pondId: string;
  deviceId: string;
  eventId: string;
  parameter: string;
  value: number;
  unit: string;
  measuredAt: string;
  receivedAt: string;
  isValid: boolean;
  notes?: string | null;
}

export interface WaterTest {
  id: string;
  farmId: string;
  pondId: string;
  batchId?: string | null;
  testedAt: string;
  temperature?: number | null;
  dissolvedOxygen?: number | null;
  ph?: number | null;
  totalAmmonia?: number | null;
  nitrite?: number | null;
  alkalinity?: number | null;
  salinity?: number | null;
  transparency?: number | null;
  sourceType: 'iot_sensor' | 'manual_digital_meter' | 'chemical_test_kit' | 'lab_result' | 'derived_calculation';
  testedBy: string;
  notes?: string | null;
  createdAt: string;
}

export interface FeedLog {
  id: string;
  farmId: string;
  pondId: string;
  batchId?: string | null;
  fedAt: string;
  feedType: string;
  quantityKg: number;
  feedingTrayCheck?: 'consumed_100' | 'consumed_80' | 'leftover_30' | 'unconsumed' | null;
  costPerKg?: number | null;
  totalCost?: number | null;
  operatorName: string;
  notes?: string | null;
  createdAt: string;
}

export interface StockEvent {
  id: string;
  farmId: string;
  pondId: string;
  batchId: string;
  eventType: 'stocking' | 'mortality' | 'sampling' | 'water_exchange' | 'aeration_issue' | 'maintenance' | 'intervention';
  eventDate: string;
  quantity?: number | null;
  details?: Record<string, any> | null;
  operatorName: string;
  photoUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface GrowthSample {
  id: string;
  farmId: string;
  pondId: string;
  batchId: string;
  sampleDate: string;
  sampleCount: number;
  avgWeightGrams: number;
  minWeightGrams?: number | null;
  maxWeightGrams?: number | null;
  estimatedSurvivalPercent?: number | null;
  estimatedTotalBiomassKg?: number | null;
  notes?: string | null;
  createdAt: string;
}

export interface Expense {
  id: string;
  farmId: string;
  pondId?: string | null;
  batchId?: string | null;
  category: 'capital_expenditure' | 'operating_expenses' | 'feed_purchase' | 'seedling_juveniles' | 'electricity' | 'water' | 'labor' | 'maintenance' | 'transportation' | 'owner_contributed' | 'other';
  expenseType: 'capex' | 'opex';
  amountPhp: number;
  paymentDate: string;
  payeeVendor?: string | null;
  description: string;
  isConsumed: boolean;
  receiptUrl?: string | null;
  recordedBy: string;
  createdAt: string;
}

export interface Harvest {
  id: string;
  farmId: string;
  pondId: string;
  batchId: string;
  harvestType: 'partial' | 'final';
  harvestDate: string;
  quantityPcs?: number | null;
  totalWeightKg: number;
  avgWeightGrams?: number | null;
  gradeClassification?: string | null;
  notes?: string | null;
  recordedBy: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  farmId: string;
  batchId?: string | null;
  harvestId?: string | null;
  saleDate: string;
  buyerName: string;
  weightSoldKg: number;
  pricePerKgPhp: number;
  totalRevenuePhp: number;
  paymentStatus: 'paid' | 'receivable_pending' | 'partial';
  recordedBy: string;
  notes?: string | null;
  createdAt: string;
}

export interface OperatingRule {
  id: string;
  farmId: string;
  species: string;
  ruleCode: string;
  name?: string;
  parameter: string;
  minVal?: number | null;
  maxVal?: number | null;
  minOptimal?: number | null;
  maxOptimal?: number | null;
  unit?: string | null;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  recommendation: string;
  actionRecommendation?: string;
  version: string;
  isActive: boolean;
}

export interface FarmAlert {
  id: string;
  farmId: string;
  pondId?: string | null;
  ruleCode: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  sourceData?: Record<string, any> | null;
  triggeredAt: string;
  createdAt?: string;
  recommendedVerification?: string | null;
  responsiblePerson?: string | null;
  status: 'open' | 'acknowledged' | 'resolved';
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  actionTaken?: string | null;
  resolutionNotes?: string | null;
}

export interface DailyReport {
  reportText?: string;
  summaryText?: string;
  reportDate?: string;
  source?: string;
  actionItems?: string[];
  generatedBy?: string;
  generatedAt?: string;
}

export interface ActionLog {
  id: string;
  farmId: string;
  alertId?: string | null;
  actionType: string;
  performedBy: string;
  notes: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  farmId: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'correction';
  previousState?: any;
  newState?: any;
  performedBy: string;
  timestamp: string;
}

export interface TestResultItem {
  name: string;
  category: string;
  passed: boolean;
  message: string;
  durationMs: number;
  details?: any;
}

export interface CctvCamera {
  id: string;
  name: string;
  zone: string;
  location: string;
  streamUrl?: string;
  status: 'online' | 'standby' | 'offline';
  resolution: string;
  fps: number;
  bitrate: string;
  hasNightVision: boolean;
  hasPtz: boolean;
  presets?: string[];
  lastMotionAt?: string;
  pondId?: string;
  coords?: { lat: number; lng: number };
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  relativeHumidity: number;
  precipitationProbability: number;
  precipitationMm: number;
  cloudCover: number;
  windSpeedKph: number;
  doRisk: 'low' | 'moderate' | 'high';
}

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  apparentTempMax: number;
  precipitationSumMm: number;
  precipitationProbabilityMax: number;
  windSpeedMaxKph: number;
  condition: string;
  weatherCode: number;
  aquacultureImpact: string;
}

export interface WeatherAquacultureAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  actionRequired: string;
}

export interface WeatherData {
  locationName: string;
  latitude: number;
  longitude: number;
  current: {
    temperature: number;
    apparentTemperature: number;
    relativeHumidity: number;
    precipitationMm: number;
    surfacePressureHpa: number;
    windSpeedKph: number;
    windDirectionDeg: number;
    windGustsKph: number;
    cloudCoverPercent: number;
    uvIndex: number;
    conditionText: string;
    weatherCode: number;
    measuredAt: string;
  };
  aquacultureAssessment: {
    oxygenDepletionRisk: 'low' | 'moderate' | 'elevated' | 'critical';
    naturalAerationRating: 'poor' | 'moderate' | 'optimal';
    runOffAcidificationRisk: 'none' | 'low' | 'moderate' | 'high';
    recommendedActions: string[];
  };
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  alerts: WeatherAquacultureAlert[];
}
