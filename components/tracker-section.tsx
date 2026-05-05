'use client';

import React, { useEffect } from "react"

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, X, Loader2, Share2, ArrowUpRight, Activity, Calendar } from 'lucide-react';
import { PortfolioOverview } from './portfolio-overview';
import { PnLChart } from './pnl-chart';
import { PositionsTable } from './positions-table';
import { OpenPositions } from './open-positions';
import { FundFlowTable } from './fund-flow-table';
import { AssetFlowCard } from './asset-flow-card';
import { MonthlyCalendar } from './monthly-calendar';
import { ShareStatsModal } from './share-stats-modal';
import { PortfolioProvider } from '@/context/portfolio-context';
import { getUserIdByAddress, fetchAllPositions, enrichPositions, type EnrichedPosition } from '@/lib/sodex-api';
import { usePortfolio } from '@/context/portfolio-context';
import { cn } from '@/lib/utils';

// Loading Spinner Component
function LoadingSpinner({ message, subMessage }: { message: string, subMessage?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      <div className="text-center space-y-1">
        <span className="block text-sm font-medium text-muted-foreground animate-pulse">{message}</span>
        {subMessage && (
          <span className="block text-xs text-muted-foreground/60">{subMessage}</span>
        )}
      </div>
    </div>
  );
}

// Loading Skeleton Component
function TrackerLoadingSkeleton({ loadingMessage, loadingSubMessage }: { loadingMessage?: string, loadingSubMessage?: string }) {
  const [showDots, setShowDots] = useState(true);

  useEffect(() => {
    // Show dots for 3 seconds, then fade to skeleton
    const timer = setTimeout(() => setShowDots(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (showDots || loadingMessage) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner 
          message={loadingMessage || "Fetching latest data..."} 
          subMessage={loadingSubMessage}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-secondary/50 rounded w-32"></div>
        <div className="h-4 bg-secondary/50 rounded w-48"></div>
      </div>

      {/* Overview Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 bg-card border border-border">
            <div className="h-4 bg-secondary/50 rounded w-20 mb-4"></div>
            <div className="h-8 bg-secondary/50 rounded w-32"></div>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6 bg-card border border-border h-80">
            <div className="h-full bg-secondary/50 rounded animate-pulse"></div>
          </Card>
        </div>
        <Card className="p-6 bg-card border border-border h-80">
          <div className="h-full bg-secondary/50 rounded animate-pulse"></div>
        </Card>
      </div>

    </div>
  );
}

function TrackerContent({ initialSearchAddress }: { initialSearchAddress?: string }) {
  const [searchInput, setSearchInput] = useState(initialSearchAddress || '');
  
  // Atomic state for the active portfolio to prevent partial rendering
  const [activePortfolio, setActivePortfolio] = useState<{
    walletAddress: string;
    userId: string;
    positions: EnrichedPosition[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<{count: number, isLong: boolean}>({ count: 0, isLong: false });
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track the current abort controller for cancellation
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Timeframe option for large accounts
  const [timeframe, setTimeframe] = useState<'30D' | 'ALL'>('ALL');

  const handleSearch = async (addressToSearch?: string) => {
    const valueToSearch = (addressToSearch || searchInput || '').trim();
    if (!valueToSearch) return;

    // Cancel any existing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setFetchProgress({ count: 0, isLong: false });

    // Long fetch timer
    const longFetchTimer = setTimeout(() => {
      setFetchProgress(prev => ({ ...prev, isLong: true }));
    }, 4000);

    try {
      const addressToFetch = valueToSearch;
      const foundUserId = await getUserIdByAddress(addressToFetch);

      // Calculate minTimestamp if 30D is selected
      const minTimestamp = timeframe === '30D' ? Date.now() - 30 * 24 * 60 * 60 * 1000 : undefined;

      const fetchedPositions = await fetchAllPositions(
        foundUserId, 
        (count) => {
          setFetchProgress(prev => ({ ...prev, count }));
        },
        minTimestamp,
        controller.signal
      );
      
      const enrichedPositions = await enrichPositions(fetchedPositions);

      // Only set everything if this is still the active request
      if (!controller.signal.aborted) {
        setActivePortfolio({
          walletAddress: valueToSearch,
          userId: foundUserId,
          positions: enrichedPositions
        });
        setError(null);
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Fetch aborted') {
        console.log('[v0] Search cancelled for:', valueToSearch);
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wallet data';
      console.error('[v0] Error searching wallet:', errorMessage);
      setError(errorMessage);
      setActivePortfolio(null);
    } finally {
      if (abortControllerRef.current === controller) {
        clearTimeout(longFetchTimer);
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  // Auto-search when initialSearchAddress is provided
  useEffect(() => {
    if (initialSearchAddress && initialSearchAddress.trim()) {
      setSearchInput(initialSearchAddress);
      handleSearch(initialSearchAddress);
    }
  }, [initialSearchAddress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleClear = () => {
    setSearchInput('');
    setActivePortfolio(null);
    setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Render portfolio data when wallet is found
  if (isLoading) {
    const loadingMessage = fetchProgress.isLong 
      ? `Indexing... (${fetchProgress.count} records)` 
      : "Resolving address...";
    const loadingSubMessage = fetchProgress.isLong 
      ? `Large history detected. Indexing entire trade history safely. Please wait until this process finishes for accurate metrics.` 
      : undefined;

    return (
      <div className="flex items-center justify-center min-h-[400px] w-full max-w-5xl mx-auto px-4">
        <TrackerLoadingSkeleton 
          loadingMessage={loadingMessage} 
          loadingSubMessage={loadingSubMessage}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="p-4 rounded-full bg-red-500/10">
          <X className="h-8 w-8 text-red-500" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Search Failed</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button onClick={handleClear} variant="outline">Try Another Address</Button>
      </div>
    );
  }

  if (!activePortfolio) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 max-w-2xl mx-auto px-4">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-black tracking-tight italic uppercase">Wallet Tracker</h2>
          <p className="text-muted-foreground">Monitor performance, positions, and fund flows for any SoDex address.</p>
        </div>
        
        <div className="w-full max-w-md space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter 0x address..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 focus:outline-none focus:border-orange-500/50 transition-all font-mono text-sm"
              />
            </div>
            <Button onClick={() => handleSearch()} disabled={isLoading} className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold italic px-6">
              TRACK
            </Button>
          </div>

          <div className="flex items-center justify-center gap-4 py-2">
             <div className="flex bg-white/5 rounded-xl p-1">
                {(['ALL', '30D'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-widest",
                      timeframe === t
                        ? "bg-white text-black shadow-lg"
                        : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Calendar className="w-3 h-3" />
                    {t === 'ALL' ? 'Full History' : 'Last 30 Days'}
                  </button>
                ))}
              </div>
          </div>
          <p className="text-[10px] text-center text-muted-foreground/40 uppercase tracking-[0.2em]">
            Tip: Use "Last 30 Days" for high-frequency trading accounts
          </p>
        </div>
      </div>
    );
  }

  return (
    <PortfolioProvider initialData={{ 
      positions: activePortfolio.positions, 
      userId: activePortfolio.userId, 
      walletAddress: activePortfolio.walletAddress, 
      sourceWalletAddress: activePortfolio.walletAddress 
    }}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-orange-500/10">
              <Activity className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight">Tracker</h2>
                <div className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Live</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-mono">{activePortfolio.walletAddress}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleClear} variant="outline" size="sm" className="rounded-xl">
              <X className="h-4 w-4 mr-2" /> Clear
            </Button>
            <ShareStatsModal walletAddress={activePortfolio.walletAddress} userId={activePortfolio.userId} />
          </div>
        </div>

        <PortfolioOverview />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PnLChart />
          </div>
          <AssetFlowCard />
        </div>

        <OpenPositions />
        <PositionsTable />
        <FundFlowTable />
      </div>
    </PortfolioProvider>
  );
}

export function TrackerSection({ initialSearchAddress }: { initialSearchAddress?: string }) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TrackerContent initialSearchAddress={initialSearchAddress} />
    </div>
  );
}
