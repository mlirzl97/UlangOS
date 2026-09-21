/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { api } from './lib/api.ts';
import { Header } from './components/Header.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { WaterQualityView } from './components/WaterQualityView.tsx';
import { PondsBatchesView } from './components/PondsBatchesView.tsx';
import { DailyOperationsView } from './components/DailyOperationsView.tsx';
import { FarmFinanceView } from './components/FarmFinanceView.tsx';
import { Esp32IotHubView } from './components/Esp32IotHubView.tsx';
import { AiIntelligenceView } from './components/AiIntelligenceView.tsx';
import { SatelliteMapView } from './components/SatelliteMapView.tsx';
import { CctvMonitorView } from './components/CctvMonitorView.tsx';
import { WeatherForecastView } from './components/WeatherForecastView.tsx';
import { ToastProvider, useToast } from './components/ui/Toast.tsx';
import { Dialog } from './components/ui/Dialog.tsx';
import { Field, Input, Select, Textarea } from './components/ui/Field.tsx';
import { Button } from './components/ui/Button.tsx';
import { Badge } from './components/ui/Badge.tsx';
import { CommandPalette } from './components/ui/CommandPalette.tsx';
import { MobileDock } from './components/ui/MobileDock.tsx';
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
  FarmAlert,
  OperatingRule,
  DailyReport,
  TestResultItem,
} from './types.ts';
import {
  calculateBiologicalMetrics,
  calculateFinancialMetrics,
  BiologicalMetrics,
  FinancialMetrics,
} from './lib/aquaculture-math.ts';
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Plus,
  Droplets,
  Utensils,
  Cpu,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';

function AquaOsApp() {
  const { user, token, loading: authLoading, signInAsDemo } = useAuth();
  const toast = useToast();

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCctvCamId, setSelectedCctvCamId] = useState<string | undefined>(undefined);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);

  // Farm State
  const [farms, setFarms] = useState<Farm[]>([]);
  const [currentFarm, setCurrentFarm] = useState<Farm | null>(null);
  const [loadingFarms, setLoadingFarms] = useState<boolean>(true);
  const [farmDataLoading, setFarmDataLoading] = useState<boolean>(false);

  // Operational Collections
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [waterTests, setWaterTests] = useState<WaterTest[]>([]);
  const [feedLogs, setFeedLogs] = useState<FeedLog[]>([]);
  const [stockEvents, setStockEvents] = useState<StockEvent[]>([]);
  const [growthSamples, setGrowthSamples] = useState<GrowthSample[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [alerts, setAlerts] = useState<FarmAlert[]>([]);
  const [operatingRules, setOperatingRules] = useState<OperatingRule[]>([]);

  // Modals
  const [isCreateFarmOpen, setIsCreateFarmOpen] = useState(false);
  const [isQuickWaterTestOpen, setIsQuickWaterTestOpen] = useState(false);
  const [isQuickFeedOpen, setIsQuickFeedOpen] = useState(false);
  const [alertToResolve, setAlertToResolve] = useState<FarmAlert | null>(null);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  // Forms state
  const [newFarmName, setNewFarmName] = useState('');
  const [newFarmLocation, setNewFarmLocation] = useState('Camarines Sur, Bicol, Philippines');
  const [newFarmOperator, setNewFarmOperator] = useState('Liezl Maigue');

  // Quick Water Test form
  const [quickTestPondId, setQuickTestPondId] = useState('');
  const [quickTestTemp, setQuickTestTemp] = useState('29.2');
  const [quickTestDo, setQuickTestDo] = useState('5.8');
  const [quickTestPh, setQuickTestPh] = useState('7.6');
  const [quickTestAmmonia, setQuickTestAmmonia] = useState('0.15');
  const [quickTestNitrite, setQuickTestNitrite] = useState('0.02');
  const [quickTestNotes, setQuickTestNotes] = useState('Routine morning check');

  // Quick Feed form
  const [quickFeedPondId, setQuickFeedPondId] = useState('');
  const [quickFeedType, setQuickFeedType] = useState('Commercial Ulang Starter Pellets (35% CP)');
  const [quickFeedKg, setQuickFeedKg] = useState('4.5');
  const [quickFeedTray, setQuickFeedTray] = useState<'consumed_100' | 'consumed_80_90' | 'consumed_50_70' | 'unconsumed_heavy'>('consumed_100');
  const [quickFeedCost, setQuickFeedCost] = useState('65');

  // Resolve Alert form
  const [alertResolutionNotes, setAlertResolutionNotes] = useState('');

  // Diagnostics test state
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<{
    total: number;
    passed: number;
    failed: number;
    durationMs: number;
    results: TestResultItem[];
  } | null>(null);

  // Sync token with ApiClient
  useEffect(() => {
    api.setToken(token);
  }, [token]);

  // Auto sign in as demo operator if not authenticated
  useEffect(() => {
    if (!authLoading && !user && !token) {
      signInAsDemo().catch(console.error);
    }
  }, [authLoading, user, token, signInAsDemo]);

  // Load farms when token is ready
  const loadFarms = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingFarms(true);
      const farmList = await api.getFarms();
      if (farmList.length === 0) {
        // Auto-seed demo farm on first load
        const seeded = await api.seedDemoFarm();
        setFarms([seeded.farm]);
        setCurrentFarm(seeded.farm);
      } else {
        setFarms(farmList);
        setCurrentFarm((prev) => (prev ? farmList.find((f) => f.id === prev.id) || farmList[0] : farmList[0]));
      }
    } catch (err: any) {
      console.error('Failed to load farms:', err);
      toast.error('Failed to sync farms', err.message);
    } finally {
      setLoadingFarms(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (token) {
      loadFarms();
    }
  }, [token, loadFarms]);

  // Load all farm collections
  const loadFarmData = useCallback(async (farmId: string) => {
    try {
      setFarmDataLoading(true);
      const [
        pondData,
        batchData,
        devData,
        telemetryData,
        testData,
        feedData,
        eventData,
        sampleData,
        expData,
        harvestData,
        saleData,
        alertData,
        ruleData,
      ] = await Promise.all([
        api.getPonds(farmId).catch(() => []),
        api.getBatches(farmId).catch(() => []),
        api.getDevices(farmId).catch(() => []),
        api.getTelemetry(farmId).catch(() => []),
        api.getWaterTests(farmId).catch(() => []),
        api.getFeedLogs(farmId).catch(() => []),
        api.getStockEvents(farmId).catch(() => []),
        api.getGrowthSamples(farmId).catch(() => []),
        api.getExpenses(farmId).catch(() => []),
        api.getHarvests(farmId).catch(() => []),
        api.getSales(farmId).catch(() => []),
        api.getAlerts(farmId).catch(() => []),
        api.getOperatingRules(farmId).catch(() => []),
      ]);

      setPonds(pondData);
      setBatches(batchData);
      setDevices(devData);
      setSensorReadings(telemetryData);
      setWaterTests(testData);
      setFeedLogs(feedData);
      setStockEvents(eventData);
      setGrowthSamples(sampleData);
      setExpenses(expData);
      setHarvests(harvestData);
      setSales(saleData);
      setAlerts(alertData);
      setOperatingRules(ruleData);

      if (pondData.length > 0) {
        setQuickTestPondId((prev) => prev || pondData[0].id);
        setQuickFeedPondId((prev) => prev || pondData[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load farm details:', err);
      toast.error('Error syncing farm records', err.message);
    } finally {
      setFarmDataLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentFarm?.id) {
      loadFarmData(currentFarm.id);
    }
  }, [currentFarm?.id, loadFarmData]);

  // Active batch selection
  const activeBatch = batches.find((b) => b.status === 'active') || batches[0] || null;

  // Compute live biological metrics
  const totalMortality = stockEvents
    .filter((e) => e.eventType === 'mortality')
    .reduce((sum, e) => sum + (e.quantity || 0), 0);
  const latestAbw = growthSamples.length > 0 ? Number(growthSamples[0].avgWeightGrams) : null;
  const bioMetrics: BiologicalMetrics = calculateBiologicalMetrics({
    initialStockQuantity: activeBatch ? activeBatch.initialStockQuantity : 0,
    mortalityCount: totalMortality,
    feedLogs,
    latestAbwGrams: latestAbw,
    harvests,
  });

  // Compute financial metrics
  const finMetrics: FinancialMetrics = calculateFinancialMetrics({
    expenses,
    harvests,
    sales,
  });

  // Handlers
  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFarmName.trim()) return;
    try {
      const created = await api.createFarm({
        name: newFarmName,
        location: newFarmLocation,
        responsibleOperator: newFarmOperator,
      });
      setFarms((prev) => [...prev, created]);
      setCurrentFarm(created);
      setIsCreateFarmOpen(false);
      setNewFarmName('');
      toast.success('Production site registered', `Initialized ${created.name}.`);
    } catch (err: any) {
      toast.error('Failed to register farm', err.message);
    }
  };

  const handleSeedDemo = async (force: boolean = false) => {
    try {
      const seeded = await api.seedDemoFarm(force);
      setFarms((prev) => [seeded.farm, ...prev.filter((f) => f.id !== seeded.farm.id)]);
      setCurrentFarm(seeded.farm);
      await loadFarmData(seeded.farm.id);
      toast.success('Full-Cycle Demo Farm Loaded', 'Populated with complete 120-day production cycle, CCTV feeds, and satellite coordinates.');
    } catch (err: any) {
      toast.error('Failed to load demo farm', err.message);
    }
  };

  const handleAddPond = async (pondData: Partial<Pond>) => {
    if (!currentFarm) return;
    const newPond = await api.createPond(currentFarm.id, pondData);
    setPonds((prev) => [...prev, newPond]);
  };

  const handleAddBatch = async (batchData: any) => {
    if (!currentFarm) return;
    const newBatch = await api.createBatch(currentFarm.id, batchData);
    setBatches((prev) => [...prev, newBatch]);
  };

  const handleCloseBatch = async (batchId: string, data: any) => {
    if (!currentFarm) return;
    const updated = await api.closeBatch(currentFarm.id, batchId, data);
    setBatches((prev) => prev.map((b) => (b.id === batchId ? updated : b)));
  };

  const handleAddWaterTest = async (testData: any) => {
    if (!currentFarm) return;
    const newTest = await api.createWaterTest(currentFarm.id, testData);
    setWaterTests((prev) => [newTest, ...prev]);
    const freshAlerts = await api.getAlerts(currentFarm.id).catch(() => []);
    if (freshAlerts.length > 0) setAlerts(freshAlerts);
  };

  const handleAddFeedLog = async (feedData: any) => {
    if (!currentFarm) return;
    const newFeed = await api.createFeedLog(currentFarm.id, feedData);
    setFeedLogs((prev) => [newFeed, ...prev]);
  };

  const handleAddStockEvent = async (eventData: any) => {
    if (!currentFarm) return;
    const newEvent = await api.createStockEvent(currentFarm.id, eventData);
    setStockEvents((prev) => [newEvent, ...prev]);
  };

  const handleAddGrowthSample = async (sampleData: any) => {
    if (!currentFarm) return;
    const newSample = await api.createGrowthSample(currentFarm.id, sampleData);
    setGrowthSamples((prev) => [newSample, ...prev]);
  };

  const handleAddExpense = async (expData: any) => {
    if (!currentFarm) return;
    const newExp = await api.createExpense(currentFarm.id, expData);
    setExpenses((prev) => [newExp, ...prev]);
  };

  const handleAddHarvest = async (harvestData: any) => {
    if (!currentFarm) return;
    const newHarvest = await api.createHarvest(currentFarm.id, harvestData);
    setHarvests((prev) => [newHarvest, ...prev]);
  };

  const handleAddSale = async (saleData: any) => {
    if (!currentFarm) return;
    const newSale = await api.createSale(currentFarm.id, saleData);
    setSales((prev) => [newSale, ...prev]);
  };

  const handleRegisterDevice = async (devData: any) => {
    if (!currentFarm) throw new Error('No active farm');
    const res = await api.createDevice(currentFarm.id, {
      deviceId: devData.deviceIdentifier || devData.deviceId,
      name: devData.name,
      pondId: devData.pondId,
    });
    setDevices((prev) => [...prev, res.device]);
    return { apiKey: res.rawApiKey, device: res.device };
  };

  const handleSimulateReading = async (deviceIdent: string, apiKey: string, tempVal: number) => {
    if (!currentFarm) return;
    const selectedDev = devices.find((d) => d.deviceIdentifier === deviceIdent || d.deviceId === deviceIdent);
    const pondId = selectedDev?.pondId || (ponds[0] ? ponds[0].id : 'pond-001');
    const resp = await fetch('/api/sensors/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': deviceIdent,
        'x-device-key': apiKey,
      },
      body: JSON.stringify({
        device_id: deviceIdent,
        pond_id: pondId,
        event_id: `evt-${Date.now()}`,
        parameter: 'water_temperature',
        value: tempVal,
        unit: 'celsius',
        measured_at: new Date().toISOString(),
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(err.error || 'Ingest failed');
    }
    const result = await resp.json();
    const telemetry = await api.getTelemetry(currentFarm.id).catch(() => []);
    setSensorReadings(telemetry);
    const freshAlerts = await api.getAlerts(currentFarm.id).catch(() => []);
    setAlerts(freshAlerts);
    return result;
  };

  const handleGenerateDailyReport = async (): Promise<DailyReport> => {
    if (!currentFarm) throw new Error('No farm selected');
    const rep = await api.getDailyAiReport(currentFarm.id);
    return {
      reportText: rep.reportText,
      generatedBy: rep.generatedBy,
      generatedAt: rep.generatedAt,
      reportDate: new Date().toISOString().split('T')[0],
      actionItems: [
        'Maintain continuous paddlewheel aeration between 01:00 and 06:00.',
        'Inspect feed trays at 13:00 to verify full consumption before afternoon feeding.',
        'Perform 10% bottom-water exchange if TAN exceeds 0.25 mg/L.',
      ],
    };
  };

  const handleResolveAlert = async (alertId: string, notes: string) => {
    if (!currentFarm) return;
    const updated = await api.resolveAlert(currentFarm.id, alertId, notes);
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
  };

  const handleAskAi = async (prompt: string): Promise<string> => {
    if (!currentFarm) throw new Error('No farm selected');
    const res = await api.askAi(currentFarm.id, prompt);
    return res.answer;
  };

  const handleRunDiagnostics = async () => {
    setDiagnosticsRunning(true);
    try {
      const res = await api.runSystemTests();
      setDiagnosticsResult(res);
      return res;
    } finally {
      setDiagnosticsRunning(false);
    }
  };

  // Quick Water Test submit
  const handleQuickWaterTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTestPondId) {
      toast.error('Please select a pond');
      return;
    }
    try {
      await handleAddWaterTest({
        pondId: quickTestPondId,
        batchId: activeBatch?.id,
        testedAt: new Date().toISOString(),
        temperature: quickTestTemp ? Number(quickTestTemp) : null,
        dissolvedOxygen: quickTestDo ? Number(quickTestDo) : null,
        ph: quickTestPh ? Number(quickTestPh) : null,
        totalAmmonia: quickTestAmmonia ? Number(quickTestAmmonia) : null,
        nitrite: quickTestNitrite ? Number(quickTestNitrite) : null,
        sourceType: 'manual_digital_meter',
        testedBy: currentFarm?.responsibleOperator || 'Field Operator',
        notes: quickTestNotes,
      });
      setIsQuickWaterTestOpen(false);
      toast.success('Water test logged', 'Parameters recorded and evaluated against biological thresholds.');
    } catch (err: any) {
      toast.error('Failed to log water test', err.message);
    }
  };

  // Quick Feed submit
  const handleQuickFeedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFeedPondId) {
      toast.error('Please select a pond');
      return;
    }
    try {
      await handleAddFeedLog({
        pondId: quickFeedPondId,
        batchId: activeBatch?.id,
        fedAt: new Date().toISOString(),
        feedType: quickFeedType,
        quantityKg: Number(quickFeedKg),
        feedingTrayCheck: quickFeedTray,
        costPerKg: Number(quickFeedCost),
        operatorName: currentFarm?.responsibleOperator || 'Field Operator',
        notes: 'Quick logged via tactile launcher',
      });
      setIsQuickFeedOpen(false);
      toast.success('Feeding recorded', `${quickFeedKg} kg logged for pond.`);
    } catch (err: any) {
      toast.error('Failed to record feeding', err.message);
    }
  };

  const openAlertsCount = alerts.filter((a) => a.status === 'open').length;

  return (
    <div className="min-h-screen bg-[#fbfbfa] text-[#181a1b] font-sans flex flex-col selection:bg-[#cde5d7] selection:text-[#194432]">
      {/* Application Shell Header */}
      <Header
        farms={farms}
        currentFarm={currentFarm}
        onSelectFarm={setCurrentFarm}
        onOpenCreateFarm={() => setIsCreateFarmOpen(true)}
        onOpenDiagnostics={() => {
          setIsDiagnosticsOpen(true);
          handleRunDiagnostics();
        }}
        onSeedDemo={() => handleSeedDemo(true)}
        openAlertsCount={openAlertsCount}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      {/* Main Workspace View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
        {loadingFarms || (!currentFarm && farmDataLoading) ? (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#194432]" />
            <div className="text-sm font-semibold text-[#181a1b] tracking-tight">
              Loading Aquaculture Operating Environment...
            </div>
            <div className="text-xs text-[#707276] font-mono">
              Connecting to PostgreSQL schema & telemetry pipeline
            </div>
          </div>
        ) : !currentFarm ? (
          <div className="py-16 max-w-md mx-auto text-center space-y-4">
            <div className="w-12 h-12 rounded-[8px] bg-[#edf5f0] text-[#194432] flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#181a1b] tracking-tight">No Active Farm Configured</h2>
            <p className="text-xs text-[#67696d] leading-relaxed">
              Load the pre-configured Bicol Station demonstration farm or register your own commercial ulang site.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="primary" size="sm" onClick={() => handleSeedDemo(true)} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Load Bicol Demo Farm
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsCreateFarmOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Create New Site
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {activeTab === 'dashboard' && (
              <DashboardView
                farm={currentFarm}
                ponds={ponds}
                activeBatch={activeBatch}
                sensorReadings={sensorReadings}
                latestWaterTest={waterTests[0] || null}
                alerts={alerts}
                bioMetrics={bioMetrics}
                finMetrics={finMetrics}
                onNavigateTab={setActiveTab}
                onOpenQuickWaterTest={() => setIsQuickWaterTestOpen(true)}
                onOpenQuickFeed={() => setIsQuickFeedOpen(true)}
                onOpenResolveAlert={(alt) => setAlertToResolve(alt)}
              />
            )}

            {activeTab === 'map' && (
              <SatelliteMapView
                farm={currentFarm}
                ponds={ponds}
                sensorReadings={sensorReadings}
                onNavigateTab={setActiveTab}
                onSelectCctv={(cam) => {
                  setSelectedCctvCamId(cam.id);
                  setActiveTab('cctv');
                }}
              />
            )}

            {activeTab === 'cctv' && (
              <CctvMonitorView
                farm={currentFarm}
                selectedCamId={selectedCctvCamId}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'weather' && (
              <WeatherForecastView
                farm={currentFarm}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'water' && (
              <WaterQualityView
                farm={currentFarm}
                ponds={ponds}
                batches={batches}
                waterTests={waterTests}
                sensorReadings={sensorReadings}
                onAddWaterTest={handleAddWaterTest}
              />
            )}

            {activeTab === 'production' && (
              <PondsBatchesView
                farm={currentFarm}
                ponds={ponds}
                batches={batches}
                onAddPond={handleAddPond}
                onAddBatch={handleAddBatch}
                onCloseBatch={handleCloseBatch}
              />
            )}

            {activeTab === 'operations' && (
              <DailyOperationsView
                farm={currentFarm}
                ponds={ponds}
                batches={batches}
                feedLogs={feedLogs}
                stockEvents={stockEvents}
                growthSamples={growthSamples}
                onAddFeedLog={handleAddFeedLog}
                onAddStockEvent={handleAddStockEvent}
                onAddGrowthSample={handleAddGrowthSample}
              />
            )}

            {activeTab === 'finance' && (
              <FarmFinanceView
                farm={currentFarm}
                ponds={ponds}
                batches={batches}
                expenses={expenses}
                harvests={harvests}
                sales={sales}
                finMetrics={finMetrics}
                onAddExpense={handleAddExpense}
                onAddHarvest={handleAddHarvest}
                onAddSale={handleAddSale}
              />
            )}

            {activeTab === 'iot' && (
              <Esp32IotHubView
                farm={currentFarm}
                ponds={ponds}
                devices={devices}
                onRegisterDevice={handleRegisterDevice}
                onSimulateReading={handleSimulateReading}
              />
            )}

            {activeTab === 'intelligence' && (
              <AiIntelligenceView
                farm={currentFarm}
                alerts={alerts}
                rules={operatingRules}
                onGenerateDailyReport={handleGenerateDailyReport}
                onResolveAlert={handleResolveAlert}
                onAskAi={handleAskAi}
                onRunDiagnostics={handleRunDiagnostics}
              />
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Dock */}
      <MobileDock
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenQuickWaterTest={() => setIsQuickWaterTestOpen(true)}
        onOpenQuickFeed={() => setIsQuickFeedOpen(true)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenDiagnostics={() => {
          setIsDiagnosticsOpen(true);
          handleRunDiagnostics();
        }}
        openAlertsCount={openAlertsCount}
      />

      {/* Command Palette (Cmd + K) */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigateTab={setActiveTab}
        onOpenQuickWaterTest={() => setIsQuickWaterTestOpen(true)}
        onOpenQuickFeed={() => setIsQuickFeedOpen(true)}
        onOpenCreateFarm={() => setIsCreateFarmOpen(true)}
        onOpenDiagnostics={() => {
          setIsDiagnosticsOpen(true);
          handleRunDiagnostics();
        }}
      />

      {/* Modal: Create Farm */}
      <Dialog
        open={isCreateFarmOpen}
        onClose={() => setIsCreateFarmOpen(false)}
        title="Register Production Site"
        description="Provision a commercial or nursery aquaculture station with separate ponds and ledger."
        icon={<Plus className="w-5 h-5 text-[#194432]" />}
      >
        <form onSubmit={handleCreateFarm} className="space-y-4">
          <Field label="Farm Name" required>
            <Input
              placeholder="e.g. Bicol Ulang Tech-Demo Station"
              value={newFarmName}
              onChange={(e) => setNewFarmName(e.target.value)}
              required
            />
          </Field>

          <Field label="Physical Geographic Location" required>
            <Input
              placeholder="e.g. Pili, Camarines Sur, Bicol"
              value={newFarmLocation}
              onChange={(e) => setNewFarmLocation(e.target.value)}
              required
            />
          </Field>

          <Field label="Designated Lead Operator" required>
            <Input
              placeholder="e.g. Liezl Maigue"
              value={newFarmOperator}
              onChange={(e) => setNewFarmOperator(e.target.value)}
              required
            />
          </Field>

          <div className="pt-3 border-t border-[#f0f0ea] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateFarmOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Initialize Site
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Quick Water Test */}
      <Dialog
        open={isQuickWaterTestOpen}
        onClose={() => setIsQuickWaterTestOpen(false)}
        title="Quick Log Water Quality Test"
        description="Instant field sampling record for DO, temperature, and pH calibration."
        icon={<Droplets className="w-5 h-5 text-[#0284c7]" />}
      >
        <form onSubmit={handleQuickWaterTestSubmit} className="space-y-4">
          <Field label="Culture Pond / Unit" required>
            <Select
              value={quickTestPondId}
              onChange={(e) => setQuickTestPondId(e.target.value)}
              required
            >
              {ponds.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.identifier})
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Dissolved O₂" description=">5.0 safe">
              <Input
                type="number"
                step="0.1"
                suffixNode="mg/L"
                value={quickTestDo}
                onChange={(e) => setQuickTestDo(e.target.value)}
              />
            </Field>

            <Field label="Temperature" description="28–31.5°C optimal">
              <Input
                type="number"
                step="0.1"
                suffixNode="°C"
                value={quickTestTemp}
                onChange={(e) => setQuickTestTemp(e.target.value)}
              />
            </Field>

            <Field label="Water pH" description="7.2–8.4 safe">
              <Input
                type="number"
                step="0.05"
                suffixNode="pH"
                value={quickTestPh}
                onChange={(e) => setQuickTestPh(e.target.value)}
              />
            </Field>

            <Field label="Total Ammonia (TAN)" description="<0.30 safe">
              <Input
                type="number"
                step="0.01"
                suffixNode="mg/L"
                value={quickTestAmmonia}
                onChange={(e) => setQuickTestAmmonia(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Field Notes">
            <Input
              value={quickTestNotes}
              onChange={(e) => setQuickTestNotes(e.target.value)}
              placeholder="e.g. Surface calm, sunlight bright, aerators off..."
            />
          </Field>

          <div className="pt-3 border-t border-[#f0f0ea] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsQuickWaterTestOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Log Record
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Quick Feed */}
      <Dialog
        open={isQuickFeedOpen}
        onClose={() => setIsQuickFeedOpen(false)}
        title="Quick Record Feeding"
        description="Disburse morning or afternoon feed rations and update live FCR tracking."
        icon={<Utensils className="w-5 h-5 text-[#194432]" />}
      >
        <form onSubmit={handleQuickFeedSubmit} className="space-y-4">
          <Field label="Target Culture Pond" required>
            <Select
              value={quickFeedPondId}
              onChange={(e) => setQuickFeedPondId(e.target.value)}
              required
            >
              {ponds.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Feed Disbursed" required>
              <Input
                type="number"
                step="0.1"
                suffixNode="kg"
                value={quickFeedKg}
                onChange={(e) => setQuickFeedKg(e.target.value)}
                required
              />
            </Field>

            <Field label="Feed Cost / kg">
              <Input
                type="number"
                prefixNode="₱"
                value={quickFeedCost}
                onChange={(e) => setQuickFeedCost(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Feed Specification">
            <Input
              value={quickFeedType}
              onChange={(e) => setQuickFeedType(e.target.value)}
            />
          </Field>

          <Field label="Feed Tray Status">
            <Select
              value={quickFeedTray}
              onChange={(e) => setQuickFeedTray(e.target.value as any)}
            >
              <option value="consumed_100">100% Consumed (Excellent appetite)</option>
              <option value="consumed_80_90">80–90% Consumed (Normal appetite)</option>
              <option value="consumed_50_70">50–70% Consumed (Reduce ration)</option>
              <option value="unconsumed_heavy">Heavy Leftover (Inspect DO/temp immediately)</option>
            </Select>
          </Field>

          <div className="pt-3 border-t border-[#f0f0ea] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsQuickFeedOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Log Feeding
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Resolve Alert */}
      <Dialog
        open={!!alertToResolve}
        onClose={() => setAlertToResolve(null)}
        title="Resolve Biological Alert"
        description="Verify pond conditions and record operator actions taken."
        icon={<AlertTriangle className="w-5 h-5 text-[#b45309]" />}
      >
        <div className="space-y-4">
          <div className="p-3 bg-[#fdfaf3] border border-[#fae2b8] rounded-[6px] text-xs">
            <div className="font-semibold text-[#78350f]">{alertToResolve?.title}</div>
            <div className="text-[#92400e] mt-0.5">{alertToResolve?.description}</div>
          </div>

          <Field label="Corrective Action Taken" required>
            <Textarea
              placeholder="e.g. Switched on emergency paddlewheel, drained 10cm bottom water, re-tested DO at 5.5 mg/L..."
              value={alertResolutionNotes}
              onChange={(e) => setAlertResolutionNotes(e.target.value)}
              required
            />
          </Field>

          <div className="pt-3 border-t border-[#f0f0ea] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAlertToResolve(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={async () => {
                if (!alertToResolve) return;
                await handleResolveAlert(alertToResolve.id, alertResolutionNotes);
                setAlertToResolve(null);
                setAlertResolutionNotes('');
                toast.success('Alert marked resolved');
              }}
            >
              Verify & Archive
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal: 16-Point Diagnostics */}
      <Dialog
        open={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        title="16-Point System Verification Suite"
        description="Automated tests verifying mathematical models, biological rules, database integrity, and sensor auth."
        maxWidth="lg"
        icon={<FileCheck className="w-5 h-5 text-[#194432]" />}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-[#fafaf7] rounded-[8px] border border-[#e4e4dd]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#181a1b]">Automated Test Runner</span>
              {diagnosticsResult && (
                <Badge
                  variant={diagnosticsResult.failed === 0 ? 'success' : 'danger'}
                  size="sm"
                >
                  {diagnosticsResult.passed}/{diagnosticsResult.total} Passed
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="xs"
              onClick={handleRunDiagnostics}
              loading={diagnosticsRunning}
              leftIcon={<RefreshCw className="w-3 h-3" />}
            >
              Re-run Suite
            </Button>
          </div>

          <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-[#f5f5f0]">
            {diagnosticsResult?.results.map((item, idx) => (
              <div
                key={idx}
                className="pt-2 pb-1.5 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  {item.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#1b7a4b] shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#b91c1c] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-medium text-[#181a1b] font-mono text-[11px]">{item.name}</div>
                    <div className="text-[11px] text-[#67696d] mt-0.5 leading-normal">{item.message}</div>
                  </div>
                </div>
                <Badge variant={item.passed ? 'success' : 'danger'} size="sm">
                  {item.passed ? 'PASS' : 'FAIL'}
                </Badge>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#f0f0ea] flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsDiagnosticsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AquaOsApp />
      </AuthProvider>
    </ToastProvider>
  );
}
