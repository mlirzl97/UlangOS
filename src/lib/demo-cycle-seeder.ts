import { db } from '../db/index.ts';
import {
  farms,
  farmMembers,
  ponds,
  batches,
  devices,
  sensorReadings,
  waterTests,
  feedLogs,
  stockEvents,
  growthSamples,
  expenses,
  harvests,
  sales,
  operatingRules,
  alerts,
  actionLogs,
} from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { DEFAULT_ULANG_OPERATING_RULES } from './aquaculture-rules.ts';

export async function seedFullCycleDemoFarm(userId: string, userEmail: string = 'liezlmaigue@gmail.com', forceReset: boolean = true) {
  // 1. Check if demo farm already exists for this user
  const existingFarms = await db.select().from(farms).where(and(eq(farms.isDemo, true), eq(farms.ownerId, userId)));
  const existing = existingFarms[0];

  if (existing && !forceReset) {
    return existing;
  }

  // If forceReset and exists, delete existing demo farm (cascades to all child records)
  if (existing && forceReset) {
    await db.delete(farms).where(eq(farms.id, existing.id));
  }

  // 2. Default CCTV Cameras configuration
  const demoCctvStreams = [
    {
      id: 'CAM-01',
      name: 'CAM 01 - Grow-Out Pond 1 (North Aerators)',
      zone: 'North Dike / Aeration Basin',
      location: 'Pond 1 North Dike',
      status: 'online',
      resolution: '1080p Full HD',
      fps: 30,
      bitrate: '2.8 Mbps',
      hasNightVision: true,
      hasPtz: true,
      presets: ['Main Paddlewheel Hub', 'Water Inlet Filter', 'Feeding Tray Station 1', 'Perimeter Dike View'],
      coords: { lat: 13.5685, lng: 123.2842 },
    },
    {
      id: 'CAM-02',
      name: 'CAM 02 - Nursery Station & Tanks 1-4',
      zone: 'Indoor Nursery Shelter',
      location: 'Concrete Nursery Platform',
      status: 'online',
      resolution: '1080p Full HD',
      fps: 30,
      bitrate: '2.4 Mbps',
      hasNightVision: true,
      hasPtz: true,
      presets: ['Acclimation Tanks 1-2', 'Blower Aeration Manifold', 'Micro-feed Dispenser', 'Testing Bench'],
      coords: { lat: 13.5679, lng: 123.2848 },
    },
    {
      id: 'CAM-03',
      name: 'CAM 03 - Sluice Gate & Biofilter Drainage',
      zone: 'Hydraulic Discharge Canal',
      location: 'Main Sluice Weir',
      status: 'online',
      resolution: '1080p Full HD',
      fps: 25,
      bitrate: '2.1 Mbps',
      hasNightVision: true,
      hasPtz: false,
      presets: ['Water Level Gauge Board', 'Debris Mesh Screen', 'Biofilter Inflow'],
      coords: { lat: 13.5674, lng: 123.2839 },
    },
    {
      id: 'CAM-04',
      name: 'CAM 04 - Solar Power Hub & Feed Storage',
      zone: 'Operations Shed',
      location: 'Central Equipment Warehouse',
      status: 'online',
      resolution: '1080p Full HD',
      fps: 30,
      bitrate: '2.6 Mbps',
      hasNightVision: true,
      hasPtz: true,
      presets: ['Solar MPPT & Inverter Wall', 'Feed Pallets & Sacks', 'Chemical & Lime Store', 'Farm Gate Entry'],
      coords: { lat: 13.5688, lng: 123.2851 },
    },
  ];

  // 3. Create Main Farm
  const [demoFarm] = await db
    .insert(farms)
    .values({
      name: 'HQ16 Demo Farm (Bicol Ulang Station)',
      location: 'Camarines Sur, Bicol, Philippines',
      timezone: 'Asia/Manila',
      responsibleOperator: 'Liezl Maigue & Family',
      status: 'active',
      isDemo: true,
      ownerId: userId,
      latitude: '13.5682',
      longitude: '123.2845',
      cctvStreams: demoCctvStreams,
    })
    .returning();

  // Member
  await db.insert(farmMembers).values({
    farmId: demoFarm.id,
    userId,
    userEmail,
    role: 'owner',
  });

  // Operating Rules
  for (const rule of DEFAULT_ULANG_OPERATING_RULES) {
    await db.insert(operatingRules).values({
      farmId: demoFarm.id,
      species: 'Macrobrachium rosenbergii',
      ruleCode: rule.ruleCode,
      parameter: rule.parameter,
      minVal: rule.minVal != null ? String(rule.minVal) : null,
      maxVal: rule.maxVal != null ? String(rule.maxVal) : null,
      unit: rule.unit,
      severity: rule.severity,
      description: rule.description,
      recommendation: rule.recommendation,
      version: rule.version,
      isActive: true,
    });
  }

  // 4. Ponds
  const [pond1] = await db
    .insert(ponds)
    .values({
      farmId: demoFarm.id,
      name: 'Grow-Out Pond 1 (Main Earthen)',
      identifier: 'POND-001',
      cultureMethod: 'semi_intensive',
      pondType: 'earthen_pond',
      areaSqM: '1000',
      waterVolumeM3: '1200',
      avgDepthM: '1.2',
      status: 'active',
      installationDate: '2026-05-15',
      latitude: '13.5685',
      longitude: '123.2842',
      notes: 'Equipped with perimeter bamboo predator fencing, 1HP paddlewheel aerator, and water inlet filter screen.',
    })
    .returning();

  const [pond2] = await db
    .insert(ponds)
    .values({
      farmId: demoFarm.id,
      name: 'Grow-Out Pond 2 (South Earthen)',
      identifier: 'POND-002',
      cultureMethod: 'semi_intensive',
      pondType: 'earthen_pond',
      areaSqM: '800',
      waterVolumeM3: '960',
      avgDepthM: '1.2',
      status: 'active',
      installationDate: '2026-06-01',
      latitude: '13.5679',
      longitude: '123.2848',
      notes: 'Natural clay bottom pond with bio-enriched substrate for benthic freshwater prawn shelter.',
    })
    .returning();

  const [tank1] = await db
    .insert(ponds)
    .values({
      farmId: demoFarm.id,
      name: 'Nursery Tank 1 (Concrete)',
      identifier: 'TANK-001',
      cultureMethod: 'intensive',
      pondType: 'concrete_tank',
      areaSqM: '120',
      waterVolumeM3: '100',
      avgDepthM: '0.8',
      status: 'active',
      installationDate: '2026-07-15',
      latitude: '13.5689',
      longitude: '123.2846',
      notes: 'High-density postlarvae acclimation tank with root air blower and mesh substrate hiding shelters.',
    })
    .returning();

  // 5. Batches - 120-Day Cycle for Pond 1
  const cycleDays = 120;
  const nowMs = Date.now();
  const stockingDateObj = new Date(nowMs - cycleDays * 24 * 3600 * 1000);
  const stockingDateStr = stockingDateObj.toISOString().split('T')[0];

  const [batch1] = await db
    .insert(batches)
    .values({
      farmId: demoFarm.id,
      pondId: pond1.id,
      batchIdentifier: 'BATCH-2026-01-BICOL',
      species: 'Macrobrachium rosenbergii (Ulang)',
      stockingDate: stockingDateStr,
      initialStockQuantity: 15000,
      currentEstimatedSurvival: '88.50',
      sourcePlJuveniles: 'SEAFDEC-AQD Certified Hatchery (Binangonan)',
      stockingCost: '18750.00', // ₱1.25 per PL-20 juvenile
      status: 'active',
      targetHarvestDate: new Date(nowMs + 15 * 24 * 3600 * 1000).toISOString().split('T')[0],
      notes: 'Stocked at PL-20 stage. Full 120-day grow-out cycle with 3 selective culls performed.',
    })
    .returning();

  // Secondary Nursery Batch
  const nurseryStockDate = new Date(nowMs - 24 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const [batch2] = await db
    .insert(batches)
    .values({
      farmId: demoFarm.id,
      pondId: tank1.id,
      batchIdentifier: 'BATCH-2026-02-NURSERY',
      species: 'Macrobrachium rosenbergii (Ulang)',
      stockingDate: nurseryStockDate,
      initialStockQuantity: 20000,
      currentEstimatedSurvival: '94.20',
      sourcePlJuveniles: 'Bureau of Fisheries and Aquatic Resources (BFAR)',
      stockingCost: '22000.00',
      status: 'active',
      targetHarvestDate: new Date(nowMs + 10 * 24 * 3600 * 1000).toISOString().split('T')[0],
      notes: 'Postlarvae stage PL-15 in concrete nursery tank. Feeding on Artemia and micro-crumble feed.',
    })
    .returning();

  // 6. Devices (ESP32 IoT Nodes)
  const demoApiKey = 'hq16_demo_key_bicol_temp_node_001';
  const demoKeyHash = crypto.createHash('sha256').update(demoApiKey).digest('hex');

  const [device1] = await db
    .insert(devices)
    .values({
      farmId: demoFarm.id,
      pondId: pond1.id,
      deviceId: 'HQ16-NODE-001',
      name: 'ESP32 Pond 1 Temp Node',
      deviceType: 'esp32_ds18b20',
      apiKeyHash: demoKeyHash,
      isEnabled: true,
      lastSeenAt: new Date(),
      hardwareSpecs: {
        microcontroller: 'ESP32 DevKit v1',
        sensor: 'DS18B20 Waterproof Probe',
        dataPin: 'GPIO4',
        voltage: '3.3V',
        solarPanel: '10W Polycrystalline',
        battery: '18650 Li-ion 3200mAh',
        intervalSec: 300,
      },
    })
    .returning();

  // 7. Sensor Readings - 48 Hours of realistic diurnal curve
  for (let i = 48; i >= 0; i--) {
    const readingTime = new Date(nowMs - i * 60 * 60 * 1000);
    const hour = readingTime.getHours();
    // Diurnal cycle: min temp at 05:00 (27.2°C), max temp at 14:00 (30.6°C)
    const baseTemp = 28.5 + Math.sin(((hour - 8) / 24) * Math.PI * 2) * 1.8;
    const noise = (Math.sin(i * 1.7) * 0.25);
    const tempVal = Number((baseTemp + noise).toFixed(2));

    await db.insert(sensorReadings).values({
      farmId: demoFarm.id,
      pondId: pond1.id,
      deviceId: device1.deviceId,
      eventId: `demo-reading-${i}-${readingTime.getTime()}`,
      parameter: 'temperature',
      value: String(tempVal),
      unit: 'celsius',
      measuredAt: readingTime,
      isValid: true,
    });
  }

  // 8. Growth Samples across 120-Day Cycle
  const samplePoints = [
    { day: 14, abw: 0.8, min: 0.5, max: 1.2, count: 50, survival: 98.0, biomass: 11.8, notes: 'Postlarvae acclimated well, feeding vigorously on zooplankton & crumbles' },
    { day: 28, abw: 2.6, min: 1.8, max: 3.5, count: 60, survival: 96.5, biomass: 37.6, notes: 'Good exoskeleton hardness, molting uniform across sampling trays' },
    { day: 42, abw: 6.2, min: 4.5, max: 8.1, count: 50, survival: 94.8, biomass: 88.2, notes: 'Transition to Grower pellet (35% CP). Active benthic foraging behavior' },
    { day: 56, abw: 11.4, min: 8.2, max: 14.6, count: 60, survival: 93.2, biomass: 159.4, notes: 'Sexual dimorphism beginning; early dominant blue-claw males noticeable' },
    { day: 70, abw: 17.5, min: 12.8, max: 22.0, count: 50, survival: 91.8, biomass: 241.0, notes: 'Substrate bamboo shelters occupied; no signs of tail rot or black gill disease' },
    { day: 84, abw: 23.2, min: 16.5, max: 29.4, count: 60, survival: 90.5, biomass: 315.0, notes: 'Pre-marketable size achieved. Feeding trays consumed 100% within 1.5 hours' },
    { day: 98, abw: 28.6, min: 21.0, max: 36.2, count: 50, survival: 89.6, biomass: 384.4, notes: 'First selective cull of large blue claws scheduled this week to relieve density' },
    { day: 112, abw: 32.8, min: 24.5, max: 41.0, count: 60, survival: 88.9, biomass: 437.0, notes: 'Post-selective harvest sampling shows rapid compensatory growth of orange claws' },
    { day: 120, abw: 35.4, min: 26.0, max: 44.5, count: 50, survival: 88.5, biomass: 470.1, notes: 'Prime market size. Average weight 35.4g (approx 28 pcs/kg), ready for final batch cycle closure' },
  ];

  for (const sp of samplePoints) {
    const sDate = new Date(stockingDateObj.getTime() + sp.day * 24 * 3600 * 1000).toISOString().split('T')[0];
    await db.insert(growthSamples).values({
      farmId: demoFarm.id,
      pondId: pond1.id,
      batchId: batch1.id,
      sampleDate: sDate,
      sampleCount: sp.count,
      avgWeightGrams: String(sp.abw),
      minWeightGrams: String(sp.min),
      maxWeightGrams: String(sp.max),
      estimatedSurvivalPercent: String(sp.survival),
      estimatedTotalBiomassKg: String(sp.biomass),
      notes: sp.notes,
    });
  }

  // 9. Water Quality Tests across Cycle
  const waterTestPoints = [
    { daysAgo: 115, timeHour: 6, temp: '27.4', do: '5.2', ph: '7.6', tan: '0.10', no2: '0.01', alk: '105', secchi: '38', notes: 'Initial cycle baseline: clear water, low plankton bloom' },
    { daysAgo: 95, timeHour: 15, temp: '30.8', do: '7.8', ph: '8.2', tan: '0.18', no2: '0.02', alk: '112', secchi: '32', notes: 'Afternoon photosynthetic peak; algal bloom vibrant light green' },
    { daysAgo: 75, timeHour: 6, temp: '28.1', do: '4.8', ph: '7.5', tan: '0.25', no2: '0.03', alk: '110', secchi: '30', notes: 'Pre-dawn DO dipped to 4.8 mg/L; engaged aerator for 3 hours' },
    { daysAgo: 55, timeHour: 15, temp: '30.4', do: '7.2', ph: '8.0', tan: '0.22', no2: '0.02', alk: '115', secchi: '28', notes: 'Mid-cycle health check: dissolved oxygen optimal, prawns active' },
    { daysAgo: 35, timeHour: 6, temp: '28.6', do: '5.4', ph: '7.7', tan: '0.28', no2: '0.04', alk: '118', secchi: '32', notes: 'Routine morning test: calm water, water exchange 10% completed yesterday' },
    { daysAgo: 20, timeHour: 15, temp: '30.2', do: '7.6', ph: '8.1', tan: '0.20', no2: '0.02', alk: '120', secchi: '35', notes: 'Post-selective harvest: transparency increased slightly' },
    { daysAgo: 5, timeHour: 6, temp: '28.4', do: '5.8', ph: '7.8', tan: '0.15', no2: '0.02', alk: '115', secchi: '34', notes: 'Pre-dawn test: paddlewheel running smoothly, DO steady' },
    { daysAgo: 1, timeHour: 14, temp: '30.5', do: '7.5', ph: '8.0', tan: '0.18', no2: '0.02', alk: '118', secchi: '33', notes: 'Yesterday afternoon routine: pond conditions in top prime band' },
    { daysAgo: 0, timeHour: 6, temp: '28.8', do: '6.2', ph: '7.8', tan: '0.14', no2: '0.01', alk: '116', secchi: '35', notes: 'Today morning test: water color green-brown, DO 6.2 mg/L, prawns healthy' },
  ];

  for (const wt of waterTestPoints) {
    const testDate = new Date(nowMs - wt.daysAgo * 24 * 3600 * 1000);
    testDate.setHours(wt.timeHour, 15, 0, 0);

    await db.insert(waterTests).values({
      farmId: demoFarm.id,
      pondId: pond1.id,
      batchId: batch1.id,
      testedAt: testDate,
      temperature: wt.temp,
      dissolvedOxygen: wt.do,
      ph: wt.ph,
      totalAmmonia: wt.tan,
      nitrite: wt.no2,
      alkalinity: wt.alk,
      transparency: wt.secchi,
      sourceType: 'manual_digital_meter',
      testedBy: 'Liezl Maigue',
      notes: wt.notes,
    });
  }

  // 10. Feed Logs across Cycle (Transitioning Starter -> Grower -> Finisher)
  const feedStages = [
    { daysAgo: 110, type: 'Ulang Starter Pellets 40% CP (AquaMaster)', kg: 3.5, tray: 'consumed_100', cost: 68.0, notes: 'Week 2: high protein starter crumble' },
    { daysAgo: 98, type: 'Ulang Starter Pellets 40% CP (AquaMaster)', kg: 5.0, tray: 'consumed_100', cost: 68.0, notes: 'Feeding vigor high, full tray clearance' },
    { daysAgo: 85, type: 'Ulang Grower Pellets 35% CP (Tateh Aqua)', kg: 8.5, tray: 'consumed_100', cost: 62.0, notes: 'Transition to 2.0mm grower sinking pellets' },
    { daysAgo: 70, type: 'Ulang Grower Pellets 35% CP (Tateh Aqua)', kg: 11.0, tray: 'consumed_80_90', cost: 62.0, notes: 'Slight feed leftover in Tray 4 due to overcast skies' },
    { daysAgo: 55, type: 'Ulang Grower Pellets 35% CP (Tateh Aqua)', kg: 13.5, tray: 'consumed_100', cost: 62.0, notes: 'Rapid growth phase, morning ration increased' },
    { daysAgo: 40, type: 'Ulang Finisher Pellets 30% CP (FeedMix)', kg: 16.0, tray: 'consumed_100', cost: 58.0, notes: 'Switch to 3.5mm finisher pellet with squid oil attractant' },
    { daysAgo: 25, type: 'Ulang Finisher Pellets 30% CP (FeedMix)', kg: 17.5, tray: 'consumed_100', cost: 58.0, notes: 'Pre-harvest conditioning ration' },
    { daysAgo: 10, type: 'Ulang Finisher Pellets 30% CP (FeedMix)', kg: 15.0, tray: 'consumed_100', cost: 58.0, notes: 'Adjusted post-harvest ration for remaining stock' },
    { daysAgo: 2, type: 'Ulang Finisher Pellets 30% CP (FeedMix)', kg: 15.5, tray: 'consumed_100', cost: 58.0, notes: 'Tray check 100% clean after 2 hours' },
    { daysAgo: 0, type: 'Ulang Finisher Pellets 30% CP (FeedMix)', kg: 16.0, tray: 'consumed_100', cost: 58.0, notes: 'Today morning feed: delivered across 4 feeding points' },
  ];

  for (const fl of feedStages) {
    const fDate = new Date(nowMs - fl.daysAgo * 24 * 3600 * 1000);
    fDate.setHours(7, 30, 0, 0);
    const totalCost = (fl.kg * fl.cost).toFixed(2);

    await db.insert(feedLogs).values({
      farmId: demoFarm.id,
      pondId: pond1.id,
      batchId: batch1.id,
      fedAt: fDate,
      feedType: fl.type,
      quantityKg: String(fl.kg),
      feedingTrayCheck: fl.tray,
      costPerKg: String(fl.cost),
      totalCost: totalCost,
      operatorName: 'Liezl Maigue',
      notes: fl.notes,
    });
  }

  // 11. Selective Harvests & Commercial Sales
  // Harvest 1 (Day 95)
  const h1Date = new Date(stockingDateObj.getTime() + 95 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const [h1] = await db
    .insert(harvests)
    .values({
      farmId: demoFarm.id,
      pondId: pond1.id,
      batchId: batch1.id,
      harvestType: 'partial',
      harvestDate: h1Date,
      quantityPcs: 2700,
      totalWeightKg: '82.50',
      avgWeightGrams: '30.55',
      gradeClassification: 'Large Blue-Claw (30-35g)',
      notes: 'First selective seine netting to thin out territorial dominant blue-claw males.',
      recordedBy: userEmail,
    })
    .returning();

  await db.insert(sales).values({
    farmId: demoFarm.id,
    batchId: batch1.id,
    harvestId: h1.id,
    saleDate: h1Date,
    buyerName: 'Naga City Seafoods & Grills (Plaza Rizal)',
    weightSoldKg: '82.50',
    pricePerKgPhp: '550.00',
    totalRevenuePhp: '45375.00',
    paymentStatus: 'paid',
    recordedBy: userEmail,
    notes: 'Paid via GCash/Bank Transfer on delivery. Premium live table-grade prawn.',
  });

  // Harvest 2 (Day 110)
  const h2Date = new Date(stockingDateObj.getTime() + 110 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const [h2] = await db
    .insert(harvests)
    .values({
      farmId: demoFarm.id,
      pondId: pond1.id,
      batchId: batch1.id,
      harvestType: 'partial',
      harvestDate: h2Date,
      quantityPcs: 4100,
      totalWeightKg: '135.20',
      avgWeightGrams: '32.98',
      gradeClassification: 'Jumbo & Large Mix (30-40g)',
      notes: 'Second selective harvest using large mesh cast nets. Excellent claw coloration and firm meat.',
      recordedBy: userEmail,
    })
    .returning();

  await db.insert(sales).values({
    farmId: demoFarm.id,
    batchId: batch1.id,
    harvestId: h2.id,
    saleDate: h2Date,
    buyerName: 'Bicol Aquafresh Consolidators (Pili Station)',
    weightSoldKg: '135.20',
    pricePerKgPhp: '580.00',
    totalRevenuePhp: '78416.00',
    paymentStatus: 'paid',
    recordedBy: userEmail,
    notes: 'Sold to regional wholesaler for resort dining in Caramoan and Legazpi.',
  });

  // Harvest 3 (Day 120 - Today)
  const h3Date = new Date(nowMs).toISOString().split('T')[0];
  const [h3] = await db
    .insert(harvests)
    .values({
      farmId: demoFarm.id,
      pondId: pond1.id,
      batchId: batch1.id,
      harvestType: 'partial',
      harvestDate: h3Date,
      quantityPcs: 3250,
      totalWeightKg: '117.40',
      avgWeightGrams: '36.12',
      gradeClassification: 'Jumbo Prime (>35g)',
      notes: 'Pre-final harvest targeting fully grown jumbo specimens for weekend market orders.',
      recordedBy: userEmail,
    })
    .returning();

  await db.insert(sales).values({
    farmId: demoFarm.id,
    batchId: batch1.id,
    harvestId: h3.id,
    saleDate: h3Date,
    buyerName: 'Villa Caceres Hotel & Seafood Bistro',
    weightSoldKg: '117.40',
    pricePerKgPhp: '600.00',
    totalRevenuePhp: '70440.00',
    paymentStatus: 'paid',
    recordedBy: userEmail,
    notes: 'Cash on delivery receipt #HQ16-SL-003.',
  });

  // 12. Capex and Opex Expenses across Full Cycle
  const expenseRecords = [
    // Capex
    { date: '2026-05-18', cat: 'capital_expenditure', type: 'capex', amt: '14500.00', vendor: 'Bicol Agri Machinery Supplies', desc: '1.0 HP Taiwan Style Paddlewheel Aerator with Stainless Shaft' },
    { date: '2026-05-25', cat: 'capital_expenditure', type: 'capex', amt: '18500.00', vendor: 'Naga Solar Power Solutions', desc: '1.2 kW Off-grid Solar Inverter with 48V 100Ah LiFePO4 Backup Battery' },
    { date: '2026-06-02', cat: 'pond_renovation', type: 'capex', amt: '6500.00', vendor: 'Pili Bamboo Crafts & Timber', desc: 'Perimeter Bamboo Predator Screens & Sluice Gate Mesh Wire' },
    // Opex
    { date: stockingDateStr, cat: 'seed_purchase', type: 'opex', amt: '18750.00', vendor: 'SEAFDEC-AQD Hatchery', desc: '15,000 Post-larvae (PL-20) certified Ulang fry with oxygen transport bags' },
    { date: '2026-06-15', cat: 'feed_purchase', type: 'opex', amt: '6800.00', vendor: 'Camarines Feed Supply Center', desc: '4 Bags (100kg) AquaMaster Ulang Starter 40% CP' },
    { date: '2026-07-10', cat: 'feed_purchase', type: 'opex', amt: '12400.00', vendor: 'Camarines Feed Supply Center', desc: '8 Bags (200kg) Tateh Grower 35% CP Prawn Pellets' },
    { date: '2026-08-08', cat: 'feed_purchase', type: 'opex', amt: '14500.00', vendor: 'FeedMix Agri Distribution', desc: '10 Bags (250kg) Finisher 30% CP Sinking Pellets' },
    { date: '2026-07-31', cat: 'electricity', type: 'opex', amt: '2650.00', vendor: 'CASURECO II Electric Coop', desc: 'Month 2 Electricity Bill for nighttime aerator running hours' },
    { date: '2026-08-31', cat: 'electricity', type: 'opex', amt: '3120.00', vendor: 'CASURECO II Electric Coop', desc: 'Month 3 Electricity Bill for aeration and water pump' },
    { date: '2026-07-20', cat: 'water_treatment', type: 'opex', amt: '2400.00', vendor: 'Bicol Aquacare Lime Store', desc: '10 Bags (400kg) Agricultural Limestone (CaCO3) for pH buffering' },
    { date: '2026-08-15', cat: 'labor', type: 'opex', amt: '8000.00', vendor: 'Farm Technician Allowance', desc: 'Bi-monthly technical operations & sampling allowance' },
  ];

  for (const exp of expenseRecords) {
    await db.insert(expenses).values({
      farmId: demoFarm.id,
      pondId: pond1.id,
      batchId: batch1.id,
      category: exp.cat,
      expenseType: exp.type,
      amountPhp: exp.amt,
      paymentDate: exp.date,
      payeeVendor: exp.vendor,
      description: exp.desc,
      isConsumed: true,
      recordedBy: userEmail,
    });
  }

  // 13. Resolved Alerts (Demonstrating operational excellence)
  const [alt1] = await db
    .insert(alerts)
    .values({
      farmId: demoFarm.id,
      pondId: pond1.id,
      ruleCode: 'DO_CRITICAL_LOW',
      severity: 'warning',
      title: 'Nighttime Dissolved Oxygen Below Threshold (4.8 mg/L)',
      description: 'Overcast skies on Day 75 limited algal oxygenation. Pre-dawn sensor reading dropped below 5.0 mg/L minimum benchmark.',
      recommendedVerification: 'Inspect paddlewheel breaker and run backup paddlewheel immediately.',
      responsiblePerson: 'Liezl Maigue',
      status: 'resolved',
      resolvedAt: new Date(nowMs - 45 * 24 * 3600 * 1000),
      actionTaken: 'Auxiliary 1HP paddlewheel activated at 03:00. DO rebounded to 6.4 mg/L by 06:00. No prawn casualties.',
    })
    .returning();

  await db.insert(actionLogs).values({
    farmId: demoFarm.id,
    alertId: alt1.id,
    actionType: 'aeration_adjustment',
    performedBy: userEmail,
    notes: 'Activated backup paddlewheel for 3.5 hours. Monitored DO recovery.',
  });

  const [alt2] = await db
    .insert(alerts)
    .values({
      farmId: demoFarm.id,
      pondId: pond1.id,
      ruleCode: 'PH_RUNOFF_RISK',
      severity: 'warning',
      title: 'Post-Downpour Dike Soil Runoff pH Alert (7.4)',
      description: 'Heavy monsoon shower washed acidic clay particles into Pond 1. Water pH dipped 0.4 units in 6 hours.',
      recommendedVerification: 'Perform digital pH pen test at 4 perimeter pond points.',
      responsiblePerson: 'Liezl Maigue',
      status: 'resolved',
      resolvedAt: new Date(nowMs - 25 * 24 * 3600 * 1000),
      actionTaken: 'Dosed 35kg agricultural limestone along windward dikes. Buffer stabilized pH at 7.8.',
    })
    .returning();

  await db.insert(actionLogs).values({
    farmId: demoFarm.id,
    alertId: alt2.id,
    actionType: 'lime_treatment',
    performedBy: userEmail,
    notes: 'Applied 35kg CaCO3. pH restabilized to 7.85 within 12 hours.',
  });

  return demoFarm;
}
