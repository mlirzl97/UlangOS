import React, { useState } from 'react';
import {
  Cpu,
  Wifi,
  Key,
  Download,
  Copy,
  Check,
  Play,
  Layers,
  Activity,
  AlertCircle,
  Plus,
  RefreshCw,
  Code,
  ShieldCheck,
} from 'lucide-react';
import { Farm, Pond, Device } from '../types.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card.tsx';
import { Dialog } from './ui/Dialog.tsx';
import { Field, Input, Select } from './ui/Field.tsx';
import { EmptyState } from './ui/EmptyState.tsx';
import { useToast } from './ui/Toast.tsx';

interface Esp32IotHubViewProps {
  farm: Farm;
  ponds: Pond[];
  devices: Device[];
  onRegisterDevice: (data: any) => Promise<any>;
  onSimulateReading: (deviceId: string, apiKey: string, tempVal: number) => Promise<any>;
}

export const Esp32IotHubView: React.FC<Esp32IotHubViewProps> = ({
  farm,
  ponds,
  devices,
  onRegisterDevice,
  onSimulateReading,
}) => {
  const toast = useToast();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(devices[0] || null);
  const [firmwareCode, setFirmwareCode] = useState<string>('');
  const [loadingFirmware, setLoadingFirmware] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newDeviceKey, setNewDeviceKey] = useState<string | null>(null);

  // Simulation state
  const [simTemp, setSimTemp] = useState('29.4');
  const [simApiKey, setSimApiKey] = useState('demo-esp32-api-key-secret-999');
  const [simulating, setSimulating] = useState(false);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

  // New device form
  const [devForm, setDevForm] = useState({
    deviceIdentifier: `ESP32-BICOL-${devices.length + 1}`,
    name: 'Pond 1 Water Probe Station',
    deviceType: 'esp32_sensor_node',
    pondId: ponds[0]?.id || '',
    firmwareVersion: '1.0.4-prod',
  });

  const loadFirmware = async (device: Device) => {
    setSelectedDevice(device);
    setLoadingFirmware(true);
    try {
      const res = await fetch(`/api/devices/${device.id}/firmware`);
      const data = await res.json();
      setFirmwareCode(data.firmwareSourceCode || '');
    } catch (err: any) {
      toast.error('Failed to load firmware', err.message);
    } finally {
      setLoadingFirmware(false);
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterSubmitting(true);
    try {
      const result = await onRegisterDevice({
        farmId: farm.id,
        ...devForm,
      });
      setNewDeviceKey(result.apiKey);
      setIsRegisterModalOpen(false);
      toast.success('Device registered', `Node ${devForm.deviceIdentifier} provisioned.`);
    } catch (err: any) {
      toast.error('Registration failed', err.message);
    } finally {
      setRegisterSubmitting(false);
    }
  };

  const handleSimulate = async () => {
    if (!selectedDevice) {
      toast.error('No device selected', 'Select an active ESP32 node to test telemetry.');
      return;
    }
    setSimulating(true);
    try {
      const devIdent = selectedDevice.deviceIdentifier || selectedDevice.deviceId;
      await onSimulateReading(devIdent, simApiKey, parseFloat(simTemp));
      toast.success('Telemetry packet ingested', `Ingested ${simTemp}°C to pond via API.`);
    } catch (err: any) {
      toast.error('Simulation failed', err.message);
    } finally {
      setSimulating(false);
    }
  };

  const copyCode = () => {
    if (!firmwareCode) return;
    navigator.clipboard.writeText(firmwareCode);
    setCopiedCode(true);
    toast.success('Code copied', 'Arduino C++ sketch copied to clipboard.');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e2dc]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#181a1b]">
            ESP32 IoT & Sensor Station Hub
          </h1>
          <p className="text-xs text-[#67696d] mt-1 leading-normal">
            Direct Dallas DS18B20 hardware telemetry ingestion, cryptographic auth tokens, and firmware generator.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            id="btn-open-register-device-modal"
            variant="primary"
            size="sm"
            onClick={() => setIsRegisterModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Register ESP32 Node
          </Button>
        </div>
      </div>

      {/* Newly Provisioned Secret Key Banner */}
      {newDeviceKey && (
        <div className="p-4 bg-[#fbfbf8] border border-[#194432] rounded-[8px] space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#194432]">
            <Key className="w-4 h-4 text-[#194432]" />
            <span>New ESP32 Device API Authentication Key</span>
          </div>
          <p className="text-xs text-[#55585d]">
            This token is required in your Arduino firmware <code className="bg-[#f0f0ea] px-1 rounded">X-API-Key</code> header to ingest telemetry securely into Cloud SQL.
          </p>
          <div className="flex items-center gap-2">
            <code className="p-2 bg-white border border-[#dcdcd6] rounded-[6px] font-mono text-xs text-[#181a1b] select-all flex-1">
              {newDeviceKey}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(newDeviceKey);
                toast.success('API Key copied', 'Flash into your config.h.');
              }}
              leftIcon={<Copy className="w-3.5 h-3.5" />}
            >
              Copy
            </Button>
          </div>
        </div>
      )}

      {/* Main Grid: Device List & Interactive Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Col: Device List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div>
              <CardTitle>Registered Hardware Nodes</CardTitle>
              <CardDescription>{devices.length} telemetry station{devices.length !== 1 ? 's' : ''}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-[#f0f0ea]">
            {devices.length === 0 ? (
              <EmptyState
                title="No hardware nodes"
                description="Register an ESP32 Dallas probe station to ingest continuous water temperature."
                icon={<Cpu className="w-5 h-5 text-[#194432]" />}
                actionLabel="Register Node"
                onAction={() => setIsRegisterModalOpen(true)}
              />
            ) : (
              devices.map((dev) => {
                const pond = ponds.find((p) => p.id === dev.pondId);
                const isSelected = selectedDevice?.id === dev.id;
                return (
                  <div
                    key={dev.id}
                    onClick={() => setSelectedDevice(dev)}
                    className={`p-3.5 px-4 cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#edf5f0] border-l-2 border-[#194432]' : 'hover:bg-[#fafaf8]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#181a1b] truncate">{dev.name}</span>
                      <Badge variant="success" size="sm" dot>
                        Online
                      </Badge>
                    </div>
                    <div className="text-[11px] font-mono text-[#787a7e] mt-0.5">
                      {dev.deviceIdentifier || dev.deviceId}
                    </div>
                    <div className="text-[11px] text-[#67696d] mt-1 flex items-center gap-2 font-mono">
                      <span>{pond?.name || 'Unassigned'}</span>
                      <span>•</span>
                      <span>v{dev.firmwareVersion || '1.0.0'}</span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#f0f0ea]/60 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadFirmware(dev);
                        }}
                        leftIcon={<Code className="w-3 h-3" />}
                      >
                        View C++ Sketch
                      </Button>
                      <span className="text-[10px] text-[#8c8f94] font-mono">Dallas DS18B20</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right 2 Cols: Ingestion API Testing & Simulation */}
        <div className="lg:col-span-2 space-y-5">
          {/* Telemetry Ingest Simulator */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>ESP32 HTTP Telemetry Ingest Simulation</CardTitle>
                <CardDescription>
                  Simulate the exact JSON payload transmitted over WiFi by an ESP32 microcontroller at the pond edge.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[#fcfcfa] p-3 rounded-[6px] border border-[#e8e8e2] text-xs font-mono">
                <div className="text-[#787a7e] text-[11px]">POST /api/iot/ingest</div>
                <div className="text-[#194432] mt-1">
                  Content-Type: application/json • Header: X-API-Key
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Field label="Selected Node">
                  <Input
                    disabled
                    value={
                      selectedDevice
                        ? `${selectedDevice.name} (${selectedDevice.deviceIdentifier || selectedDevice.deviceId})`
                        : 'No device selected'
                    }
                  />
                </Field>

                <Field label="Water Temperature (°C)" required>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 29.4"
                    suffixNode="°C"
                    value={simTemp}
                    onChange={(e) => setSimTemp(e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Cryptographic API Key Header">
                <Input
                  type="text"
                  placeholder="X-API-Key secret token"
                  value={simApiKey}
                  onChange={(e) => setSimApiKey(e.target.value)}
                />
              </Field>

              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[#55585d]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1b7a4b]" />
                  <span>Validates against Cloud SQL device registry</span>
                </div>
                <Button
                  id="btn-simulate-packet"
                  variant="primary"
                  size="sm"
                  onClick={handleSimulate}
                  loading={simulating}
                  leftIcon={<Play className="w-3.5 h-3.5" />}
                >
                  Transmit Packet
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* C++ Arduino Firmware Generator */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>ESP32 C++ Production Firmware Source</CardTitle>
                <CardDescription>
                  Standard Arduino IDE sketch with OneWire, DallasTemperature, and HTTPClient libraries.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {firmwareCode && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={copyCode}
                    leftIcon={copiedCode ? <Check className="w-3 h-3 text-[#1b7a4b]" /> : <Copy className="w-3 h-3" />}
                  >
                    {copiedCode ? 'Copied' : 'Copy'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => selectedDevice && loadFirmware(selectedDevice)}
                  loading={loadingFirmware}
                  leftIcon={<RefreshCw className="w-3 h-3" />}
                >
                  Generate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {firmwareCode ? (
                <div className="relative">
                  <pre className="p-4 bg-[#1e2420] text-[#e0e7e3] rounded-[8px] font-mono text-[11px] overflow-x-auto max-h-72 leading-relaxed border border-[#2b332e]">
                    {firmwareCode}
                  </pre>
                </div>
              ) : (
                <div className="p-8 text-center bg-[#fafaf8] rounded-[8px] border border-dashed border-[#dcdcd6] text-xs text-[#787a7e]">
                  <Code className="w-6 h-6 text-[#9a9ca0] mx-auto mb-2" />
                  <p className="font-medium text-[#2d3034]">Firmware generator ready</p>
                  <p className="text-[11px] text-[#67696d] mt-0.5">
                    Click &ldquo;View C++ Sketch&rdquo; on any hardware node to compile its source.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: Register Device */}
      <Dialog
        open={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Provision ESP32 Hardware Probe"
        description="Register a Dallas DS18B20 temperature node and issue a secure SHA-256 API token."
        icon={<Cpu className="w-5 h-5 text-[#194432]" />}
      >
        <form onSubmit={handleRegisterDevice} className="space-y-4">
          <Field label="Station Name" required>
            <Input
              value={devForm.name}
              onChange={(e) => setDevForm({ ...devForm, name: e.target.value })}
              required
            />
          </Field>

          <Field label="Device Hardware Identifier" required>
            <Input
              value={devForm.deviceIdentifier}
              onChange={(e) => setDevForm({ ...devForm, deviceIdentifier: e.target.value })}
              required
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Assigned Culture Pond" required>
              <Select
                value={devForm.pondId}
                onChange={(e) => setDevForm({ ...devForm, pondId: e.target.value })}
                required
              >
                {ponds.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Firmware Version">
              <Input
                value={devForm.firmwareVersion}
                onChange={(e) => setDevForm({ ...devForm, firmwareVersion: e.target.value })}
              />
            </Field>
          </div>

          <div className="pt-3 border-t border-[#f0f0ea] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsRegisterModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={registerSubmitting}>
              Provision Node
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
