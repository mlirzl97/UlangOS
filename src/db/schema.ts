import { boolean, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users (Linked with Firebase Auth UID)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Farms
export const farms = pgTable('farms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  timezone: text('timezone').default('Asia/Manila').notNull(),
  responsibleOperator: text('responsible_operator').notNull(),
  status: text('status').default('active').notNull(), // active, maintenance, inactive
  isDemo: boolean('is_demo').default(false).notNull(),
  ownerId: text('owner_id').notNull(), // uid of creator
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  cctvStreams: jsonb('cctv_streams'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Farm Members (Role-Based Access: owner, operator, viewer)
export const farmMembers = pgTable('farm_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').notNull(), // Firebase UID
  userEmail: text('user_email').notNull(),
  role: text('role').default('operator').notNull(), // 'owner' | 'operator' | 'viewer'
  invitedAt: timestamp('invited_at').defaultNow().notNull(),
});

// 4. Ponds and Tanks
export const ponds = pgTable('ponds', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  identifier: text('identifier').notNull(), // e.g. "POND-001"
  cultureMethod: text('culture_method').default('semi_intensive').notNull(),
  pondType: text('pond_type').default('earthen_pond').notNull(),
  areaSqM: numeric('area_sq_m'),
  waterVolumeM3: numeric('water_volume_m3'),
  avgDepthM: numeric('avg_depth_m'),
  status: text('status').default('active').notNull(), // active, fallow, preparing, harvesting, maintenance
  installationDate: text('installation_date'),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Production Batches (Historical preservation)
export const batches = pgTable('batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  pondId: uuid('pond_id').references(() => ponds.id, { onDelete: 'cascade' }).notNull(),
  batchIdentifier: text('batch_identifier').notNull(), // e.g. "BATCH-2026-01-ULANG"
  species: text('species').default('Macrobrachium rosenbergii (Ulang)').notNull(),
  stockingDate: text('stocking_date').notNull(), // YYYY-MM-DD
  initialStockQuantity: integer('initial_stock_quantity').notNull(),
  currentEstimatedSurvival: numeric('current_estimated_survival').default('100.00'),
  sourcePlJuveniles: text('source_pl_juveniles'),
  stockingCost: numeric('stocking_cost').default('0.00'), // PHP
  status: text('status').default('active').notNull(), // active, completed, terminated
  targetHarvestDate: text('target_harvest_date'),
  closedAt: timestamp('closed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Devices (ESP32 IoT Nodes)
export const devices = pgTable('devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  pondId: uuid('pond_id').references(() => ponds.id, { onDelete: 'set null' }),
  deviceId: text('device_id').notNull().unique(), // e.g. "HQ16-NODE-001"
  name: text('name').notNull(),
  deviceType: text('device_type').default('esp32_ds18b20').notNull(),
  apiKeyHash: text('api_key_hash').notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  lastSeenAt: timestamp('last_seen_at'),
  hardwareSpecs: jsonb('hardware_specs'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Sensor Readings (High-frequency IoT ingestion)
export const sensorReadings = pgTable('sensor_readings', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  pondId: uuid('pond_id').references(() => ponds.id, { onDelete: 'cascade' }).notNull(),
  deviceId: text('device_id').notNull(),
  eventId: text('event_id').notNull().unique(), // idempotency / deduplication
  parameter: text('parameter').notNull(), // e.g. "temperature"
  value: numeric('value').notNull(),
  unit: text('unit').notNull(), // "celsius"
  measuredAt: timestamp('measured_at').notNull(),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
  isValid: boolean('is_valid').default(true).notNull(),
  notes: text('notes'),
});

// 8. Water Tests (Manual or digital water-quality parameters)
export const waterTests = pgTable('water_tests', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  pondId: uuid('pond_id').references(() => ponds.id, { onDelete: 'cascade' }).notNull(),
  batchId: uuid('batch_id').references(() => batches.id, { onDelete: 'set null' }),
  testedAt: timestamp('tested_at').notNull(),
  temperature: numeric('temperature'),
  dissolvedOxygen: numeric('dissolved_oxygen'), // mg/L
  ph: numeric('ph'),
  totalAmmonia: numeric('total_ammonia'), // mg/L
  nitrite: numeric('nitrite'), // mg/L
  alkalinity: numeric('alkalinity'), // mg/L CaCO3
  salinity: numeric('salinity'), // ppt
  transparency: numeric('transparency'), // cm
  sourceType: text('source_type').default('manual_digital_meter').notNull(), // iot_sensor, manual_digital_meter, chemical_test_kit, lab_result
  testedBy: text('tested_by').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. Feed Logs (Daily feeding records)
export const feedLogs = pgTable('feed_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  pondId: uuid('pond_id').references(() => ponds.id, { onDelete: 'cascade' }).notNull(),
  batchId: uuid('batch_id').references(() => batches.id, { onDelete: 'set null' }),
  fedAt: timestamp('fed_at').notNull(),
  feedType: text('feed_type').notNull(), // e.g. "Grower Pellet 30% CP"
  quantityKg: numeric('quantity_kg').notNull(),
  feedingTrayCheck: text('feeding_tray_check'), // consumed_100, consumed_80, leftover_30, unconsumed
  costPerKg: numeric('cost_per_kg'),
  totalCost: numeric('total_cost'),
  operatorName: text('operator_name').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 10. Stock Events (Stocking, mortality, water exchange, aerator events)
export const stockEvents = pgTable('stock_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  pondId: uuid('pond_id').references(() => ponds.id, { onDelete: 'cascade' }).notNull(),
  batchId: uuid('batch_id').references(() => batches.id, { onDelete: 'cascade' }).notNull(),
  eventType: text('event_type').notNull(), // 'stocking', 'mortality', 'sampling', 'water_exchange', 'aeration_issue', 'maintenance', 'intervention'
  eventDate: timestamp('event_date').notNull(),
  quantity: integer('quantity'),
  details: jsonb('details'),
  operatorName: text('operator_name').notNull(),
  photoUrl: text('photo_url'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Growth Samples (Sampling metrics, ABW, biomass estimates)
export const growthSamples = pgTable('growth_samples', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  pondId: uuid('pond_id').references(() => ponds.id, { onDelete: 'cascade' }).notNull(),
  batchId: uuid('batch_id').references(() => batches.id, { onDelete: 'cascade' }).notNull(),
  sampleDate: text('sample_date').notNull(), // YYYY-MM-DD
  sampleCount: integer('sample_count').notNull(),
  avgWeightGrams: numeric('avg_weight_grams').notNull(),
  minWeightGrams: numeric('min_weight_grams'),
  maxWeightGrams: numeric('max_weight_grams'),
  estimatedSurvivalPercent: numeric('estimated_survival_percent'),
  estimatedTotalBiomassKg: numeric('estimated_total_biomass_kg'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. Expenses (Financial Management: Capex vs Opex, Cash vs Accrued)
export const expenses = pgTable('expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  pondId: uuid('pond_id').references(() => ponds.id, { onDelete: 'set null' }),
  batchId: uuid('batch_id').references(() => batches.id, { onDelete: 'set null' }),
  category: text('category').notNull(), // 'capital_expenditure', 'operating_expenses', 'feed_purchase', 'seedling_juveniles', 'electricity', 'water', 'labor', 'maintenance', 'transportation', 'owner_contributed', 'other'
  expenseType: text('expense_type').default('opex').notNull(), // 'capex' | 'opex'
  amountPhp: numeric('amount_php').notNull(),
  paymentDate: text('payment_date').notNull(), // YYYY-MM-DD
  payeeVendor: text('payee_vendor'),
  description: text('description').notNull(),
  isConsumed: boolean('is_consumed').default(true).notNull(), // distinguishes cash purchase vs consumed
  receiptUrl: text('receipt_url'),
  recordedBy: text('recorded_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Inventory Transactions (Feed and supply stores)
export const inventoryTransactions = pgTable('inventory_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  itemType: text('item_type').notNull(), // 'feed', 'chemical_treatment', 'probiotic', 'fuel', 'spare_part'
  itemName: text('item_name').notNull(),
  transactionType: text('transaction_type').notNull(), // 'purchase_in', 'consumption_out', 'spoilage_out', 'adjustment'
  quantity: numeric('quantity').notNull(),
  unit: text('unit').notNull(), // 'kg', 'bags', 'liters', 'units'
  unitCostPhp: numeric('unit_cost_php'),
  totalCostPhp: numeric('total_cost_php'),
  referenceId: text('reference_id'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

// 14. Harvests (Partial or final harvest with grading)
export const harvests = pgTable('harvests', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  pondId: uuid('pond_id').references(() => ponds.id, { onDelete: 'cascade' }).notNull(),
  batchId: uuid('batch_id').references(() => batches.id, { onDelete: 'cascade' }).notNull(),
  harvestType: text('harvest_type').default('partial').notNull(), // 'partial' | 'final'
  harvestDate: text('harvest_date').notNull(), // YYYY-MM-DD
  quantityPcs: integer('quantity_pcs'),
  totalWeightKg: numeric('total_weight_kg').notNull(),
  avgWeightGrams: numeric('avg_weight_grams'),
  gradeClassification: text('grade_classification'), // e.g. "Jumbo (>40g)", "Large (30-40g)", "Medium (20-30g)"
  notes: text('notes'),
  recordedBy: text('recorded_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 15. Sales (Commercial revenue tracking)
export const sales = pgTable('sales', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  batchId: uuid('batch_id').references(() => batches.id, { onDelete: 'set null' }),
  harvestId: uuid('harvest_id').references(() => harvests.id, { onDelete: 'set null' }),
  saleDate: text('sale_date').notNull(), // YYYY-MM-DD
  buyerName: text('buyer_name').notNull(),
  weightSoldKg: numeric('weight_sold_kg').notNull(),
  pricePerKgPhp: numeric('price_per_kg_php').notNull(),
  totalRevenuePhp: numeric('total_revenue_php').notNull(),
  paymentStatus: text('payment_status').default('paid').notNull(), // 'paid', 'receivable_pending', 'partial'
  recordedBy: text('recorded_by').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 16. Operating Rules (Species specific thresholds, e.g. Macrobrachium rosenbergii)
export const operatingRules = pgTable('operating_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  species: text('species').default('Macrobrachium rosenbergii').notNull(),
  ruleCode: text('rule_code').notNull(),
  parameter: text('parameter').notNull(),
  minVal: numeric('min_val'),
  maxVal: numeric('max_val'),
  unit: text('unit'),
  severity: text('severity').default('warning').notNull(), // 'info', 'warning', 'critical'
  description: text('description').notNull(),
  recommendation: text('recommendation').notNull(),
  version: text('version').default('1.0').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

// 17. Alerts (Operational notifications and exceptions)
export const alerts = pgTable('alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  pondId: uuid('pond_id').references(() => ponds.id, { onDelete: 'set null' }),
  ruleCode: text('rule_code').notNull(),
  severity: text('severity').notNull(), // 'info', 'warning', 'critical'
  title: text('title').notNull(),
  description: text('description').notNull(),
  sourceData: jsonb('source_data'),
  triggeredAt: timestamp('triggered_at').defaultNow().notNull(),
  recommendedVerification: text('recommended_verification'),
  responsiblePerson: text('responsible_person'),
  status: text('status').default('open').notNull(), // 'open', 'acknowledged', 'resolved'
  resolvedAt: timestamp('resolved_at'),
  actionTaken: text('action_taken'),
});

// 18. Action Logs (Audit history for corrective actions)
export const actionLogs = pgTable('action_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  alertId: uuid('alert_id').references(() => alerts.id, { onDelete: 'set null' }),
  actionType: text('action_type').notNull(),
  performedBy: text('performed_by').notNull(),
  notes: text('notes').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// 19. Audit Logs (System-wide trace of modifications and corrections)
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }).notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(), // 'create', 'update', 'delete', 'correction'
  previousState: jsonb('previous_state'),
  newState: jsonb('new_state'),
  performedBy: text('performed_by').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Drizzle Relations
export const farmsRelations = relations(farms, ({ many }) => ({
  ponds: many(ponds),
  batches: many(batches),
  devices: many(devices),
  members: many(farmMembers),
}));

export const pondsRelations = relations(ponds, ({ one, many }) => ({
  farm: one(farms, {
    fields: [ponds.farmId],
    references: [farms.id],
  }),
  batches: many(batches),
  devices: many(devices),
  waterTests: many(waterTests),
  feedLogs: many(feedLogs),
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
  farm: one(farms, {
    fields: [batches.farmId],
    references: [farms.id],
  }),
  pond: one(ponds, {
    fields: [batches.pondId],
    references: [ponds.id],
  }),
  waterTests: many(waterTests),
  feedLogs: many(feedLogs),
  stockEvents: many(stockEvents),
  growthSamples: many(growthSamples),
  harvests: many(harvests),
}));
