import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import {
  users,
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
  auditLogs,
} from './src/db/schema.ts';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { requireAuth, requireDeviceAuth, requireFarmRole, AuthRequest, DeviceRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { DEFAULT_ULANG_OPERATING_RULES } from './src/lib/aquaculture-rules.ts';
import { calculateBiologicalMetrics, calculateFinancialMetrics } from './src/lib/aquaculture-math.ts';
import { generateDailyManagementReport, DailyReportData } from './src/lib/daily-report-generator.ts';
import { generateEsp32Firmware } from './src/lib/esp32-firmware.ts';
import { runAquaOsTestSuite } from './src/lib/test-runner.ts';
import { seedFullCycleDemoFarm } from './src/lib/demo-cycle-seeder.ts';
import { getFarmWeatherData } from './src/lib/weather-service.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// ----------------------------------------------------
// Health check
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'HQ16 AquaOS',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    timezone: 'Asia/Manila',
  });
});

// ----------------------------------------------------
// 1. Auth Sync
// ----------------------------------------------------
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email || 'farmer@hq16agrilabs.ph';
    const { displayName, photoUrl } = req.body;

    const profile = await getOrCreateUser(uid, email, displayName, photoUrl);
    res.json(profile);
  } catch (err: any) {
    console.error('Error syncing user:', err);
    res.status(500).json({ error: 'Failed to synchronize user profile' });
  }
});

// ----------------------------------------------------
// 2. Farms Management
// ----------------------------------------------------
app.get('/api/farms', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;

    // Get farms where user is owner or member
    const ownedFarms = await db.select().from(farms).where(eq(farms.ownerId, userId));
    const memberships = await db.select().from(farmMembers).where(eq(farmMembers.userId, userId));
    const memberFarmIds = memberships.map((m) => m.farmId);

    let allFarms = [...ownedFarms];
    if (memberFarmIds.length > 0) {
      for (const fId of memberFarmIds) {
        if (!allFarms.some((f) => f.id === fId)) {
          const extra = await db.select().from(farms).where(eq(farms.id, fId));
          if (extra.length) allFarms.push(extra[0]);
        }
      }
    }

    // Always ensure at least the demo farm is available for viewing if requested
    const demoFarms = await db.select().from(farms).where(eq(farms.isDemo, true));
    for (const df of demoFarms) {
      if (!allFarms.some((f) => f.id === df.id)) {
        allFarms.push(df);
      }
    }

    res.json(allFarms);
  } catch (err: any) {
    console.error('Error fetching farms:', err);
    res.status(500).json({ error: 'Failed to fetch farms' });
  }
});

app.post('/api/farms', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const userEmail = req.user!.email || 'farmer@hq16agrilabs.ph';
    const { name, location, timezone, responsibleOperator, isDemo } = req.body;

    if (!name || !location || !responsibleOperator) {
      return res.status(400).json({ error: 'Name, location, and responsible operator are required' });
    }

    const [newFarm] = await db
      .insert(farms)
      .values({
        name,
        location,
        timezone: timezone || 'Asia/Manila',
        responsibleOperator,
        status: 'active',
        isDemo: Boolean(isDemo),
        ownerId: userId,
      })
      .returning();

    // Add owner to farm_members
    await db.insert(farmMembers).values({
      farmId: newFarm.id,
      userId,
      userEmail,
      role: 'owner',
    });

    // Initialize Default Aquaculture Operating Rules for Macrobrachium rosenbergii (Ulang)
    for (const rule of DEFAULT_ULANG_OPERATING_RULES) {
      await db.insert(operatingRules).values({
        farmId: newFarm.id,
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

    // Audit log
    await db.insert(auditLogs).values({
      farmId: newFarm.id,
      entityType: 'farms',
      entityId: newFarm.id,
      action: 'create',
      newState: newFarm,
      performedBy: userEmail,
    });

    res.status(201).json(newFarm);
  } catch (err: any) {
    console.error('Error creating farm:', err);
    res.status(500).json({ error: 'Failed to create farm' });
  }
});

// Seed or Reset Demo Farm with Full 120-Day Cycle Data
app.post('/api/farms/seed-demo-farm', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const userEmail = req.user!.email || 'demo-farmer@hq16agrilabs.ph';
    const forceReset = req.query.force === 'true' || req.body?.force === true;

    const demoFarm = await seedFullCycleDemoFarm(userId, userEmail, forceReset);
    res.status(201).json({ farm: demoFarm, message: 'Sample demo farm populated with a complete 120-day production cycle, CCTV streams, and Bicol geolocation' });
  } catch (err: any) {
    console.error('Error seeding demo farm:', err);
    res.status(500).json({ error: 'Failed to initialize demo farm: ' + (err.message || String(err)) });
  }
});

// Explicit Reset Full Cycle endpoint
app.post('/api/farms/:farmId/reset-full-cycle', requireAuth, requireFarmRole('operator'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const userEmail = req.user!.email || 'demo-farmer@hq16agrilabs.ph';
    const demoFarm = await seedFullCycleDemoFarm(userId, userEmail, true);
    res.json({ farm: demoFarm, message: 'Production cycle fully reset with 120 days of historical data, CCTV nodes, and sensor telemetry' });
  } catch (err: any) {
    console.error('Error resetting farm full cycle:', err);
    res.status(500).json({ error: 'Failed to reset farm cycle' });
  }
});

// Live Weather & Climate Endpoint
app.get('/api/farms/:farmId/weather', async (req: Request, res: Response) => {
  try {
    const { farmId } = req.params;
    let lat = 13.5682;
    let lon = 123.2845;
    let location = 'Camarines Sur, Bicol, Philippines';

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(farmId);
    if (isUuid) {
      const [farm] = await db.select().from(farms).where(eq(farms.id, farmId));
      if (farm) {
        if (farm.latitude) lat = Number(farm.latitude);
        if (farm.longitude) lon = Number(farm.longitude);
        if (farm.location) location = farm.location;
      }
    }

    const weather = await getFarmWeatherData(lat, lon, location);
    res.json(weather);
  } catch (err: any) {
    console.error('Error in /api/farms/:farmId/weather:', err);
    // Graceful fallback to guaranteed Bicol aquaculture meteorological model
    const fallback = await getFarmWeatherData(13.5682, 123.2845, 'Camarines Sur, Bicol, Philippines');
    res.json(fallback);
  }
});

// CCTV Feeds Endpoint
app.get('/api/farms/:farmId/cctv', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const [farm] = await db.select().from(farms).where(eq(farms.id, farmId));
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    const streams = (farm.cctvStreams as any) || [
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

    res.json(streams);
  } catch (err: any) {
    console.error('Error fetching CCTV streams:', err);
    res.status(500).json({ error: 'Failed to fetch CCTV feeds' });
  }
});

// ----------------------------------------------------
// 3. Ponds & Tanks API
// ----------------------------------------------------
app.get('/api/farms/:farmId/ponds', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const pondList = await db.select().from(ponds).where(eq(ponds.farmId, farmId)).orderBy(ponds.name);
    res.json(pondList);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch ponds' });
  }
});

app.post('/api/farms/:farmId/ponds', requireAuth, requireFarmRole('operator'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const { name, identifier, cultureMethod, pondType, areaSqM, waterVolumeM3, avgDepthM, status, installationDate, notes } = req.body;

    if (!name || !identifier) {
      return res.status(400).json({ error: 'Name and unique identifier are required' });
    }

    const [newPond] = await db
      .insert(ponds)
      .values({
        farmId,
        name,
        identifier,
        cultureMethod: cultureMethod || 'semi_intensive',
        pondType: pondType || 'earthen_pond',
        areaSqM: areaSqM != null ? String(areaSqM) : null,
        waterVolumeM3: waterVolumeM3 != null ? String(waterVolumeM3) : null,
        avgDepthM: avgDepthM != null ? String(avgDepthM) : null,
        status: status || 'active',
        installationDate: installationDate || null,
        notes: notes || null,
      })
      .returning();

    res.status(201).json(newPond);
  } catch (err: any) {
    console.error('Error creating pond:', err);
    res.status(500).json({ error: 'Failed to create pond' });
  }
});

// ----------------------------------------------------
// 4. Production Batches API
// ----------------------------------------------------
app.get('/api/farms/:farmId/batches', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const batchList = await db.select().from(batches).where(eq(batches.farmId, farmId)).orderBy(desc(batches.createdAt));
    const normalized = batchList.map((b) => ({
      ...b,
      currentEstimatedSurvival: b.currentEstimatedSurvival != null ? Number(b.currentEstimatedSurvival) : 100,
      stockingCost: b.stockingCost != null ? Number(b.stockingCost) : 0,
      initialStockQuantity: Number(b.initialStockQuantity) || 0,
    }));
    res.json(normalized);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

app.post('/api/farms/:farmId/batches', requireAuth, requireFarmRole('operator'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const {
      pondId,
      batchIdentifier,
      species,
      stockingDate,
      initialStockQuantity,
      sourcePlJuveniles,
      stockingCost,
      targetHarvestDate,
      notes,
    } = req.body;

    if (!pondId || !batchIdentifier || !stockingDate || !initialStockQuantity) {
      return res.status(400).json({ error: 'Pond, batch identifier, stocking date, and quantity are required' });
    }

    const [newBatch] = await db
      .insert(batches)
      .values({
        farmId,
        pondId,
        batchIdentifier,
        species: species || 'Macrobrachium rosenbergii (Ulang)',
        stockingDate,
        initialStockQuantity: Number(initialStockQuantity),
        currentEstimatedSurvival: '100.00',
        sourcePlJuveniles: sourcePlJuveniles || null,
        stockingCost: stockingCost != null ? String(stockingCost) : '0.00',
        status: 'active',
        targetHarvestDate: targetHarvestDate || null,
        notes: notes || null,
      })
      .returning();

    // Record initial stocking event in stock_events
    await db.insert(stockEvents).values({
      farmId,
      pondId,
      batchId: newBatch.id,
      eventType: 'stocking',
      eventDate: new Date(stockingDate),
      quantity: Number(initialStockQuantity),
      operatorName: req.user?.email || 'Farm Operator',
      notes: `Batch initiated with ${initialStockQuantity} ${species || 'ulang'} juveniles`,
    });

    res.status(201).json(newBatch);
  } catch (err: any) {
    console.error('Error starting batch:', err);
    res.status(500).json({ error: 'Failed to start batch' });
  }
});

// Close / Complete batch without overwriting history
app.post('/api/farms/:farmId/batches/:batchId/close', requireAuth, requireFarmRole('operator'), async (req: AuthRequest, res: Response) => {
  try {
    const { batchId } = req.params;
    const { finalSurvivalPercent, closingNotes } = req.body;

    const [closed] = await db
      .update(batches)
      .set({
        status: 'completed',
        closedAt: new Date(),
        currentEstimatedSurvival: finalSurvivalPercent != null ? String(finalSurvivalPercent) : undefined,
        notes: closingNotes ? sql`concat(${batches.notes}, '\n[Batch Closed]: ', ${closingNotes})` : batches.notes,
      })
      .where(eq(batches.id, batchId))
      .returning();

    res.json(closed);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to close production batch' });
  }
});

// ----------------------------------------------------
// 5. Device Registry & Provisioning
// ----------------------------------------------------
app.get('/api/farms/:farmId/devices', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const devList = await db
      .select({
        id: devices.id,
        farmId: devices.farmId,
        pondId: devices.pondId,
        deviceId: devices.deviceId,
        name: devices.name,
        deviceType: devices.deviceType,
        isEnabled: devices.isEnabled,
        lastSeenAt: devices.lastSeenAt,
        hardwareSpecs: devices.hardwareSpecs,
        createdAt: devices.createdAt,
      })
      .from(devices)
      .where(eq(devices.farmId, farmId))
      .orderBy(devices.name);

    res.json(devList);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

app.post('/api/farms/:farmId/devices', requireAuth, requireFarmRole('owner'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const { deviceId, name, pondId, hardwareSpecs } = req.body;

    if (!deviceId || !name) {
      return res.status(400).json({ error: 'Device ID (e.g. HQ16-NODE-001) and Name are required' });
    }

    // Generate secure device API key
    const rawApiKey = 'hq16_dev_' + crypto.randomBytes(16).toString('hex');
    const apiKeyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');

    const [newDevice] = await db
      .insert(devices)
      .values({
        farmId,
        pondId: pondId || null,
        deviceId,
        name,
        deviceType: 'esp32_ds18b20',
        apiKeyHash,
        isEnabled: true,
        hardwareSpecs: hardwareSpecs || {
          microcontroller: 'ESP32 DevKit v1',
          sensor: 'DS18B20 Waterproof',
          dataPin: 'GPIO4',
          voltage: '3.3V',
          resistor: '4.7kΩ pull-up',
          intervalSec: 300,
        },
      })
      .returning();

    // Return the raw key ONCE so the operator can flash the ESP32
    res.status(201).json({
      device: newDevice,
      rawApiKey,
      instructions: 'Save this API key securely in the ESP32 Arduino sketch. It will not be shown again.',
    });
  } catch (err: any) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'A device with this Device ID already exists' });
    }
    console.error('Error provisioning device:', err);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// Revoke or toggle device credentials
app.post('/api/farms/:farmId/devices/:deviceId/toggle', requireAuth, requireFarmRole('owner'), async (req: AuthRequest, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { isEnabled } = req.body;

    const [updated] = await db
      .update(devices)
      .set({ isEnabled: Boolean(isEnabled) })
      .where(eq(devices.deviceId, deviceId))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update device state' });
  }
});

// Download Arduino firmware customized for this device
app.get('/api/farms/:farmId/devices/:deviceId/firmware', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { farmId, deviceId } = req.params;
    const [dev] = await db.select().from(devices).where(and(eq(devices.farmId, farmId), eq(devices.deviceId, deviceId)));
    if (!dev) return res.status(404).json({ error: 'Device not found' });

    let pondIdentifier = 'POND-001';
    if (dev.pondId) {
      const [pond] = await db.select().from(ponds).where(eq(ponds.id, dev.pondId));
      if (pond) pondIdentifier = pond.identifier;
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const apiEndpointUrl = `${protocol}://${host}/api/sensors/ingest`;

    const code = generateEsp32Firmware({
      deviceId: dev.deviceId,
      pondIdentifier,
      apiEndpointUrl,
      deviceApiKey: 'YOUR_SAVED_DEVICE_KEY_OR_TOKEN',
    });

    res.setHeader('Content-Type', 'text/plain');
    res.send(code);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate firmware' });
  }
});

// ----------------------------------------------------
// 6. Secure ESP32 Sensor Telemetry Ingestion API
// ----------------------------------------------------
app.post('/api/sensors/ingest', requireDeviceAuth, async (req: DeviceRequest, res: Response) => {
  try {
    const { device_id, pond_id, event_id, parameter, value, unit, measured_at } = req.body;

    // 1. Validate payload structure
    if (!device_id || !pond_id || !event_id || !parameter || value === undefined || !unit || !measured_at) {
      return res.status(400).json({
        error: 'Invalid Payload: Missing required fields (device_id, pond_id, event_id, parameter, value, unit, measured_at)',
      });
    }

    // 2. Validate parameter & units
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return res.status(400).json({ error: 'Invalid reading value: must be a numeric float' });
    }

    if (parameter.toLowerCase() === 'temperature') {
      if (unit.toLowerCase() !== 'celsius' && unit.toLowerCase() !== 'c') {
        return res.status(400).json({ error: "Invalid unit for temperature: must be 'celsius'" });
      }
      // Out-of-bounds check for freshwater pond temperature
      if (numValue < 10.0 || numValue > 45.0) {
        return res.status(422).json({
          error: `Biologically improbable water temperature (${numValue}°C). Check DS18B20 probe wiring and sensor connection.`,
          code: 'OUT_OF_RANGE',
        });
      }
    }

    const device = req.deviceRecord!;

    // 3. Resolve Pond: match by ID or identifier (e.g. "POND-001")
    let targetPondId = device.pondId;
    if (pond_id) {
      const matchedPonds = await db
        .select()
        .from(ponds)
        .where(
          and(
            eq(ponds.farmId, device.farmId),
            sql`(${ponds.id}::text = ${pond_id} OR ${ponds.identifier} = ${pond_id})`
          )
        )
        .limit(1);

      if (matchedPonds.length > 0) {
        targetPondId = matchedPonds[0].id;
      } else if (!targetPondId) {
        return res.status(404).json({ error: `Pond '${pond_id}' not found on farm '${device.farmId}'` });
      }
    }

    if (!targetPondId) {
      return res.status(400).json({ error: 'Device is not associated with any pond' });
    }

    // 4. Ingest Reading into PostgreSQL (deduplicate by event_id)
    const measuredDate = new Date(measured_at);
    const serverReceiptTime = new Date();

    const [reading] = await db
      .insert(sensorReadings)
      .values({
        farmId: device.farmId,
        pondId: targetPondId,
        deviceId: device.deviceId,
        eventId: event_id,
        parameter: parameter.toLowerCase(),
        value: String(numValue),
        unit: unit.toLowerCase(),
        measuredAt: isNaN(measuredDate.getTime()) ? serverReceiptTime : measuredDate,
        receivedAt: serverReceiptTime,
        isValid: true,
      })
      .returning();

    // 5. Update device lastSeenAt
    await db.update(devices).set({ lastSeenAt: serverReceiptTime }).where(eq(devices.id, device.id));

    // 6. Check Operating Rules Trigger for Temperature
    if (parameter.toLowerCase() === 'temperature') {
      const activeRules = await db
        .select()
        .from(operatingRules)
        .where(and(eq(operatingRules.farmId, device.farmId), eq(operatingRules.parameter, 'temperature'), eq(operatingRules.isActive, true)));

      for (const rule of activeRules) {
        const minVal = rule.minVal != null ? Number(rule.minVal) : null;
        const maxVal = rule.maxVal != null ? Number(rule.maxVal) : null;

        if ((minVal != null && numValue < minVal) || (maxVal != null && numValue > maxVal)) {
          // Trigger alert
          await db.insert(alerts).values({
            farmId: device.farmId,
            pondId: targetPondId,
            ruleCode: rule.ruleCode,
            severity: rule.severity,
            title: `Water Temperature Threshold Exceeded (${numValue}°C)`,
            description: `${rule.description} Current reading: ${numValue}°C (Optimal: ${minVal ?? '-'} to ${maxVal ?? '-'}°C).`,
            sourceData: { readingId: reading.id, deviceId: device.deviceId, value: numValue, measuredAt: measured_at },
            recommendedVerification: rule.recommendation,
            responsiblePerson: 'Pond Technician / Operator',
            status: 'open',
          });
        }
      }
    }

    res.status(201).json({
      status: 'success',
      ack: 'READING_STORED',
      event_id: reading.eventId,
      received_at: serverReceiptTime.toISOString(),
      value: numValue,
    });
  } catch (err: any) {
    if (err?.code === '23505') {
      // Duplicate event_id
      return res.status(409).json({
        error: 'Duplicate Telemetry: An event with this event_id has already been processed',
        code: 'DUPLICATE_EVENT',
      });
    }
    console.error('Sensor ingestion error:', err);
    res.status(500).json({ error: 'Failed to record sensor reading' });
  }
});

// Telemetry query endpoint for dashboard & charts
app.get('/api/farms/:farmId/telemetry', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const readings = await db
      .select()
      .from(sensorReadings)
      .where(eq(sensorReadings.farmId, farmId))
      .orderBy(asc(sensorReadings.measuredAt))
      .limit(200);

    res.json(readings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch telemetry readings' });
  }
});

// Alias for /api/telemetry/ingest for compatibility
app.post('/api/telemetry/ingest', requireDeviceAuth, async (req: DeviceRequest, res: Response) => {
  // Re-route to same logic as /api/sensors/ingest
  try {
    const { device_id, pond_id, event_id, parameter, value, unit, measured_at } = req.body;
    if (!device_id || !event_id || !parameter || value === undefined) {
      return res.status(400).json({ error: 'Missing required telemetry fields' });
    }

    const device = req.deviceRecord!;
    let targetPondId = device.pondId;
    if (pond_id) {
      const matchedPonds = await db
        .select()
        .from(ponds)
        .where(and(eq(ponds.farmId, device.farmId), sql`(${ponds.id}::text = ${pond_id} OR ${ponds.identifier} = ${pond_id})`))
        .limit(1);
      if (matchedPonds.length > 0) targetPondId = matchedPonds[0].id;
    }

    if (!targetPondId) {
      const firstPond = await db.select().from(ponds).where(eq(ponds.farmId, device.farmId)).limit(1);
      if (firstPond.length > 0) targetPondId = firstPond[0].id;
    }

    if (!targetPondId) {
      return res.status(400).json({ error: 'No pond associated with device' });
    }

    const numValue = Number(value);
    const measuredDate = measured_at ? new Date(measured_at) : new Date();
    const serverReceiptTime = new Date();

    const [reading] = await db
      .insert(sensorReadings)
      .values({
        farmId: device.farmId,
        pondId: targetPondId,
        deviceId: device.deviceId,
        eventId: event_id,
        parameter: parameter.toLowerCase(),
        value: String(numValue),
        unit: unit || 'celsius',
        measuredAt: isNaN(measuredDate.getTime()) ? serverReceiptTime : measuredDate,
        receivedAt: serverReceiptTime,
        isValid: true,
      })
      .returning();

    await db.update(devices).set({ lastSeenAt: serverReceiptTime }).where(eq(devices.id, device.id));

    res.status(201).json({ status: 'success', ack: 'READING_STORED', reading });
  } catch (err: any) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Duplicate telemetry event' });
    }
    console.error('Ingest alias error:', err);
    res.status(500).json({ error: 'Failed to ingest telemetry' });
  }
});

// ----------------------------------------------------
// 7. Water Tests API
// ----------------------------------------------------
app.get('/api/farms/:farmId/water-tests', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const tests = await db.select().from(waterTests).where(eq(waterTests.farmId, farmId)).orderBy(desc(waterTests.testedAt)).limit(100);
    res.json(tests);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch water tests' });
  }
});

app.post('/api/farms/:farmId/water-tests', requireAuth, requireFarmRole('operator'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const {
      pondId,
      batchId,
      testedAt,
      temperature,
      dissolvedOxygen,
      ph,
      totalAmmonia,
      nitrite,
      alkalinity,
      salinity,
      transparency,
      sourceType,
      testedBy,
      notes,
    } = req.body;

    if (!pondId) {
      return res.status(400).json({ error: 'Pond selection is required' });
    }

    const testTime = testedAt ? new Date(testedAt) : new Date();

    const [record] = await db
      .insert(waterTests)
      .values({
        farmId,
        pondId,
        batchId: batchId || null,
        testedAt: testTime,
        temperature: temperature != null && temperature !== '' ? String(temperature) : null,
        dissolvedOxygen: dissolvedOxygen != null && dissolvedOxygen !== '' ? String(dissolvedOxygen) : null,
        ph: ph != null && ph !== '' ? String(ph) : null,
        totalAmmonia: totalAmmonia != null && totalAmmonia !== '' ? String(totalAmmonia) : null,
        nitrite: nitrite != null && nitrite !== '' ? String(nitrite) : null,
        alkalinity: alkalinity != null && alkalinity !== '' ? String(alkalinity) : null,
        salinity: salinity != null && salinity !== '' ? String(salinity) : null,
        transparency: transparency != null && transparency !== '' ? String(transparency) : null,
        sourceType: sourceType || 'manual_digital_meter',
        testedBy: testedBy || req.user?.email || 'Farm Operator',
        notes: notes || null,
      })
      .returning();

    // Check DO & pH Alerts
    if (dissolvedOxygen != null && Number(dissolvedOxygen) < 4.0) {
      await db.insert(alerts).values({
        farmId,
        pondId,
        ruleCode: 'RULE_DO_CRITICAL',
        severity: 'critical',
        title: `Low Dissolved Oxygen Alert (${dissolvedOxygen} mg/L)`,
        description: `DO reading of ${dissolvedOxygen} mg/L is below safe threshold (4.0 mg/L) for Macrobrachium rosenbergii.`,
        recommendedVerification: 'Turn on aerators immediately and hold off morning feeding until DO exceeds 5.0 mg/L.',
        status: 'open',
      });
    }

    if (ph != null && (Number(ph) < 6.8 || Number(ph) > 8.8)) {
      await db.insert(alerts).values({
        farmId,
        pondId,
        ruleCode: 'RULE_PH_RANGE',
        severity: 'warning',
        title: `Pond pH Abnormal (${ph})`,
        description: `Water pH of ${ph} is outside optimal range (7.0 - 8.5).`,
        recommendedVerification: 'Check pond bottom condition and apply agricultural lime if acidic.',
        status: 'open',
      });
    }

    res.status(201).json(record);
  } catch (err: any) {
    console.error('Error saving water test:', err);
    res.status(500).json({ error: 'Failed to record water test' });
  }
});

// ----------------------------------------------------
// 8. Daily Farm Operations (Feed, Stock Events, Samples)
// ----------------------------------------------------
app.get('/api/farms/:farmId/feed-logs', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const logs = await db.select().from(feedLogs).where(eq(feedLogs.farmId, farmId)).orderBy(desc(feedLogs.fedAt)).limit(100);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch feed logs' });
  }
});

app.post('/api/farms/:farmId/feed-logs', requireAuth, requireFarmRole('operator'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const { pondId, batchId, fedAt, feedType, quantityKg, feedingTrayCheck, costPerKg, operatorName, notes } = req.body;

    if (!pondId || !feedType || quantityKg === undefined) {
      return res.status(400).json({ error: 'Pond, feed type, and quantity (kg) are required' });
    }

    const qKg = Number(quantityKg);
    const cKg = costPerKg != null && costPerKg !== '' ? Number(costPerKg) : 0;
    const totalCost = qKg * cKg;

    const [log] = await db
      .insert(feedLogs)
      .values({
        farmId,
        pondId,
        batchId: batchId || null,
        fedAt: fedAt ? new Date(fedAt) : new Date(),
        feedType,
        quantityKg: String(qKg),
        feedingTrayCheck: feedingTrayCheck || null,
        costPerKg: cKg > 0 ? String(cKg) : null,
        totalCost: totalCost > 0 ? String(totalCost) : null,
        operatorName: operatorName || req.user?.email || 'Farm Operator',
        notes: notes || null,
      })
      .returning();

    // Also record an operating expense for feed consumption if cost is known
    if (totalCost > 0) {
      await db.insert(expenses).values({
        farmId,
        pondId,
        batchId: batchId || null,
        category: 'feed_purchase',
        expenseType: 'opex',
        amountPhp: String(totalCost),
        paymentDate: new Date().toISOString().split('T')[0],
        description: `Feed consumed: ${qKg}kg ${feedType}`,
        isConsumed: true,
        recordedBy: operatorName || req.user?.email || 'Farm Operator',
      });
    }

    res.status(201).json(log);
  } catch (err: any) {
    console.error('Error logging feed:', err);
    res.status(500).json({ error: 'Failed to record feed log' });
  }
});

app.get('/api/farms/:farmId/stock-events', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const events = await db.select().from(stockEvents).where(eq(stockEvents.farmId, farmId)).orderBy(desc(stockEvents.eventDate)).limit(100);
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch stock events' });
  }
});

app.post('/api/farms/:farmId/stock-events', requireAuth, requireFarmRole('operator'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const { pondId, batchId, eventType, eventDate, quantity, details, operatorName, photoUrl, notes } = req.body;

    if (!pondId || !eventType) {
      return res.status(400).json({ error: 'Pond and event type are required' });
    }

    const [ev] = await db
      .insert(stockEvents)
      .values({
        farmId,
        pondId,
        batchId,
        eventType,
        eventDate: eventDate ? new Date(eventDate) : new Date(),
        quantity: quantity != null ? Number(quantity) : null,
        details: details || null,
        operatorName: operatorName || req.user?.email || 'Farm Operator',
        photoUrl: photoUrl || null,
        notes: notes || null,
      })
      .returning();

    // Check for unusual mortality spike
    if (eventType === 'mortality' && quantity && Number(quantity) > 50) {
      await db.insert(alerts).values({
        farmId,
        pondId,
        ruleCode: 'RULE_UNUSUAL_MORTALITY',
        severity: 'critical',
        title: `Spike in Recorded Mortality (${quantity} pcs)`,
        description: `Higher than normal prawn mortality recorded on ${new Date(ev.eventDate).toLocaleDateString()}. Immediate inspection required.`,
        recommendedVerification: 'Check dissolved oxygen levels, test ammonia/nitrite, examine dead prawns for shell lesions or gills browning.',
        status: 'open',
      });
    }

    res.status(201).json(ev);
  } catch (err: any) {
    console.error('Error logging stock event:', err);
    res.status(500).json({ error: 'Failed to record stock event' });
  }
});

app.get('/api/farms/:farmId/growth-samples', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const samples = await db.select().from(growthSamples).where(eq(growthSamples.farmId, farmId)).orderBy(desc(growthSamples.sampleDate));
    res.json(samples);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch growth samples' });
  }
});

app.post('/api/farms/:farmId/growth-samples', requireAuth, requireFarmRole('operator'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const { pondId, batchId, sampleDate, sampleCount, avgWeightGrams, minWeightGrams, maxWeightGrams, notes } = req.body;

    if (!pondId || !batchId || !sampleCount || !avgWeightGrams) {
      return res.status(400).json({ error: 'Pond, batch, count, and average body weight (g) are required' });
    }

    // Get current batch stocking info to calculate estimated survival and biomass
    const [batch] = await db.select().from(batches).where(eq(batches.id, batchId));
    const allMortalities = await db
      .select()
      .from(stockEvents)
      .where(and(eq(stockEvents.batchId, batchId), eq(stockEvents.eventType, 'mortality')));
    const totalMort = allMortalities.reduce((acc, m) => acc + (m.quantity || 0), 0);

    const allHarvests = await db.select().from(harvests).where(eq(harvests.batchId, batchId));
    const totalHarvestedCount = allHarvests.reduce((acc, h) => acc + (h.quantityPcs || 0), 0);

    const remainingStock = Math.max(0, (batch?.initialStockQuantity || 0) - totalMort - totalHarvestedCount);
    const abw = Number(avgWeightGrams);
    const estimatedBiomassKg = remainingStock > 0 ? Number(((remainingStock * abw) / 1000).toFixed(2)) : 0;
    const estSurvival = batch?.initialStockQuantity ? Number(((remainingStock / batch.initialStockQuantity) * 100).toFixed(2)) : 100;

    const [sample] = await db
      .insert(growthSamples)
      .values({
        farmId,
        pondId,
        batchId,
        sampleDate: sampleDate || new Date().toISOString().split('T')[0],
        sampleCount: Number(sampleCount),
        avgWeightGrams: String(abw),
        minWeightGrams: minWeightGrams ? String(minWeightGrams) : null,
        maxWeightGrams: maxWeightGrams ? String(maxWeightGrams) : null,
        estimatedSurvivalPercent: String(estSurvival),
        estimatedTotalBiomassKg: String(estimatedBiomassKg),
        notes: notes || null,
      })
      .returning();

    // Update batch with latest survival estimate
    await db.update(batches).set({ currentEstimatedSurvival: String(estSurvival) }).where(eq(batches.id, batchId));

    res.status(201).json(sample);
  } catch (err: any) {
    console.error('Error recording sample:', err);
    res.status(500).json({ error: 'Failed to record growth sample' });
  }
});

// ----------------------------------------------------
// 9. Farm Finance (Expenses, Sales, Profitability)
// ----------------------------------------------------
app.get('/api/farms/:farmId/expenses', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const expList = await db.select().from(expenses).where(eq(expenses.farmId, farmId)).orderBy(desc(expenses.paymentDate));
    res.json(expList);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

app.post('/api/farms/:farmId/expenses', requireAuth, requireFarmRole('operator'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const { pondId, batchId, category, expenseType, amountPhp, paymentDate, payeeVendor, description, isConsumed, receiptUrl } = req.body;

    if (!category || amountPhp === undefined || !description) {
      return res.status(400).json({ error: 'Category, amount (PHP), and description are required' });
    }

    const [exp] = await db
      .insert(expenses)
      .values({
        farmId,
        pondId: pondId || null,
        batchId: batchId || null,
        category,
        expenseType: expenseType || 'opex',
        amountPhp: String(amountPhp),
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        payeeVendor: payeeVendor || null,
        description,
        isConsumed: isConsumed !== undefined ? Boolean(isConsumed) : true,
        receiptUrl: receiptUrl || null,
        recordedBy: req.user?.email || 'Farm Operator',
      })
      .returning();

    res.status(201).json(exp);
  } catch (err: any) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Failed to record expense' });
  }
});

app.get('/api/farms/:farmId/harvests', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const hList = await db.select().from(harvests).where(eq(harvests.farmId, farmId)).orderBy(desc(harvests.harvestDate));
    res.json(hList);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch harvests' });
  }
});

app.post('/api/farms/:farmId/harvests', requireAuth, requireFarmRole('operator'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const { pondId, batchId, harvestType, harvestDate, quantityPcs, totalWeightKg, avgWeightGrams, gradeClassification, notes } = req.body;

    if (!pondId || !batchId || totalWeightKg === undefined) {
      return res.status(400).json({ error: 'Pond, batch, and total weight (kg) are required' });
    }

    const [h] = await db
      .insert(harvests)
      .values({
        farmId,
        pondId,
        batchId,
        harvestType: harvestType || 'partial',
        harvestDate: harvestDate || new Date().toISOString().split('T')[0],
        quantityPcs: quantityPcs ? Number(quantityPcs) : null,
        totalWeightKg: String(totalWeightKg),
        avgWeightGrams: avgWeightGrams ? String(avgWeightGrams) : null,
        gradeClassification: gradeClassification || null,
        notes: notes || null,
        recordedBy: req.user?.email || 'Farm Operator',
      })
      .returning();

    res.status(201).json(h);
  } catch (err: any) {
    console.error('Error recording harvest:', err);
    res.status(500).json({ error: 'Failed to record harvest' });
  }
});

app.get('/api/farms/:farmId/sales', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const sList = await db.select().from(sales).where(eq(sales.farmId, farmId)).orderBy(desc(sales.saleDate));
    res.json(sList);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

app.post('/api/farms/:farmId/sales', requireAuth, requireFarmRole('operator'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const { batchId, harvestId, saleDate, buyerName, weightSoldKg, pricePerKgPhp, paymentStatus, notes } = req.body;

    if (!buyerName || weightSoldKg === undefined || pricePerKgPhp === undefined) {
      return res.status(400).json({ error: 'Buyer name, weight sold (kg), and price per kg (PHP) are required' });
    }

    const wt = Number(weightSoldKg);
    const pr = Number(pricePerKgPhp);
    const totalRev = wt * pr;

    const [s] = await db
      .insert(sales)
      .values({
        farmId,
        batchId: batchId || null,
        harvestId: harvestId || null,
        saleDate: saleDate || new Date().toISOString().split('T')[0],
        buyerName,
        weightSoldKg: String(wt),
        pricePerKgPhp: String(pr),
        totalRevenuePhp: String(totalRev),
        paymentStatus: paymentStatus || 'paid',
        recordedBy: req.user?.email || 'Farm Operator',
        notes: notes || null,
      })
      .returning();

    res.status(201).json(s);
  } catch (err: any) {
    console.error('Error recording sale:', err);
    res.status(500).json({ error: 'Failed to record sale' });
  }
});

// Financial Analytics calculation route
app.get('/api/farms/:farmId/finance-summary', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const expList = await db.select().from(expenses).where(eq(expenses.farmId, farmId));
    const saleList = await db.select().from(sales).where(eq(sales.farmId, farmId));
    const harvestList = await db.select().from(harvests).where(eq(harvests.farmId, farmId));

    const metrics = calculateFinancialMetrics({
      expenses: expList.map((e) => ({
        amountPhp: e.amountPhp,
        expenseType: e.expenseType as 'capex' | 'opex',
        category: e.category,
        isConsumed: e.isConsumed,
      })),
      sales: saleList.map((s) => ({
        totalRevenuePhp: s.totalRevenuePhp,
        paymentStatus: s.paymentStatus,
        weightSoldKg: s.weightSoldKg,
      })),
      harvests: harvestList.map((h) => ({
        totalWeightKg: h.totalWeightKg,
      })),
    });

    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate financial summary' });
  }
});

// ----------------------------------------------------
// 10. HQ16 Intelligence & Rules Engine
// ----------------------------------------------------
app.get('/api/farms/:farmId/alerts', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const alertList = await db.select().from(alerts).where(eq(alerts.farmId, farmId)).orderBy(desc(alerts.triggeredAt));
    res.json(alertList);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

app.post('/api/farms/:farmId/alerts/:alertId/resolve', requireAuth, requireFarmRole('operator'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId, alertId } = req.params;
    const { actionTaken } = req.body;

    const [updated] = await db
      .update(alerts)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        actionTaken: actionTaken || 'Verified by farm operator',
      })
      .where(and(eq(alerts.id, alertId), eq(alerts.farmId, farmId)))
      .returning();

    // Log in action_logs
    await db.insert(actionLogs).values({
      farmId,
      alertId,
      actionType: 'resolve_alert',
      performedBy: req.user?.email || 'Farm Operator',
      notes: actionTaken || 'Marked resolved',
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

app.get('/api/farms/:farmId/operating-rules', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const rules = await db.select().from(operatingRules).where(eq(operatingRules.farmId, farmId));
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// Run Deterministic Rules Evaluation
app.post('/api/farms/:farmId/rules/evaluate', requireAuth, requireFarmRole('operator'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const now = Date.now();
    const newAlertsGenerated: any[] = [];

    // 1. Check Stale Devices (> 15 mins without reporting)
    const activeDevices = await db.select().from(devices).where(and(eq(devices.farmId, farmId), eq(devices.isEnabled, true)));
    for (const dev of activeDevices) {
      if (!dev.lastSeenAt || now - new Date(dev.lastSeenAt).getTime() > 15 * 60 * 1000) {
        const lastMinutes = dev.lastSeenAt ? Math.round((now - new Date(dev.lastSeenAt).getTime()) / 60000) : 'Never';
        // Avoid duplicate open alert for same device
        const existing = await db
          .select()
          .from(alerts)
          .where(and(eq(alerts.farmId, farmId), eq(alerts.ruleCode, 'RULE_SENSOR_HEARTBEAT'), eq(alerts.status, 'open')));
        if (!existing.length) {
          const [alt] = await db
            .insert(alerts)
            .values({
              farmId,
              pondId: dev.pondId,
              ruleCode: 'RULE_SENSOR_HEARTBEAT',
              severity: 'warning',
              title: `ESP32 Telemetry Silent (${dev.name})`,
              description: `Sensor node ${dev.deviceId} has been silent for ${lastMinutes} minutes (Threshold: 15m).`,
              recommendedVerification: 'Check power adapter, Wi-Fi router in Bicol, and GPIO4 wiring.',
              status: 'open',
            })
            .returning();
          newAlertsGenerated.push(alt);
        }
      }
    }

    // 2. Check Overdue Manual Water Test (> 24 hours)
    const latestTest = await db.select().from(waterTests).where(eq(waterTests.farmId, farmId)).orderBy(desc(waterTests.testedAt)).limit(1);
    if (!latestTest.length || now - new Date(latestTest[0].testedAt).getTime() > 24 * 3600 * 1000) {
      const existing = await db
        .select()
        .from(alerts)
        .where(and(eq(alerts.farmId, farmId), eq(alerts.ruleCode, 'RULE_WATER_TEST_SCHEDULE'), eq(alerts.status, 'open')));
      if (!existing.length) {
        const [alt] = await db
          .insert(alerts)
          .values({
            farmId,
            ruleCode: 'RULE_WATER_TEST_SCHEDULE',
            severity: 'info',
            title: 'Daily Water Test Overdue',
            description: 'No manual DO or pH test has been logged for over 24 hours.',
            recommendedVerification: 'Perform morning (06:00) and afternoon (16:00) testing using digital meter or test kit.',
            status: 'open',
          })
          .returning();
        newAlertsGenerated.push(alt);
      }
    }

    res.json({ evaluated: true, newAlertsGenerated });
  } catch (err: any) {
    console.error('Error evaluating rules:', err);
    res.status(500).json({ error: 'Failed to run rules engine' });
  }
});

// Daily AI & Deterministic Management Report
app.get('/api/farms/:farmId/reports/daily-ai', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const [farm] = await db.select().from(farms).where(eq(farms.id, farmId));
    if (!farm) return res.status(404).json({ error: 'Farm not found' });

    // Latest Active Batch
    const activeBatches = await db
      .select()
      .from(batches)
      .where(and(eq(batches.farmId, farmId), eq(batches.status, 'active')))
      .orderBy(desc(batches.stockingDate))
      .limit(1);

    const activeBatch = activeBatches[0];
    const daysSinceStocking = activeBatch?.stockingDate
      ? Math.max(0, Math.floor((Date.now() - new Date(activeBatch.stockingDate).getTime()) / (24 * 3600 * 1000)))
      : 0;

    // Latest Water Test
    const [latestTest] = await db.select().from(waterTests).where(eq(waterTests.farmId, farmId)).orderBy(desc(waterTests.testedAt)).limit(1);

    // Latest Sensor Reading
    const [latestSensor] = await db
      .select()
      .from(sensorReadings)
      .where(eq(sensorReadings.farmId, farmId))
      .orderBy(desc(sensorReadings.measuredAt))
      .limit(1);

    // Biological Data
    const fLogs = await db.select().from(feedLogs).where(eq(feedLogs.farmId, farmId));
    const sEvents = await db.select().from(stockEvents).where(eq(stockEvents.farmId, farmId));
    const gSamples = await db.select().from(growthSamples).where(eq(growthSamples.farmId, farmId)).orderBy(desc(growthSamples.sampleDate)).limit(1);
    const hHarvests = await db.select().from(harvests).where(eq(harvests.farmId, farmId));

    const totalMort = sEvents.filter((e) => e.eventType === 'mortality').reduce((acc, m) => acc + (m.quantity || 0), 0);
    const latestAbw = gSamples.length ? Number(gSamples[0].avgWeightGrams) : null;

    const bio = calculateBiologicalMetrics({
      initialStockQuantity: activeBatch?.initialStockQuantity || 0,
      mortalityCount: totalMort,
      feedLogs: fLogs.map((f) => ({ quantityKg: f.quantityKg })),
      latestAbwGrams: latestAbw,
      harvests: hHarvests.map((h) => ({ totalWeightKg: h.totalWeightKg, quantityPcs: h.quantityPcs })),
    });

    // Finance Data
    const expList = await db.select().from(expenses).where(eq(expenses.farmId, farmId));
    const saleList = await db.select().from(sales).where(eq(sales.farmId, farmId));
    const fin = calculateFinancialMetrics({
      expenses: expList.map((e) => ({
        amountPhp: e.amountPhp,
        expenseType: e.expenseType as 'capex' | 'opex',
        category: e.category,
        isConsumed: e.isConsumed,
      })),
      sales: saleList.map((s) => ({
        totalRevenuePhp: s.totalRevenuePhp,
        paymentStatus: s.paymentStatus,
        weightSoldKg: s.weightSoldKg,
      })),
      harvests: hHarvests.map((h) => ({ totalWeightKg: h.totalWeightKg })),
      stockingCost: activeBatch?.stockingCost || 0,
    });

    // Alerts
    const openAlerts = await db.select().from(alerts).where(and(eq(alerts.farmId, farmId), eq(alerts.status, 'open')));

    const missingNotes: string[] = [];
    if (!latestSensor) missingNotes.push('No continuous ESP32 sensor telemetry recorded.');
    if (!latestTest) missingNotes.push('No manual water-quality test recorded.');
    if (!latestAbw) missingNotes.push('No physical prawn growth sampling (ABW) recorded yet.');

    const reportData: DailyReportData = {
      farmName: farm.name,
      location: farm.location,
      batchIdentifier: activeBatch?.batchIdentifier || 'None',
      species: activeBatch?.species || 'Macrobrachium rosenbergii',
      daysSinceStocking,
      latestWaterTest: latestTest
        ? {
            testedAt: latestTest.testedAt.toISOString(),
            temperature: latestTest.temperature ? Number(latestTest.temperature) : null,
            dissolvedOxygen: latestTest.dissolvedOxygen ? Number(latestTest.dissolvedOxygen) : null,
            ph: latestTest.ph ? Number(latestTest.ph) : null,
            totalAmmonia: latestTest.totalAmmonia ? Number(latestTest.totalAmmonia) : null,
            nitrite: latestTest.nitrite ? Number(latestTest.nitrite) : null,
            sourceType: latestTest.sourceType,
          }
        : null,
      latestSensorReading: latestSensor
        ? {
            measuredAt: latestSensor.measuredAt.toISOString(),
            parameter: latestSensor.parameter,
            value: Number(latestSensor.value),
            unit: latestSensor.unit,
            deviceId: latestSensor.deviceId,
          }
        : null,
      biological: {
        initialStock: bio.initialStock,
        mortalityCount: bio.totalMortalityRecorded,
        estimatedRemainingStock: bio.estimatedRemainingStock,
        survivalRatePercent: bio.survivalRatePercent,
        totalFeedConsumedKg: bio.totalFeedConsumedKg,
        estimatedBiomassKg: bio.estimatedBiomassKg,
        latestAbwGrams: bio.latestAbwGrams,
      },
      finance: {
        totalOpexCashPhp: fin.totalOpexCashPhp,
        totalRevenuePhp: fin.totalRevenuePhp,
        cashProfitPhp: fin.cashOperatingProfitPhp,
      },
      openAlertsCount: openAlerts.length,
      alertsList: openAlerts.map((a) => ({ title: a.title, severity: a.severity, description: a.description })),
      missingDataNotes: missingNotes,
    };

    const generated = await generateDailyManagementReport(reportData);
    res.json(generated);
  } catch (err: any) {
    console.error('Error generating daily report:', err);
    res.status(500).json({ error: 'Failed to generate daily intelligence report' });
  }
});

// Interactive AI Farm Assistant Endpoint (Gemini 3.8 Flash with fallback)
app.post('/api/farms/:farmId/intelligence/ask', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    // Fetch farm and latest context
    const [farm] = await db.select().from(farms).where(eq(farms.id, farmId));
    const [latestTest] = await db.select().from(waterTests).where(eq(waterTests.farmId, farmId)).orderBy(desc(waterTests.testedAt)).limit(1);
    const [latestSensor] = await db.select().from(sensorReadings).where(eq(sensorReadings.farmId, farmId)).orderBy(desc(sensorReadings.measuredAt)).limit(1);
    const activeBatches = await db.select().from(batches).where(and(eq(batches.farmId, farmId), eq(batches.status, 'active'))).limit(1);

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const systemInstruction = `You are the HQ16 AquaOS Senior Aquaculture AI Advisor for small-scale freshwater prawn (Macrobrachium rosenbergii, 'ulang') farming in Bicol, Philippines.
Current Farm Context:
- Farm: ${farm?.name || 'Bicol Farm'}, ${farm?.location || 'Camarines Sur, Philippines'}
- Active Batch: ${activeBatches[0]?.batchIdentifier || 'None'}
- Latest Continuous Water Temperature: ${latestSensor?.value ?? 'None'} °C
- Latest Manual DO: ${latestTest?.dissolvedOxygen ?? 'None'} mg/L (Safe: >5.0 mg/L, Critical: <4.0 mg/L)
- Latest Manual pH: ${latestTest?.ph ?? 'None'} (Safe: 7.0 - 8.5)
- Optimal Temperature Band: 28.0°C – 31.5°C
Always provide concise, operationally actionable advice with specific recommendations on feeding adjustments, aerator operation, and water exchange. Address the farmer with polite, professional phrasing.`;

      const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      for (const model of candidateModels) {
        let attempts = 0;
        while (attempts < 2) {
          attempts++;
          try {
            const response = await ai.models.generateContent({
              model,
              contents: prompt,
              config: {
                systemInstruction,
                temperature: 0.3,
              },
            });

            if (response.text) {
              return res.json({ answer: response.text });
            }
          } catch (mErr: any) {
            const msg = mErr?.message || '';
            const is503 = mErr?.status === 'UNAVAILABLE' || msg.includes('503') || msg.includes('high demand');
            if (is503 && attempts === 1) {
              await new Promise((resolve) => setTimeout(resolve, 600));
              continue;
            }
            console.log(`[AquaOS AI] Ask model ${model} ${is503 ? 'temporarily busy (503)' : 'encountered error'}, checking next fallback...`);
            break;
          }
        }
      }
    }

    // Deterministic fallback if API key is not configured
    const p = prompt.toLowerCase();
    let reply = `[HQ16 Rule-Engine Advisory] Based on standard Philippine Macrobrachium rosenbergii protocols: `;
    if (p.includes('temp') || p.includes('hot') || p.includes('cold')) {
      reply += `Target temperature is 28.0°C–31.5°C. Water above 32°C lowers oxygen solubility; run paddlewheel aerators and check water depth. Temperatures below 26°C depress feed consumption; reduce ration by 25%.`;
    } else if (p.includes('do') || p.includes('oxygen')) {
      reply += `Dissolved oxygen must stay above 5.0 mg/L. At <4.0 mg/L, prawn molting slows and cannibalism rises. If DO is below 4.0 mg/L, immediately turn on mechanical aeration and withhold feed until morning recovery.`;
    } else if (p.includes('feed') || p.includes('fcr')) {
      reply += `Feed with 30-35% crude protein sinking pellets twice daily (morning & late afternoon). Check feeding trays after 2 hours: if >30% remains, cut the next ration by 30%. Target FCR is 1.4–1.8.`;
    } else {
      reply += `Maintain water transparency at 30-40 cm Secchi depth, pH between 7.0 and 8.5, and TAN ammonia below 1.0 mg/L. Regularly sample weights every 14 days to update pond biomass.`;
    }

    res.json({ answer: reply });
  } catch (err: any) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'Failed to process AI recommendation' });
  }
});

// Device Firmware direct query by device ID or identifier
app.get('/api/devices/:deviceId/firmware', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const [dev] = await db
      .select()
      .from(devices)
      .where(sql`(${devices.id}::text = ${deviceId} OR ${devices.deviceId} = ${deviceId})`);
    
    if (!dev) {
      return res.status(404).json({ error: 'Device not found' });
    }

    let pondIdentifier = 'POND-001';
    if (dev.pondId) {
      const [pond] = await db.select().from(ponds).where(eq(ponds.id, dev.pondId));
      if (pond) pondIdentifier = pond.identifier;
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const apiEndpointUrl = `${protocol}://${host}/api/sensors/ingest`;

    const code = generateEsp32Firmware({
      deviceId: dev.deviceId,
      pondIdentifier,
      apiEndpointUrl,
      deviceApiKey: 'YOUR_DEVICE_API_KEY_SAVED_DURING_PROVISIONING',
    });

    res.json({ firmwareSourceCode: code, deviceId: dev.deviceId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate firmware' });
  }
});

// ----------------------------------------------------
// 11. Full Farm Data Export (JSON / CSV)
// ----------------------------------------------------
app.get('/api/farms/:farmId/export', requireAuth, requireFarmRole('viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;
    const format = (req.query.format as string) || 'json';

    const [farm] = await db.select().from(farms).where(eq(farms.id, farmId));
    const pondList = await db.select().from(ponds).where(eq(ponds.farmId, farmId));
    const batchList = await db.select().from(batches).where(eq(batches.farmId, farmId));
    const devList = await db.select().from(devices).where(eq(devices.farmId, farmId));
    const wTests = await db.select().from(waterTests).where(eq(waterTests.farmId, farmId));
    const sReadings = await db.select().from(sensorReadings).where(eq(sensorReadings.farmId, farmId)).limit(500);
    const fLogs = await db.select().from(feedLogs).where(eq(feedLogs.farmId, farmId));
    const sEvents = await db.select().from(stockEvents).where(eq(stockEvents.farmId, farmId));
    const gSamples = await db.select().from(growthSamples).where(eq(growthSamples.farmId, farmId));
    const expList = await db.select().from(expenses).where(eq(expenses.farmId, farmId));
    const hList = await db.select().from(harvests).where(eq(harvests.farmId, farmId));
    const saleList = await db.select().from(sales).where(eq(sales.farmId, farmId));
    const alertList = await db.select().from(alerts).where(eq(alerts.farmId, farmId));

    const exportBundle = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        system: 'HQ16 AquaOS',
        version: '1.0.0',
        farmId,
        format,
      },
      farm,
      ponds: pondList,
      batches: batchList,
      devices: devList.map((d) => ({ ...d, apiKeyHash: '[REDACTED]' })),
      waterTests: wTests,
      sensorReadings: sReadings,
      feedLogs: fLogs,
      stockEvents: sEvents,
      growthSamples: gSamples,
      expenses: expList,
      harvests: hList,
      sales: saleList,
      alerts: alertList,
    };

    if (format === 'csv') {
      // Export primary water tests as CSV for quick spreadsheet analysis
      const headers = ['tested_at', 'pond_id', 'temperature', 'dissolved_oxygen', 'ph', 'ammonia', 'nitrite', 'source', 'tested_by'];
      const rows = wTests.map((t) => [
        t.testedAt.toISOString(),
        t.pondId,
        t.temperature ?? '',
        t.dissolvedOxygen ?? '',
        t.ph ?? '',
        t.totalAmmonia ?? '',
        t.nitrite ?? '',
        t.sourceType,
        `"${t.testedBy}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=aquaos-water-tests-${farmId}.csv`);
      return res.send(csvContent);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=aquaos-backup-${farmId}.json`);
    res.json(exportBundle);
  } catch (err: any) {
    console.error('Error exporting data:', err);
    res.status(500).json({ error: 'Failed to export farm data' });
  }
});

// ----------------------------------------------------
// 12. Self-Test Suite Runner Route
// ----------------------------------------------------
app.post('/api/system/run-tests', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const testReport = await runAquaOsTestSuite();
    res.json(testReport);
  } catch (err: any) {
    console.error('Test suite run error:', err);
    res.status(500).json({ error: 'Failed to run test suite', details: err?.message });
  }
});

// ----------------------------------------------------
// Vite Middleware (Dev vs Prod)
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HQ16 AquaOS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
