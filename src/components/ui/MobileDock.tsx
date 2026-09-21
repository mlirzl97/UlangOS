import React, { useState } from 'react';
import {
  Layers,
  Droplets,
  PlusCircle,
  DollarSign,
  Cpu,
  BrainCircuit,
  MoreHorizontal,
  FileCheck,
  Search,
  Plus,
  Compass,
  Camera,
  CloudSun,
} from 'lucide-react';
import { Dialog } from './Dialog.tsx';

export interface MobileDockProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenQuickWaterTest: () => void;
  onOpenQuickFeed: () => void;
  onOpenCommandPalette: () => void;
  onOpenDiagnostics: () => void;
  openAlertsCount: number;
}

export const MobileDock: React.FC<MobileDockProps> = ({
  activeTab,
  setActiveTab,
  onOpenQuickWaterTest,
  onOpenQuickFeed,
  onOpenCommandPalette,
  onOpenDiagnostics,
  openAlertsCount,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryItems = [
    { id: 'dashboard', label: 'Overview', icon: <Layers className="w-4 h-4" /> },
    { id: 'water', label: 'Water', icon: <Droplets className="w-4 h-4" /> },
    { id: 'production', label: 'Ponds', icon: <Layers className="w-4 h-4" /> },
    { id: 'operations', label: 'Daily Ops', icon: <PlusCircle className="w-4 h-4" /> },
  ];

  return (
    <>
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e2e2dc] px-2 py-1.5 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] pb-[calc(0.375rem+env(safe-area-inset-bottom,0))]">
        <div className="flex items-center justify-around">
          {primaryItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors rounded-[6px] ${
                  isActive
                    ? 'text-[#194432] font-semibold'
                    : 'text-[#67696d] hover:text-[#181a1b]'
                }`}
              >
                <div
                  className={`p-1 rounded-[6px] ${
                    isActive ? 'bg-[#edf5f0] text-[#194432]' : 'text-current'
                  }`}
                >
                  {item.icon}
                </div>
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </button>
            );
          })}

          {/* More trigger */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors rounded-[6px] relative ${
              ['finance', 'iot', 'intelligence'].includes(activeTab)
                ? 'text-[#194432] font-semibold'
                : 'text-[#67696d] hover:text-[#181a1b]'
            }`}
          >
            <div
              className={`p-1 rounded-[6px] relative ${
                ['finance', 'iot', 'intelligence'].includes(activeTab)
                  ? 'bg-[#edf5f0] text-[#194432]'
                  : 'text-current'
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
              {openAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#dc2626]" />
              )}
            </div>
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        </div>
      </div>

      {/* More Options Bottom Sheet */}
      <Dialog
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Aquaculture Operations"
        description="Quick tools, secondary modules & system diagnostics"
      >
        <div className="space-y-4">
          {/* Quick Action buttons */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#787a7e] mb-2 font-medium">
              Quick Logging
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMoreOpen(false);
                  onOpenQuickWaterTest();
                }}
                className="p-3 text-left bg-[#f8f8f5] hover:bg-[#f0f0ea] border border-[#e2e2dc] rounded-[8px] flex items-center gap-2.5 text-xs font-medium text-[#181a1b] btn-tactile"
              >
                <Droplets className="w-4 h-4 text-[#0284c7]" />
                <span>Log Water Test</span>
              </button>
              <button
                onClick={() => {
                  setMoreOpen(false);
                  onOpenQuickFeed();
                }}
                className="p-3 text-left bg-[#f8f8f5] hover:bg-[#f0f0ea] border border-[#e2e2dc] rounded-[8px] flex items-center gap-2.5 text-xs font-medium text-[#181a1b] btn-tactile"
              >
                <PlusCircle className="w-4 h-4 text-[#194432]" />
                <span>Record Feeding</span>
              </button>
            </div>
          </div>

          {/* Secondary Views */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#787a7e] mb-2 font-medium">
              Secondary Modules
            </div>
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  setActiveTab('map');
                  setMoreOpen(false);
                }}
                className={`w-full p-2.5 text-left rounded-[6px] border flex items-center justify-between text-xs transition-colors ${
                  activeTab === 'map'
                    ? 'bg-[#edf5f0] border-[#cbe4d6] text-[#194432] font-semibold'
                    : 'bg-white border-[#e2e2dc] hover:bg-[#f8f8f6] text-[#2d3034]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-[#194432]" />
                  <span>Satellite GIS Site Map</span>
                </div>
                <span className="text-[11px] text-[#707276]">GPS Pins</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('cctv');
                  setMoreOpen(false);
                }}
                className={`w-full p-2.5 text-left rounded-[6px] border flex items-center justify-between text-xs transition-colors ${
                  activeTab === 'cctv'
                    ? 'bg-[#edf5f0] border-[#cbe4d6] text-[#194432] font-semibold'
                    : 'bg-white border-[#e2e2dc] hover:bg-[#f8f8f6] text-[#2d3034]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Camera className="w-4 h-4 text-[#0284c7]" />
                  <span>Real-Time CCTV Feeds</span>
                </div>
                <span className="text-[11px] text-[#707276]">4 Streams</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('weather');
                  setMoreOpen(false);
                }}
                className={`w-full p-2.5 text-left rounded-[6px] border flex items-center justify-between text-xs transition-colors ${
                  activeTab === 'weather'
                    ? 'bg-[#edf5f0] border-[#cbe4d6] text-[#194432] font-semibold'
                    : 'bg-white border-[#e2e2dc] hover:bg-[#f8f8f6] text-[#2d3034]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CloudSun className="w-4 h-4 text-[#d97706]" />
                  <span>Weather & Aquaculture Climate</span>
                </div>
                <span className="text-[11px] text-[#707276]">Forecast</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('finance');
                  setMoreOpen(false);
                }}
                className={`w-full p-2.5 text-left rounded-[6px] border flex items-center justify-between text-xs transition-colors ${
                  activeTab === 'finance'
                    ? 'bg-[#edf5f0] border-[#cbe4d6] text-[#194432] font-semibold'
                    : 'bg-white border-[#e2e2dc] hover:bg-[#f8f8f6] text-[#2d3034]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-[#1b7a4b]" />
                  <span>Farm Financial Ledger</span>
                </div>
                <span className="text-[11px] text-[#707276]">CAPEX / OPEX</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('iot');
                  setMoreOpen(false);
                }}
                className={`w-full p-2.5 text-left rounded-[6px] border flex items-center justify-between text-xs transition-colors ${
                  activeTab === 'iot'
                    ? 'bg-[#edf5f0] border-[#cbe4d6] text-[#194432] font-semibold'
                    : 'bg-white border-[#e2e2dc] hover:bg-[#f8f8f6] text-[#2d3034]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 text-[#7c3aed]" />
                  <span>ESP32 Hardware Hub</span>
                </div>
                <span className="text-[11px] text-[#707276]">DS18B20 Nodes</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('intelligence');
                  setMoreOpen(false);
                }}
                className={`w-full p-2.5 text-left rounded-[6px] border flex items-center justify-between text-xs transition-colors ${
                  activeTab === 'intelligence'
                    ? 'bg-[#edf5f0] border-[#cbe4d6] text-[#194432] font-semibold'
                    : 'bg-white border-[#e2e2dc] hover:bg-[#f8f8f6] text-[#2d3034]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BrainCircuit className="w-4 h-4 text-[#059669]" />
                  <span>AI & Operating Rules</span>
                </div>
                {openAlertsCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]">
                    {openAlertsCount} alerts
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* System utilities */}
          <div className="pt-2 border-t border-[#f0f0ea] flex items-center justify-between gap-2">
            <button
              onClick={() => {
                setMoreOpen(false);
                onOpenCommandPalette();
              }}
              className="flex-1 py-2 px-3 text-xs font-medium text-[#4a4c50] bg-[#f2f2ee] hover:bg-[#eaeae4] rounded-[6px] border border-[#dcdcd6] flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search (⌘K)</span>
            </button>
            <button
              onClick={() => {
                setMoreOpen(false);
                onOpenDiagnostics();
              }}
              className="flex-1 py-2 px-3 text-xs font-medium text-[#194432] bg-[#edf5f0] hover:bg-[#e2f0e7] rounded-[6px] border border-[#cbe4d6] flex items-center justify-center gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>16-Point Tests</span>
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
};
