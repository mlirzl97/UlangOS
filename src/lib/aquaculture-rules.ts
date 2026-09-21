export interface RuleDefinition {
  ruleCode: string;
  parameter: string;
  minVal: number | null;
  maxVal: number | null;
  unit: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  recommendation: string;
  version: string;
}

export const DEFAULT_ULANG_OPERATING_RULES: RuleDefinition[] = [
  {
    ruleCode: 'RULE_TEMP_OPTIMAL',
    parameter: 'temperature',
    minVal: 27.0,
    maxVal: 31.5,
    unit: 'celsius',
    severity: 'warning',
    description: 'Freshwater prawn (ulang) optimum grow-out temperature is 28–31°C.',
    recommendation: 'Check pond shade, water depth, and aerator circulation. Temperatures below 26°C depress feed intake; above 32°C decrease dissolved oxygen capacity.',
    version: '1.0',
  },
  {
    ruleCode: 'RULE_DO_CRITICAL',
    parameter: 'dissolved_oxygen',
    minVal: 4.0,
    maxVal: null,
    unit: 'mg/L',
    severity: 'critical',
    description: 'Dissolved Oxygen is below safe threshold (<4.0 mg/L) for Macrobrachium rosenbergii.',
    recommendation: 'Immediately turn on paddlewheel aerators or emergency blowers. Cease feeding until DO rises above 5.0 mg/L.',
    version: '1.0',
  },
  {
    ruleCode: 'RULE_PH_RANGE',
    parameter: 'ph',
    minVal: 7.0,
    maxVal: 8.5,
    unit: 'pH',
    severity: 'warning',
    description: 'Pond pH is outside optimal range (7.0 - 8.5).',
    recommendation: 'If pH < 7.0, apply agricultural lime (calcium carbonate). If pH > 8.8 in late afternoon, increase water exchange or aeration to mitigate phytoplankton blooms.',
    version: '1.0',
  },
  {
    ruleCode: 'RULE_AMMONIA_MAX',
    parameter: 'total_ammonia',
    minVal: null,
    maxVal: 1.0,
    unit: 'mg/L',
    severity: 'critical',
    description: 'Total Ammonia Nitrogen (TAN) exceeds 1.0 mg/L.',
    recommendation: 'Perform 20–30% water exchange with clean, well-aerated source water. Reduce feed ration by 50% immediately.',
    version: '1.0',
  },
  {
    ruleCode: 'RULE_NITRITE_MAX',
    parameter: 'nitrite',
    minVal: null,
    maxVal: 0.25,
    unit: 'mg/L',
    severity: 'warning',
    description: 'Nitrite (NO2-) is elevated (>0.25 mg/L).',
    recommendation: 'High nitrite impedes prawn oxygen uptake. Check biofilter or pond bottom condition and add salt/calcium chloride if recommended by farm protocol.',
    version: '1.0',
  },
  {
    ruleCode: 'RULE_SENSOR_HEARTBEAT',
    parameter: 'sensor_heartbeat',
    minVal: null,
    maxVal: 900, // 15 minutes in seconds
    unit: 'seconds',
    severity: 'warning',
    description: 'ESP32 temperature node has not transmitted data in over 15 minutes.',
    recommendation: 'Inspect ESP32 power supply, DS18B20 probe wiring on GPIO4, and Wi-Fi / cellular connectivity in Bicol.',
    version: '1.0',
  },
  {
    ruleCode: 'RULE_WATER_TEST_SCHEDULE',
    parameter: 'water_test_cadence',
    minVal: null,
    maxVal: 86400, // 24 hours
    unit: 'seconds',
    severity: 'info',
    description: 'No manual water test recorded in the past 24 hours.',
    recommendation: 'Perform manual morning (06:00) and afternoon (16:00) DO and pH checks using digital test meter or test kit.',
    version: '1.0',
  },
];
