export function generateEsp32Firmware(params: {
  deviceId: string;
  pondIdentifier: string;
  apiEndpointUrl: string;
  deviceApiKey: string;
}): string {
  return `/*
 * HQ16 Agri Labs - AquaOS ESP32 Sensor Node Firmware
 * Target: ESP32 DevKit v1 + Waterproof DS18B20 Temperature Probe
 * Location: Bicol Freshwater Prawn (Macrobrachium rosenbergii) Farm
 *
 * Hardware Wiring:
 * - ESP32 3V3       --> DS18B20 Red (VCC)
 * - ESP32 GND       --> DS18B20 Black/Blue (GND)
 * - ESP32 GPIO 4    --> DS18B20 Yellow (DATA)
 * - 4.7kΩ Resistor  --> Connected between GPIO 4 (DATA) and 3V3 (VCC)
 *
 * Required Arduino IDE Libraries:
 * 1. OneWire (by Jim Studt, Paul Stoffregen)
 * 2. DallasTemperature (by Miles Burton)
 * 3. ArduinoJson (by Benoit Blanchon, v6.x or v7.x)
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>
#include <time.h>

// Wi-Fi Credentials
const char* WIFI_SSID     = "YOUR_FARM_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_FARM_WIFI_PASSWORD";

// AquaOS Ingestion Configuration
const char* API_INGEST_URL = "${params.apiEndpointUrl}";
const char* DEVICE_ID      = "${params.deviceId}";
const char* POND_ID        = "${params.pondIdentifier}";
const char* DEVICE_API_KEY = "${params.deviceApiKey}";

// Hardware Configuration
const int ONE_WIRE_BUS = 4; // GPIO4
const unsigned long MEASUREMENT_INTERVAL_MS = 300000; // 300 seconds (5 minutes)

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// NTP Configuration (Asia/Manila: UTC+8)
const char* NTP_SERVER = "pool.ntp.org";
const long  GMT_OFFSET_SEC = 28800; // +8 hours
const int   DAYLIGHT_OFFSET_SEC = 0;

void setupWifi() {
  Serial.print("Connecting to Wi-Fi ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\\nWiFi connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\\nWiFi connection failed! Will retry in main loop.");
  }
}

String getCurrentIsoTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain NTP time, using millis timestamp fallback");
    char fallbackBuf[64];
    snprintf(fallbackBuf, sizeof(fallbackBuf), "2026-09-20T00:00:00+08:00");
    return String(fallbackBuf);
  }
  char timeStringBuff[64];
  strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%dT%H:%M:%S+08:00", &timeinfo);
  return String(timeStringBuff);
}

String generateUuid() {
  uint32_t r1 = esp_random();
  uint32_t r2 = esp_random();
  uint32_t r3 = esp_random();
  uint32_t r4 = esp_random();
  char uuidBuf[40];
  snprintf(uuidBuf, sizeof(uuidBuf), "%08x-%04x-%04x-%04x-%08x%04x",
           r1, (uint16_t)(r2 >> 16), (uint16_t)(r2 & 0xFFFF),
           (uint16_t)(r3 >> 16), r4, (uint16_t)(r3 & 0xFFFF));
  return String(uuidBuf);
}

void transmitTemperature(float tempC) {
  if (WiFi.status() != WL_CONNECTED) {
    setupWifi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  WiFiClientSecure client;
  client.setInsecure(); // For custom cloud-run / dev certificates. Use setCACert in strict production.

  HTTPClient http;
  if (!http.begin(client, API_INGEST_URL)) {
    Serial.println("Unable to connect to AquaOS API endpoint");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Api-Key", DEVICE_API_KEY);

  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["pond_id"] = POND_ID;
  doc["event_id"] = generateUuid();
  doc["parameter"] = "temperature";
  doc["value"] = serialized(String(tempC, 2));
  doc["unit"] = "celsius";
  doc["measured_at"] = getCurrentIsoTimestamp();

  String requestBody;
  serializeJson(doc, requestBody);

  Serial.println("Transmitting payload: " + requestBody);
  int httpResponseCode = http.POST(requestBody);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("HTTP Code: %d, Response: %s\\n", httpResponseCode, response.c_str());
  } else {
    Serial.printf("HTTP Ingestion Error: %s\\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("--- HQ16 Agri Labs: AquaOS ESP32 Sensor Starting ---");

  sensors.begin();
  sensors.setResolution(12); // 12-bit precision (0.0625°C resolution)

  setupWifi();
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
}

void loop() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);

  // Validate sensor reading (-127C indicates disconnected DS18B20)
  if (tempC == DEVICE_DISCONNECTED_C || tempC < -10.0 || tempC > 60.0) {
    Serial.println("Error: DS18B20 probe disconnected or reading invalid (" + String(tempC) + " °C)");
  } else {
    Serial.printf("Pond Temperature: %.2f °C\\n", tempC);
    transmitTemperature(tempC);
  }

  // Deep sleep or light delay for 300 seconds
  delay(MEASUREMENT_INTERVAL_MS);
}
`;
}
