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
  Shield
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
    { id: 'dex-status', label: 'SoDex Status', icon: Activity },
    { id: 'tracker', label: 'Address Tracker', icon: TrendingUp },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'assets', label: 'Assets', icon: Compass },
    { id: 'analyzer', label: 'Reverse Search', icon: Zap },
    { id: 'about', label: 'What is SoDEX', icon: Info },
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
    <div className="md:hidden" ref={menuRef}>
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
          <div className="bg-[#0D0D0D] border border-white/10 rounded-[1.8rem] shadow-[0_40px_80px_rgba(0,0,0,0.9)] p-1 max-w-[220px] ml-auto">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2 rounded-xl transition-all duration-200 text-left w-full border border-transparent",
                      isActive
                        ? "bg-[#251808] text-[#F97316] border-[#F97316]/40 shadow-[inset_0_0_20px_rgba(249,115,22,0.05)]"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className={cn(
                      "w-4 h-4 stroke-[1.5]",
                      isActive ? "text-[#F97316]" : "text-white/40"
                    )} />
                    <span className={cn(
                      "text-[13.5px] font-medium tracking-tight",
                      isActive ? "text-[#F97316]" : "text-white/90"
                    )}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


