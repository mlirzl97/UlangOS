import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Layers,
  Droplets,
  PlusCircle,
  FileCheck,
  TrendingUp,
  Cpu,
  BrainCircuit,
  FileText,
  DollarSign,
  Plus,
  ArrowRight,
  X,
  Compass,
  Camera,
  CloudSun,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  category: 'Navigation' | 'Quick Actions' | 'Diagnostics';
  title: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenQuickWaterTest: () => void;
  onOpenQuickFeed: () => void;
  onOpenCreateFarm: () => void;
  onOpenDiagnostics: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  onNavigateTab,
  onOpenQuickWaterTest,
  onOpenQuickFeed,
  onOpenCreateFarm,
  onOpenDiagnostics,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Farm Overview',
      description: 'Main operational status, biological health and key metrics',
      icon: <Layers className="w-4 h-4 text-[#194432]" />,
      shortcut: 'G D',
      action: () => {
        onNavigateTab('dashboard');
        onClose();
      },
    },
    {
      id: 'nav-map',
      category: 'Navigation',
      title: 'Satellite GIS Map',
      description: 'Google Maps satellite view with pond boundaries and GIS pins',
      icon: <Compass className="w-4 h-4 text-[#194432]" />,
      shortcut: 'G M',
      action: () => {
        onNavigateTab('map');
        onClose();
      },
    },
    {
      id: 'nav-cctv',
      category: 'Navigation',
      title: 'Real-Time CCTV Feeds',
      description: 'Live RTSP/HLS streams with PTZ controls and night vision',
      icon: <Camera className="w-4 h-4 text-[#0284c7]" />,
      shortcut: 'G C',
      action: () => {
        onNavigateTab('cctv');
        onClose();
      },
    },
    {
      id: 'nav-weather',
      category: 'Navigation',
      title: 'Weather & Climate Forecast',
      description: 'Diurnal forecast, wind aeration rating and DO depletion risk',
      icon: <CloudSun className="w-4 h-4 text-[#d97706]" />,
      shortcut: 'G W',
      action: () => {
        onNavigateTab('weather');
        onClose();
      },
    },
    {
      id: 'nav-water',
      category: 'Navigation',
      title: 'Water Quality & Sensors',
      description: 'DO, pH, temp, ammonia telemetry and manual logs',
      icon: <Droplets className="w-4 h-4 text-[#0284c7]" />,
      shortcut: 'G W',
      action: () => {
        onNavigateTab('water');
        onClose();
      },
    },
    {
      id: 'nav-production',
      category: 'Navigation',
      title: 'Ponds & Batches',
      description: 'Manage culture ponds, tanks and active grow-out cycles',
      icon: <Layers className="w-4 h-4 text-[#1b7a4b]" />,
      shortcut: 'G P',
      action: () => {
        onNavigateTab('production');
        onClose();
      },
    },
    {
      id: 'nav-operations',
      category: 'Navigation',
      title: 'Daily Operations',
      description: 'Record feeding, mortality, water exchange, and ABW sampling',
      icon: <PlusCircle className="w-4 h-4 text-[#d97706]" />,
      shortcut: 'G O',
      action: () => {
        onNavigateTab('operations');
        onClose();
      },
    },
    {
      id: 'nav-finance',
      category: 'Navigation',
      title: 'Farm Finance',
      description: 'CAPEX, OPEX, harvests, sales ledger and cost per kg',
      icon: <DollarSign className="w-4 h-4 text-[#1b7a4b]" />,
      shortcut: 'G F',
      action: () => {
        onNavigateTab('finance');
        onClose();
      },
    },
    {
      id: 'nav-iot',
      category: 'Navigation',
      title: 'ESP32 IoT Hub',
      description: 'Dallas DS18B20 nodes, telemetry logs and Arduino code',
      icon: <Cpu className="w-4 h-4 text-[#7c3aed]" />,
      shortcut: 'G I',
      action: () => {
        onNavigateTab('iot');
        onClose();
      },
    },
    {
      id: 'nav-intelligence',
      category: 'Navigation',
      title: 'AI & Operating Rules',
      description: 'Gemini briefing, BFAR/FAO threshold alerts, and advisor chat',
      icon: <BrainCircuit className="w-4 h-4 text-[#059669]" />,
      shortcut: 'G A',
      action: () => {
        onNavigateTab('intelligence');
        onClose();
      },
    },
    {
      id: 'act-water-test',
      category: 'Quick Actions',
      title: 'Log Water Test',
      description: 'Record manual DO, pH, temp, TAN or nitrite reading',
      icon: <Droplets className="w-4 h-4 text-[#0284c7]" />,
      shortcut: 'Q W',
      action: () => {
        onClose();
        onOpenQuickWaterTest();
      },
    },
    {
      id: 'act-feed',
      category: 'Quick Actions',
      title: 'Record Feeding',
      description: 'Log pellet distribution and feeding tray check',
      icon: <PlusCircle className="w-4 h-4 text-[#194432]" />,
      shortcut: 'Q F',
      action: () => {
        onClose();
        onOpenQuickFeed();
      },
    },
    {
      id: 'act-create-farm',
      category: 'Quick Actions',
      title: 'Register New Farm',
      description: 'Create a new commercial aquaculture production site',
      icon: <Plus className="w-4 h-4 text-[#181a1b]" />,
      action: () => {
        onClose();
        onOpenCreateFarm();
      },
    },
    {
      id: 'act-diagnostics',
      category: 'Diagnostics',
      title: 'Run 16-Point System Verification',
      description: 'Test math formulas, biological rules, telemetry ingest and auth',
      icon: <FileCheck className="w-4 h-4 text-[#1b7a4b]" />,
      shortcut: 'T S',
      action: () => {
        onClose();
        onOpenDiagnostics();
      },
    },
  ];

  const filtered = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
      }
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, filtered, selectedIndex]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-[#141816]/40 backdrop-blur-[2px] animate-in fade-in duration-150"
    >
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-[10px] border border-[#dcdcd6] shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#f0f0eb] gap-2.5">
          <Search className="w-4 h-4 text-[#888b90] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a destination or action... (e.g., water, feed, diagnostics)"
            className="w-full text-sm text-[#181a1b] placeholder:text-[#9fa1a6] bg-transparent focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[#787a7e] bg-[#f4f4f0] rounded border border-[#deded8]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-2 divide-y divide-[#f5f5f0]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#787a7e]">
              No commands matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-[6px] cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#edf5f0] text-[#194432]' : 'hover:bg-[#f8f8f5] text-[#2d3034]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">{item.icon}</div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold tracking-tight truncate flex items-center gap-1.5">
                        <span>{item.title}</span>
                        <span className="text-[10px] font-normal text-[#8c8f94] font-mono">
                          [{item.category}]
                        </span>
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-[#67696d] truncate leading-tight mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.shortcut && (
                      <kbd className="text-[10px] font-mono text-[#787a7e] bg-[#f2f2ee] px-1.5 py-0.5 rounded border border-[#deded8]">
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-[#194432]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#f0f0ea] bg-[#fafaf7] flex items-center justify-between text-[11px] text-[#707276]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="font-mono text-[10px]">HQ16 AquaOS Navigator</span>
        </div>
      </div>
    </div>
  );
};
