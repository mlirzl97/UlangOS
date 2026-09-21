import React from 'react';
import {
  Thermometer,
  Droplets,
  Wind,
  Layers,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  PlusCircle,
  FileText,
  Cpu,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  Compass,
  Camera,
  CloudSun,
  MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Farm, Pond, Batch, SensorReading, WaterTest, FarmAlert } from '../types.ts';
import { BiologicalMetrics, FinancialMetrics } from '../lib/aquaculture-math.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';
import { Stat } from './ui/Stat.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card.tsx';

interface DashboardViewProps {
  farm: Farm;
  ponds: Pond[];
  activeBatch: Batch | null;
  sensorReadings: SensorReading[];
  latestWaterTest: WaterTest | null;
  alerts: FarmAlert[];
  bioMetrics: BiologicalMetrics;
  finMetrics: FinancialMetrics;
  onNavigateTab: (tab: string) => void;
  onOpenQuickWaterTest: () => void;
  onOpenQuickFeed: () => void;
  onOpenResolveAlert: (alert: FarmAlert) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  farm,
  ponds,
  activeBatch,
  sensorReadings,
  latestWaterTest,
  alerts,
  bioMetrics,
  finMetrics,
  onNavigateTab,
  onOpenQuickWaterTest,
  onOpenQuickFeed,
  onOpenResolveAlert,
}) => {
  // Days of Culture (DOC)
  const doc = activeBatch?.stockingDate
    ? Math.max(0, Math.floor((Date.now() - new Date(activeBatch.stockingDate).getTime()) / (24 * 3600 * 1000)))
    : 0;

  // Latest water telemetry
  const latestSensor = sensorReadings[sensorReadings.length - 1];
  const currentTemp = latestSensor
    ? Number(latestSensor.value)
    : latestWaterTest?.temperature
    ? Number(latestWaterTest.temperature)
    : null;
  const currentDo = latestWaterTest?.dissolvedOxygen ? Number(latestWaterTest.dissolvedOxygen) : null;
  const currentPh = latestWaterTest?.ph ? Number(latestWaterTest.ph) : null;

  // 24-hour temperature trend
  const tempChartData = sensorReadings.slice(-24).map((r) => ({
    time: new Date(r.measuredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    temperature: Number(r.value),
  }));

  const openAlerts = alerts.filter((a) => a.status === 'open');

  return (
    <div className="space-y-6">
      {/* Top Editorial Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e2dc]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#181a1b]">{farm.name}</h1>
            {farm.isDemo && (
              <Badge variant="warning" size="sm">
                Demo Mode
              </Badge>
            )}
            <Badge variant="accent" size="sm" dot>
              Active Grow-Out
            </Badge>
          </div>
          <p className="text-xs text-[#67696d] mt-1 leading-normal">
            {farm.location} • Operator: <span className="text-[#2d3034] font-medium">{farm.responsibleOperator}</span> • Species:{' '}
            <span className="text-[#2d3034] font-medium italic">Macrobrachium rosenbergii</span> (Ulang)
          </p>
        </div>

        {/* Tactical Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            id="btn-quick-water-test"
            variant="outline"
            size="sm"
            onClick={onOpenQuickWaterTest}
            leftIcon={<Droplets className="w-3.5 h-3.5 text-[#0284c7]" />}
          >
            Log Water Test
          </Button>
          <Button
            id="btn-quick-feed"
            variant="primary"
            size="sm"
            onClick={onOpenQuickFeed}
            leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
          >
            Record Feeding
          </Button>
          <Button
            id="btn-quick-ai-report"
            variant="secondary"
            size="sm"
            onClick={() => onNavigateTab('intelligence')}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#194432]" />}
          >
            Daily Brief
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner (if any) */}
      {openAlerts.length > 0 && (
        <div className="bg-[#fef8ee] border border-[#fbdca7] rounded-[8px] p-3.5 sm:p-4 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#b45309] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-[#78350f]">
                  {openAlerts.length} Operational Risk Notice{openAlerts.length > 1 ? 's' : ''} Require Immediate Attention
                </h3>
                <div className="mt-2 space-y-1.5">
                  {openAlerts.slice(0, 3).map((alt) => (
                    <div
                      key={alt.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-white/90 p-2.5 rounded-[6px] border border-[#fae2b8] gap-2"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={alt.severity === 'critical' ? 'danger' : 'warning'} size="sm">
                          {alt.severity}
                        </Badge>
                        <span className="font-semibold text-[#181a1b]">{alt.title}:</span>
                        <span className="text-[#55585d]">{alt.description}</span>
                      </div>
                      <button
                        id={`btn-resolve-alert-${alt.id}`}
                        onClick={() => onOpenResolveAlert(alt)}
                        className="text-xs font-medium text-[#194432] hover:underline shrink-0 text-left cursor-pointer"
                      >
                        Verify & Resolve →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('intelligence')}
              className="text-xs font-medium text-[#78350f] hover:underline flex items-center gap-0.5 shrink-0"
            >
              View all
            </button>
          </div>
        </div>
      )}

      {/* Key Water Parameters & Cycle Status (Row 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Stat
          label="Water Temperature"
          value={currentTemp !== null ? currentTemp.toFixed(1) : '—'}
          unit="°C"
          subtext="Target: 28.0–31.5°C"
          status={
            currentTemp && (currentTemp < 26 || currentTemp > 33)
              ? 'warning'
              : currentTemp
              ? 'optimal'
              : 'neutral'
          }
          icon={<Thermometer className="w-4 h-4 text-[#0284c7]" />}
          delta={{
            value: latestSensor ? 'ESP32 Live' : 'Manual meter',
            isGood: true,
          }}
          onClick={() => onNavigateTab('water')}
        />

        <Stat
          label="Dissolved Oxygen (DO)"
          value={currentDo !== null ? currentDo.toFixed(1) : '—'}
          unit="mg/L"
          subtext={currentDo && currentDo < 4.0 ? 'CRITICAL: Aerate!' : 'Safe limit: >5.0 mg/L'}
          status={currentDo && currentDo < 4.0 ? 'danger' : currentDo ? 'optimal' : 'neutral'}
          icon={<Wind className="w-4 h-4 text-[#0284c7]" />}
          delta={{
            value: latestWaterTest
              ? new Date(latestWaterTest.testedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'No test',
          }}
          onClick={() => onNavigateTab('water')}
        />

        <Stat
          label="Water pH"
          value={currentPh !== null ? currentPh.toFixed(2) : '—'}
          unit="pH"
          subtext="Optimal range: 7.2–8.4"
          status={
            currentPh && (currentPh < 6.8 || currentPh > 8.8)
              ? 'warning'
              : currentPh
              ? 'optimal'
              : 'neutral'
          }
          icon={<Droplets className="w-4 h-4 text-[#1b7a4b]" />}
          delta={{
            value: 'Standard scale',
          }}
          onClick={() => onNavigateTab('water')}
        />

        <Stat
          label="Culture Cycle"
          value={doc}
          unit="DOC"
          subtext={`${activeBatch?.batchIdentifier || 'No Batch'} • ${bioMetrics.survivalRatePercent != null ? bioMetrics.survivalRatePercent.toFixed(1) + '%' : '—'} est. survival`}
          status="optimal"
          icon={<Clock className="w-4 h-4 text-[#7c3aed]" />}
          delta={{
            value: `${bioMetrics.estimatedRemainingStock.toLocaleString()} stock`,
            isGood: true,
          }}
          onClick={() => onNavigateTab('production')}
        />
      </div>

      {/* Secondary Metrics: Biomass, Feed FCR, Economics, IoT Nodes (Row 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Stat
          label="Estimated Biomass"
          value={bioMetrics.estimatedBiomassKg != null && bioMetrics.estimatedBiomassKg > 0 ? bioMetrics.estimatedBiomassKg.toFixed(1) : '—'}
          unit="kg"
          subtext={`ABW: ${bioMetrics.latestAbwGrams ? bioMetrics.latestAbwGrams.toFixed(1) + 'g' : 'Awaiting sample'}`}
          icon={<TrendingUp className="w-4 h-4 text-[#194432]" />}
          onClick={() => onNavigateTab('operations')}
        />

        <Stat
          label="Feed Conversion (FCR)"
          value={bioMetrics.fcr !== null ? bioMetrics.fcr.toFixed(2) : '—'}
          subtext={`${bioMetrics.totalFeedConsumedKg.toFixed(1)} kg consumed`}
          status={bioMetrics.fcr && bioMetrics.fcr > 2.2 ? 'warning' : 'optimal'}
          delta={{
            value: bioMetrics.fcr && bioMetrics.fcr <= 1.8 ? 'Excellent (<1.8)' : 'Target: 1.5–1.8',
            isGood: bioMetrics.fcr ? bioMetrics.fcr <= 1.8 : undefined,
          }}
          icon={<PlusCircle className="w-4 h-4 text-[#d97706]" />}
          onClick={() => onNavigateTab('operations')}
        />

        <Stat
          label="Operating Cash Profit"
          value={`₱${Math.abs(finMetrics.cashOperatingProfitPhp).toLocaleString()}`}
          subtext={`OPEX: ₱${finMetrics.totalOpexCashPhp.toLocaleString()} • Rev: ₱${finMetrics.totalRevenuePhp.toLocaleString()}`}
          status={finMetrics.cashOperatingProfitPhp >= 0 ? 'optimal' : 'neutral'}
          delta={{
            value: finMetrics.cashOperatingProfitPhp >= 0 ? '+ In Profit' : 'Grow-out phase',
            trend: finMetrics.cashOperatingProfitPhp >= 0 ? 'up' : 'neutral',
            isGood: finMetrics.cashOperatingProfitPhp >= 0,
          }}
          icon={<DollarSign className="w-4 h-4 text-[#1b7a4b]" />}
          onClick={() => onNavigateTab('finance')}
        />

        <Stat
          label="Telemetry Hardware"
          value={sensorReadings.length > 0 ? 'Online' : 'Idle'}
          subtext={`${ponds.length} pond${ponds.length !== 1 ? 's' : ''} mapped • Dallas DS18B20`}
          status={sensorReadings.length > 0 ? 'optimal' : 'neutral'}
          delta={{
            value: `${sensorReadings.length} packet${sensorReadings.length !== 1 ? 's' : ''}`,
            isGood: true,
          }}
          icon={<Cpu className="w-4 h-4 text-[#7c3aed]" />}
          onClick={() => onNavigateTab('iot')}
        />
      </div>

      {/* Main Grid: Telemetry Trend & Active Ponds Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: 24h Telemetry Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Water Temperature Telemetry</CardTitle>
              <CardDescription>
                Live readings from ESP32 nodes and manual tests with BFAR/FAO threshold safe zone (28.0–31.5°C).
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onNavigateTab('water')}
              rightIcon={<ArrowUpRight className="w-3 h-3" />}
            >
              Full telemetry
            </Button>
          </CardHeader>
          <CardContent>
            {tempChartData.length > 0 ? (
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tempChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#e8e8e2" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11, fill: '#787a7e' }}
                      stroke="#dcdcd6"
                      tickLine={false}
                    />
                    <YAxis
                      domain={[24, 35]}
                      tick={{ fontSize: 11, fill: '#787a7e' }}
                      stroke="#dcdcd6"
                      tickLine={false}
                      unit="°C"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#dcdcd6',
                        borderRadius: '6px',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)',
                      }}
                      formatter={(val: any) => [`${Number(val).toFixed(1)} °C`, 'Temperature']}
                    />
                    <ReferenceLine
                      y={28.0}
                      stroke="#1b7a4b"
                      strokeDasharray="3 3"
                      label={{ value: 'Min Optimal 28°C', fill: '#1b7a4b', fontSize: 10, position: 'insideBottomRight' }}
                    />
                    <ReferenceLine
                      y={31.5}
                      stroke="#b45309"
                      strokeDasharray="3 3"
                      label={{ value: 'Max Optimal 31.5°C', fill: '#b45309', fontSize: 10, position: 'insideTopRight' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      stroke="#194432"
                      strokeWidth={2}
                      dot={{ r: 2, fill: '#194432' }}
                      activeDot={{ r: 4, stroke: '#194432', strokeWidth: 1, fill: '#ffffff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#787a7e]">
                <Droplets className="w-8 h-8 text-[#a0a2a8] mb-2" />
                <p className="text-xs font-medium">No telemetry recorded yet</p>
                <p className="text-[11px] text-[#8c8f94] mt-0.5">
                  Use &ldquo;Log Water Test&rdquo; or ingest sensor packets from the ESP32 IoT Hub.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right 1 Col: Ponds & Tanks Snapshot */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Culture Ponds & Tanks</CardTitle>
              <CardDescription>{ponds.length} production unit{ponds.length !== 1 ? 's' : ''} registered</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onNavigateTab('production')}
              rightIcon={<ArrowUpRight className="w-3 h-3" />}
            >
              Manage
            </Button>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-[#f0f0ea]">
            {ponds.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#787a7e]">No ponds configured yet.</div>
            ) : (
              ponds.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onNavigateTab('production')}
                  className="p-3.5 px-4 hover:bg-[#fafaf8] cursor-pointer transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#181a1b] truncate">{p.name}</span>
                      <span className="text-[10px] font-mono text-[#787a7e]">({p.identifier})</span>
                    </div>
                    <div className="text-[11px] text-[#67696d] mt-0.5 flex items-center gap-1.5 font-mono">
                      <span>{p.areaSqM || 0} m²</span>
                      <span>•</span>
                      <span>{p.waterVolumeM3 || 0} m³</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={p.status === 'active' ? 'success' : 'neutral'} size="sm">
                      {p.status}
                    </Badge>
                    <ChevronRight className="w-3.5 h-3.5 text-[#a0a2a8]" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Spatial, Surveillance & Environmental Intelligence Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Google Satellite Imagery & Site GIS */}
        <Card className="flex flex-col justify-between hover:border-[#194432] transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#194432]" />
                <CardTitle className="text-sm font-bold">Satellite GIS Map</CardTitle>
              </div>
              <Badge variant="accent" size="sm">
                Google Maps
              </Badge>
            </div>
            <CardDescription className="text-xs">
              High-resolution satellite topography with spatial pins across {ponds.length} ponds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="p-3 bg-[#f7f7f4] border border-[#e2e2dc] rounded-[8px] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#707276] font-medium">Coordinates:</span>
                <span className="font-mono font-semibold text-[#181a1b]">13.5682°N, 123.2845°E</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#707276] font-medium">Mapped Layers:</span>
                <span className="font-medium text-[#194432]">Ponds, CCTVs, Aerators, IoT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#707276] font-medium">Imagery Mode:</span>
                <span className="font-mono text-[#181a1b]">Satellite & Hybrid</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => onNavigateTab('map')}
              rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
            >
              Explore Satellite Imagery
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Real-time CCTV Video Surveillance */}
        <Card className="flex flex-col justify-between hover:border-[#0284c7] transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#0284c7]" />
                <CardTitle className="text-sm font-bold">CCTV Surveillance</CardTitle>
              </div>
              <Badge variant="success" size="sm" dot>
                4 Feeds Live
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Grow-out ponds, nursery tanks, sluice gate, and solar warehouse perimeter.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="p-3 bg-[#f0f9ff] border border-[#bae6fd] rounded-[8px] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#0369a1] font-medium">Video Codec:</span>
                <span className="font-mono font-semibold text-[#0369a1]">1080p @ 30 FPS (H.265)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#0369a1] font-medium">Analytics:</span>
                <span className="font-medium text-[#0369a1]">Bio-Splash & Motion Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#0369a1] font-medium">Controls:</span>
                <span className="font-medium text-[#0369a1]">PTZ, Presets & Night-Vision</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs text-[#0284c7] border-[#bae6fd] hover:bg-[#e0f2fe]"
              onClick={() => onNavigateTab('cctv')}
              rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
            >
              Launch Multi-Camera Grid
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Weather Forecast & Natural Aeration */}
        <Card className="flex flex-col justify-between hover:border-[#d97706] transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-[#d97706]" />
                <CardTitle className="text-sm font-bold">Weather Microclimate</CardTitle>
              </div>
              <Badge variant="neutral" size="sm">
                Bicol Station
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Diurnal hourly forecast, natural wind aeration rating, and nighttime DO depletion risk.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="p-3 bg-[#fffbeb] border border-[#fef3c7] rounded-[8px] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#92400e] font-medium">Ambient / Water:</span>
                <span className="font-mono font-semibold text-[#92400e]">29.8°C • Humidity 78%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#92400e] font-medium">Surface Wind:</span>
                <span className="font-semibold text-[#92400e]">14 km/h (Optimal Aeration)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#92400e] font-medium">Nighttime DO Risk:</span>
                <span className="font-semibold text-emerald-800">Low (Paddlewheels: 01:00-06:00)</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs text-[#d97706] border-[#fde68a] hover:bg-[#fef3c7]"
              onClick={() => onNavigateTab('weather')}
              rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
            >
              View Detailed Forecast
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card subtle>
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1b7a4b]" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#181a1b] font-mono">
                Freshwater Prawn Standard Compliance
              </h4>
            </div>
            <p className="text-xs text-[#55585d] max-w-2xl leading-relaxed">
              HQ16 operating guidelines enforce BFAR Region V guidelines: DO &gt; 5.0 mg/L, temperature 28–31.5°C, pH 7.2–8.4, and total ammonia &lt; 0.3 mg/L. All test records and telemetry packets are continuously validated against these deterministic rules.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateTab('intelligence')}
            className="shrink-0"
          >
            Review Operating Rules →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
