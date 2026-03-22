'use client';

import React, { useEffect } from "react"

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, X, Loader2, Share2 } from 'lucide-react';
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
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
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
      <div className="flex items-center justify-center min-h-[600px] px-4">
        <div className="p-8 sm:p-10 bg-card/40 dark:bg-[#141414]/90 border border-border/20 dark:border-white/5 rounded-[2rem] shadow-2xl max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-2xl font-bold text-foreground dark:text-white mb-3 tracking-tight">Wallet Tracker</h2>
          <p className="text-muted-foreground/80 dark:text-muted-foreground/80 mb-8 text-sm leading-relaxed">Enter a wallet address to track trading positions and performance</p>

          <div className="space-y-4">
            <div className="relative group">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter wallet address"
                className="w-full px-5 py-4 bg-secondary/50 dark:bg-[#1f1f1f] border border-border/20 dark:border-none rounded-2xl text-sm font-medium text-foreground dark:text-white placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-border/50 dark:focus:ring-zinc-700 transition-all duration-300"
              />
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-xs font-medium">{error}</p>
              </div>
            )}

            <button
              onClick={() => handleSearch(searchInput)}
              disabled={isLoading || !searchInput.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 bg-zinc-400 hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 rounded-2xl font-semibold transition-all duration-300 active:scale-[0.98]"
            >
              <Search className="w-4 h-4" />
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Wallet Tracker</h1>
            <p className="text-xs md:text-sm text-muted-foreground break-all max-w-full">
              Tracking: <span className="text-foreground/80">{walletAddress}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ShareStatsModal 
              walletAddress={walletAddress} 
              userId={userId || ''} 
              sourceWalletAddress={sourceWalletAddress || undefined}
              trigger={
                <Button
                  variant="outline"
                  className="gap-1.5 md:gap-2 text-orange-500 hover:text-orange-400 bg-orange-500/5 hover:bg-orange-500/10 border-orange-500/20 rounded-xl px-3 md:px-4 h-9 md:h-10 text-[11px] md:text-xs font-bold"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share Results
                </Button>
              }
            />
            <Button
              variant="outline"
              onClick={handleClear}
              className="gap-1.5 md:gap-2 text-muted-foreground hover:text-foreground bg-transparent border-white/5 rounded-xl px-3 md:px-4 h-9 md:h-10 text-[11px] md:text-xs font-bold"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <PortfolioOverview />

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 gap-6">
          {/* PnL Chart */}
          <div>
            <PnLChart />
          </div>
        </div>

        {/* Positions Table */}
        <PositionsTable />

        {/* Fund Flow Table and Asset Flow Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FundFlowTable walletAddress={sourceWalletAddress || walletAddress || ''} />
          <AssetFlowCard walletAddress={sourceWalletAddress || walletAddress || ''} />
        </div>



        {/* Calendar and Open Positions stacked */}
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

