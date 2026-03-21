'use client';

import React, { useMemo, useState, useEffect } from "react"


import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trophy, TrendingUp, DollarSign, Activity, BarChart3, Settings2, Target, Zap } from 'lucide-react';
import { usePortfolio } from '@/context/portfolio-context';
import { fetchPnLOverview, getVolumeFromPnLOverview, fetchDetailedBalance } from '@/lib/sodex-api';
import { fetchSpotTradesData } from '@/lib/spot-api';
import { getTokenPrice } from '@/lib/token-price-service';
import { useSessionCache } from '@/context/session-cache-context';
import { cn } from '@/lib/utils';

// Cool loading animation component with gradient shimmer effect
function LoadingShimmer({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-muted/20 rounded-lg animate-pulse", className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" style={{ animationName: 'shimmer' }} />
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

interface PortfolioStat {
  label: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: React.ReactNode;
  breakdown?: {
    futures?: number;
    spot?: number;
    vault?: number;
    futures_label?: string;
    spot_label?: string;
    vault_label?: string;
  };
}

export function PortfolioOverview() {
  const { positions, userId, vaultBalance, setVaultBalance, walletAddress, sourceWalletAddress } = usePortfolio();

  const [balances, setBalances] = useState({
    total: 0,
    spot: 0,
    futures: 0,
    vault: 0,
    hasUnpricedAssets: false,
    tokens: [] as any[]
  });

  const [metrics, setMetrics] = useState({
    futuresVolume: 0,
    spotVolume: 0,
    futuresFees: 0,
    spotFees: 0,
    pnl30d: 0,
    vaultPnl: 0,
    vaultShares: 0
  });

  const [loading, setLoading] = useState({
    balances: false,
    metrics: false,
    vault: false
  });
  const [spotProgress, setSpotProgress] = useState<{
    fetchedCount: number;
    estimatedRemainingMs?: number;
  } | null>(null);

  // 1. Fetch Balances
  useEffect(() => {
    if (!userId) return;

    const fetchBalances = async () => {
      setLoading(prev => ({ ...prev, balances: true }));
      try {
        const data = await fetchDetailedBalance(userId);
        setBalances(prev => ({
          ...prev,
          total: data.totalUsdValue,
          spot: data.spotBalance,
          futures: data.futuresBalance,
          hasUnpricedAssets: data.hasUnpricedAssets || false,
          tokens: data.tokens || []
        }));
      } catch (err) {
        console.error('[v0] Error fetching balances:', err);
      } finally {
        setLoading(prev => ({ ...prev, balances: false }));
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // 2. Fetch Metrics (Volume, Fees, PnL)
  useEffect(() => {
    if (!userId || !positions) return;

    const fetchMetrics = async () => {
      setLoading(prev => ({ ...prev, metrics: true }));
      try {
        // Futures volume from PnL overview
        const pnlData = await fetchPnLOverview(userId);
        const fVol = getVolumeFromPnLOverview(pnlData);

        // Spot volume and fees with progress tracking
        const spotData = await fetchSpotTradesData(userId, (p) => {
          setSpotProgress({
            fetchedCount: p.fetchedCount,
            estimatedRemainingMs: p.estimatedRemainingMs
          });
        });

        // 30D PnL from positions
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const pnl30 = positions
          .filter(p => (p.updated_at || 0) >= thirtyDaysAgo)
          .reduce((sum, p) => sum + (p.realizedPnlValue || 0), 0);

        // Futures fees from current positions
        const fFees = positions.reduce((sum, p) => sum + (parseFloat(p.cum_trading_fee || '0') || 0), 0);

        setMetrics(prev => ({
          ...prev,
          futuresVolume: fVol,
          spotVolume: spotData.totalVolume,
          futuresFees: fFees,
          spotFees: spotData.totalFees,
          pnl30d: pnl30
        }));
      } catch (err) {
        console.error('[v0] Error fetching metrics:', err);
      } finally {
        setLoading(prev => ({ ...prev, metrics: false }));
        setSpotProgress(null);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 45000);
    return () => clearInterval(interval);
  }, [userId, positions]);

  // 3. Fetch Vault Data
  useEffect(() => {
    const addr = sourceWalletAddress || walletAddress;
    if (!addr) return;

    const fetchVault = async () => {
      setLoading(prev => ({ ...prev, vault: true }));
      try {
        const response = await fetch('/api/sodex/vault-position', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: addr }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.code === '0' && data.data) {
            const shares = data.data.shares || 0;
            const mag7Price = await getTokenPrice('MAG7.ssi');
            const sharesUsd = shares * mag7Price;

            setMetrics(prev => ({
              ...prev,
              vaultPnl: data.data.pnl,
              vaultShares: shares
            }));

            setBalances(prev => ({ ...prev, vault: sharesUsd }));
            setVaultBalance(sharesUsd);
          }
        }
      } catch (err) {
        console.error('[v0] Error fetching vault:', err);
      } finally {
        setLoading(prev => ({ ...prev, vault: false }));
      }
    };

    fetchVault();
    const interval = setInterval(fetchVault, 60000);
    return () => clearInterval(interval);
  }, [walletAddress, sourceWalletAddress, setVaultBalance]);

  // Rank Selection State
  const [rankOptions, setRankOptions] = useState({
    windowType: '30D' as '24H' | '7D' | '30D' | 'ALL_TIME',
    sortBy: 'volume' as 'pnl' | 'volume'
  });
  const [userRankData, setUserRankData] = useState<any>(null);
  const [isRankLoading, setIsRankLoading] = useState(false);

  // Fetch Live Rank
  useEffect(() => {
    const addr = sourceWalletAddress || walletAddress;
    if (!addr) return;

    const loadRank = async () => {
      setIsRankLoading(true);
      try {
        const { fetchUserRank } = await import('@/lib/sodex-api');
        const data = await fetchUserRank(addr, rankOptions.windowType, rankOptions.sortBy);
        setUserRankData(data);
      } catch (err) {
        console.error('[v0] Error fetching live rank:', err);
      } finally {
        setIsRankLoading(false);
      }
    };

    loadRank();
  }, [walletAddress, sourceWalletAddress, rankOptions]);

  const totalNetWorth = balances.total + balances.vault;
  const isSyncing = loading.balances || loading.metrics || loading.vault;

  // Helper for formatting numbers with K/M suffixes
  const formatCompactNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toFixed(2);
  };

  return (
    <Card className="group relative overflow-hidden bg-card/40 border border-border/40 rounded-[2.5rem] shadow-2xl transition-all duration-500 hover:border-accent/20">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/[0.03] dark:bg-accent/[0.01] blur-[120px] -mr-64 -mt-64 rounded-full animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/[0.02] dark:bg-purple-500/[0.01] blur-[100px] -ml-40 -mb-40 rounded-full" />

      <div className="p-8 md:p-10 relative z-10">

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">

          {/* 1. Primary Balance Section (Condensed) */}
          <div className="md:col-span-3 space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] flex items-center gap-2">
                <DollarSign className="w-3 h-3 text-orange-500" /> Total Balance
              </p>
              <div className="flex items-baseline gap-2">
                {loading.balances && totalNetWorth === 0 ? (
                  <LoadingShimmer className="h-10 w-32 md:h-12 md:w-40" />
                ) : (
                  <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter text-foreground drop-shadow-sm">
                    ${totalNetWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </h2>
                )}
                {balances.hasUnpricedAssets && (
                  <span className="text-[10px] font-bold text-accent/40">+ assets</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-6 border-t border-border/10 max-w-[180px]">
              {[
                { label: 'Futures', value: balances.futures, color: 'text-foreground/60', isLoading: loading.balances },
                { label: 'Spot', value: balances.spot, color: 'text-foreground/60', isLoading: loading.balances },
                { label: 'Vault', value: balances.vault, color: 'text-orange-500 font-black', isLoading: loading.vault }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between group/item">
                  <span className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest group-hover/item:text-muted-foreground/80 transition-colors">{item.label}</span>
                  {item.isLoading && item.value === 0 ? (
                    <LoadingShimmer className="h-4 w-16" />
                  ) : (
                    <span className={cn("text-[11px] font-bold transition-all group-hover/item:scale-105", item.color)}>
                      ${item.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2. Performance & Rankings Section */}
          <div className="md:col-span-5 space-y-10 md:border-x md:border-border/10 md:px-10">
            {/* PnL Section */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-orange-500" /> 30D Performance
              </p>
              <div className="flex flex-col gap-1">
                <p className={cn("text-3xl font-black italic tracking-tighter", metrics.pnl30d >= 0 ? "text-green-500" : "text-red-500")}>
                  {metrics.pnl30d >= 0 ? '+' : ''}${Math.abs(metrics.pnl30d).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
                <div className="h-1 w-full bg-muted/20 rounded-full overflow-hidden">
                  <div className={cn("h-full transition-all duration-1000", metrics.pnl30d >= 0 ? "bg-green-500/30 w-1/2" : "bg-red-500/30 w-1/3")} />
                </div>
              </div>
            </div>

            {/* Global Rankings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] flex items-center gap-2">
                  <Trophy className="w-3 h-3 text-orange-500" /> Leaderboard status
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg hover:bg-orange-500/10">
                      <Settings2 className="w-3.5 h-3.5 text-orange-500/60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-4 bg-card/95 backdrop-blur-xl border-border/20 rounded-2xl shadow-2xl" align="end">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Timeframe</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['24H', '7D', '30D', 'ALL_TIME'] as const).map((t) => (
                            <button
                              key={t}
                              onClick={() => setRankOptions(prev => ({ ...prev, windowType: t }))}
                              className={cn(
                                "px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                                rankOptions.windowType === t
                                  ? "bg-orange-500/10 border-orange-500/20 text-orange-500"
                                  : "bg-secondary/5 border-border/10 text-muted-foreground hover:bg-secondary/10"
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sort By</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['pnl', 'volume'] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => setRankOptions(prev => ({ ...prev, sortBy: s }))}
                              className={cn(
                                "px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border flex items-center justify-center gap-1.5",
                                rankOptions.sortBy === s
                                  ? "bg-orange-500/10 border-orange-500/20 text-orange-500"
                                  : "bg-secondary/5 border-border/10 text-muted-foreground hover:bg-secondary/10"
                              )}
                            >
                              {s === 'pnl' ? <Activity className="w-3 h-3" /> : <BarChart3 className="w-3 h-3" />}
                              <span className="capitalize">{s}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="p-6 rounded-3xl bg-orange-500/[0.03] border border-orange-500/10 flex items-center justify-between group/rank transition-all hover:bg-orange-500/[0.05]">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] block">
                    {rankOptions.windowType} {rankOptions.sortBy} Rank
                  </span>
                  {isRankLoading ? (
                    <LoadingShimmer className="h-8 w-20" />
                  ) : (
                    <span className="text-3xl font-black text-orange-500 italic drop-shadow-sm">
                      #{userRankData?.rank || '---'}
                    </span>
                  )}
                </div>
                <div className="h-10 w-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Operational Metrics Section */}
          <div className="md:col-span-4 space-y-8 flex flex-col justify-center">
            {/* Vault Shares */}
            <div className="space-y-1.5 p-5 rounded-3xl bg-orange-500/[0.04] border border-orange-500/10">
              <p className="text-[9px] font-black text-orange-500/60 uppercase tracking-[0.2em] flex items-center gap-2">
                <Target className="w-2.5 h-2.5" /> Vault
              </p>
              <div className="flex items-baseline justify-between">
                {loading.metrics && metrics.vaultShares === 0 ? (
                  <LoadingShimmer className="h-8 w-24" />
                ) : (
                  <p className="text-2xl font-black tracking-tighter text-orange-400">
                    {metrics.vaultShares.toFixed(2)} <span className="text-[8px] opacity-30">MAG7</span>
                  </p>
                )}
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg bg-background/95 border border-border/10", metrics.vaultPnl >= 0 ? "text-green-500/80" : "text-red-500/80")}>
                  {metrics.vaultPnl >= 0 ? '↑' : '↓'} {Math.abs(metrics.vaultPnl).toFixed(4)}
                </span>
              </div>
            </div>

            {/* Volume & Fees Detailed Grid */}
            <div className="grid grid-cols-1 gap-6 pl-2">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.22em] flex items-center gap-2">
                  <BarChart3 className="w-2.5 h-2.5" /> Total Volume
                </p>
                <div className="flex gap-10">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted-foreground/50 uppercase">Futures</span>
                    {loading.metrics && metrics.futuresVolume === 0 ? (
                      <LoadingShimmer className="h-5 w-16 mt-1" />
                    ) : (
                      <span className="text-lg font-black text-foreground italic leading-none">${formatCompactNumber(metrics.futuresVolume)}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted-foreground/50 uppercase">Spot</span>
                    {loading.metrics && metrics.spotVolume === 0 ? (
                      <div className="flex flex-col gap-1">
                        <LoadingShimmer className="h-5 w-16 mt-1" />
                        {spotProgress && spotProgress.fetchedCount > 0 && (
                          <span className="text-[7px] font-bold text-accent/40 uppercase tracking-tighter">
                            {spotProgress.fetchedCount} trades... 
                            {spotProgress.estimatedRemainingMs ? ` ~${(spotProgress.estimatedRemainingMs / 1000).toFixed(0)}s left` : ''}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-lg font-black text-foreground italic leading-none">${formatCompactNumber(metrics.spotVolume)}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.22em] flex items-center gap-2">
                  <Zap className="w-2.5 h-2.5" /> Total Fees Paid
                </p>
                <div className="flex gap-10">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted-foreground/50 uppercase">Futures</span>
                    {loading.metrics && metrics.futuresFees === 0 ? (
                      <LoadingShimmer className="h-5 w-16 mt-1" />
                    ) : (
                      <span className="text-lg font-black text-foreground/80 italic leading-none">${metrics.futuresFees.toFixed(1)}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted-foreground/50 uppercase">Spot</span>
                    {loading.metrics && metrics.spotFees === 0 ? (
                      <LoadingShimmer className="h-5 w-16 mt-1" />
                    ) : (
                      <span className="text-lg font-black text-foreground/80 italic leading-none">${metrics.spotFees.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isSyncing && (
          <div className="absolute bottom-4 right-8 flex items-center gap-2 text-[8px] text-muted-foreground/20 font-bold uppercase tracking-widest">
            <div className="w-1 h-1 bg-accent rounded-full animate-pulse" />
            Syncing
          </div>
        )}
      </div>
    </Card>
  );
}

function MetricBox({ label, value, icon, isPositive }: { label: string, value: string, icon: React.ReactNode, isPositive: boolean }) {
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest flex items-center gap-2">
        {icon} {label}
      </p>
      <p className={`text-xl font-bold tracking-tight ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {value}
      </p>
      <div className="w-full h-1 bg-secondary/20 rounded-full overflow-hidden">
        <div className={`h-full ${isPositive ? 'bg-green-500' : 'bg-red-500'} w-[40%] opacity-20`} />
      </div>
    </div>
  );
}

