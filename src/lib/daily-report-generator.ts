import { GoogleGenAI } from '@google/genai';

export interface DailyReportData {
  farmName: string;
  location: string;
  batchIdentifier: string;
  species: string;
  daysSinceStocking: number;
  latestWaterTest: {
    testedAt: string;
    temperature: number | null;
    dissolvedOxygen: number | null;
    ph: number | null;
    totalAmmonia: number | null;
    nitrite: number | null;
    sourceType: string;
  } | null;
  latestSensorReading: {
    measuredAt: string;
    parameter: string;
    value: number;
    unit: string;
    deviceId: string;
  } | null;
  biological: {
    initialStock: number;
    mortalityCount: number;
    estimatedRemainingStock: number;
    survivalRatePercent: number | null;
    totalFeedConsumedKg: number;
    estimatedBiomassKg: number | null;
    latestAbwGrams: number | null;
  };
  finance: {
    totalOpexCashPhp: number;
    totalRevenuePhp: number;
    cashProfitPhp: number;
  };
  openAlertsCount: number;
  alertsList: { title: string; severity: string; description: string }[];
  missingDataNotes: string[];
}

export async function generateDailyManagementReport(data: DailyReportData): Promise<{
  reportText: string;
  summaryText: string;
  reportDate: string;
  source: 'gemini_ai' | 'deterministic-engine';
  generatedBy: string;
  generatedAt: string;
}> {
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });

  // 1. Build Grounded Deterministic Report
  const deterministicReport = `
# HQ16 Agri Labs — AquaOS Daily Farm Intelligence Report
**Farm:** ${data.farmName} (${data.location})  
**Date & Time (Asia/Manila):** ${timestamp}  
**Production Batch:** ${data.batchIdentifier || 'No active batch'} (${data.species})  
**Days Since Stocking:** ${data.daysSinceStocking} days  

---

### 1. Overall Farm Health & Operational Summary
- Farm status is currently active with ${data.openAlertsCount} open operational alerts.
- Days under culture: ${data.daysSinceStocking} days. Estimated stock remaining is ${data.biological.estimatedRemainingStock.toLocaleString()} prawns.

### 2. Water Quality Observations
${
  data.latestWaterTest
    ? `- Latest manual test recorded on **${new Date(data.latestWaterTest.testedAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila' })}**:
  - Dissolved Oxygen (DO): **${data.latestWaterTest.dissolvedOxygen != null ? data.latestWaterTest.dissolvedOxygen + ' mg/L' : 'No test'}** (Threshold: >4.0 mg/L)
  - pH Level: **${data.latestWaterTest.ph != null ? data.latestWaterTest.ph : 'No test'}** (Optimal: 7.0–8.5)
  - Temperature: **${data.latestWaterTest.temperature != null ? data.latestWaterTest.temperature + ' °C' : 'N/A'}**
  - Total Ammonia (TAN): **${data.latestWaterTest.totalAmmonia != null ? data.latestWaterTest.totalAmmonia + ' mg/L' : 'Not tested'}**
  - Nitrite (NO2): **${data.latestWaterTest.nitrite != null ? data.latestWaterTest.nitrite + ' mg/L' : 'Not tested'}**`
    : '- No manual water-quality tests recorded for today.'
}
${
  data.latestSensorReading
    ? `- ESP32 Continuous Sensor Node (${data.latestSensorReading.deviceId}):
  - Live Water Temperature: **${data.latestSensorReading.value} ${data.latestSensorReading.unit}** (measured at ${new Date(data.latestSensorReading.measuredAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila' })})`
    : '- No real-time ESP32 sensor telemetry received in the past cycle.'
}

### 3. Biological & Feeding Observations
- Initial Stocking: **${data.biological.initialStock.toLocaleString()} juveniles**
- Cumulative Recorded Mortality: **${data.biological.mortalityCount} pcs**
- Estimated Survival Rate: **${data.biological.survivalRatePercent != null ? data.biological.survivalRatePercent + '%' : 'Insufficient data'}**
- Total Feed Consumed to Date: **${data.biological.totalFeedConsumedKg} kg**
- Latest Sampled Average Body Weight (ABW): **${data.biological.latestAbwGrams != null ? data.biological.latestAbwGrams + ' g' : 'No recent sampling'}**
- Current Estimated Biomass: **${data.biological.estimatedBiomassKg != null ? data.biological.estimatedBiomassKg + ' kg' : 'Awaiting ABW sampling'}**

### 4. Financial & Operating Costs
- Cumulative Cash Operating Expenses: **₱${data.finance.totalOpexCashPhp.toLocaleString()}**
- Cumulative Realized Revenue: **₱${data.finance.totalRevenuePhp.toLocaleString()}**
- Net Cash Operating Result: **₱${data.finance.cashProfitPhp.toLocaleString()}**

### 5. Missing Data & Unreliable Observations
${
  data.missingDataNotes.length > 0
    ? data.missingDataNotes.map((n) => `- ⚠️ ${n}`).join('\n')
    : '- All scheduled logs and sensor check-ins are up to date.'
}

### 6. Active Risks & Recommended On-Site Verification
${
  data.alertsList.length > 0
    ? data.alertsList.map((a) => `- **[${a.severity.toUpperCase()}] ${a.title}**: ${a.description}`).join('\n')
    : '- No high-priority biological or equipment risks identified at this time.'
}
- Recommended Farm Routine: Inspect pond surface for early morning piping/gasping behavior, check feed check-trays 2 hours post-feed, and verify aerator belt tension.
  `.trim();

  // 2. If Gemini API key is configured, synthesize with strict instructions
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const prompt = `You are the lead aquaculture specialist and technical operations advisor for HQ16 Agri Labs, advising a family freshwater prawn (Macrobrachium rosenbergii / ulang) farm in Bicol, Philippines.
Given the verified farm telemetry and records below, generate a professional, highly structured, actionable Daily Farm Management Intelligence Briefing.

STRICT ACCURACY RULES:
1. NEVER hallucinate, invent, or extrapolate sensor readings, mortality, costs, or harvest quantities not explicitly present in the data.
2. Distinguish verified facts from calculations and estimates.
3. Emphasize practical actions for Philippine tropical conditions (Bicol weather, monsoon/typhoon vulnerability, pond oxygen drop before sunrise).
4. Clearly list missing or delayed data points.
5. Format with clear Markdown headings.

VERIFIED FARM DATA:
${JSON.stringify(data, null, 2)}
`;

      const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      for (const model of candidateModels) {
        let attempts = 0;
        while (attempts < 2) {
          attempts++;
          try {
            const response = await ai.models.generateContent({
              model,
              contents: prompt,
            });

            if (response.text) {
              let finalReport = response.text;
              if (!finalReport.includes('Missing Data & Unreliable Observations') && !finalReport.includes('Missing Data')) {
                finalReport += `\n\n### 5. Missing Data & Unreliable Observations\n` +
                  (data.missingDataNotes.length > 0 ? data.missingDataNotes.map((n) => `- ⚠️ ${n}`).join('\n') : '- All scheduled parameters verified.');
              }
              return {
                reportText: finalReport,
                summaryText: finalReport,
                reportDate: timestamp,
                source: 'gemini_ai',
                generatedBy: model,
                generatedAt: timestamp,
              };
            }
          } catch (mErr: any) {
            const msg = mErr?.message || '';
            const is503 = mErr?.status === 'UNAVAILABLE' || msg.includes('503') || msg.includes('high demand');
            if (is503 && attempts === 1) {
              await new Promise((resolve) => setTimeout(resolve, 600));
              continue;
            }
            console.log(`[AquaOS AI] Model ${model} ${is503 ? 'temporarily busy (503)' : 'encountered error'}, checking next fallback...`);
            break;
          }
        }
      }
    } catch (err: any) {
      console.log('[AquaOS AI] AI inference fallback activated, using deterministic engine:', err?.message || 'Service busy');
    }
  }

  return {
    reportText: deterministicReport,
    summaryText: deterministicReport,
    reportDate: timestamp,
    source: 'deterministic-engine',
    generatedBy: 'deterministic-engine',
    generatedAt: timestamp,
  };
}
