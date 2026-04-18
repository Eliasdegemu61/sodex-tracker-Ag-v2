'use client';

import React, { useEffect } from "react"

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, X, Loader2, Share2, ArrowUpRight } from 'lucide-react';
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

// Loading Spinner Component
function LoadingSpinner({ message }: { message: string }) {
  return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      <span className="text-sm font-medium text-muted-foreground animate-pulse">{message}</span>
    </div>
  );
}

// Loading Skeleton Component
function TrackerLoadingSkeleton() {
  const [showDots, setShowDots] = useState(true);

  useEffect(() => {
    // Show dots for 3 seconds, then fade to skeleton
    const timer = setTimeout(() => setShowDots(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (showDots) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner message="Fetching latest data..." />
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
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [sourceWalletAddress, setSourceWalletAddress] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [positions, setPositions] = useState<EnrichedPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (addressToSearch?: string) => {
    const valueToSearch = (addressToSearch || searchInput || '').trim();
    if (!valueToSearch) return;

    setIsLoading(true);
    setError(null);

    try {
      const addressToFetch = valueToSearch;
      const foundUserId = await getUserIdByAddress(addressToFetch);

      setWalletAddress(valueToSearch);
      setSourceWalletAddress(valueToSearch);
      setUserId(foundUserId);

      const fetchedPositions = await fetchAllPositions(foundUserId);
      const enrichedPositions = await enrichPositions(fetchedPositions);

      setPositions(enrichedPositions);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wallet data';
      console.error('[v0] Error searching wallet:', errorMessage);
      setError(errorMessage);
      setWalletAddress(null);
      setUserId(null);
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-search when initialSearchAddress is provided
  useEffect(() => {
    if (initialSearchAddress && initialSearchAddress.trim()) {
      setSearchInput(initialSearchAddress);
      handleSearch(initialSearchAddress);
    }
  }, [initialSearchAddress]);

  const handleClear = () => {
    setSearchInput('');
    setWalletAddress(null);
    setSourceWalletAddress(null);
    setUserId(null);
    setPositions([]);
    setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Render portfolio data when wallet is found
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full max-w-5xl mx-auto px-4">
        <LoadingSpinner message="Searching SoDex registry..." />
      </div>
    );
  }

  // Render search UI when no wallet is selected
  if (!walletAddress) {
    return (
      <div className="flex min-h-[calc(100vh-13rem)] flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-[2rem] border border-black/8 bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#050505] dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-10">
          <div className="mb-8 space-y-2">
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">Tracker</h2>
            <p className="text-sm leading-6 text-muted-foreground">Enter wallet address.</p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="0x..."
                className="w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-4 text-sm font-medium text-foreground placeholder:text-black/25 focus:outline-none focus:ring-1 focus:ring-black/15 transition-all dark:border-white/10 dark:bg-white/[0.02] dark:placeholder:text-white/25 dark:focus:ring-white/25"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/25 bg-red-500/8 p-3">
                <p className="text-xs font-medium text-red-600 dark:text-red-300">{error}</p>
              </div>
            )}

            <button
              onClick={() => handleSearch(searchInput)}
              disabled={isLoading || !searchInput.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white bg-white px-4 py-3.5 text-sm font-semibold text-black transition-all active:scale-[0.99] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Search className="h-4 w-4" />
              {isLoading ? 'Searching...' : 'Search Wallet'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PortfolioProvider
      initialUserId={userId}
      initialPositions={positions}
      initialWalletAddress={walletAddress}
      initialSourceWalletAddress={sourceWalletAddress}
    >
      <div className="space-y-5 text-foreground">
        <div className="rounded-[1.75rem] border border-black/8 bg-white px-5 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground md:text-3xl">
                Tracker
              </h1>
              <p className="max-w-3xl break-all text-sm text-muted-foreground">
                {walletAddress}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ShareStatsModal 
                walletAddress={walletAddress} 
                userId={userId || ''} 
                sourceWalletAddress={sourceWalletAddress || undefined}
                trigger={
                  <Button
                    variant="outline"
                    className="h-9 rounded-2xl border-black/10 bg-black/[0.02] px-3.5 text-[11px] font-semibold text-black/70 hover:bg-black/[0.05] hover:text-black dark:border-white/12 dark:bg-white/[0.02] dark:text-white/70 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </Button>
                }
              />
            <Button
              variant="outline"
              onClick={handleClear}
              className="h-9 rounded-2xl border-black/10 bg-black/[0.02] px-3.5 text-[11px] font-semibold text-black/70 hover:bg-black/[0.05] hover:text-black dark:border-white/12 dark:bg-white/[0.02] dark:text-white/70 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </Button>
            <a
              href={`https://sodex.com/join/TRADING`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-2xl border border-white/12 bg-white px-3.5 text-[11px] font-semibold text-black transition hover:bg-white/90"
            >
              Trade
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
        </div>

        <PortfolioOverview />

        <div className="grid grid-cols-1 gap-6">
          <div>
            <PnLChart />
          </div>
        </div>

        <PositionsTable />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FundFlowTable walletAddress={sourceWalletAddress || walletAddress || ''} />
          <AssetFlowCard walletAddress={sourceWalletAddress || walletAddress || ''} />
        </div>

        <div className="space-y-6">
          <MonthlyCalendar />
          <OpenPositions />
        </div>
      </div>

    </PortfolioProvider>
  );
}

export function TrackerSection({ initialSearchAddress }: { initialSearchAddress?: string }) {
  return (
    <TrackerContent initialSearchAddress={initialSearchAddress} />
  );
}

