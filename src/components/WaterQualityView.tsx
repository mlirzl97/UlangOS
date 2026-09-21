import React, { useState } from 'react';
import {
  Droplets,
  Thermometer,
  Wind,
  Plus,
  Filter,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Cpu,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Farm, Pond, Batch, WaterTest, SensorReading } from '../types.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card.tsx';
import { Dialog } from './ui/Dialog.tsx';
import { Field, Input, Select, Textarea } from './ui/Field.tsx';
import { EmptyState } from './ui/EmptyState.tsx';
import { useToast } from './ui/Toast.tsx';

interface WaterQualityViewProps {
  farm: Farm;
  ponds: Pond[];
  batches: Batch[];
  waterTests: WaterTest[];
  sensorReadings: SensorReading[];
  onAddWaterTest: (data: any) => Promise<void>;
}

export const WaterQualityView: React.FC<WaterQualityViewProps> = ({
  farm,
  ponds,
  batches,
  waterTests,
  sensorReadings,
  onAddWaterTest,
}) => {
  const toast = useToast();
  const [selectedPondId, setSelectedPondId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Water Test Form State
  const [formData, setFormData] = useState({
    pondId: ponds[0]?.id || '',
    batchId: batches.find((b) => b.status === 'active')?.id || '',
    testedAt: new Date().toISOString().slice(0, 16),
    temperature: '',
    dissolvedOxygen: '',
    ph: '',
    totalAmmonia: '',
    nitrite: '',
    alkalinity: '',
    salinity: '',
    transparency: '',
    sourceType: 'manual_digital_meter',
    testedBy: farm.responsibleOperator || '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pondId) {
      toast.error('Pond selection required', 'Please choose an active culture pond or tank.');
      return;
    }
    setSubmitting(true);
    try {
      await onAddWaterTest(formData);
      setIsFormOpen(false);
      toast.success('Water test recorded', 'Physicochemical parameters logged and evaluated against rules.');
      setFormData((prev) => ({
        ...prev,
        temperature: '',
        dissolvedOxygen: '',
        ph: '',
        totalAmmonia: '',
        nitrite: '',
        alkalinity: '',
        salinity: '',
        transparency: '',
        notes: '',
      }));
    } catch (err: any) {
      toast.error('Failed to log water test', err.message || 'Check connection or values.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTests = waterTests.filter((t) => {
    const matchesPond = selectedPondId === 'all' || t.pondId === selectedPondId;
    const matchesSearch =
      searchQuery.trim() === '' ||
      (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.testedBy && t.testedBy.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesPond && matchesSearch;
  });

  // Trend chart data combining recent manual tests
  const trendData = [...filteredTests]
    .reverse()
    .slice(-15)
    .map((t) => ({
      date:
        new Date(t.testedAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' }) +
        ' ' +
        new Date(t.testedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      do: t.dissolvedOxygen ? Number(t.dissolvedOxygen) : null,
      ph: t.ph ? Number(t.ph) : null,
      temp: t.temperature ? Number(t.temperature) : null,
      ammonia: t.totalAmmonia ? Number(t.totalAmmonia) : null,
    }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e2dc]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#181a1b] flex items-center gap-2">
            <span>Water Quality & Telemetry</span>
          </h1>
          <p className="text-xs text-[#67696d] mt-1 leading-normal">
            Continuous physicochemical monitoring for tropical freshwater prawn (<span className="italic">Macrobrachium rosenbergii</span>).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            id="btn-open-water-test-form"
            variant="primary"
            size="sm"
            onClick={() => setIsFormOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Log Water Test
          </Button>
        </div>
      </div>

      {/* Reference Matrix: BFAR Standards for Ulang */}
      <Card subtle>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#181a1b] font-mono">
              BFAR / FAO Ulang Water Standards Matrix
            </span>
            <span className="text-[11px] text-[#707276] font-mono">Macrobrachium rosenbergii</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded-[6px] border border-[#e2e2dc]">
              <div className="text-[11px] text-[#707276]">Dissolved O₂</div>
              <div className="text-sm font-semibold font-mono tnum text-[#181a1b] mt-0.5">&gt; 5.0 mg/L</div>
              <div className="text-[10px] text-[#b91c1c] font-medium mt-0.5">&lt; 4.0 Danger</div>
            </div>
            <div className="bg-white p-2.5 rounded-[6px] border border-[#e2e2dc]">
              <div className="text-[11px] text-[#707276]">Temperature</div>
              <div className="text-sm font-semibold font-mono tnum text-[#181a1b] mt-0.5">28.0–31.5 °C</div>
              <div className="text-[10px] text-[#b45309] font-medium mt-0.5">&lt; 26 / &gt; 33 Alert</div>
            </div>
            <div className="bg-white p-2.5 rounded-[6px] border border-[#e2e2dc]">
              <div className="text-[11px] text-[#707276]">Water pH</div>
              <div className="text-sm font-semibold font-mono tnum text-[#181a1b] mt-0.5">7.2–8.4 pH</div>
              <div className="text-[10px] text-[#b45309] font-medium mt-0.5">Molting buffer</div>
            </div>
            <div className="bg-white p-2.5 rounded-[6px] border border-[#e2e2dc]">
              <div className="text-[11px] text-[#707276]">Total Ammonia (TAN)</div>
              <div className="text-sm font-semibold font-mono tnum text-[#181a1b] mt-0.5">&lt; 0.30 mg/L</div>
              <div className="text-[10px] text-[#b91c1c] font-medium mt-0.5">&gt; 0.50 Toxic</div>
            </div>
            <div className="bg-white p-2.5 rounded-[6px] border border-[#e2e2dc]">
              <div className="text-[11px] text-[#707276]">Nitrite (NO₂⁻)</div>
              <div className="text-sm font-semibold font-mono tnum text-[#181a1b] mt-0.5">&lt; 0.05 mg/L</div>
              <div className="text-[10px] text-[#b91c1c] font-medium mt-0.5">&gt; 0.10 Anoxia</div>
            </div>
            <div className="bg-white p-2.5 rounded-[6px] border border-[#e2e2dc]">
              <div className="text-[11px] text-[#707276]">Alkalinity (CaCO₃)</div>
              <div className="text-sm font-semibold font-mono tnum text-[#181a1b] mt-0.5">80–150 mg/L</div>
              <div className="text-[10px] text-[#1b7a4b] font-medium mt-0.5">Exoskeleton safe</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parameter Multi-Trend Chart */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Water Quality Parameter Trends</CardTitle>
              <CardDescription>
                Chronological progression of DO, pH, Temperature and TAN across recent test samples.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e8e8e2" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#787a7e' }}
                    stroke="#dcdcd6"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#787a7e' }}
                    stroke="#dcdcd6"
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#dcdcd6',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="do"
                    name="DO (mg/L)"
                    stroke="#0284c7"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ph"
                    name="pH"
                    stroke="#1b7a4b"
                    strokeWidth={1.75}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="temp"
                    name="Temp (°C)"
                    stroke="#b45309"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ammonia"
                    name="Ammonia TAN (mg/L)"
                    stroke="#b91c1c"
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & Test Records Table */}
      <Card>
        <CardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Historical Water Test Logs</CardTitle>
            <CardDescription>{filteredTests.length} record{filteredTests.length !== 1 ? 's' : ''} logged</CardDescription>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-[#888b90] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search notes / tester..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-2.5 text-xs text-[#181a1b] placeholder:text-[#9fa1a6] bg-[#f8f8f6] border border-[#dcdcd6] rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#194432]"
              />
            </div>

            {/* Pond Filter */}
            <select
              value={selectedPondId}
              onChange={(e) => setSelectedPondId(e.target.value)}
              className="h-8 px-2.5 text-xs font-medium text-[#181a1b] bg-[#f8f8f6] border border-[#dcdcd6] rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#194432] cursor-pointer"
            >
              <option value="all">All Ponds</option>
              {ponds.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredTests.length === 0 ? (
            <EmptyState
              title="No water tests match"
              description="No manual tests or lab logs found for this filter. Log a new water test to record parameters."
              icon={<Droplets className="w-5 h-5 text-[#0284c7]" />}
              actionLabel="Log Water Test"
              onAction={() => setIsFormOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e2e2dc] bg-[#fafaf7] text-[#67696d] font-mono text-[11px]">
                    <th className="py-2.5 px-4 font-medium">Timestamp</th>
                    <th className="py-2.5 px-3 font-medium">Pond</th>
                    <th className="py-2.5 px-3 font-medium text-right">DO (mg/L)</th>
                    <th className="py-2.5 px-3 font-medium text-right">pH</th>
                    <th className="py-2.5 px-3 font-medium text-right">Temp (°C)</th>
                    <th className="py-2.5 px-3 font-medium text-right">Ammonia</th>
                    <th className="py-2.5 px-3 font-medium text-right">Nitrite</th>
                    <th className="py-2.5 px-3 font-medium">Source</th>
                    <th className="py-2.5 px-4 font-medium">Operator & Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0ea]">
                  {filteredTests.map((test) => {
                    const pond = ponds.find((p) => p.id === test.pondId);
                    const isDoLow = test.dissolvedOxygen && Number(test.dissolvedOxygen) < 4.0;
                    const isAmmoniaHigh = test.totalAmmonia && Number(test.totalAmmonia) > 0.3;

                    return (
                      <tr key={test.id} className="hover:bg-[#fafaf8] transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#4a4c50] whitespace-nowrap">
                          {new Date(test.testedAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[#181a1b] whitespace-nowrap">
                          {pond ? pond.name : 'Unknown Pond'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold tnum">
                          <span
                            className={
                              isDoLow
                                ? 'text-[#b91c1c] bg-[#fef2f2] px-1.5 py-0.5 rounded border border-[#fecaca]'
                                : 'text-[#181a1b]'
                            }
                          >
                            {test.dissolvedOxygen ? Number(test.dissolvedOxygen).toFixed(1) : '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tnum text-[#181a1b]">
                          {test.ph ? Number(test.ph).toFixed(2) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tnum text-[#181a1b]">
                          {test.temperature ? Number(test.temperature).toFixed(1) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tnum">
                          <span
                            className={
                              isAmmoniaHigh
                                ? 'text-[#b91c1c] bg-[#fef2f2] px-1.5 py-0.5 rounded border border-[#fecaca]'
                                : 'text-[#181a1b]'
                            }
                          >
                            {test.totalAmmonia ? Number(test.totalAmmonia).toFixed(2) : '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tnum text-[#181a1b]">
                          {test.nitrite ? Number(test.nitrite).toFixed(2) : '—'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <Badge variant="neutral" size="sm">
                            {test.sourceType.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-[#67696d]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-[#2d3034]">{test.testedBy}</span>
                            {test.notes && <span className="truncate max-w-[180px]">({test.notes})</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Water Test Dialog Modal */}
      <Dialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Log Water Quality Test"
        description="Record field meter readings or test-kit values to calibrate operating algorithms."
        maxWidth="lg"
        icon={<Droplets className="w-5 h-5 text-[#0284c7]" />}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Pond / Tank Unit" required>
              <Select
                value={formData.pondId}
                onChange={(e) => setFormData({ ...formData, pondId: e.target.value })}
                required
              >
                {ponds.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.identifier})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Sampling Date & Time" required>
              <Input
                type="datetime-local"
                value={formData.testedAt}
                onChange={(e) => setFormData({ ...formData, testedAt: e.target.value })}
                required
              />
            </Field>

            <Field label="Dissolved Oxygen (DO)" description="Optimal: > 5.0 mg/L">
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 5.8"
                suffixNode="mg/L"
                value={formData.dissolvedOxygen}
                onChange={(e) => setFormData({ ...formData, dissolvedOxygen: e.target.value })}
              />
            </Field>

            <Field label="Water Temperature" description="Optimal: 28.0–31.5 °C">
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 29.4"
                suffixNode="°C"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
              />
            </Field>

            <Field label="Water pH" description="Optimal: 7.2–8.4">
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 7.65"
                suffixNode="pH"
                value={formData.ph}
                onChange={(e) => setFormData({ ...formData, ph: e.target.value })}
              />
            </Field>

            <Field label="Total Ammonia Nitrogen (TAN)" description="Max safe: < 0.30 mg/L">
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 0.15"
                suffixNode="mg/L"
                value={formData.totalAmmonia}
                onChange={(e) => setFormData({ ...formData, totalAmmonia: e.target.value })}
              />
            </Field>

            <Field label="Nitrite (NO₂⁻)" description="Max safe: < 0.05 mg/L">
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 0.02"
                suffixNode="mg/L"
                value={formData.nitrite}
                onChange={(e) => setFormData({ ...formData, nitrite: e.target.value })}
              />
            </Field>

            <Field label="Measurement Source">
              <Select
                value={formData.sourceType}
                onChange={(e) => setFormData({ ...formData, sourceType: e.target.value as any })}
              >
                <option value="manual_digital_meter">Digital Optical DO / pH Meter</option>
                <option value="chemical_test_kit">Chemical Titration / Colorimeter Kit</option>
                <option value="lab_result">BFAR Lab Spectrophotometer</option>
                <option value="iot_sensor">Calibrated IoT Probe</option>
              </Select>
            </Field>
          </div>

          <Field label="Tested By Operator" required>
            <Input
              type="text"
              placeholder="Operator name"
              value={formData.testedBy}
              onChange={(e) => setFormData({ ...formData, testedBy: e.target.value })}
              required
            />
          </Field>

          <Field label="Field Notes / Water Color / Weather Context">
            <Textarea
              placeholder="e.g. Slight tea color, Secchi depth 35cm, morning sun, surface aeration active..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Field>

          <div className="pt-3 border-t border-[#f0f0ea] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={submitting}>
              Save Water Test
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
