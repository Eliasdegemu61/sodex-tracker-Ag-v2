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
  CandlestickChart,
  MessageSquare,
  Coins,
  FileText,
  Layers,
  Radio,
  Target,
  Signal
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
      { id: 'dex-status', label: 'SoDex Status', icon: Signal },
      { id: 'tracker', label: 'Tracker', icon: Target },
      { id: 'portfolio', label: 'Portfolio', icon: Wallet },
      { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
      { id: 'assets', label: 'Assets', icon: Layers },
      { id: 'pulse', label: 'Community Pulse', icon: Radio },
      { id: 'funding', label: 'Accrued Funding', icon: Coins },
      { id: 'export-history', label: 'Trade History', icon: FileText },
      { id: 'analyzer', label: 'Reverse Search', icon: Search },
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
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[110] border-t bg-background/95 backdrop-blur-md">
      <div className="flex items-center gap-7 px-6 py-3 overflow-x-auto no-scrollbar scroll-smooth">
        {navItems.flatMap(group => group.items).map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 min-w-fit transition-all duration-300",
                isActive 
                  ? "text-orange-500 scale-105" 
                  : "text-muted-foreground/40 hover:text-muted-foreground/80"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
              <span className="text-[8px] font-black uppercase tracking-[0.1em] whitespace-nowrap opacity-70">
                {item.label === 'Community Pulse' ? 'Pulse' : 
                 item.label === 'Accrued Funding' ? 'Funding' : 
                 item.label === 'Reverse Search' ? 'Search' :
                 item.label === 'SoDex Status' ? 'Status' :
                 item.label === 'Trade analytics' ? 'Analytics' :
                 item.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Bottom Safe Area for Mobile Browsers */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
