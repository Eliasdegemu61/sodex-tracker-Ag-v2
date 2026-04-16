'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Search,
  Wallet,
  Trophy,
  Zap,
  Info,
  Menu,
  X,
  TrendingUp,
  Compass,
  Shield,
  BookOpen,
  LineChart,
  CandlestickChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/app/providers';

interface MobileNavMenuProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function MobileNavMenu({ currentPage, onNavigate }: MobileNavMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { section: 'Main Navigation', items: [
      { id: 'dex-status', label: 'SoDex Status', icon: Activity },
      { id: 'tracker', label: 'Tracker', icon: TrendingUp },
      { id: 'portfolio', label: 'Portfolio', icon: Wallet },
      { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
      { id: 'assets', label: 'Assets', icon: Compass },
      { id: 'analyzer', label: 'Reverse Search', icon: Zap },
    ]},
    { section: 'Beta', items: [
      { id: 'journal', label: 'Journal', icon: BookOpen },
      { id: 'demo-trading', label: 'Demo Trading', icon: CandlestickChart },
      { id: 'analytics', label: 'Trade analytics', icon: LineChart },
    ]}
  ];

  const handleNavClick = (pageId: string) => {
    onNavigate(pageId);
    setIsOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="lg:hidden" ref={menuRef}>
      {/* Menu Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-90 border",
          theme === 'light'
            ? "bg-black/5 border-black/10 text-black hover:text-orange-500 hover:border-orange-500/50"
            : "bg-white/[0.03] border-white/5 text-white/40 hover:text-orange-400 hover:border-orange-400/50",
          isOpen && (theme === 'light' ? "text-orange-500 border-orange-500/50" : "text-orange-400 border-orange-400/50")
        )}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="fixed inset-x-0 top-[70px] z-[100] px-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className={cn(
            "border rounded-[1.8rem] shadow-[0_40px_80px_rgba(0,0,0,0.5)] p-2 max-w-[260px] ml-auto overflow-hidden",
            theme === 'light' ? "bg-white border-black/5" : "bg-[#0D0D0D] border-white/10"
          )}>
            <div className="flex flex-col gap-5 p-2">
              {navItems.map((group) => (
                <div key={group.section} className="flex flex-col gap-1.5">
                  <span className="px-3.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">
                    {group.section}
                  </span>
                  <div className="flex flex-col gap-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id)}
                          className={cn(
                            "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-left w-full border border-transparent group",
                            isActive
                              ? (theme === 'light' 
                                  ? "bg-primary/5 text-primary border-primary/20 shadow-[inset_0_0_10px_rgba(255,77,0,0.02)]" 
                                  : "bg-primary/10 text-primary border-primary/30 shadow-[inset_0_0_20px_rgba(255,77,0,0.05)]")
                              : (theme === 'light' 
                                  ? "text-black/60 hover:text-black hover:bg-black/5" 
                                  : "text-white/60 hover:text-white hover:bg-white/5")
                          )}
                        >
                          <Icon className={cn(
                            "w-4 h-4 transition-transform group-hover:scale-110",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )} />
                          <span className="text-sm font-bold tracking-tight">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


