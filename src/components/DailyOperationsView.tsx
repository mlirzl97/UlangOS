import React, { useState } from 'react';
import {
  Utensils,
  Activity,
  Scale,
  Plus,
  Calendar,
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Farm, Pond, Batch, FeedLog, StockEvent, GrowthSample } from '../types.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card.tsx';
import { Dialog } from './ui/Dialog.tsx';
import { Field, Input, Select, Textarea } from './ui/Field.tsx';
import { EmptyState } from './ui/EmptyState.tsx';
import { useToast } from './ui/Toast.tsx';

interface DailyOperationsViewProps {
  farm: Farm;
  ponds: Pond[];
  batches: Batch[];
  feedLogs: FeedLog[];
  stockEvents: StockEvent[];
  growthSamples: GrowthSample[];
  onAddFeedLog: (data: any) => Promise<void>;
  onAddStockEvent: (data: any) => Promise<void>;
  onAddGrowthSample: (data: any) => Promise<void>;
}

export const DailyOperationsView: React.FC<DailyOperationsViewProps> = ({
  farm,
  ponds,
  batches,
  feedLogs,
  stockEvents,
  growthSamples,
  onAddFeedLog,
  onAddStockEvent,
  onAddGrowthSample,
}) => {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'events' | 'growth'>('feed');

  // Modal States
  const [isFeedModalOpen, setIsFeedModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isGrowthModalOpen, setIsGrowthModalOpen] = useState(false);

  const [feedSubmitting, setFeedSubmitting] = useState(false);
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [growthSubmitting, setGrowthSubmitting] = useState(false);

  // Feed Form
  const [feedForm, setFeedForm] = useState({
    pondId: ponds[0]?.id || '',
    batchId: batches.find((b) => b.status === 'active')?.id || '',
    fedAt: new Date().toISOString().slice(0, 16),
    feedType: 'Grower Pellet 30% CP (AquaMaster)',
    quantityKg: '',
    feedingTrayCheck: 'consumed_100',
    costPerKg: '58.00',
    operatorName: farm.responsibleOperator || '',
    notes: '',
  });

  // Stock Event Form
  const [eventForm, setEventForm] = useState({
    pondId: ponds[0]?.id || '',
    batchId: batches.find((b) => b.status === 'active')?.id || '',
    eventType: 'mortality',
    eventDate: new Date().toISOString().slice(0, 16),
    quantity: '',
    operatorName: farm.responsibleOperator || '',
    notes: '',
  });

  // Growth Sample Form
  const [growthForm, setGrowthForm] = useState({
    pondId: ponds[0]?.id || '',
    batchId: batches.find((b) => b.status === 'active')?.id || '',
    sampleDate: new Date().toISOString().split('T')[0],
    sampleCount: '50',
    avgWeightGrams: '',
    minWeightGrams: '',
    maxWeightGrams: '',
    notes: '',
  });

  const handleFeedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedForm.quantityKg || Number(feedForm.quantityKg) <= 0) {
      toast.error('Feed quantity required', 'Please enter a valid weight in kilograms.');
      return;
    }
    setFeedSubmitting(true);
    try {
      await onAddFeedLog(feedForm);
      setIsFeedModalOpen(false);
      toast.success('Feeding recorded', `${feedForm.quantityKg} kg logged for pond.`);
      setFeedForm({ ...feedForm, quantityKg: '', notes: '' });
    } catch (err: any) {
      toast.error('Failed to record feeding', err.message);
    } finally {
      setFeedSubmitting(false);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.quantity || Number(eventForm.quantity) <= 0) {
      toast.error('Quantity required', 'Please enter affected count.');
      return;
    }
    setEventSubmitting(true);
    try {
      await onAddStockEvent(eventForm);
      setIsEventModalOpen(false);
      toast.success('Stock event recorded', `${eventForm.quantity} pcs logged (${eventForm.eventType}).`);
      setEventForm({ ...eventForm, quantity: '', notes: '' });
    } catch (err: any) {
      toast.error('Failed to record stock event', err.message);
    } finally {
      setEventSubmitting(false);
    }
  };

  const handleGrowthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!growthForm.avgWeightGrams || Number(growthForm.avgWeightGrams) <= 0) {
      toast.error('Average weight required', 'Please enter the average body weight in grams.');
      return;
    }
    setGrowthSubmitting(true);
    try {
      await onAddGrowthSample(growthForm);
      setIsGrowthModalOpen(false);
      toast.success('Sampling recorded', `ABW ${growthForm.avgWeightGrams}g logged.`);
      setGrowthForm({ ...growthForm, avgWeightGrams: '', minWeightGrams: '', maxWeightGrams: '', notes: '' });
    } catch (err: any) {
      toast.error('Failed to record growth sample', err.message);
    } finally {
      setGrowthSubmitting(false);
    }
  };

  // Calculations
  const totalFeedKg = feedLogs.reduce((acc, f) => acc + Number(f.quantityKg || 0), 0);
  const totalMortality = stockEvents
    .filter((e) => e.eventType === 'mortality')
    .reduce((acc, e) => acc + Number(e.quantity || 0), 0);
  const latestGrowth = growthSamples[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e2dc]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#181a1b]">
            Daily Farm Operations
          </h1>
          <p className="text-xs text-[#67696d] mt-1 leading-normal">
            Feeding distribution, mortality tracking, and biweekly average body weight (ABW) sampling.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            id="btn-open-feed-modal"
            variant="primary"
            size="sm"
            onClick={() => setIsFeedModalOpen(true)}
            leftIcon={<Utensils className="w-3.5 h-3.5" />}
          >
            Record Feeding
          </Button>
          <Button
            id="btn-open-event-modal"
            variant="outline"
            size="sm"
            onClick={() => setIsEventModalOpen(true)}
            leftIcon={<Activity className="w-3.5 h-3.5" />}
          >
            Stock Event
          </Button>
          <Button
            id="btn-open-growth-modal"
            variant="outline"
            size="sm"
            onClick={() => setIsGrowthModalOpen(true)}
            leftIcon={<Scale className="w-3.5 h-3.5" />}
          >
            ABW Sampling
          </Button>
        </div>
      </div>

      {/* Operational Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-3.5 rounded-[8px] border border-[#dcdcd6] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-[#787a7e] uppercase">Total Feed Disbursed</div>
            <div className="text-base font-semibold font-mono tnum text-[#181a1b] mt-0.5">
              {totalFeedKg.toFixed(1)} <span className="text-xs font-normal text-[#55585d]">kg</span>
            </div>
            <div className="text-[11px] text-[#67696d] mt-0.5">{feedLogs.length} distribution events</div>
          </div>
          <div className="w-9 h-9 rounded-[6px] bg-[#edf5f0] text-[#194432] flex items-center justify-center">
            <Utensils className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-[8px] border border-[#dcdcd6] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-[#787a7e] uppercase">Recorded Mortalities</div>
            <div className="text-base font-semibold font-mono tnum text-[#181a1b] mt-0.5">
              {totalMortality.toLocaleString()} <span className="text-xs font-normal text-[#55585d]">pcs</span>
            </div>
            <div className="text-[11px] text-[#67696d] mt-0.5">Tracked for accurate survival calculation</div>
          </div>
          <div className="w-9 h-9 rounded-[6px] bg-[#fdf2f2] text-[#b91c1c] flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-[8px] border border-[#dcdcd6] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-[#787a7e] uppercase">Latest Measured ABW</div>
            <div className="text-base font-semibold font-mono tnum text-[#181a1b] mt-0.5">
              {latestGrowth ? Number(latestGrowth.avgWeightGrams).toFixed(1) : '—'}{' '}
              <span className="text-xs font-normal text-[#55585d]">grams</span>
            </div>
            <div className="text-[11px] text-[#67696d] mt-0.5">
              {latestGrowth ? `Sample of ${latestGrowth.sampleCount} specimens` : 'No samples yet'}
            </div>
          </div>
          <div className="w-9 h-9 rounded-[6px] bg-[#f0f4ff] text-[#2563eb] flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="border-b border-[#e2e2dc] flex items-center gap-2">
        <button
          onClick={() => setActiveSubTab('feed')}
          className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'feed'
              ? 'border-[#194432] text-[#194432] font-semibold'
              : 'border-transparent text-[#55585d] hover:text-[#181a1b]'
          }`}
        >
          Feeding Distribution Logs ({feedLogs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('events')}
          className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'events'
              ? 'border-[#194432] text-[#194432] font-semibold'
              : 'border-transparent text-[#55585d] hover:text-[#181a1b]'
          }`}
        >
          Mortality & Stock Events ({stockEvents.length})
        </button>
        <button
          onClick={() => setActiveSubTab('growth')}
          className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'growth'
              ? 'border-[#194432] text-[#194432] font-semibold'
              : 'border-transparent text-[#55585d] hover:text-[#181a1b]'
          }`}
        >
          Growth & Sampling Records ({growthSamples.length})
        </button>
      </div>

      {/* Tab 1: Feed Logs */}
      {activeSubTab === 'feed' && (
        <Card>
          <CardContent className="p-0">
            {feedLogs.length === 0 ? (
              <EmptyState
                title="No feeding records logged"
                description="Daily feeding logs calculate feed conversion ratio (FCR) and cost-per-kg dynamically."
                icon={<Utensils className="w-5 h-5 text-[#194432]" />}
                actionLabel="Record Feeding"
                onAction={() => setIsFeedModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e2e2dc] bg-[#fafaf7] text-[#67696d] font-mono text-[11px]">
                      <th className="py-2.5 px-4 font-medium">Date & Time</th>
                      <th className="py-2.5 px-3 font-medium">Pond</th>
                      <th className="py-2.5 px-3 font-medium">Feed Specification</th>
                      <th className="py-2.5 px-3 font-medium text-right">Quantity (kg)</th>
                      <th className="py-2.5 px-3 font-medium text-right">Cost (PHP)</th>
                      <th className="py-2.5 px-3 font-medium">Feeding Tray Check</th>
                      <th className="py-2.5 px-4 font-medium">Operator & Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0ea]">
                    {feedLogs.map((log) => {
                      const pond = ponds.find((p) => p.id === log.pondId);
                      const cost = Number(log.quantityKg) * Number(log.costPerKg || 0);

                      return (
                        <tr key={log.id} className="hover:bg-[#fafaf8] transition-colors">
                          <td className="py-2.5 px-4 font-mono text-[11px] text-[#4a4c50] whitespace-nowrap">
                            {new Date(log.fedAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-[#181a1b] whitespace-nowrap">
                            {pond?.name || 'Unknown Pond'}
                          </td>
                          <td className="py-2.5 px-3 text-[#2d3034]">{log.feedType}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold tnum text-[#181a1b]">
                            {Number(log.quantityKg).toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tnum text-[#1b7a4b]">
                            ₱{cost.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={
                                log.feedingTrayCheck === 'consumed_100'
                                  ? 'success'
                                  : log.feedingTrayCheck === 'consumed_80'
                                  ? 'neutral'
                                  : 'warning'
                              }
                              size="sm"
                            >
                              {log.feedingTrayCheck ? log.feedingTrayCheck.replace(/_/g, ' ') : 'unrecorded'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-[#67696d]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-[#2d3034]">{log.operatorName}</span>
                              {log.notes && <span className="truncate max-w-[160px]">({log.notes})</span>}
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
      )}

      {/* Tab 2: Stock Events */}
      {activeSubTab === 'events' && (
        <Card>
          <CardContent className="p-0">
            {stockEvents.length === 0 ? (
              <EmptyState
                title="No stock events logged"
                description="Record mortalities, tank-to-pond transfers, or sample mortalities to keep inventory accurate."
                icon={<Activity className="w-5 h-5 text-[#b91c1c]" />}
                actionLabel="Record Stock Event"
                onAction={() => setIsEventModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e2e2dc] bg-[#fafaf7] text-[#67696d] font-mono text-[11px]">
                      <th className="py-2.5 px-4 font-medium">Event Date</th>
                      <th className="py-2.5 px-3 font-medium">Pond</th>
                      <th className="py-2.5 px-3 font-medium">Event Nature</th>
                      <th className="py-2.5 px-3 font-medium text-right">Count (pcs)</th>
                      <th className="py-2.5 px-4 font-medium">Operator & Context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0ea]">
                    {stockEvents.map((ev) => {
                      const pond = ponds.find((p) => p.id === ev.pondId);
                      return (
                        <tr key={ev.id} className="hover:bg-[#fafaf8] transition-colors">
                          <td className="py-2.5 px-4 font-mono text-[11px] text-[#4a4c50] whitespace-nowrap">
                            {new Date(ev.eventDate).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-[#181a1b] whitespace-nowrap">
                            {pond?.name || 'Unknown Pond'}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={ev.eventType === 'mortality' ? 'danger' : 'neutral'}
                              size="sm"
                            >
                              {ev.eventType}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold tnum text-[#181a1b]">
                            {Number(ev.quantity).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-[#67696d]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-[#2d3034]">{ev.operatorName}</span>
                              {ev.notes && <span className="truncate max-w-[200px]">({ev.notes})</span>}
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
      )}

      {/* Tab 3: Growth Samples */}
      {activeSubTab === 'growth' && (
        <Card>
          <CardContent className="p-0">
            {growthSamples.length === 0 ? (
              <EmptyState
                title="No growth sampling recorded"
                description="Biweekly net-cast sampling updates the farm's Average Body Weight (ABW) and total biomass."
                icon={<Scale className="w-5 h-5 text-[#2563eb]" />}
                actionLabel="Record ABW Sample"
                onAction={() => setIsGrowthModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e2e2dc] bg-[#fafaf7] text-[#67696d] font-mono text-[11px]">
                      <th className="py-2.5 px-4 font-medium">Sampling Date</th>
                      <th className="py-2.5 px-3 font-medium">Pond</th>
                      <th className="py-2.5 px-3 font-medium text-right">Sample Size</th>
                      <th className="py-2.5 px-3 font-medium text-right">Average Weight (g)</th>
                      <th className="py-2.5 px-3 font-medium text-right">Min Weight (g)</th>
                      <th className="py-2.5 px-3 font-medium text-right">Max Weight (g)</th>
                      <th className="py-2.5 px-4 font-medium">Sampling Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0ea]">
                    {growthSamples.map((sample) => {
                      const pond = ponds.find((p) => p.id === sample.pondId);
                      return (
                        <tr key={sample.id} className="hover:bg-[#fafaf8] transition-colors">
                          <td className="py-2.5 px-4 font-mono text-[11px] text-[#4a4c50] whitespace-nowrap">
                            {sample.sampleDate}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-[#181a1b] whitespace-nowrap">
                            {pond?.name || 'Unknown Pond'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tnum text-[#55585d]">
                            {sample.sampleCount} pcs
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold tnum text-[#181a1b]">
                            {Number(sample.avgWeightGrams).toFixed(1)} g
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tnum text-[#787a7e]">
                            {sample.minWeightGrams ? Number(sample.minWeightGrams).toFixed(1) + ' g' : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tnum text-[#787a7e]">
                            {sample.maxWeightGrams ? Number(sample.maxWeightGrams).toFixed(1) + ' g' : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-[#67696d] truncate max-w-[200px]">
                            {sample.notes || 'Normal distribution'}
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
      )}

      {/* Modal: Feed Log */}
      <Dialog
        open={isFeedModalOpen}
        onClose={() => setIsFeedModalOpen(false)}
        title="Record Feeding Distribution"
        description="Log morning, afternoon, or evening pellet feeding along with tray consumption checks."
        icon={<Utensils className="w-5 h-5 text-[#194432]" />}
      >
        <form onSubmit={handleFeedSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Pond / Tank Unit" required>
              <Select
                value={feedForm.pondId}
                onChange={(e) => setFeedForm({ ...feedForm, pondId: e.target.value })}
                required
              >
                {ponds.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Distribution Timestamp" required>
              <Input
                type="datetime-local"
                value={feedForm.fedAt}
                onChange={(e) => setFeedForm({ ...feedForm, fedAt: e.target.value })}
                required
              />
            </Field>

            <Field label="Feed Formulation" required>
              <Input
                value={feedForm.feedType}
                onChange={(e) => setFeedForm({ ...feedForm, feedType: e.target.value })}
                required
              />
            </Field>

            <Field label="Disbursed Quantity" required>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 5.5"
                suffixNode="kg"
                value={feedForm.quantityKg}
                onChange={(e) => setFeedForm({ ...feedForm, quantityKg: e.target.value })}
                required
              />
            </Field>

            <Field label="Feed Tray Consumption Check">
              <Select
                value={feedForm.feedingTrayCheck}
                onChange={(e) => setFeedForm({ ...feedForm, feedingTrayCheck: e.target.value })}
              >
                <option value="consumed_100">100% Consumed (Excellent Appetite)</option>
                <option value="consumed_80_90">80–90% Consumed (Normal Appetite)</option>
                <option value="consumed_50_70">50–70% Consumed (Reduce ration 20%)</option>
                <option value="unconsumed_heavy">Heavy Leftover (&lt;50% - DO / Temp Check)</option>
              </Select>
            </Field>

            <Field label="Cost per Kilogram (PHP)">
              <Input
                type="number"
                step="0.5"
                prefixNode="₱"
                value={feedForm.costPerKg}
                onChange={(e) => setFeedForm({ ...feedForm, costPerKg: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Operator Name" required>
            <Input
              value={feedForm.operatorName}
              onChange={(e) => setFeedForm({ ...feedForm, operatorName: e.target.value })}
              required
            />
          </Field>

          <Field label="Observations / Feeding Notes">
            <Textarea
              placeholder="e.g. Active feeding along edges, water transparency 32cm, no leftovers on trays..."
              value={feedForm.notes}
              onChange={(e) => setFeedForm({ ...feedForm, notes: e.target.value })}
            />
          </Field>

          <div className="pt-3 border-t border-[#f0f0ea] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsFeedModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={feedSubmitting}>
              Log Feeding
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Stock Event */}
      <Dialog
        open={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title="Record Stock Event"
        description="Log mortalities, transfers, or juvenile counts to keep population models synchronized."
        icon={<Activity className="w-5 h-5 text-[#b91c1c]" />}
      >
        <form onSubmit={handleEventSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Pond Unit" required>
              <Select
                value={eventForm.pondId}
                onChange={(e) => setEventForm({ ...eventForm, pondId: e.target.value })}
                required
              >
                {ponds.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Event Type">
              <Select
                value={eventForm.eventType}
                onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
              >
                <option value="mortality">Observed Mortality</option>
                <option value="transfer">Internal Pond Transfer</option>
                <option value="sampling_sacrifice">Sampling Sacrifice</option>
                <option value="partial_harvest">Partial Selective Harvest</option>
              </Select>
            </Field>

            <Field label="Quantity (Count)" required>
              <Input
                type="number"
                placeholder="e.g. 15"
                suffixNode="pcs"
                value={eventForm.quantity}
                onChange={(e) => setEventForm({ ...eventForm, quantity: e.target.value })}
                required
              />
            </Field>

            <Field label="Event Timestamp" required>
              <Input
                type="datetime-local"
                value={eventForm.eventDate}
                onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                required
              />
            </Field>
          </div>

          <Field label="Cause of Event / Observations">
            <Textarea
              placeholder="e.g. Exoskeleton molting stress, localized low DO near inlet, predator bird netting intact..."
              value={eventForm.notes}
              onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
            />
          </Field>

          <div className="pt-3 border-t border-[#f0f0ea] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEventModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={eventSubmitting}>
              Record Event
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Growth Sample */}
      <Dialog
        open={isGrowthModalOpen}
        onClose={() => setIsGrowthModalOpen(false)}
        title="Record ABW Growth Sample"
        description="Cast net biometric survey to compute Average Body Weight (ABW) and calibrate daily feed rate."
        icon={<Scale className="w-5 h-5 text-[#2563eb]" />}
      >
        <form onSubmit={handleGrowthSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Pond Sampled" required>
              <Select
                value={growthForm.pondId}
                onChange={(e) => setGrowthForm({ ...growthForm, pondId: e.target.value })}
                required
              >
                {ponds.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Sampling Date" required>
              <Input
                type="date"
                value={growthForm.sampleDate}
                onChange={(e) => setGrowthForm({ ...growthForm, sampleDate: e.target.value })}
                required
              />
            </Field>

            <Field label="Specimens Sampled" required>
              <Input
                type="number"
                placeholder="e.g. 50"
                suffixNode="pcs"
                value={growthForm.sampleCount}
                onChange={(e) => setGrowthForm({ ...growthForm, sampleCount: e.target.value })}
                required
              />
            </Field>

            <Field label="Average Body Weight (ABW)" required>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 28.5"
                suffixNode="grams"
                value={growthForm.avgWeightGrams}
                onChange={(e) => setGrowthForm({ ...growthForm, avgWeightGrams: e.target.value })}
                required
              />
            </Field>

            <Field label="Minimum Specimen Weight">
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 21.0"
                suffixNode="grams"
                value={growthForm.minWeightGrams}
                onChange={(e) => setGrowthForm({ ...growthForm, minWeightGrams: e.target.value })}
              />
            </Field>

            <Field label="Maximum Specimen Weight">
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 36.2"
                suffixNode="grams"
                value={growthForm.maxWeightGrams}
                onChange={(e) => setGrowthForm({ ...growthForm, maxWeightGrams: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Biometric Notes / Claw Development / Sex Ratio">
            <Textarea
              placeholder="e.g. 60% blue claw males, clean shells, no black spot disease observed..."
              value={growthForm.notes}
              onChange={(e) => setGrowthForm({ ...growthForm, notes: e.target.value })}
            />
          </Field>

          <div className="pt-3 border-t border-[#f0f0ea] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsGrowthModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={growthSubmitting}>
              Save Sample
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
