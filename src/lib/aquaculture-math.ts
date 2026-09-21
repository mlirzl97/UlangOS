/**
 * HQ16 AquaOS - Deterministic Biological and Financial Aquaculture Formulas
 * Focused on Macrobrachium rosenbergii (Philippine freshwater prawn / ulang)
 */

export interface BiologicalMetrics {
  initialStock: number;
  totalMortalityRecorded: number;
  additionalStock: number;
  estimatedRemainingStock: number;
  survivalRatePercent: number | null; // null if insufficient data
  totalFeedConsumedKg: number;
  latestAbwGrams: number | null; // Average Body Weight
  estimatedBiomassKg: number | null;
  totalHarvestedWeightKg: number;
  totalHarvestedCount: number;
  fcr: number | null; // Feed Conversion Ratio = Total Feed (kg) / (Harvest Biomass + Current Biomass - Initial Biomass)
  isEstimated: boolean;
}

export function calculateBiologicalMetrics(params: {
  initialStockQuantity: number;
  mortalityCount: number;
  additionalStockCount?: number;
  feedLogs: { quantityKg: number | string }[];
  latestAbwGrams?: number | null;
  harvests: { totalWeightKg: number | string; quantityPcs?: number | null }[];
}): BiologicalMetrics {
  const initialStock = Number(params.initialStockQuantity) || 0;
  const mortality = Number(params.mortalityCount) || 0;
  const additional = Number(params.additionalStockCount) || 0;

  const totalHarvestedCount = params.harvests.reduce((acc, h) => acc + (Number(h.quantityPcs) || 0), 0);
  const totalHarvestedWeightKg = params.harvests.reduce((acc, h) => acc + (Number(h.totalWeightKg) || 0), 0);

  const totalFeedConsumedKg = params.feedLogs.reduce((acc, f) => acc + (Number(f.quantityKg) || 0), 0);

  // Remaining stock estimate
  const estimatedRemainingStock = Math.max(0, initialStock + additional - mortality - totalHarvestedCount);

  // Survival rate calculation:
  // If batch has finished (harvested), verified survival = (total harvested / initial stock) * 100
  // If ongoing: estimated survival = (estimated remaining + harvested) / initial stock * 100
  let survivalRatePercent: number | null = null;
  if (initialStock > 0) {
    const rawSurvival = ((estimatedRemainingStock + totalHarvestedCount) / initialStock) * 100;
    survivalRatePercent = Math.min(100, Math.max(0, Number(rawSurvival.toFixed(2))));
  }

  // Biomass estimate: remaining stock * (ABW in grams / 1000)
  let estimatedBiomassKg: number | null = null;
  if (params.latestAbwGrams && params.latestAbwGrams > 0 && estimatedRemainingStock > 0) {
    estimatedBiomassKg = Number(((estimatedRemainingStock * params.latestAbwGrams) / 1000).toFixed(2));
  }

  // Feed Conversion Ratio (FCR)
  // FCR = Total Feed Consumed (kg) / Net Biomass Gain (kg)
  let fcr: number | null = null;
  const netBiomassKg = (estimatedBiomassKg || 0) + totalHarvestedWeightKg;
  if (totalFeedConsumedKg > 0 && netBiomassKg > 0) {
    fcr = Number((totalFeedConsumedKg / netBiomassKg).toFixed(2));
  }

  return {
    initialStock,
    totalMortalityRecorded: mortality,
    additionalStock: additional,
    estimatedRemainingStock,
    survivalRatePercent,
    totalFeedConsumedKg: Number(totalFeedConsumedKg.toFixed(2)),
    latestAbwGrams: params.latestAbwGrams ? Number(params.latestAbwGrams.toFixed(2)) : null,
    estimatedBiomassKg,
    totalHarvestedWeightKg: Number(totalHarvestedWeightKg.toFixed(2)),
    totalHarvestedCount,
    fcr,
    isEstimated: true,
  };
}

export interface FinancialMetrics {
  totalCapexPhp: number;
  totalOpexCashPhp: number;
  totalOpexConsumedPhp: number;
  totalFeedCostPhp: number;
  totalStockingCostPhp: number;
  totalRevenuePhp: number;
  totalReceivablesPendingPhp: number;
  cashOperatingProfitPhp: number; // Cash Revenue - Cash Opex
  economicOperatingProfitPhp: number; // Recognized Revenue - Consumed Opex
  operatingMarginPercent: number | null;
  costPerKgProduced: number | null; // Consumed Opex / Total Harvest Weight
  feedCostPerKgProduced: number | null;
  breakEvenPricePerKg: number | null; // Consumed Opex / Total Harvest Weight
  weightSoldKg: number;
  totalHarvestWeightKg: number;
}

export function calculateFinancialMetrics(params: {
  expenses: {
    amountPhp: number | string;
    expenseType: 'capex' | 'opex';
    category: string;
    isConsumed: boolean;
  }[];
  sales: {
    totalRevenuePhp: number | string;
    paymentStatus: string;
    weightSoldKg: number | string;
  }[];
  harvests: {
    totalWeightKg: number | string;
  }[];
  stockingCost?: number | string;
}): FinancialMetrics {
  let totalCapexPhp = 0;
  let totalOpexCashPhp = 0;
  let totalOpexConsumedPhp = 0;
  let totalFeedCostPhp = 0;

  for (const exp of params.expenses) {
    const amount = Number(exp.amountPhp) || 0;
    if (exp.expenseType === 'capex') {
      totalCapexPhp += amount;
    } else {
      totalOpexCashPhp += amount;
      if (exp.isConsumed) {
        totalOpexConsumedPhp += amount;
      }
      if (exp.category === 'feed_purchase' || exp.category === 'feed') {
        totalFeedCostPhp += amount;
      }
    }
  }

  const stockingCost = Number(params.stockingCost) || 0;
  totalOpexCashPhp += stockingCost;
  totalOpexConsumedPhp += stockingCost;

  let totalRevenuePhp = 0;
  let totalReceivablesPendingPhp = 0;
  let weightSoldKg = 0;

  for (const s of params.sales) {
    const rev = Number(s.totalRevenuePhp) || 0;
    const wt = Number(s.weightSoldKg) || 0;
    weightSoldKg += wt;

    if (s.paymentStatus === 'paid') {
      totalRevenuePhp += rev;
    } else {
      totalReceivablesPendingPhp += rev;
      totalRevenuePhp += rev; // Accrual basis
    }
  }

  const totalHarvestWeightKg = params.harvests.reduce((acc, h) => acc + (Number(h.totalWeightKg) || 0), 0);

  const cashOperatingProfitPhp = totalRevenuePhp - totalOpexCashPhp;
  const economicOperatingProfitPhp = totalRevenuePhp - totalOpexConsumedPhp;

  let operatingMarginPercent: number | null = null;
  if (totalRevenuePhp > 0) {
    operatingMarginPercent = Number(((economicOperatingProfitPhp / totalRevenuePhp) * 100).toFixed(2));
  }

  let costPerKgProduced: number | null = null;
  let feedCostPerKgProduced: number | null = null;
  let breakEvenPricePerKg: number | null = null;

  if (totalHarvestWeightKg > 0) {
    costPerKgProduced = Number((totalOpexConsumedPhp / totalHarvestWeightKg).toFixed(2));
    feedCostPerKgProduced = Number((totalFeedCostPhp / totalHarvestWeightKg).toFixed(2));
    breakEvenPricePerKg = costPerKgProduced;
  }

  return {
    totalCapexPhp: Number(totalCapexPhp.toFixed(2)),
    totalOpexCashPhp: Number(totalOpexCashPhp.toFixed(2)),
    totalOpexConsumedPhp: Number(totalOpexConsumedPhp.toFixed(2)),
    totalFeedCostPhp: Number(totalFeedCostPhp.toFixed(2)),
    totalStockingCostPhp: Number(stockingCost.toFixed(2)),
    totalRevenuePhp: Number(totalRevenuePhp.toFixed(2)),
    totalReceivablesPendingPhp: Number(totalReceivablesPendingPhp.toFixed(2)),
    cashOperatingProfitPhp: Number(cashOperatingProfitPhp.toFixed(2)),
    economicOperatingProfitPhp: Number(economicOperatingProfitPhp.toFixed(2)),
    operatingMarginPercent,
    costPerKgProduced,
    feedCostPerKgProduced,
    breakEvenPricePerKg,
    weightSoldKg: Number(weightSoldKg.toFixed(2)),
    totalHarvestWeightKg: Number(totalHarvestWeightKg.toFixed(2)),
  };
}
