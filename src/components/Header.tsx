import React, { useState, useEffect } from 'react';
import {
  Layers,
  Database,
  AlertTriangle,
  LogOut,
  LogIn,
  Plus,
  RefreshCw,
  FileCheck,
  Search,
  ChevronDown,
  Droplets,
  PlusCircle,
  DollarSign,
  Cpu,
  BrainCircuit,
  Menu,
  X,
  Compass,
  Camera,
  CloudSun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Farm } from '../types.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';

interface HeaderProps {
  farms: Farm[];
  currentFarm: Farm | null;
  onSelectFarm: (farm: Farm) => void;
  onOpenCreateFarm: () => void;
  onOpenDiagnostics: () => void;
  onSeedDemo: () => void;
  openAlertsCount: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCommandPalette: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  farms,
  currentFarm,
  onSelectFarm,
  onOpenCreateFarm,
  onOpenDiagnostics,
  onSeedDemo,
  openAlertsCount,
  activeTab,
  setActiveTab,
  onOpenCommandPalette,
}) => {
  const { user, isDemoUser, signInWithGoogle, signInAsDemo, signOut, loading } = useAuth();
  const [manilaTime, setManilaTime] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        month: 'short',
        day: 'numeric',
      }).format(new Date());
      setManilaTime(timeStr + ' PHT');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'map', label: 'Satellite Map', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'cctv', label: 'CCTV Feeds', icon: <Camera className="w-3.5 h-3.5" /> },
    { id: 'weather', label: 'Weather & Climate', icon: <CloudSun className="w-3.5 h-3.5" /> },
    { id: 'water', label: 'Water Quality', icon: <Droplets className="w-3.5 h-3.5" /> },
    { id: 'production', label: 'Ponds & Batches', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'operations', label: 'Daily Ops', icon: <PlusCircle className="w-3.5 h-3.5" /> },
    { id: 'finance', label: 'Finance', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'iot', label: 'ESP32 IoT', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'intelligence', label: 'AI & Rules', icon: <BrainCircuit className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-[#e2e2dc] sticky top-0 z-30 transition-all">
      {/* Primary Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          {/* Logo, Farm Context & Time */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Emblem */}
            <div className="w-8 h-8 rounded-[6px] bg-[#194432] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <span className="font-mono text-xs tracking-tighter">HQ16</span>
            </div>

            {/* Brand title */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold tracking-tight text-[#181a1b] text-sm sm:text-base leading-none">
                  AquaOS
                </span>
                <span className="hidden md:inline-block text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#edf5f0] text-[#194432] border border-[#cce3d5]">
                  Bicol Station
                </span>
              </div>
              <div className="text-[11px] text-[#707276] font-mono flex items-center gap-1 mt-0.5 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1b7a4b] animate-pulse shrink-0" />
                <span className="truncate">{manilaTime || 'Asia/Manila (UTC+8)'}</span>
              </div>
            </div>

            {/* Farm Selector */}
            <div className="hidden lg:flex items-center pl-3 border-l border-[#e8e8e2] ml-2">
              {farms.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <select
                      id="farm-select-dropdown"
                      value={currentFarm?.id || ''}
                      onChange={(e) => {
                        const selected = farms.find((f) => f.id === e.target.value);
                        if (selected) onSelectFarm(selected);
                      }}
                      className="h-8 pl-2.5 pr-7 text-xs font-medium text-[#181a1b] bg-[#f8f8f6] hover:bg-[#f2f2ee] border border-[#dcdcd6] rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#194432] appearance-none cursor-pointer"
                    >
                      {farms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} {f.isDemo ? '(Demo)' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-[#787a7e] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                  </div>
                  <button
                    id="btn-new-farm-modal"
                    onClick={onOpenCreateFarm}
                    title="Register New Farm"
                    className="h-8 w-8 flex items-center justify-center bg-[#f8f8f6] hover:bg-[#eaeae6] border border-[#dcdcd6] text-[#4a4c50] rounded-[6px] transition-colors btn-tactile"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={onSeedDemo} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                  Load Demo Farm
                </Button>
              )}
            </div>
          </div>

          {/* Quick Actions & Utilities */}
          <div className="flex items-center gap-2">
            {/* Command Palette Trigger */}
            <button
              onClick={onOpenCommandPalette}
              title="Command Palette (Cmd+K)"
              className="hidden md:flex items-center gap-2 h-8 px-2.5 text-xs text-[#67696d] bg-[#f8f8f6] hover:bg-[#f2f2ee] border border-[#dcdcd6] rounded-[6px] transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-[#8c8f94]" />
              <span>Search & jump...</span>
              <kbd className="text-[10px] font-mono text-[#787a7e] bg-[#ecece8] px-1.5 py-0.5 rounded border border-[#deded8]">
                ⌘K
              </kbd>
            </button>

            {/* 16-Point Verification runner */}
            <Button
              id="btn-run-diagnostics"
              variant="outline"
              size="sm"
              onClick={onOpenDiagnostics}
              leftIcon={<FileCheck className="w-3.5 h-3.5 text-[#194432]" />}
              className="hidden sm:inline-flex text-xs text-[#194432]"
            >
              <span className="hidden xl:inline">16-Point</span> Verification
            </Button>

            {/* Database indicator */}
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono text-[#55585d] bg-[#f8f8f6] px-2 py-1 rounded-[5px] border border-[#e4e4dd]">
              <Database className="w-3 h-3 text-[#1b7a4b]" />
              <span>Cloud SQL: PG</span>
            </div>

            {/* Open alerts pill */}
            {openAlertsCount > 0 && (
              <button
                id="btn-open-alerts-indicator"
                onClick={() => setActiveTab('intelligence')}
                className="h-8 px-2 sm:px-2.5 text-xs font-medium bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer hover:bg-[#fee2e2]"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-[#dc2626] shrink-0" />
                <span className="font-mono font-semibold">{openAlertsCount}</span>
                <span className="hidden sm:inline">Notice{openAlertsCount > 1 ? 's' : ''}</span>
              </button>
            )}

            {/* User Profile / Auth */}
            {loading ? (
              <div className="text-xs text-[#707276] font-mono">Syncing...</div>
            ) : user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-[#e8e8e2]">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-[#181a1b] truncate max-w-[120px]">
                    {user.displayName || user.email?.split('@')[0] || 'Operator'}
                  </div>
                  <div className="text-[10px] text-[#1b7a4b] font-mono leading-none">
                    {isDemoUser ? 'Demo Access' : 'Verified'}
                  </div>
                </div>
                <button
                  id="btn-user-signout"
                  onClick={signOut}
                  title="Sign Out"
                  className="h-8 w-8 flex items-center justify-center text-[#707276] hover:text-[#181a1b] hover:bg-[#f2f2ee] rounded-[6px] border border-transparent hover:border-[#dcdcd6] transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button variant="primary" size="sm" onClick={signInAsDemo} id="btn-demo-signin">
                  Demo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signInWithGoogle}
                  id="btn-google-signin"
                  leftIcon={<LogIn className="w-3.5 h-3.5" />}
                  className="hidden sm:inline-flex"
                >
                  Sign In
                </Button>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden h-8 w-8 flex items-center justify-center text-[#4a4c50] hover:bg-[#f2f2ee] rounded-[6px] border border-[#dcdcd6]"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Navigation Tabs */}
      <div className="hidden lg:block border-t border-[#f0f0ea] bg-[#fafaf8]/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center space-x-1 py-1.5 overflow-x-auto scrollbar-none">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-[5px] flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap btn-tactile ${
                    isActive
                      ? 'bg-[#194432] text-white shadow-xs font-semibold'
                      : 'text-[#55585d] hover:text-[#181a1b] hover:bg-[#f0f0ea]'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Drawer (When hamburger is clicked) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#e2e2dc] bg-white px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="pb-2 border-b border-[#f0f0ea] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#181a1b]">Navigation</span>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenCommandPalette();
              }}
              className="text-xs text-[#194432] font-medium flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search (⌘K)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-[6px] text-left text-xs font-medium flex items-center gap-2 transition-colors ${
                  activeTab === item.id
                    ? 'bg-[#194432] text-white'
                    : 'text-[#4a4c50] hover:bg-[#f4f4f0]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {farms.length > 0 && (
            <div className="pt-2 border-t border-[#f0f0ea] space-y-1">
              <label className="text-[11px] font-medium text-[#707276]">Active Farm Context</label>
              <select
                value={currentFarm?.id || ''}
                onChange={(e) => {
                  const selected = farms.find((f) => f.id === e.target.value);
                  if (selected) onSelectFarm(selected);
                  setMobileMenuOpen(false);
                }}
                className="w-full h-8 text-xs bg-[#f8f8f6] border border-[#dcdcd6] rounded-[6px] px-2"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
