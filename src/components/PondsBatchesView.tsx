import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  AlertCircle,
  Archive,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Farm, Pond, Batch } from '../types.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card.tsx';
import { Dialog } from './ui/Dialog.tsx';
import { Field, Input, Select, Textarea } from './ui/Field.tsx';
import { EmptyState } from './ui/EmptyState.tsx';
import { useToast } from './ui/Toast.tsx';

interface PondsBatchesViewProps {
  farm: Farm;
  ponds: Pond[];
  batches: Batch[];
  onAddPond: (data: Partial<Pond>) => Promise<void>;
  onAddBatch: (data: any) => Promise<void>;
  onCloseBatch: (batchId: string, data: any) => Promise<void>;
}

export const PondsBatchesView: React.FC<PondsBatchesViewProps> = ({
  farm,
  ponds,
  batches,
  onAddPond,
  onAddBatch,
  onCloseBatch,
}) => {
  const toast = useToast();
  const [isPondModalOpen, setIsPondModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [closingBatch, setClosingBatch] = useState<Batch | null>(null);

  const [pondSubmitting, setPondSubmitting] = useState(false);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [closeSubmitting, setCloseSubmitting] = useState(false);

  // New Pond Form State
  const [pondForm, setPondForm] = useState({
    name: '',
    identifier: '',
    cultureMethod: 'semi_intensive' as const,
    pondType: 'earthen_pond' as const,
    areaSqM: '',
    waterVolumeM3: '',
    avgDepthM: '1.2',
    status: 'active' as const,
    notes: '',
  });

  // New Batch Form State
  const [batchForm, setBatchForm] = useState({
    pondId: ponds[0]?.id || '',
    batchIdentifier: `BATCH-${new Date().getFullYear()}-0${batches.length + 1}`,
    species: 'Macrobrachium rosenbergii (Ulang)',
    stockingDate: new Date().toISOString().split('T')[0],
    initialStockQuantity: '10000',
    sourcePlJuveniles: 'SEAFDEC-AQD Certified Hatchery',
    stockingCost: '12500.00',
    targetHarvestDate: new Date(Date.now() + 120 * 24 * 3600 * 1000).toISOString().split('T')[0],
    notes: '',
  });

  // Close Batch State
  const [closingSurvival, setClosingSurvival] = useState('85.0');
  const [closingNotes, setClosingNotes] = useState('');

  const handlePondSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pondForm.name || !pondForm.identifier) {
      toast.error('Name & identifier required', 'Please provide a clear pond name and code.');
      return;
    }
    setPondSubmitting(true);
    try {
      await onAddPond({
        ...pondForm,
        areaSqM: pondForm.areaSqM ? Number(pondForm.areaSqM) : null,
        waterVolumeM3: pondForm.waterVolumeM3 ? Number(pondForm.waterVolumeM3) : null,
        avgDepthM: pondForm.avgDepthM ? Number(pondForm.avgDepthM) : null,
      });
      setIsPondModalOpen(false);
      toast.success('Pond unit created', `Registered "${pondForm.name}" to farm.`);
      setPondForm({
        name: '',
        identifier: '',
        cultureMethod: 'semi_intensive',
        pondType: 'earthen_pond',
        areaSqM: '',
        waterVolumeM3: '',
        avgDepthM: '1.2',
        status: 'active',
        notes: '',
      });
    } catch (err: any) {
      toast.error('Failed to create pond', err.message);
    } finally {
      setPondSubmitting(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.pondId) {
      toast.error('Pond required', 'Please select a pond for this batch.');
      return;
    }
    setBatchSubmitting(true);
    try {
      await onAddBatch(batchForm);
      setIsBatchModalOpen(false);
      toast.success('Batch stocked', `Cycle "${batchForm.batchIdentifier}" initialized.`);
    } catch (err: any) {
      toast.error('Failed to stock batch', err.message);
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleCloseBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingBatch) return;
    setCloseSubmitting(true);
    try {
      await onCloseBatch(closingBatch.id, {
        finalSurvivalPercent: Number(closingSurvival),
        closingNotes,
      });
      setClosingBatch(null);
      toast.success('Batch archived', `Cycle "${closingBatch.batchIdentifier}" marked completed.`);
    } catch (err: any) {
      toast.error('Failed to archive batch', err.message);
    } finally {
      setCloseSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e2dc]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#181a1b]">
            Ponds & Culture Batches
          </h1>
          <p className="text-xs text-[#67696d] mt-1 leading-normal">
            Production units, stocking cycles, and grow-out batch lifecycle at {farm.name}.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            id="btn-add-pond"
            variant="outline"
            size="sm"
            onClick={() => setIsPondModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Pond / Tank
          </Button>
          <Button
            id="btn-stock-batch"
            variant="primary"
            size="sm"
            onClick={() => setIsBatchModalOpen(true)}
            leftIcon={<Calendar className="w-3.5 h-3.5" />}
          >
            Stock New Batch
          </Button>
        </div>
      </div>

      {/* 1. Pond Registry Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-tight text-[#181a1b] font-mono uppercase">
            Culture Units ({ponds.length})
          </h2>
        </div>

        {ponds.length === 0 ? (
          <EmptyState
            title="No culture ponds registered"
            description="Register your first earthen pond, circular tank, or nursery module to begin tracking."
            icon={<Layers className="w-5 h-5 text-[#194432]" />}
            actionLabel="Add Pond / Tank"
            onAction={() => setIsPondModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {ponds.map((p) => {
              const activeBatch = batches.find((b) => b.pondId === p.id && b.status === 'active');
              return (
                <Card key={p.id} hoverable>
                  <CardHeader className="pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{p.name}</CardTitle>
                        <span className="text-[11px] font-mono text-[#787a7e]">({p.identifier})</span>
                      </div>
                      <div className="text-[11px] text-[#67696d] capitalize mt-0.5">
                        {p.pondType.replace(/_/g, ' ')} • {p.cultureMethod.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <Badge variant={p.status === 'active' ? 'success' : 'neutral'} size="sm">
                      {p.status}
                    </Badge>
                  </CardHeader>

                  <CardContent className="pt-3 space-y-2.5 text-xs">
                    <div className="grid grid-cols-3 gap-2 bg-[#fbfbfa] p-2 rounded-[6px] border border-[#f0f0eb] font-mono tnum text-center">
                      <div>
                        <div className="text-[10px] text-[#787a7e]">Area</div>
                        <div className="font-semibold text-[#181a1b]">{p.areaSqM || 0} m²</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#787a7e]">Volume</div>
                        <div className="font-semibold text-[#181a1b]">{p.waterVolumeM3 || 0} m³</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#787a7e]">Avg Depth</div>
                        <div className="font-semibold text-[#181a1b]">{p.avgDepthM || 1.2} m</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#f0f0eb] flex items-center justify-between text-[11px]">
                      <span className="text-[#67696d]">Active Grow-out:</span>
                      {activeBatch ? (
                        <span className="font-mono font-medium text-[#194432]">
                          {activeBatch.batchIdentifier} ({Number(activeBatch.initialStockQuantity || 0).toLocaleString()} PL)
                        </span>
                      ) : (
                        <span className="text-[#9fa1a6] italic">Fallow / Ready for stocking</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Culture Batches Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-tight text-[#181a1b] font-mono uppercase">
            Grow-Out Batches ({batches.length})
          </h2>
        </div>

        {batches.length === 0 ? (
          <EmptyState
            title="No culture batches initialized"
            description="Stock post-larvae (PL) or juveniles into a pond to start a culture cycle with biological FCR tracking."
            icon={<Calendar className="w-5 h-5 text-[#194432]" />}
            actionLabel="Stock New Batch"
            onAction={() => setIsBatchModalOpen(true)}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e2e2dc] bg-[#fafaf7] text-[#67696d] font-mono text-[11px]">
                      <th className="py-2.5 px-4 font-medium">Batch Identifier</th>
                      <th className="py-2.5 px-3 font-medium">Pond</th>
                      <th className="py-2.5 px-3 font-medium">Stocking Date</th>
                      <th className="py-2.5 px-3 font-medium text-right">Initial Stock</th>
                      <th className="py-2.5 px-3 font-medium text-right">Est. Survival</th>
                      <th className="py-2.5 px-3 font-medium">Hatchery Source</th>
                      <th className="py-2.5 px-3 font-medium">Status</th>
                      <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0ea]">
                    {batches.map((batch) => {
                      const pond = ponds.find((p) => p.id === batch.pondId);
                      const isActive = batch.status === 'active';

                      return (
                        <tr key={batch.id} className="hover:bg-[#fafaf8] transition-colors">
                          <td className="py-2.5 px-4 font-mono font-semibold text-[#181a1b] whitespace-nowrap">
                            {batch.batchIdentifier}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-[#2d3034] whitespace-nowrap">
                            {pond?.name || 'Unknown Pond'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-[#55585d] whitespace-nowrap">
                            {batch.stockingDate}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium tnum text-[#181a1b]">
                            {Number(batch.initialStockQuantity || 0).toLocaleString()} pcs
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium tnum text-[#1b7a4b]">
                            {batch.currentEstimatedSurvival != null && !isNaN(Number(batch.currentEstimatedSurvival))
                              ? Number(batch.currentEstimatedSurvival).toFixed(1) + '%'
                              : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-[#67696d] truncate max-w-[160px]">
                            {batch.sourcePlJuveniles || 'Local Hatchery'}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <Badge variant={isActive ? 'success' : 'neutral'} size="sm">
                              {batch.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            {isActive && (
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => setClosingBatch(batch)}
                                leftIcon={<Archive className="w-3 h-3" />}
                              >
                                Close Cycle
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal: Add Pond */}
      <Dialog
        open={isPondModalOpen}
        onClose={() => setIsPondModalOpen(false)}
        title="Register Culture Pond / Tank"
        description="Add an earthen pond, concrete nursery tank, or circular grow-out unit."
        icon={<Layers className="w-5 h-5 text-[#194432]" />}
      >
        <form onSubmit={handlePondSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Pond / Tank Name" required>
              <Input
                placeholder="e.g. Pond 03 Grow-Out"
                value={pondForm.name}
                onChange={(e) => setPondForm({ ...pondForm, name: e.target.value })}
                required
              />
            </Field>

            <Field label="Identifier Code" required>
              <Input
                placeholder="e.g. POND-003"
                value={pondForm.identifier}
                onChange={(e) => setPondForm({ ...pondForm, identifier: e.target.value })}
                required
              />
            </Field>

            <Field label="Pond Construction Type">
              <Select
                value={pondForm.pondType}
                onChange={(e) => setPondForm({ ...pondForm, pondType: e.target.value as any })}
              >
                <option value="earthen_pond">Earthen Pond</option>
                <option value="concrete_tank">Concrete Tank</option>
                <option value="lined_pond">HDPE Lined Pond</option>
                <option value="circular_tank">Circular Tank</option>
              </Select>
            </Field>

            <Field label="Culture Intensity Method">
              <Select
                value={pondForm.cultureMethod}
                onChange={(e) => setPondForm({ ...pondForm, cultureMethod: e.target.value as any })}
              >
                <option value="semi_intensive">Semi-Intensive (Recommended)</option>
                <option value="intensive">Intensive (With Aeration)</option>
                <option value="extensive">Extensive</option>
              </Select>
            </Field>

            <Field label="Surface Area" description="Square meters">
              <Input
                type="number"
                placeholder="e.g. 1000"
                suffixNode="m²"
                value={pondForm.areaSqM}
                onChange={(e) => setPondForm({ ...pondForm, areaSqM: e.target.value })}
              />
            </Field>

            <Field label="Water Volume" description="Cubic meters">
              <Input
                type="number"
                placeholder="e.g. 1200"
                suffixNode="m³"
                value={pondForm.waterVolumeM3}
                onChange={(e) => setPondForm({ ...pondForm, waterVolumeM3: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Pond Notes / Sump Drainage Details">
            <Textarea
              placeholder="e.g. Central monk gate, gravity drainage, 2 paddlewheels installed..."
              value={pondForm.notes}
              onChange={(e) => setPondForm({ ...pondForm, notes: e.target.value })}
            />
          </Field>

          <div className="pt-3 border-t border-[#f0f0ea] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPondModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={pondSubmitting}>
              Register Unit
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Stock Batch */}
      <Dialog
        open={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Stock New Grow-Out Batch"
        description="Initialize a new rearing cycle with certified post-larvae (PL) or juveniles."
        icon={<Calendar className="w-5 h-5 text-[#194432]" />}
      >
        <form onSubmit={handleBatchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Assign To Pond" required>
              <Select
                value={batchForm.pondId}
                onChange={(e) => setBatchForm({ ...batchForm, pondId: e.target.value })}
                required
              >
                {ponds.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.identifier})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Batch Identifier" required>
              <Input
                value={batchForm.batchIdentifier}
                onChange={(e) => setBatchForm({ ...batchForm, batchIdentifier: e.target.value })}
                required
              />
            </Field>

            <Field label="Target Species">
              <Input
                value={batchForm.species}
                onChange={(e) => setBatchForm({ ...batchForm, species: e.target.value })}
              />
            </Field>

            <Field label="Stocking Date" required>
              <Input
                type="date"
                value={batchForm.stockingDate}
                onChange={(e) => setBatchForm({ ...batchForm, stockingDate: e.target.value })}
                required
              />
            </Field>

            <Field label="Stock Quantity (PL / Juveniles)" required>
              <Input
                type="number"
                placeholder="e.g. 10000"
                suffixNode="pcs"
                value={batchForm.initialStockQuantity}
                onChange={(e) => setBatchForm({ ...batchForm, initialStockQuantity: e.target.value })}
                required
              />
            </Field>

            <Field label="Total Stocking Seed Cost (PHP)">
              <Input
                type="number"
                placeholder="e.g. 12500"
                prefixNode="₱"
                value={batchForm.stockingCost}
                onChange={(e) => setBatchForm({ ...batchForm, stockingCost: e.target.value })}
              />
            </Field>

            <Field label="Target Harvest Date">
              <Input
                type="date"
                value={batchForm.targetHarvestDate}
                onChange={(e) => setBatchForm({ ...batchForm, targetHarvestDate: e.target.value })}
              />
            </Field>

            <Field label="Hatchery Source Origin">
              <Input
                placeholder="e.g. SEAFDEC-AQD Hatchery"
                value={batchForm.sourcePlJuveniles}
                onChange={(e) => setBatchForm({ ...batchForm, sourcePlJuveniles: e.target.value })}
              />
            </Field>
          </div>

          <div className="pt-3 border-t border-[#f0f0ea] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsBatchModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={batchSubmitting}>
              Initialize Batch
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Close Batch */}
      <Dialog
        open={!!closingBatch}
        onClose={() => setClosingBatch(null)}
        title={`Close Batch ${closingBatch?.batchIdentifier}`}
        description="Archive this production cycle and record final harvest survival metrics."
        icon={<Archive className="w-5 h-5 text-[#b45309]" />}
      >
        <form onSubmit={handleCloseBatchSubmit} className="space-y-4">
          <Field label="Final Observed Survival Rate (%)" required>
            <Input
              type="number"
              step="0.1"
              suffixNode="%"
              value={closingSurvival}
              onChange={(e) => setClosingSurvival(e.target.value)}
              required
            />
          </Field>

          <Field label="Harvest Closing Notes">
            <Textarea
              placeholder="e.g. 100% final harvest completed, pond ready for liming and sun-drying..."
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
            />
          </Field>

          <div className="pt-3 border-t border-[#f0f0ea] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setClosingBatch(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={closeSubmitting}>
              Archive Cycle
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
