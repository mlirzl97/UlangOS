import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Video,
  Grid,
  Maximize,
  Moon,
  Sun,
  Shield,
  RefreshCw,
  Sliders,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Play,
  Pause,
  AlertCircle,
  Eye,
  Crosshair,
  Wifi,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Farm, CctvCamera } from '../types.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card.tsx';

interface CctvMonitorViewProps {
  farm: Farm;
  selectedCamId?: string;
  onNavigateTab?: (tab: string) => void;
}

export const CctvMonitorView: React.FC<CctvMonitorViewProps> = ({
  farm,
  selectedCamId,
  onNavigateTab,
}) => {
  const defaultCameras: CctvCamera[] = [
    {
      id: 'CAM-01',
      name: 'CAM 01 - Grow-Out Pond 1 (North Aerators)',
      zone: 'Pond 1 North Dike',
      location: 'Aerator Hub & Feeding Tray 1',
      status: 'online',
      resolution: '1080p Full HD',
      fps: 30,
      bitrate: '2.8 Mbps',
      hasNightVision: true,
      hasPtz: true,
      presets: ['Paddlewheel Aerator 1', 'Feeding Tray Station 1', 'Inlet Spillway', 'North Dike Perimeter'],
    },
    {
      id: 'CAM-02',
      name: 'CAM 02 - Nursery Station & Tanks 1-4',
      zone: 'Indoor Nursery Shelter',
      location: 'Concrete Acclimation Platform',
      status: 'online',
      resolution: '1080p Full HD',
      fps: 30,
      bitrate: '2.4 Mbps',
      hasNightVision: true,
      hasPtz: true,
      presets: ['Tank 1 Nursery Mesh', 'Air Blower Manifold', 'Artemia Hatching Jar', 'Technician Bench'],
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
      presets: ['Water Elevation Gauge', 'Debris Mesh Screen', 'Biofilter Outfall'],
    },
    {
      id: 'CAM-04',
      name: 'CAM 04 - Solar Power Hub & Feed Storage',
      zone: 'Operations Shed',
      location: 'Warehouse & Battery Station',
      status: 'online',
      resolution: '1080p Full HD',
      fps: 30,
      bitrate: '2.6 Mbps',
      hasNightVision: true,
      hasPtz: true,
      presets: ['Solar MPPT & Inverter', 'Feed Pallets & Sacks', 'Agricultural Lime Store', 'Farm Gate Entry'],
    },
  ];

  const cameras: CctvCamera[] = (farm.cctvStreams as CctvCamera[]) || defaultCameras;

  const [activeCamId, setActiveCamId] = useState<string>(selectedCamId || cameras[0]?.id || 'CAM-01');
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [isMotionDetectOn, setIsMotionDetectOn] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [timeString, setTimeString] = useState<string>('');
  const [snapshotAlert, setSnapshotAlert] = useState<string | null>(null);

  const activeCam = cameras.find((c) => c.id === activeCamId) || cameras[0];

  // Time ticker in PHT
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTimeString(
        now.toLocaleString('en-US', {
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' PHT'
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Preset selector
  const handleSelectPreset = (preset: string) => {
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(1);
    setSnapshotAlert(`Camera repositioned to preset: "${preset}"`);
    setTimeout(() => setSnapshotAlert(null), 3000);
  };

  // PTZ adjustments
  const handlePan = (dx: number, dy: number) => {
    setPanOffset((prev) => ({
      x: Math.max(-50, Math.min(50, prev.x + dx)),
      y: Math.max(-50, Math.min(50, prev.y + dy)),
    }));
  };

  const handleZoom = (dz: number) => {
    setZoomLevel((prev) => Math.max(1, Math.min(3.5, Number((prev + dz).toFixed(1)))));
  };

  // Snapshot download
  const handleTakeSnapshot = (camName: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = isNightMode ? '#0d1f14' : '#142820';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px monospace';
      ctx.fillText(`${camName} • HQ16 AQUAOS CCTV SNAPSHOT`, 40, 60);
      ctx.fillText(`Recorded: ${timeString}`, 40, 100);
      ctx.fillText(`Coordinates: 13.5682°N, 123.2845°E • Camarines Sur, Bicol`, 40, 140);

      const link = document.createElement('a');
      link.download = `CCTV_${camName.replace(/\s+/g, '_')}_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
    setSnapshotAlert(`High-resolution snapshot captured for ${camName}`);
    setTimeout(() => setSnapshotAlert(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e2dc]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#181a1b]">
              Surveillance & Real-Time CCTV Feeds
            </h1>
            <Badge variant="success" size="sm" dot>
              4 Streams Live
            </Badge>
          </div>
          <p className="text-xs text-[#67696d] mt-1 font-mono">
            Encrypted RTSP/HLS Stream Gateway • Ultra-low latency (&lt;210ms) • Bicol Farm Perimeter
          </p>
        </div>

        {/* View Mode & Global Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            leftIcon={<Grid className="w-3.5 h-3.5" />}
          >
            Quad Grid (2x2)
          </Button>
          <Button
            variant={viewMode === 'single' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('single')}
            leftIcon={<Video className="w-3.5 h-3.5" />}
          >
            Single Focus View
          </Button>
          <Button
            variant={isNightMode ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIsNightMode(!isNightMode)}
            leftIcon={isNightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          >
            {isNightMode ? 'Night Vision (IR On)' : 'Daylight Mode'}
          </Button>
        </div>
      </div>

      {snapshotAlert && (
        <div className="p-3 bg-[#edf5f0] border border-[#194432] rounded-[8px] text-xs font-semibold text-[#194432] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#194432]" />
            <span>{snapshotAlert}</span>
          </div>
          <button onClick={() => setSnapshotAlert(null)} className="text-[#194432] hover:opacity-75">
            Dismiss
          </button>
        </div>
      )}

      {/* QUAD GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cameras.map((cam) => (
            <div
              key={cam.id}
              className={`rounded-[12px] border overflow-hidden transition-all shadow-sm ${
                activeCamId === cam.id
                  ? 'border-[#194432] ring-2 ring-[#194432]/30'
                  : 'border-[#d8d8d2] hover:border-[#194432]'
              }`}
            >
              {/* Camera Header Bar */}
              <div className="bg-[#181a1b] text-white px-3 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold">{cam.id}</span>
                  <span className="text-zinc-400 font-sans truncate max-w-[180px]">{cam.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-400">{cam.fps} FPS</span>
                  <button
                    onClick={() => {
                      setActiveCamId(cam.id);
                      setViewMode('single');
                    }}
                    className="p-1 hover:bg-white/10 rounded text-zinc-300 hover:text-white"
                    title="Maximize stream"
                  >
                    <Maximize className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Video Surface */}
              <div
                className="relative aspect-video bg-[#0d1612] flex items-center justify-center cursor-pointer group"
                onClick={() => {
                  setActiveCamId(cam.id);
                  setViewMode('single');
                }}
              >
                <LiveStreamCanvas
                  cam={cam}
                  isNightMode={isNightMode}
                  zoom={1}
                  pan={{ x: 0, y: 0 }}
                  timeStr={timeString}
                  isMotionDetectOn={isMotionDetectOn}
                />

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                  <Maximize className="w-4 h-4" />
                  <span>Click to expand & control PTZ</span>
                </div>
              </div>

              {/* Camera Status Footer */}
              <div className="bg-[#f7f7f4] px-3 py-2 border-t border-[#e2e2dc] flex items-center justify-between text-xs text-[#707276]">
                <div className="flex items-center gap-2">
                  <Badge variant="neutral" size="sm">
                    {cam.zone}
                  </Badge>
                  <span className="font-mono text-[11px]">{cam.bitrate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTakeSnapshot(cam.name);
                    }}
                    className="text-[#194432] hover:underline font-medium text-xs flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Snapshot
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SINGLE FOCUS VIEW WITH PTZ CONTROLS */}
      {viewMode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-[12px] border border-[#d8d8d2] overflow-hidden shadow-md bg-[#0d1612]">
              {/* HUD Header */}
              <div className="bg-[#181a1b] text-white px-4 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-sm">{activeCam.name}</span>
                  <Badge variant="accent" size="sm">
                    {activeCam.resolution}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 font-mono text-zinc-300">
                  <span>Zoom: {zoomLevel}x</span>
                  <span>{timeString}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-zinc-600 text-white hover:bg-white/10 text-xs py-1"
                    onClick={() => handleTakeSnapshot(activeCam.name)}
                    leftIcon={<Download className="w-3 h-3" />}
                  >
                    Capture
                  </Button>
                </div>
              </div>

              {/* High-res Viewport */}
              <div className="relative aspect-video w-full overflow-hidden flex items-center justify-center">
                <LiveStreamCanvas
                  cam={activeCam}
                  isNightMode={isNightMode}
                  zoom={zoomLevel}
                  pan={panOffset}
                  timeStr={timeString}
                  isMotionDetectOn={isMotionDetectOn}
                />

                {/* In-viewport Motion Tag */}
                {isMotionDetectOn && (
                  <div className="absolute top-4 right-4 bg-red-600/90 text-white font-mono text-[10px] px-2 py-1 rounded flex items-center gap-1.5 animate-pulse shadow">
                    <Crosshair className="w-3 h-3" />
                    <span>MOTION DETECTED: BIO-SURFACE SPLASH</span>
                  </div>
                )}

                {/* Floating zoom indicator */}
                {zoomLevel > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/75 backdrop-blur-md text-white font-mono text-xs px-2.5 py-1 rounded">
                    DIGITAL MAGNIFICATION {zoomLevel}X
                  </div>
                )}
              </div>

              {/* Stream Diagnostics Footer */}
              <div className="bg-[#181a1b] border-t border-white/10 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-zinc-400 font-mono">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Wifi className="w-3.5 h-3.5" /> Signal: -62 dBm
                  </span>
                  <span>Bitrate: {activeCam.bitrate}</span>
                  <span>Codec: H.265 Main@L4.1</span>
                  <span>Latency: 195ms</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPanOffset({ x: 0, y: 0 });
                      setZoomLevel(1);
                    }}
                    className="text-zinc-300 hover:text-white underline"
                  >
                    Reset Framing
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Camera Selector Thumbnails */}
            <div className="grid grid-cols-4 gap-2">
              {cameras.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveCamId(c.id);
                    setPanOffset({ x: 0, y: 0 });
                    setZoomLevel(1);
                  }}
                  className={`p-2 rounded-[8px] border text-left transition-all ${
                    activeCamId === c.id
                      ? 'bg-[#edf5f0] border-[#194432] font-semibold text-[#194432]'
                      : 'bg-white border-[#e2e2dc] text-[#707276] hover:bg-[#f7f7f4]'
                  }`}
                >
                  <div className="text-xs font-bold">{c.id}</div>
                  <div className="text-[11px] truncate">{c.zone}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Sidebar: PTZ Controller & Presets */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#194432]" />
                  PTZ Camera Controller
                </CardTitle>
                <CardDescription className="text-xs">
                  Pan-Tilt-Zoom adjustments for {activeCam.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Virtual Joystick Pad */}
                <div className="bg-[#f4f4f0] p-4 rounded-[10px] border border-[#e2e2dc] flex flex-col items-center justify-center space-y-2">
                  <button
                    onClick={() => handlePan(0, -15)}
                    className="w-9 h-9 rounded-full bg-white hover:bg-[#edf5f0] border border-[#d8d8d2] flex items-center justify-center shadow-xs text-[#181a1b]"
                    title="Tilt Up"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handlePan(-15, 0)}
                      className="w-9 h-9 rounded-full bg-white hover:bg-[#edf5f0] border border-[#d8d8d2] flex items-center justify-center shadow-xs text-[#181a1b]"
                      title="Pan Left"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-[#194432] text-white flex items-center justify-center text-[10px] font-mono">
                      PTZ
                    </div>
                    <button
                      onClick={() => handlePan(15, 0)}
                      className="w-9 h-9 rounded-full bg-white hover:bg-[#edf5f0] border border-[#d8d8d2] flex items-center justify-center shadow-xs text-[#181a1b]"
                      title="Pan Right"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onClick={() => handlePan(0, 15)}
                    className="w-9 h-9 rounded-full bg-white hover:bg-[#edf5f0] border border-[#d8d8d2] flex items-center justify-center shadow-xs text-[#181a1b]"
                    title="Tilt Down"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>

                {/* Optical Zoom Controls */}
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleZoom(-0.5)}
                    disabled={zoomLevel <= 1}
                    leftIcon={<ZoomOut className="w-3.5 h-3.5" />}
                  >
                    Zoom Out
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleZoom(0.5)}
                    disabled={zoomLevel >= 3.5}
                    leftIcon={<ZoomIn className="w-3.5 h-3.5" />}
                  >
                    Zoom In ({zoomLevel}x)
                  </Button>
                </div>

                {/* Presets */}
                <div className="space-y-2 pt-2 border-t border-[#e2e2dc]">
                  <div className="text-xs font-semibold text-[#181a1b]">Guard Tour Presets</div>
                  <div className="space-y-1.5">
                    {(activeCam.presets || ['Center Overview', 'Dike Border', 'Surface Aerator']).map((pr, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectPreset(pr)}
                        className="w-full text-left px-2.5 py-1.5 text-xs bg-white hover:bg-[#edf5f0] border border-[#e2e2dc] hover:border-[#194432] rounded-[6px] transition-colors flex items-center justify-between"
                      >
                        <span className="truncate">{pr}</span>
                        <Crosshair className="w-3 h-3 text-[#194432]" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Motion Detection Toggle */}
                <div className="pt-2 border-t border-[#e2e2dc] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-[#181a1b]">Bio-Motion Analytics</div>
                    <div className="text-[11px] text-[#707276]">Alert on unusual predator or surface activity</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isMotionDetectOn}
                    onChange={(e) => setIsMotionDetectOn(e.target.checked)}
                    className="w-4 h-4 text-[#194432] rounded border-gray-300 focus:ring-[#194432]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

// Canvas animation component rendering simulated live video stream
interface LiveStreamCanvasProps {
  cam: CctvCamera;
  isNightMode: boolean;
  zoom: number;
  pan: { x: number; y: number };
  timeStr: string;
  isMotionDetectOn: boolean;
}

const LiveStreamCanvas: React.FC<LiveStreamCanvasProps> = ({
  cam,
  isNightMode,
  zoom,
  pan,
  timeStr,
  isMotionDetectOn,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let tick = 0;

    const render = () => {
      tick++;
      const w = canvas.width;
      const h = canvas.height;

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      // Apply Pan and Zoom
      ctx.translate(w / 2, h / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-w / 2 + pan.x * 2, -h / 2 + pan.y * 2);

      // 1. Water or Area Background
      if (isNightMode) {
        // Infrared night vision monochrome green/dark tint
        ctx.fillStyle = '#06160e';
        ctx.fillRect(0, 0, w, h);

        // IR noise grain
        ctx.fillStyle = '#0d2d1e';
        for (let i = 0; i < 40; i++) {
          const rx = (Math.sin(tick * 0.05 + i) * 0.5 + 0.5) * w;
          const ry = (Math.cos(tick * 0.07 + i) * 0.5 + 0.5) * h;
          ctx.fillRect(rx, ry, 2, 2);
        }
      } else {
        // Daytime tropical pond water tone
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        if (cam.id === 'CAM-01') {
          grad.addColorStop(0, '#153224');
          grad.addColorStop(1, '#0e2419');
        } else if (cam.id === 'CAM-02') {
          grad.addColorStop(0, '#192b33');
          grad.addColorStop(1, '#111d23');
        } else {
          grad.addColorStop(0, '#212924');
          grad.addColorStop(1, '#131b17');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Animated Water Ripples
      ctx.strokeStyle = isNightMode ? '#1e5e3d' : 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 1.5;
      for (let r = 0; r < 5; r++) {
        const cx = w * 0.5 + Math.sin(tick * 0.02 + r) * 20;
        const cy = h * 0.55 + Math.cos(tick * 0.02 + r) * 10;
        const radius = ((tick * 1.2 + r * 60) % 240) + 20;
        ctx.beginPath();
        ctx.ellipse(cx, cy, radius * 1.4, radius * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Specific Camera Zone Visuals
      if (cam.id === 'CAM-01') {
        // Rotating paddlewheel aerator spray
        const wheelX = w * 0.45;
        const wheelY = h * 0.48;

        // Splash bubbles
        ctx.fillStyle = isNightMode ? '#34d399' : '#e0f2fe';
        for (let b = 0; b < 12; b++) {
          const angle = tick * 0.15 + b * (Math.PI / 6);
          const dist = 35 + (b % 3) * 15;
          const bx = wheelX + Math.cos(angle) * dist;
          const by = wheelY + Math.sin(angle) * dist * 0.6;
          ctx.beginPath();
          ctx.arc(bx, by, 3 + (b % 2) * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Paddle shaft
        ctx.fillStyle = isNightMode ? '#10b981' : '#cbd5e1';
        ctx.fillRect(wheelX - 45, wheelY - 4, 90, 8);
      } else if (cam.id === 'CAM-02') {
        // Nursery Acclimation Tanks grid
        ctx.strokeStyle = isNightMode ? '#22c55e' : '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.2, h * 0.25, w * 0.6, h * 0.5);
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.25);
        ctx.lineTo(w * 0.5, h * 0.75);
        ctx.stroke();
      }

      // Motion bounding box if motion detect on
      if (isMotionDetectOn && tick % 120 < 80) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w * 0.38, h * 0.35, 120, 85);
        ctx.fillStyle = '#ef4444';
        ctx.font = '10px monospace';
        ctx.fillText('ACTIVE SPLASH (98%)', w * 0.38, h * 0.35 - 5);
      }

      ctx.restore();

      // 4. Constant HUD Overlays (Fixed non-scaled)
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px monospace';
      ctx.fillText(`REC • ${cam.id} • ${cam.name}`, 15, 22);
      ctx.fillText(timeStr || 'LIVE STREAM', 15, 40);

      // Night vision label
      if (isNightMode) {
        ctx.fillStyle = '#34d399';
        ctx.fillText('IR ILLUMINATION 850NM [ON]', w - 180, 22);
      }

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [cam, isNightMode, zoom, pan, timeStr, isMotionDetectOn]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={360}
      className="w-full h-full object-cover select-none"
    />
  );
};
