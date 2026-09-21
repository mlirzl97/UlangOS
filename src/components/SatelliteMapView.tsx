import React, { useState, useCallback, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  MapControl,
  ControlPosition,
} from '@vis.gl/react-google-maps';
import {
  Layers,
  MapPin,
  Camera,
  Cpu,
  Wind,
  Droplets,
  Eye,
  Maximize2,
  Minimize2,
  Navigation,
  Compass,
  RefreshCw,
  Info,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Farm, Pond, CctvCamera, SensorReading } from '../types.ts';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID, INTERNAL_USAGE_ATTRIBUTION_IDS } from '../lib/maps-config.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card.tsx';

interface SatelliteMapViewProps {
  farm: Farm;
  ponds: Pond[];
  sensorReadings: SensorReading[];
  onNavigateTab?: (tab: string) => void;
  onSelectCctv?: (camera: CctvCamera) => void;
}

interface MapMarkerItem {
  id: string;
  type: 'pond' | 'cctv' | 'sensor' | 'aerator' | 'sluice';
  title: string;
  subtitle: string;
  position: { lat: number; lng: number };
  status: string;
  details?: any;
}

export const SatelliteMapView: React.FC<SatelliteMapViewProps> = ({
  farm,
  ponds,
  sensorReadings,
  onNavigateTab,
  onSelectCctv,
}) => {
  // Center coordinates: Camarines Sur, Bicol farm site
  const farmLat = farm.latitude ? Number(farm.latitude) : 13.5682;
  const farmLng = farm.longitude ? Number(farm.longitude) : 123.2845;

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: farmLat,
    lng: farmLng,
  });
  const [zoom, setZoom] = useState<number>(17);
  const [mapTypeId, setMapTypeId] = useState<'satellite' | 'hybrid' | 'roadmap'>('satellite');
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerItem | null>(null);

  // Layer toggles
  const [showPonds, setShowPonds] = useState<boolean>(true);
  const [showCctv, setShowCctv] = useState<boolean>(true);
  const [showSensors, setShowSensors] = useState<boolean>(true);
  const [showInfrastructure, setShowInfrastructure] = useState<boolean>(true);

  // Latest temp from sensors
  const latestSensor = sensorReadings[sensorReadings.length - 1];
  const currentTemp = latestSensor ? Number(latestSensor.value) : 29.4;

  // Compile all spatial markers
  const markers = useMemo(() => {
    const list: MapMarkerItem[] = [];

    // Ponds
    ponds.forEach((p, idx) => {
      const lat = p.latitude ? Number(p.latitude) : farmLat + (idx === 0 ? 0.0003 : idx === 1 ? -0.0003 : 0.0007);
      const lng = p.longitude ? Number(p.longitude) : farmLng + (idx === 0 ? -0.0003 : idx === 1 ? 0.0003 : 0.0001);

      list.push({
        id: `pond-${p.id}`,
        type: 'pond',
        title: p.name,
        subtitle: `${p.identifier} • ${p.pondType.replace('_', ' ')} • ${p.areaSqM || 1000} m²`,
        position: { lat, lng },
        status: p.status,
        details: p,
      });
    });

    // CCTV Cameras
    const streams = farm.cctvStreams || [];
    streams.forEach((cam, idx) => {
      const lat = cam.coords?.lat || farmLat + (idx === 0 ? 0.0004 : idx === 1 ? -0.0002 : idx === 2 ? -0.0008 : 0.0006);
      const lng = cam.coords?.lng || farmLng + (idx === 0 ? -0.0004 : idx === 1 ? 0.0004 : idx === 2 ? -0.0006 : 0.0006);

      list.push({
        id: `cctv-${cam.id}`,
        type: 'cctv',
        title: cam.name,
        subtitle: `${cam.zone} • ${cam.resolution} (${cam.status.toUpperCase()})`,
        position: { lat, lng },
        status: cam.status,
        details: cam,
      });
    });

    // IoT Sensor Node
    list.push({
      id: 'sensor-esp32-001',
      type: 'sensor',
      title: 'ESP32 Node 001 (Temp Probe)',
      subtitle: `Real-time Telemetry: ${currentTemp.toFixed(1)}°C • Solar Charged`,
      position: { lat: farmLat + 0.00025, lng: farmLng - 0.00015 },
      status: 'active',
      details: { temp: currentTemp, signal: '-68 dBm', battery: '4.1V (94%)' },
    });

    // Infrastructure: Paddlewheel Aerators & Sluice Gate
    list.push({
      id: 'aerator-hub-01',
      type: 'aerator',
      title: '1.0 HP Paddlewheel Aerator Hub',
      subtitle: 'Zone 1 High-Efficiency Water Impeller • 3.2 kg O2/hr',
      position: { lat: farmLat + 0.0004, lng: farmLng - 0.0002 },
      status: 'standby',
      details: { power: '220V / 750W', autoSchedule: '01:00 - 06:30 PHT' },
    });

    list.push({
      id: 'infra-sluice-01',
      type: 'sluice',
      title: 'Main Hydraulic Sluice Weir',
      subtitle: 'Water Elevation Level 1.20m • Dual Biofilter Screen',
      position: { lat: farmLat - 0.0008, lng: farmLng - 0.0006 },
      status: 'active',
      details: { flowRate: '45 L/s', meshCondition: 'Clean / Inspected' },
    });

    return list;
  }, [ponds, farm.cctvStreams, farmLat, farmLng, currentTemp]);

  const filteredMarkers = useMemo(() => {
    return markers.filter((m) => {
      if (m.type === 'pond' && !showPonds) return false;
      if (m.type === 'cctv' && !showCctv) return false;
      if (m.type === 'sensor' && !showSensors) return false;
      if ((m.type === 'aerator' || m.type === 'sluice') && !showInfrastructure) return false;
      return true;
    });
  }, [markers, showPonds, showCctv, showSensors, showInfrastructure]);

  const handleCenterPond = (p: Pond) => {
    const lat = p.latitude ? Number(p.latitude) : farmLat;
    const lng = p.longitude ? Number(p.longitude) : farmLng;
    setMapCenter({ lat, lng });
    setZoom(18);
    const m = markers.find((item) => item.type === 'pond' && item.details?.id === p.id);
    if (m) setSelectedMarker(m);
  };

  const handleCenterCam = (cam: CctvCamera) => {
    const lat = cam.coords?.lat || farmLat;
    const lng = cam.coords?.lng || farmLng;
    setMapCenter({ lat, lng });
    setZoom(18);
    const m = markers.find((item) => item.type === 'cctv' && item.details?.id === cam.id);
    if (m) setSelectedMarker(m);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e2dc]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#181a1b]">
              Satellite Site & GIS Map
            </h1>
            <Badge variant="accent" size="sm" dot>
              High-Res Imagery
            </Badge>
          </div>
          <p className="text-xs text-[#67696d] mt-1 font-mono">
            Location: {farm.location} • Coordinates: {farmLat.toFixed(4)}° N, {farmLng.toFixed(4)}° E
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={mapTypeId === 'satellite' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setMapTypeId('satellite')}
          >
            Satellite
          </Button>
          <Button
            variant={mapTypeId === 'hybrid' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setMapTypeId('hybrid')}
          >
            Hybrid
          </Button>
          <Button
            variant={mapTypeId === 'roadmap' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setMapTypeId('roadmap')}
          >
            Terrain
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMapCenter({ lat: farmLat, lng: farmLng });
              setZoom(17);
              setSelectedMarker(null);
            }}
            leftIcon={<Navigation className="w-3.5 h-3.5" />}
          >
            Reset Center
          </Button>
        </div>
      </div>

      {/* Quick Navigation Pills & Layer Toggles */}
      <div className="bg-white border border-[#e2e2dc] rounded-[10px] p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[#181a1b] flex items-center gap-1.5 mr-1">
            <Layers className="w-3.5 h-3.5 text-[#194432]" />
            Active Layers:
          </span>
          <button
            onClick={() => setShowPonds(!showPonds)}
            className={`px-2.5 py-1 rounded-[6px] border text-xs font-medium transition-colors ${
              showPonds ? 'bg-[#edf5f0] border-[#194432] text-[#194432]' : 'bg-[#f4f4f0] border-[#e2e2dc] text-[#707276]'
            }`}
          >
            Ponds & Tanks ({ponds.length})
          </button>
          <button
            onClick={() => setShowCctv(!showCctv)}
            className={`px-2.5 py-1 rounded-[6px] border text-xs font-medium transition-colors ${
              showCctv ? 'bg-[#edf5f0] border-[#194432] text-[#194432]' : 'bg-[#f4f4f0] border-[#e2e2dc] text-[#707276]'
            }`}
          >
            CCTV Feeds ({farm.cctvStreams?.length || 4})
          </button>
          <button
            onClick={() => setShowSensors(!showSensors)}
            className={`px-2.5 py-1 rounded-[6px] border text-xs font-medium transition-colors ${
              showSensors ? 'bg-[#edf5f0] border-[#194432] text-[#194432]' : 'bg-[#f4f4f0] border-[#e2e2dc] text-[#707276]'
            }`}
          >
            IoT Sensor Nodes
          </button>
          <button
            onClick={() => setShowInfrastructure(!showInfrastructure)}
            className={`px-2.5 py-1 rounded-[6px] border text-xs font-medium transition-colors ${
              showInfrastructure ? 'bg-[#edf5f0] border-[#194432] text-[#194432]' : 'bg-[#f4f4f0] border-[#e2e2dc] text-[#707276]'
            }`}
          >
            Aerator & Sluice
          </button>
        </div>

        {/* Quick Jump */}
        <div className="flex items-center gap-2">
          <span className="text-[#707276]">Quick Focus:</span>
          {ponds.slice(0, 2).map((p) => (
            <button
              key={p.id}
              onClick={() => handleCenterPond(p)}
              className="text-[#194432] hover:underline font-semibold"
            >
              {p.identifier}
            </button>
          ))}
        </div>
      </div>

      {/* Main Google Maps Viewport Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div
            id="google-maps-satellite-container"
            className="relative w-full h-[540px] sm:h-[620px] rounded-[12px] overflow-hidden border border-[#d8d8d2] shadow-sm bg-[#121815]"
          >
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
              <Map
                style={{ width: '100%', height: '100%' }}
                defaultCenter={mapCenter}
                center={mapCenter}
                defaultZoom={zoom}
                zoom={zoom}
                mapTypeId={mapTypeId}
                mapId={GOOGLE_MAPS_MAP_ID}
                internalUsageAttributionIds={INTERNAL_USAGE_ATTRIBUTION_IDS}
                gestureHandling="cooperative"
                disableDefaultUI={false}
                zoomControl={true}
                scaleControl={true}
              >
                {/* Advanced Markers */}
                {filteredMarkers.map((marker) => {
                  const isPond = marker.type === 'pond';
                  const isCctv = marker.type === 'cctv';
                  const isSensor = marker.type === 'sensor';
                  const isAerator = marker.type === 'aerator';
                  const isSluice = marker.type === 'sluice';

                  const pinBg = isPond
                    ? '#194432'
                    : isCctv
                    ? '#0284c7'
                    : isSensor
                    ? '#d97706'
                    : isAerator
                    ? '#4f46e5'
                    : '#059669';

                  const pinBorder = '#ffffff';

                  return (
                    <AdvancedMarker
                      key={marker.id}
                      position={marker.position}
                      title={marker.title}
                      onClick={() => setSelectedMarker(marker)}
                    >
                      <Pin
                        background={pinBg}
                        borderColor={pinBorder}
                        glyphColor="#ffffff"
                        scale={selectedMarker?.id === marker.id ? 1.25 : 1.0}
                      />
                    </AdvancedMarker>
                  );
                })}

                {/* Selected Marker InfoWindow */}
                {selectedMarker && (
                  <InfoWindow
                    position={selectedMarker.position}
                    onCloseClick={() => setSelectedMarker(null)}
                    headerContent={
                      <div className="font-bold text-xs text-[#181a1b] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#194432]" />
                        {selectedMarker.title}
                      </div>
                    }
                  >
                    <div className="p-1 space-y-2 text-xs max-w-[240px]">
                      <p className="text-[#494b4f]">{selectedMarker.subtitle}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-[#e2e2dc]">
                        <span className="font-mono text-[11px] text-[#707276]">
                          {selectedMarker.position.lat.toFixed(5)}, {selectedMarker.position.lng.toFixed(5)}
                        </span>
                        <Badge
                          variant={selectedMarker.status === 'active' || selectedMarker.status === 'online' ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {selectedMarker.status.toUpperCase()}
                        </Badge>
                      </div>
                      {selectedMarker.type === 'cctv' && onSelectCctv && (
                        <div className="pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full text-xs py-1"
                            onClick={() => {
                              onSelectCctv(selectedMarker.details);
                              if (onNavigateTab) onNavigateTab('cctv');
                            }}
                            leftIcon={<Camera className="w-3 h-3" />}
                          >
                            Open Live Video
                          </Button>
                        </div>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>

            {/* In-Map Telemetry HUD Banner */}
            <div className="absolute top-3 left-3 bg-[#181a1be6] backdrop-blur-md text-white px-3 py-2 rounded-[8px] border border-white/15 text-xs shadow-lg space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Bicol Station Satellite Telemetry</span>
              </div>
              <div className="text-[11px] text-zinc-300 font-mono flex items-center gap-3">
                <span>Water Temp: {currentTemp.toFixed(1)}°C</span>
                <span>Zoom: {zoom}x</span>
                <span>Elevation: 18m MSL</span>
              </div>
            </div>

            {/* Quick Map Legend */}
            <div className="absolute bottom-3 left-3 bg-[#ffffffea] backdrop-blur-md border border-[#e2e2dc] rounded-[8px] p-2.5 shadow-md text-[11px] text-[#181a1b] flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#194432]" />
                <span>Pond/Tank</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                <span>CCTV Camera</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]" />
                <span>IoT Sensor</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4f46e5]" />
                <span>Paddlewheel</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Spatial Asset Inspector */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#194432]" />
                Site Asset Inspector
              </CardTitle>
              <CardDescription className="text-xs">
                Spatial distribution across 1.2-hectare freshwater facility.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedMarker ? (
                <div className="p-3 bg-[#edf5f0] border border-[#194432]/30 rounded-[8px] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-[#194432]">
                      Selected Spatial Node
                    </span>
                    <Badge variant="success" size="sm">
                      {selectedMarker.status.toUpperCase()}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-sm text-[#181a1b]">{selectedMarker.title}</h4>
                  <p className="text-xs text-[#494b4f] leading-relaxed">{selectedMarker.subtitle}</p>
                  <div className="text-[11px] font-mono text-[#707276] bg-white p-2 rounded border border-[#e2e2dc]">
                    GPS: {selectedMarker.position.lat.toFixed(6)}°N, {selectedMarker.position.lng.toFixed(6)}°E
                  </div>
                  {selectedMarker.type === 'cctv' && onNavigateTab && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => onNavigateTab('cctv')}
                      leftIcon={<Camera className="w-3.5 h-3.5" />}
                    >
                      Watch Live Stream
                    </Button>
                  )}
                  {selectedMarker.type === 'pond' && onNavigateTab && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => onNavigateTab('production')}
                      leftIcon={<Layers className="w-3.5 h-3.5" />}
                    >
                      Inspect Pond Biomass
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-[#f7f7f4] border border-[#e2e2dc] rounded-[8px] text-xs text-[#707276] text-center">
                  Click any marker on the satellite imagery to inspect spatial telemetry and control parameters.
                </div>
              )}

              {/* Ponds Quick List */}
              <div className="space-y-1.5 pt-2">
                <div className="text-xs font-semibold text-[#181a1b] flex items-center justify-between">
                  <span>Ponds & Tanks</span>
                  <span className="text-[#707276] font-normal">{ponds.length} sites</span>
                </div>
                {ponds.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleCenterPond(p)}
                    className="p-2 bg-white hover:bg-[#edf5f0] border border-[#e2e2dc] hover:border-[#194432] rounded-[6px] transition-colors cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[#181a1b]">{p.identifier}</div>
                      <div className="text-[11px] text-[#707276]">{p.name}</div>
                    </div>
                    <div className="text-right font-mono text-[11px] text-[#194432]">
                      {p.areaSqM} m²
                    </div>
                  </div>
                ))}
              </div>

              {/* CCTV Cameras Quick List */}
              <div className="space-y-1.5 pt-2">
                <div className="text-xs font-semibold text-[#181a1b] flex items-center justify-between">
                  <span>Surveillance Streams</span>
                  <span className="text-[#707276] font-normal">
                    {farm.cctvStreams?.length || 4} feeds
                  </span>
                </div>
                {(farm.cctvStreams || []).map((cam) => (
                  <div
                    key={cam.id}
                    onClick={() => handleCenterCam(cam)}
                    className="p-2 bg-white hover:bg-[#e0f2fe] border border-[#e2e2dc] hover:border-[#0284c7] rounded-[6px] transition-colors cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[#181a1b]">{cam.id}</div>
                      <div className="text-[11px] text-[#707276]">{cam.zone}</div>
                    </div>
                    <Badge variant="accent" size="sm">
                      {cam.resolution}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
