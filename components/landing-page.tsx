'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, MapPin, LineChart, Compass, PieChart, Trophy, Flashlight, Zap, Send, Twitter, Shield, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const ANIMATION_DURATION = 800; // Duration for each tab to glow in ms
const CYCLE_DURATION = ANIMATION_DURATION * 5; // Total cycle time for all 5 tabs

export function LandingPage() {
  const router = useRouter();
  const [loadingStep, setLoadingStep] = useState(0);
  const [glowingTabIndex, setGlowingTabIndex] = useState(0);
  const [logoSrc, setLogoSrc] = useState('https://sodex.com/_next/image?url=%2Flogo%2Flogo.webp&w=256&q=75');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [showLoading, setShowLoading] = useState(true);

  const loadingMessages = [
    'Analyzing market data',
    'Processing trades',
    'Loading portfolios',
    'Fetching leaderboards',
    'Setting up dashboard',
  ];

  const tabs = [
    { id: 'dex-status', label: 'SoDex Status', icon: Compass },
    { id: 'tracker', label: 'Tracker', icon: LineChart },
    { id: 'portfolio', label: 'Portfolio', icon: PieChart },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'analyzer', label: 'Reverse Search', icon: Flashlight },
    { id: 'whale-tracker', label: 'Whales', icon: Shield },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
    }, 1500);

    const timeout = setTimeout(() => {
      setShowLoading(false);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const glowInterval = setInterval(() => {
      setGlowingTabIndex((prev) => (prev + 1) % tabs.length);
    }, ANIMATION_DURATION);

    return () => clearInterval(glowInterval);
  }, [tabs.length]);

  // Do NOT preload any dashboard data on landing page - lazy load only when user navigates
  // This allows other sections to load faster when selected

  // Handle address search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[v0] handleSearch called with address:', searchAddress);
    if (searchAddress.trim()) {
      const encodedAddress = encodeURIComponent(searchAddress.trim());
      console.log('[v0] Pushing to dashboard with address:', encodedAddress);
      router.push(`/dashboard?tab=tracker&address=${encodedAddress}`);
    }
  };

  // Handle Enter key in input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('[v0] Key pressed:', e.key);
    if (e.key === 'Enter') {
      console.log('[v0] Enter key detected, preventing default and calling handleSearch');
      e.preventDefault();
      handleSearch(e as any);
    }
  };

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    const newLogoSrc = isDark
      ? 'https://sodex.com/_next/image?url=%2Flogo%2Flogo.webp&w=256&q=75'
      : 'https://testnet.sodex.com/assets/SoDEX-Dh5Mk-Pl.svg';
    setLogoSrc(newLogoSrc);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <style>{`
        @keyframes sequentialGlow {
          0% {
            text-shadow: 0 0 0 rgba(249, 115, 22, 0),
                        0 0 0 rgba(249, 115, 22, 0);
            filter: drop-shadow(0 0 0px rgba(249, 115, 22, 0));
            color: rgb(249, 115, 22);
          }
          50% {
            text-shadow: 0 0 10px rgba(249, 115, 22, 1),
                        0 0 20px rgba(249, 115, 22, 0.8);
            filter: drop-shadow(0 0 12px rgba(249, 115, 22, 1));
            color: rgb(249, 115, 22);
          }
          100% {
            text-shadow: 0 0 0 rgba(249, 115, 22, 0),
                        0 0 0 rgba(249, 115, 22, 0);
            filter: drop-shadow(0 0 0px rgba(249, 115, 22, 0));
            color: rgb(249, 115, 22);
          }
        }
        .tab-icon-glow {
          animation: sequentialGlow 1.6s ease-in-out;
        }
        @keyframes bounce-loader {
          0%, 100% {
            transform: translateY(0);
            opacity: 1;
          }
          50% {
            transform: translateY(-12px);
            opacity: 0.6;
          }
        }
        .dot-bounce {
          animation: bounce-loader 1.4s infinite;
        }
        .dot-bounce:nth-child(2) {
          animation-delay: 0.2s;
        }
        .dot-bounce:nth-child(3) {
          animation-delay: 0.4s;
        }
      `}</style>

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-8">
        {/* Main heading with logo */}
        <div className="space-y-2 sm:space-y-4">
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <img
              src={logoSrc || "/placeholder.svg"}
              alt="Sodex Logo"
              className="h-10 sm:h-16 w-auto object-contain flex-shrink-0"
              loading="eager"
              decoding="async"
            />
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Tracker and <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-400">Dashboard</span>
            </h1>
          </div>
          <p className="text-xs sm:text-lg md:text-xl text-muted-foreground text-balance">
            Real-time portfolio tracking, address monitoring, and performance analytics for SoDex
          </p>
        </div>

        {/* Loading indicator - Bouncing dots animation */}
        {showLoading && (
          <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 py-3 sm:py-6">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-orange-500 dot-bounce" />
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-orange-500 dot-bounce" />
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-orange-500 dot-bounce" />
            </div>
            <div className="h-6">
              <p className="text-xs sm:text-sm text-muted-foreground transition-opacity duration-300">
                {loadingMessages[loadingStep]}
              </p>
            </div>
          </div>
        )}

        {/* Address Search Bar */}
        <div className="pt-4 sm:pt-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter wallet address to search..."
              className="flex-1 px-4 py-2 sm:py-3 rounded-lg bg-card border border-border/50 text-foreground text-xs sm:text-sm placeholder-muted-foreground focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
              autoComplete="off"
            />
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-medium px-6 py-2 sm:py-3 text-xs sm:text-sm transition-colors whitespace-nowrap rounded-lg cursor-pointer"
            >
              Search
            </button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">or choose a section below</p>
        </div>

        {/* Navigation tabs with sequential glow */}
        <div className="pt-2 sm:pt-4">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-4">Choose a section to explore:</p>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isGlowing = index === glowingTabIndex;
              
              return (
                <Link key={tab.id} href={`/dashboard?tab=${tab.id}`}>
                  <Button
                    variant="outline"
                    className="w-full h-14 sm:h-20 flex flex-col items-center justify-center gap-1 sm:gap-2 border-border/50 transition-all hover:border-orange-500/50 bg-transparent hover:bg-transparent"
                  >
                    <Icon className={`w-4 sm:w-5 h-4 sm:h-5 text-orange-500 ${isGlowing ? 'tab-icon-glow' : ''}`} />
                    <span className="text-xs font-medium text-balance text-muted-foreground group-hover:text-orange-500 hover:text-orange-500 transition-colors">{tab.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 pt-4 sm:pt-8">
          <div className="flex flex-col items-center gap-1 sm:gap-2">
            <BarChart3 className="w-5 sm:w-6 h-5 sm:h-6 text-orange-500" />
            <h3 className="text-sm sm:text-base font-semibold">Real-time Analytics</h3>
            <p className="text-xs text-muted-foreground">Live market data and portfolio performance</p>
          </div>
          <div className="flex flex-col items-center gap-1 sm:gap-2">
            <MapPin className="w-5 sm:w-6 h-5 sm:h-6 text-orange-500" />
            <h3 className="text-sm sm:text-base font-semibold">Address Tracking</h3>
            <p className="text-xs text-muted-foreground">Monitor wallets and track fund flows</p>
          </div>
          <div className="flex flex-col items-center gap-1 sm:gap-2">
            <LineChart className="w-5 sm:w-6 h-5 sm:h-6 text-orange-500" />
            <h3 className="text-sm sm:text-base font-semibold">Track Winners</h3>
            <p className="text-xs text-muted-foreground">Monitor top traders and patterns</p>
          </div>
        </div>

        {/* Footer text */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 pt-4 sm:pt-8 text-xs text-muted-foreground">
          <a href="https://x.com/eliasing00" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors flex items-center justify-center p-1.5 sm:p-2 rounded-lg hover:bg-orange-500/10">
            <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.6l-5.165-6.756-5.868 6.756h-3.308l7.732-8.835L2.882 2.25h6.6l4.759 6.318L18.244 2.25zM17.55 19.5h1.832L6.281 3.75H4.38L17.55 19.5z" />
            </svg>
          </a>
          <a href="https://t.me/fallphile" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors flex items-center justify-center p-1.5 sm:p-2 rounded-lg hover:bg-orange-500/10">
            <Send className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </a>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <span className="text-xs">Built by Elias</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <button onClick={() => setShowDisclaimer(true)} className="hover:text-orange-500 transition-colors underline text-xs">Disclaimer</button>
        </div>

        {/* Disclaimer Modal */}
        {showDisclaimer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto p-6 space-y-4">
              <h2 className="text-xl font-bold text-foreground">Disclaimer</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>
                  This dashboard is an independent, community built analytics tool created for tracking on-chain activity related to SoDEX. It is not affiliated with, endorsed by, or operated by the SoDEX team. All data is provided for informational purposes only and should not be considered financial advice. Always verify transactions and contract addresses directly on the blockchain before making any decisions.
                </p>
                <p className="text-xs">- Elias (SoDex OG)</p>
              </div>
              <button
                onClick={() => setShowDisclaimer(false)}
                className="text-orange-500 hover:text-orange-600 font-medium transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Animated accent elements */}
      <div className="absolute top-20 right-10 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl" />


    </div>
  );
}

