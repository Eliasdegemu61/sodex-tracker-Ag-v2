'use client';

import React, { useEffect } from "react"

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, X, Loader2, Share2, ArrowUpRight, Activity, Calendar, ChevronRight } from 'lucide-react';
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
function TrackerLoadingSkeleton({ loadingMessage, loadingSubMessage, onAbort, onContinue, currentCount }: { 
  loadingMessage?: string, 
  loadingSubMessage?: string, 
  onAbort?: () => void,
  onContinue?: () => void,
  currentCount?: number
}) {
  const [showDots, setShowDots] = useState(true);

  useEffect(() => {
    // Show dots for 3 seconds, then fade to skeleton
    const timer = setTimeout(() => setShowDots(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (showDots || loadingMessage) {
    const isPaused = loadingMessage?.includes('Paused');

    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-8">
        <LoadingSpinner 
          message={loadingMessage || "Fetching latest data..."} 
          subMessage={loadingSubMessage}
        />
        
        {isPaused && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex gap-3">
              <Button onClick={onAbort} variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 px-6">
                Show Current ({currentCount})
              </Button>
              <Button onClick={onContinue} className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 gap-2">
                Continue Fetching <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em]">
              Fetched 10,000 records. Continuing may slow down the browser.
            </p>
          </div>
        )}
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
  const [isPaused, setIsPaused] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<{count: number, isLong: boolean, nextCursor?: string}>({ count: 0, isLong: false });
  const [error, setError] = useState<string | null>(null);
  
  // Store intermediate positions when paused
  const [pendingPositions, setPendingPositions] = useState<any[]>([]);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  // Ref to track the current abort controller for cancellation
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Timeframe option for large accounts
  const [timeframe, setTimeframe] = useState<'30D' | 'ALL'>('ALL');

  const handleSearch = async (addressToSearch?: string, cursor?: string, accumulatedPositions: any[] = []) => {
    const valueToSearch = (addressToSearch || searchInput || '').trim();
    if (!valueToSearch) return;

    // Only cancel if this is a fresh search (not a "Continue")
    if (!cursor) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setPendingPositions([]);
    }

    const controller = abortControllerRef.current!;

    setIsLoading(true);
    setIsPaused(false);
    setError(null);
    
    if (!cursor) {
      setFetchProgress({ count: 0, isLong: false });
    }

    // Long fetch timer
    const longFetchTimer = setTimeout(() => {
      setFetchProgress(prev => ({ ...prev, isLong: true }));
    }, 4000);

    try {
      const addressToFetch = valueToSearch;
      const foundUserId = cursor ? pendingUserId! : await getUserIdByAddress(addressToFetch);
      
      if (!cursor) setPendingUserId(foundUserId);

      // Calculate minTimestamp if 30D is selected
      const minTimestamp = timeframe === '30D' ? Date.now() - 30 * 24 * 60 * 60 * 1000 : undefined;

      // Soft limit of 10k records
      const SOFT_LIMIT = 10000;

      const { positions: fetchedPositions, nextCursor } = await fetchAllPositions(
        foundUserId, 
        (count) => {
          setFetchProgress(prev => ({ ...prev, count: accumulatedPositions.length + count }));
        },
        minTimestamp,
        controller.signal,
        SOFT_LIMIT,
        cursor
      );
      
      const totalPositions = [...accumulatedPositions, ...fetchedPositions];

      if (nextCursor && totalPositions.length >= SOFT_LIMIT) {
        // We hit the limit and there's more to fetch
        setPendingPositions(totalPositions);
        setFetchProgress(prev => ({ ...prev, count: totalPositions.length, nextCursor }));
        setIsPaused(true);
        clearTimeout(longFetchTimer);
        return;
      }

      // Finish and enrich
      const enrichedPositions = await enrichPositions(totalPositions);

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
      if (err instanceof Error && (err.name === 'AbortError' || err.message === 'Fetch aborted')) {
        console.log('[v0] Search cancelled for:', valueToSearch);
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wallet data';
      console.error('[v0] Error searching wallet:', errorMessage);
      setError(errorMessage);
      setActivePortfolio(null);
    } finally {
      if (abortControllerRef.current === controller && !isPaused) {
        clearTimeout(longFetchTimer);
        if (!isPaused) setIsLoading(false);
        // Don't clear ref if we are paused, we need it for "Continue"
      }
    }
  };

  const handleContinue = () => {
    const addressToUse = activePortfolio?.walletAddress || searchInput;
    if (fetchProgress.nextCursor && addressToUse) {
      handleSearch(addressToUse, fetchProgress.nextCursor, pendingPositions);
    }
  };

  const handleAbortAndShow = async () => {
    if (!pendingPositions || pendingPositions.length === 0) return;
    setIsLoading(true);
    setIsPaused(false);
    try {
      const enriched = await enrichPositions(pendingPositions);
      setActivePortfolio({
        walletAddress: searchInput,
        userId: pendingUserId!,
        positions: enriched
      });
    } catch (err) {
      console.error('[v0] Abort and show error:', err);
      setError('Failed to process existing data');
    } finally {
      setIsLoading(false);
      if (abortControllerRef.current) abortControllerRef.current.abort();
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
    if (abortControllerRef.current) abortControllerRef.current.abort();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Render portfolio data when wallet is found
  if (isLoading || isPaused) {
    const loadingMessage = isPaused 
      ? `Paused at ${fetchProgress.count.toLocaleString()} records`
      : fetchProgress.isLong 
        ? `Indexing... (${fetchProgress.count.toLocaleString()} records)` 
        : "Resolving address...";
        
    const loadingSubMessage = isPaused
      ? "Large dataset detected. You can view what we've fetched so far or continue indexing the full history."
      : fetchProgress.isLong 
        ? `Indexing entire trade history safely. Please wait until this process finishes for accurate metrics.` 
        : undefined;

    return (
      <div className="flex items-center justify-center min-h-[400px] w-full max-w-5xl mx-auto px-4">
        <TrackerLoadingSkeleton 
          loadingMessage={loadingMessage} 
          loadingSubMessage={loadingSubMessage}
          onAbort={handleAbortAndShow}
          onContinue={handleContinue}
          currentCount={fetchProgress.count}
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
      <div className="flex min-h-[400px] flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-[1.5rem] md:rounded-[2rem] border border-black/8 bg-white p-6 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#050505] dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          
          <div className="mb-6 md:mb-8 text-center sm:text-left">
            <h2 className="mb-1 text-2xl md:text-4xl font-bold tracking-tight text-foreground">Tracker</h2>
            <p className="text-[10px] md:text-sm font-medium text-muted-foreground/60 tracking-wider">monitor performance and flows for any address</p>
          </div>

          <div className="space-y-6">
            <div className="relative">
              <input
                type="text"
                placeholder="0x..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setError(null); }}
                onKeyPress={handleKeyPress}
                className="w-full rounded-xl md:rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 md:py-4 text-xs md:text-sm font-medium text-foreground placeholder:text-black/25 focus:outline-none focus:ring-1 focus:ring-black/15 transition-all disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.02] dark:placeholder:text-white/25 dark:focus:ring-white/25"
              />
            </div>

            <div className="flex items-center justify-center">
               <div className="flex bg-black/[0.03] dark:bg-white/[0.03] rounded-xl p-1 w-full">
                  {(['ALL', '30D'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold transition-all tracking-widest",
                        timeframe === t
                          ? "bg-white dark:bg-white text-black shadow-lg"
                          : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                      )}
                    >
                      <Calendar className="w-3 h-3" />
                      {t === 'ALL' ? 'full history' : 'last 30 days'}
                    </button>
                  ))}
                </div>
            </div>

            <button
              onClick={() => handleSearch()}
              disabled={isLoading || !searchInput.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl md:rounded-2xl border border-white bg-white py-3 md:py-4 text-xs md:text-sm font-bold text-black shadow-sm transition-all hover:bg-white/90 disabled:opacity-40 tracking-widest"
            >
              <Search className="w-4 h-4" />
              <span>Track Wallet</span>
            </button>

            <p className="text-[10px] text-center text-muted-foreground/40 uppercase tracking-[0.2em]">
              Tip: Use "Last 30 Days" for high-frequency trading accounts
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <PortfolioProvider 
      initialUserId={activePortfolio.userId}
      initialPositions={activePortfolio.positions}
      initialWalletAddress={activePortfolio.walletAddress}
      initialSourceWalletAddress={activePortfolio.walletAddress}
    >
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight">Tracker</h2>
              </div>
              <p className="text-xs text-muted-foreground/60">{activePortfolio.walletAddress}</p>
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
          <AssetFlowCard walletAddress={activePortfolio.walletAddress} />
        </div>

        <OpenPositions />
        <PositionsTable />
        <FundFlowTable walletAddress={activePortfolio.walletAddress} />
      </div>
    </PortfolioProvider>
  );
}

export function TrackerSection({ initialSearchAddress }: { initialSearchAddress?: string }) {
  return (
    <div className="w-full max-w-[1800px] mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
      <TrackerContent initialSearchAddress={initialSearchAddress} />
    </div>
  );
}
