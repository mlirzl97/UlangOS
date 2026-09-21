import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Plus,
  Receipt,
  ShoppingBag,
  Scale,
  CreditCard,
  Building2,
  PieChart,
  Calendar,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Farm, Pond, Batch, Expense, Harvest, Sale } from '../types.ts';
import { FinancialMetrics } from '../lib/aquaculture-math.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';
import { Stat } from './ui/Stat.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card.tsx';
import { Dialog } from './ui/Dialog.tsx';
import { Field, Input, Select, Textarea } from './ui/Field.tsx';
import { EmptyState } from './ui/EmptyState.tsx';
import { useToast } from './ui/Toast.tsx';

interface FarmFinanceViewProps {
  farm: Farm;
  ponds: Pond[];
  batches: Batch[];
  expenses: Expense[];
  harvests: Harvest[];
  sales: Sale[];
  finMetrics: FinancialMetrics;
  onAddExpense: (data: any) => Promise<void>;
  onAddHarvest: (data: any) => Promise<void>;
  onAddSale: (data: any) => Promise<void>;
}

export const FarmFinanceView: React.FC<FarmFinanceViewProps> = ({
  farm,
  ponds,
  batches,
  expenses,
  harvests,
  sales,
  finMetrics,
  onAddExpense,
  onAddHarvest,
  onAddSale,
}) => {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'expenses' | 'harvests' | 'sales'>('expenses');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);

  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [harvestSubmitting, setHarvestSubmitting] = useState(false);
  const [saleSubmitting, setSaleSubmitting] = useState(false);

  // Forms
  const [expenseForm, setExpenseForm] = useState({
    pondId: ponds[0]?.id || '',
    batchId: batches.find((b) => b.status === 'active')?.id || '',
    category: 'feed_purchase',
    expenseType: 'opex',
    amountPhp: '',
    paymentDate: new Date().toISOString().split('T')[0],
    payeeVendor: '',
    description: '',
    isConsumed: true,
  });

  const [harvestForm, setHarvestForm] = useState({
    pondId: ponds[0]?.id || '',
    batchId: batches.find((b) => b.status === 'active')?.id || '',
    harvestType: 'partial',
    harvestDate: new Date().toISOString().split('T')[0],
    quantityPcs: '',
    totalWeightKg: '',
    avgWeightGrams: '',
    gradeClassification: 'Grade A (Large 25-35g)',
    notes: '',
  });

  const [saleForm, setSaleForm] = useState({
    batchId: batches.find((b) => b.status === 'active')?.id || '',
    saleDate: new Date().toISOString().split('T')[0],
    buyerName: 'Naga City Seafood Market Dealer',
    weightSoldKg: '',
    pricePerKgPhp: '550.00',
    paymentStatus: 'paid',
    notes: '',
  });

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amountPhp || Number(expenseForm.amountPhp) <= 0) {
      toast.error('Amount required', 'Please enter a valid expense amount in PHP.');
      return;
    }
    setExpenseSubmitting(true);
    try {
      await onAddExpense(expenseForm);
      setIsExpenseModalOpen(false);
      toast.success('Expense recorded', `₱${Number(expenseForm.amountPhp).toLocaleString()} logged.`);
      setExpenseForm({ ...expenseForm, amountPhp: '', description: '', payeeVendor: '' });
    } catch (err: any) {
      toast.error('Failed to record expense', err.message);
    } finally {
      setExpenseSubmitting(false);
    }
  };

  const handleHarvestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!harvestForm.totalWeightKg || Number(harvestForm.totalWeightKg) <= 0) {
      toast.error('Weight required', 'Please specify total harvested biomass in kg.');
      return;
    }
    setHarvestSubmitting(true);
    try {
      await onAddHarvest(harvestForm);
      setIsHarvestModalOpen(false);
      toast.success('Harvest recorded', `${harvestForm.totalWeightKg} kg harvested and logged.`);
      setHarvestForm({ ...harvestForm, totalWeightKg: '', quantityPcs: '', notes: '' });
    } catch (err: any) {
      toast.error('Failed to record harvest', err.message);
    } finally {
      setHarvestSubmitting(false);
    }
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForm.weightSoldKg || Number(saleForm.weightSoldKg) <= 0) {
      toast.error('Weight sold required', 'Please specify weight sold in kg.');
      return;
    }
    setSaleSubmitting(true);
    try {
      await onAddSale(saleForm);
      setIsSaleModalOpen(false);
      toast.success('Sale recorded', `${saleForm.weightSoldKg} kg sold to ${saleForm.buyerName}.`);
      setSaleForm({ ...saleForm, weightSoldKg: '', notes: '' });
    } catch (err: any) {
      toast.error('Failed to record sale', err.message);
    } finally {
      setSaleSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e2dc]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#181a1b]">
            Farm Financial Ledger
          </h1>
          <p className="text-xs text-[#67696d] mt-1 leading-normal">
            Deterministic accounting separating Capital Assets (CAPEX) from Consumed Operations (OPEX).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            id="btn-open-expense-modal"
            variant="outline"
            size="sm"
            onClick={() => setIsExpenseModalOpen(true)}
            leftIcon={<Receipt className="w-3.5 h-3.5" />}
          >
            Record Expense
          </Button>
          <Button
            id="btn-open-harvest-modal"
            variant="outline"
            size="sm"
            onClick={() => setIsHarvestModalOpen(true)}
            leftIcon={<Scale className="w-3.5 h-3.5" />}
          >
            Record Harvest
          </Button>
          <Button
            id="btn-open-sale-modal"
            variant="primary"
            size="sm"
            onClick={() => setIsSaleModalOpen(true)}
            leftIcon={<ShoppingBag className="w-3.5 h-3.5" />}
          >
            Record Prawn Sale
          </Button>
        </div>
      </div>

      {/* Financial KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Stat
          label="Total Capex (Assets)"
          value={`₱${finMetrics.totalCapexPhp.toLocaleString()}`}
          subtext="Infrastructure, aerators, fencing"
          icon={<Building2 className="w-4 h-4 text-[#787a7e]" />}
        />

        <Stat
          label="Cash Opex (Disbursed)"
          value={`₱${finMetrics.totalOpexCashPhp.toLocaleString()}`}
          subtext={`Consumed: ₱${finMetrics.totalOpexConsumedPhp.toLocaleString()}`}
          icon={<CreditCard className="w-4 h-4 text-[#b45309]" />}
        />

        <Stat
          label="Recognized Revenue"
          value={`₱${finMetrics.totalRevenuePhp.toLocaleString()}`}
          subtext={`Pending: ₱${finMetrics.totalReceivablesPendingPhp.toLocaleString()}`}
          status="optimal"
          icon={<DollarSign className="w-4 h-4 text-[#1b7a4b]" />}
        />

        <Stat
          label="Economic Operating Profit"
          value={`₱${Math.abs(finMetrics.economicOperatingProfitPhp).toLocaleString()}`}
          subtext={`Margin: ${finMetrics.operatingMarginPercent !== null ? `${finMetrics.operatingMarginPercent}%` : '—'}`}
          status={finMetrics.economicOperatingProfitPhp >= 0 ? 'optimal' : 'neutral'}
          delta={{
            value: finMetrics.economicOperatingProfitPhp >= 0 ? 'Profitable' : 'Grow-out phase',
            trend: finMetrics.economicOperatingProfitPhp >= 0 ? 'up' : 'neutral',
            isGood: finMetrics.economicOperatingProfitPhp >= 0,
          }}
          icon={<TrendingUp className="w-4 h-4 text-[#194432]" />}
        />
      </div>

      {/* Production Costing Benchmarks Strip */}
      <Card subtle>
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[#edf5f0] text-[#194432] flex items-center justify-center font-bold shrink-0">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-[#181a1b] tracking-tight">
                Ulang Production Costing Benchmarks
              </h3>
              <p className="text-[11px] text-[#707276]">
                Based on cumulative harvested biomass ({finMetrics.totalHarvestWeightKg} kg total)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 font-mono">
            <div>
              <span className="text-[#787a7e] text-[10px] block font-sans">Total Cost / kg</span>
              <span className="font-semibold text-[#181a1b] text-xs sm:text-sm">
                {finMetrics.costPerKgProduced !== null ? `₱${finMetrics.costPerKgProduced} / kg` : 'Pre-harvest'}
              </span>
            </div>

            <div>
              <span className="text-[#787a7e] text-[10px] block font-sans">Feed Cost / kg</span>
              <span className="font-semibold text-[#181a1b] text-xs sm:text-sm">
                {finMetrics.feedCostPerKgProduced !== null ? `₱${finMetrics.feedCostPerKgProduced} / kg` : 'Pre-harvest'}
              </span>
            </div>

            <div>
              <span className="text-[#787a7e] text-[10px] block font-sans">Break-Even Price</span>
              <span className="font-semibold text-[#194432] text-xs sm:text-sm">
                {finMetrics.breakEvenPricePerKg !== null ? `₱${finMetrics.breakEvenPricePerKg} / kg` : 'Pre-harvest'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-Tab Navigation */}
      <div className="border-b border-[#e2e2dc] flex items-center gap-2">
        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'expenses'
              ? 'border-[#194432] text-[#194432] font-semibold'
              : 'border-transparent text-[#55585d] hover:text-[#181a1b]'
          }`}
        >
          Expense Ledger ({expenses.length})
        </button>
        <button
          onClick={() => setActiveSubTab('harvests')}
          className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'harvests'
              ? 'border-[#194432] text-[#194432] font-semibold'
              : 'border-transparent text-[#55585d] hover:text-[#181a1b]'
          }`}
        >
          Harvest Log ({harvests.length})
        </button>
        <button
          onClick={() => setActiveSubTab('sales')}
          className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'sales'
              ? 'border-[#194432] text-[#194432] font-semibold'
              : 'border-transparent text-[#55585d] hover:text-[#181a1b]'
          }`}
        >
          Sales & Receivables ({sales.length})
        </button>
      </div>

      {/* Sub-Tab 1: Expenses */}
      {activeSubTab === 'expenses' && (
        <Card>
          <CardContent className="p-0">
            {expenses.length === 0 ? (
              <EmptyState
                title="No expenses recorded"
                description="Log feed purchases, electricity, seedstock, farm labor, and infrastructure costs."
                icon={<Receipt className="w-5 h-5 text-[#194432]" />}
                actionLabel="Record Expense"
                onAction={() => setIsExpenseModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e2e2dc] bg-[#fafaf7] text-[#67696d] font-mono text-[11px]">
                      <th className="py-2.5 px-4 font-medium">Payment Date</th>
                      <th className="py-2.5 px-3 font-medium">Category</th>
                      <th className="py-2.5 px-3 font-medium">Type</th>
                      <th className="py-2.5 px-3 font-medium text-right">Amount (PHP)</th>
                      <th className="py-2.5 px-3 font-medium">Vendor / Payee</th>
                      <th className="py-2.5 px-4 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0ea]">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-[#fafaf8] transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#4a4c50] whitespace-nowrap">
                          {exp.paymentDate}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[#181a1b]">
                          {exp.category.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={exp.expenseType === 'capex' ? 'neutral' : 'warning'} size="sm">
                            {exp.expenseType.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold tnum text-[#181a1b]">
                          ₱{Number(exp.amountPhp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-[#2d3034]">{exp.payeeVendor || '—'}</td>
                        <td className="py-2.5 px-4 text-[#67696d] truncate max-w-[240px]">
                          {exp.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sub-Tab 2: Harvests */}
      {activeSubTab === 'harvests' && (
        <Card>
          <CardContent className="p-0">
            {harvests.length === 0 ? (
              <EmptyState
                title="No harvests recorded"
                description="Record partial cullings or final drainage harvests with weight and grade breakdown."
                icon={<Scale className="w-5 h-5 text-[#194432]" />}
                actionLabel="Record Harvest"
                onAction={() => setIsHarvestModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e2e2dc] bg-[#fafaf7] text-[#67696d] font-mono text-[11px]">
                      <th className="py-2.5 px-4 font-medium">Harvest Date</th>
                      <th className="py-2.5 px-3 font-medium">Pond</th>
                      <th className="py-2.5 px-3 font-medium">Classification</th>
                      <th className="py-2.5 px-3 font-medium text-right">Biomass (kg)</th>
                      <th className="py-2.5 px-3 font-medium text-right">Specimen Count</th>
                      <th className="py-2.5 px-3 font-medium text-right">Avg Weight (g)</th>
                      <th className="py-2.5 px-4 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0ea]">
                    {harvests.map((h) => {
                      const pond = ponds.find((p) => p.id === h.pondId);
                      return (
                        <tr key={h.id} className="hover:bg-[#fafaf8] transition-colors">
                          <td className="py-2.5 px-4 font-mono text-[11px] text-[#4a4c50] whitespace-nowrap">
                            {h.harvestDate}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-[#181a1b] whitespace-nowrap">
                            {pond?.name || 'Unknown'}
                          </td>
                          <td className="py-2.5 px-3">{h.gradeClassification || 'Grade A'}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold tnum text-[#181a1b]">
                            {Number(h.totalWeightKg).toFixed(1)} kg
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tnum text-[#55585d]">
                            {Number(h.quantityPcs).toLocaleString()} pcs
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tnum text-[#194432]">
                            {h.avgWeightGrams ? Number(h.avgWeightGrams).toFixed(1) + ' g' : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-[#67696d] truncate max-w-[200px]">{h.notes || '—'}</td>
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

      {/* Sub-Tab 3: Sales */}
      {activeSubTab === 'sales' && (
        <Card>
          <CardContent className="p-0">
            {sales.length === 0 ? (
              <EmptyState
                title="No sales recorded"
                description="Log prawn sales to local Naga markets, resort restaurants, or wholesale seafood buyers."
                icon={<ShoppingBag className="w-5 h-5 text-[#194432]" />}
                actionLabel="Record Prawn Sale"
                onAction={() => setIsSaleModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e2e2dc] bg-[#fafaf7] text-[#67696d] font-mono text-[11px]">
                      <th className="py-2.5 px-4 font-medium">Sale Date</th>
                      <th className="py-2.5 px-3 font-medium">Buyer / Customer</th>
                      <th className="py-2.5 px-3 font-medium text-right">Volume (kg)</th>
                      <th className="py-2.5 px-3 font-medium text-right">Price / kg</th>
                      <th className="py-2.5 px-3 font-medium text-right">Total Revenue</th>
                      <th className="py-2.5 px-3 font-medium">Settlement Status</th>
                      <th className="py-2.5 px-4 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0ea]">
                    {sales.map((s) => (
                      <tr key={s.id} className="hover:bg-[#fafaf8] transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#4a4c50] whitespace-nowrap">
                          {s.saleDate}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[#181a1b]">{s.buyerName}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium tnum text-[#181a1b]">
                          {Number(s.weightSoldKg).toFixed(1)} kg
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tnum text-[#55585d]">
                          ₱{Number(s.pricePerKgPhp).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold tnum text-[#1b7a4b]">
                          ₱{Number(s.totalRevenuePhp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={s.paymentStatus === 'paid' ? 'success' : 'warning'} size="sm">
                            {s.paymentStatus}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-[#67696d] truncate max-w-[200px]">{s.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal: Record Expense */}
      <Dialog
        open={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Record Farm Financial Expense"
        description="Categorize outlays into capital investment (CAPEX) or operational expense (OPEX)."
        icon={<Receipt className="w-5 h-5 text-[#194432]" />}
      >
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Accounting Classification" required>
              <Select
                value={expenseForm.expenseType}
                onChange={(e) => setExpenseForm({ ...expenseForm, expenseType: e.target.value as any })}
                required
              >
                <option value="opex">OPEX (Operational: Feed, Power, Labor)</option>
                <option value="capex">CAPEX (Capital Assets: Aerators, Liner, Fencing)</option>
              </Select>
            </Field>

            <Field label="Category" required>
              <Select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                required
              >
                <option value="feed_purchase">Feed Pellet Purchase</option>
                <option value="seedstock_purchase">Juvenile / PL Seedstock</option>
                <option value="electricity_power">Electricity & Grid Power</option>
                <option value="labor_wages">Operator & Farm Labor Wages</option>
                <option value="pond_preparation">Lime, Tea Seed Cake, Pond Prep</option>
                <option value="equipment_hardware">Aerator / Water Pump / Pipe</option>
                <option value="transportation">Logistics & Fuel</option>
                <option value="regulatory_licenses">BFAR Permits & Licensing</option>
              </Select>
            </Field>

            <Field label="Disbursed Amount (PHP)" required>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 15000"
                prefixNode="₱"
                value={expenseForm.amountPhp}
                onChange={(e) => setExpenseForm({ ...expenseForm, amountPhp: e.target.value })}
                required
              />
            </Field>

            <Field label="Payment Date" required>
              <Input
                type="date"
                value={expenseForm.paymentDate}
                onChange={(e) => setExpenseForm({ ...expenseForm, paymentDate: e.target.value })}
                required
              />
            </Field>

            <Field label="Payee / Vendor Name">
              <Input
                placeholder="e.g. Bicol Aqua Feeds Corp."
                value={expenseForm.payeeVendor}
                onChange={(e) => setExpenseForm({ ...expenseForm, payeeVendor: e.target.value })}
              />
            </Field>

            <Field label="Assign to Pond (Optional)">
              <Select
                value={expenseForm.pondId}
                onChange={(e) => setExpenseForm({ ...expenseForm, pondId: e.target.value })}
              >
                <option value="">Farm General Overhead</option>
                {ponds.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Expense Description / Invoice Reference">
            <Textarea
              placeholder="e.g. Official Receipt #4829 for 20 bags of grower pellet 30% CP..."
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
            />
          </Field>

          <div className="pt-3 border-t border-[#f0f0ea] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={expenseSubmitting}>
              Save Expense
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Record Harvest */}
      <Dialog
        open={isHarvestModalOpen}
        onClose={() => setIsHarvestModalOpen(false)}
        title="Record Prawn Harvest"
        description="Document partial culling or complete pond drainage with grading."
        icon={<Scale className="w-5 h-5 text-[#194432]" />}
      >
        <form onSubmit={handleHarvestSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Pond Harvested" required>
              <Select
                value={harvestForm.pondId}
                onChange={(e) => setHarvestForm({ ...harvestForm, pondId: e.target.value })}
                required
              >
                {ponds.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Harvest Date" required>
              <Input
                type="date"
                value={harvestForm.harvestDate}
                onChange={(e) => setHarvestForm({ ...harvestForm, harvestDate: e.target.value })}
                required
              />
            </Field>

            <Field label="Harvest Method">
              <Select
                value={harvestForm.harvestType}
                onChange={(e) => setHarvestForm({ ...harvestForm, harvestType: e.target.value })}
              >
                <option value="partial">Partial Harvest (Seine net culling)</option>
                <option value="final">Final Harvest (Total drainage)</option>
              </Select>
            </Field>

            <Field label="Total Biomass Harvested" required>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 140.5"
                suffixNode="kg"
                value={harvestForm.totalWeightKg}
                onChange={(e) => setHarvestForm({ ...harvestForm, totalWeightKg: e.target.value })}
                required
              />
            </Field>

            <Field label="Total Specimen Count">
              <Input
                type="number"
                placeholder="e.g. 4500"
                suffixNode="pcs"
                value={harvestForm.quantityPcs}
                onChange={(e) => setHarvestForm({ ...harvestForm, quantityPcs: e.target.value })}
              />
            </Field>

            <Field label="Grade Classification">
              <Select
                value={harvestForm.gradeClassification}
                onChange={(e) => setHarvestForm({ ...harvestForm, gradeClassification: e.target.value })}
              >
                <option value="Grade A (Large 25-35g)">Grade A (Large 25–35g)</option>
                <option value="Grade Jumbo (>35g)">Grade Jumbo (&gt;35g)</option>
                <option value="Grade B (Medium 18-24g)">Grade B (Medium 18–24g)</option>
                <option value="Mixed Commercial">Mixed Commercial Run</option>
              </Select>
            </Field>
          </div>

          <Field label="Harvest Notes">
            <Textarea
              placeholder="e.g. Chilled in ice slurry immediately, zero shell damage, high market readiness..."
              value={harvestForm.notes}
              onChange={(e) => setHarvestForm({ ...harvestForm, notes: e.target.value })}
            />
          </Field>

          <div className="pt-3 border-t border-[#f0f0ea] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsHarvestModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={harvestSubmitting}>
              Log Harvest
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Record Sale */}
      <Dialog
        open={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        title="Record Prawn Sale & Revenue"
        description="Issue sales record and recognize revenue against grow-out cycles."
        icon={<ShoppingBag className="w-5 h-5 text-[#194432]" />}
      >
        <form onSubmit={handleSaleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Buyer / Dealer / Restaurant" required>
              <Input
                value={saleForm.buyerName}
                onChange={(e) => setSaleForm({ ...saleForm, buyerName: e.target.value })}
                required
              />
            </Field>

            <Field label="Sale Date" required>
              <Input
                type="date"
                value={saleForm.saleDate}
                onChange={(e) => setSaleForm({ ...saleForm, saleDate: e.target.value })}
                required
              />
            </Field>

            <Field label="Weight Sold" required>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 50"
                suffixNode="kg"
                value={saleForm.weightSoldKg}
                onChange={(e) => setSaleForm({ ...saleForm, weightSoldKg: e.target.value })}
                required
              />
            </Field>

            <Field label="Price per Kilogram (PHP)" required>
              <Input
                type="number"
                step="5"
                placeholder="e.g. 550"
                prefixNode="₱"
                value={saleForm.pricePerKgPhp}
                onChange={(e) => setSaleForm({ ...saleForm, pricePerKgPhp: e.target.value })}
                required
              />
            </Field>

            <Field label="Settlement Status">
              <Select
                value={saleForm.paymentStatus}
                onChange={(e) => setSaleForm({ ...saleForm, paymentStatus: e.target.value })}
              >
                <option value="paid">Paid in Full (Cash / Bank Transfer)</option>
                <option value="partial">Partial Deposit Received</option>
                <option value="pending">Pending Receivable (Consignment)</option>
              </Select>
            </Field>
          </div>

          <Field label="Sales Notes / Delivery Terms">
            <Textarea
              placeholder="e.g. Delivered fresh iced to Naga City Public Market stall #12..."
              value={saleForm.notes}
              onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
            />
          </Field>

          <div className="pt-3 border-t border-[#f0f0ea] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsSaleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={saleSubmitting}>
              Record Sale
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
