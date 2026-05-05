'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  AlertCircle, 
  Clock, 
  Search, 
  X, 
  ArrowUpRight, 
  Info, 
  Wallet,
  TrendingUp,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { usePortfolio } from '@/context/portfolio-context';
import { 
  fetchAccountDetails, 
  fetchMarkPrices, 
  fetchFundingRate, 
  getUserIdByAddress,
  type OpenPositionData, 
  type MarkPrice, 
  type FundingRateData 
} from '@/lib/sodex-api';
import { getTokenLogo } from '@/lib/token-logos';
import { cn } from '@/lib/utils';

interface PositionWithFunding extends OpenPositionData {
  markPrice: number;
  fundingData: FundingRateData | null;
}

function AccruedFundingContent({ userId, walletAddress, onClear }: { userId: string, walletAddress: string, onClear?: () => void }) {
  const [positions, setPositions] = useState<PositionWithFunding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const [accountData, markPrices] = await Promise.all([
        fetchAccountDetails(userId),
        fetchMarkPrices()
      ]);

      const markPriceMap = new Map(markPrices.map(mp => [mp.s, parseFloat(mp.p)]));
      
      const positionsWithFunding = await Promise.all(
        accountData.positions.map(async (pos) => {
          let fundingData: FundingRateData | null = null;
          try {
            fundingData = await fetchFundingRate(pos.symbol);
          } catch (e) {
            console.warn(`Failed to fetch funding for ${pos.symbol}`, e);
          }
          
          return {
            ...pos,
            markPrice: markPriceMap.get(pos.symbol) || parseFloat(pos.entryPrice),
            fundingData
          };
        })
      );

      setPositions(positionsWithFunding);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('[Funding] Load error:', err);
      if (positions.length === 0) {
        setError(err instanceof Error ? err.message : 'Failed to load funding data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const refreshInterval = setInterval(loadData, 3000);
    return () => clearInterval(refreshInterval);
  }, [userId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const totalNetAccrued = useMemo(() => {
    return positions.reduce((sum, pos) => {
      if (!pos.fundingData) return sum;
      const notionalValue = Math.abs(parseFloat(pos.positionSize)) * pos.markPrice;
      const rate = parseFloat(pos.fundingData.fundingRate);
      const interval = pos.fundingData.collectionInterval * 1000;
      const nextCollection = pos.fundingData.nextCollectionTime;
      const elapsed = interval - Math.max(0, nextCollection - currentTime);
      const fraction = Math.min(1, Math.max(0, elapsed / interval));
      const intervalFunding = notionalValue * rate;
      const accrued = (pos.positionSide === 'LONG' ? -1 : 1) * intervalFunding * fraction;
      return sum + accrued;
    }, 0);
  }, [positions, currentTime]);

  if (isLoading && positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/20 mb-4" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">Syncing Engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 border-b border-white/5 pb-4 md:pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">Accrued Funding</h1>
            <Badge variant="outline" className="text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0 h-4 bg-secondary/50 border-border/50 text-muted-foreground/60">BETA</Badge>
          </div>
          <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground/40">
            <Wallet className="w-3 md:w-3.5 h-3 md:h-3.5" />
            <span className="font-mono truncate max-w-[150px] md:max-w-none">{walletAddress}</span>
            {onClear && (
              <button onClick={onClear} className="ml-1 text-muted-foreground/20 hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-6 bg-white/[0.02] md:bg-transparent p-3 md:p-0 rounded-xl border border-white/5 md:border-none">
          <div className="text-left md:text-right">
            <p className="text-[8px] md:text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] mb-0.5">Total Net Accrued</p>
            <p className={cn(
              "text-xl md:text-2xl font-bold tracking-tighter tabular-nums",
              totalNetAccrued >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {totalNetAccrued >= 0 ? '+' : '-'}${Math.abs(totalNetAccrued).toFixed(4)}
            </p>
          </div>
          <div className="hidden md:block h-10 w-px bg-white/5" />
          <div className="text-right block md:hidden">
            <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground/20", isLoading && "animate-spin")} />
          </div>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
          <p className="text-sm text-muted-foreground/20 font-medium">No open positions found.</p>
        </div>
      ) : (
        <>
          {/* Mobile View: Card List */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {positions.map((pos) => {
              const notionalValue = Math.abs(parseFloat(pos.positionSize)) * pos.markPrice;
              const fundingRate = pos.fundingData ? parseFloat(pos.fundingData.fundingRate) : 0;
              const nextCollection = pos.fundingData ? pos.fundingData.nextCollectionTime : 0;
              const interval = pos.fundingData ? pos.fundingData.collectionInterval * 1000 : 3600000;
              const timeLeft = Math.max(0, nextCollection - currentTime);
              const fraction = Math.min(1, Math.max(0, (interval - timeLeft) / interval));
              const netAccrued = (pos.positionSide === 'LONG' ? -1 : 1) * (notionalValue * fundingRate) * fraction;
              const isReceiving = netAccrued > 0;
              const isExpanded = expandedId === pos.positionId;

              return (
                <Card 
                  key={pos.positionId} 
                  className={cn(
                    "bg-white/[0.02] border-white/5 rounded-2xl overflow-hidden transition-all duration-300",
                    isExpanded ? "ring-1 ring-white/10" : ""
                  )}
                  onClick={() => setExpandedId(isExpanded ? null : pos.positionId)}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTokenLogo(pos.symbol) ? (
                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center p-1.5 border border-white/5 shrink-0">
                          <img src={getTokenLogo(pos.symbol)} alt="" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-white/10 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{pos.symbol}</span>
                          <span className={cn(
                            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest",
                            pos.positionSide === 'LONG' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                          )}>
                            {pos.positionSide}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/30 font-bold uppercase tracking-widest mt-0.5">
                          {pos.leverage}X Leverage
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-bold tabular-nums", isReceiving ? "text-green-500" : "text-red-500")}>
                        {isReceiving ? '+' : '-'}${Math.abs(netAccrued).toFixed(4)}
                      </p>
                      <p className="text-[9px] text-muted-foreground/20 font-bold uppercase tracking-widest">Accrued</p>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-white/[0.01] animate-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest">Mark Price</p>
                          <p className="text-xs font-mono text-muted-foreground/60">${pos.markPrice.toFixed(2)}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest">Notional</p>
                          <p className="text-xs font-mono text-muted-foreground/60">${notionalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest">Funding Rate</p>
                          <p className={cn("text-xs font-mono", fundingRate > 0 ? "text-green-500/70" : "text-red-500/70")}>
                            {(fundingRate * 100).toFixed(6)}%
                          </p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest">Next Settlement</p>
                          <p className="text-xs font-mono text-muted-foreground/60">
                            {Math.floor(timeLeft / 60000)}:{(Math.floor((timeLeft % 60000) / 1000)).toString().padStart(2, '0')}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-white/10" style={{ width: `${fraction * 100}%` }} />
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Desktop View: Formal Table */}
          <div className="hidden md:block overflow-hidden border border-white/5 rounded-2xl bg-white/[0.01]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="px-5 py-4 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">Symbol</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">Position</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">Mark Price</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">Notional</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">Funding Rate</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">Settlement</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest text-right">Accrued (Est.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {positions.map((pos) => {
                  const notionalValue = Math.abs(parseFloat(pos.positionSize)) * pos.markPrice;
                  const fundingRate = pos.fundingData ? parseFloat(pos.fundingData.fundingRate) : 0;
                  const nextCollection = pos.fundingData ? pos.fundingData.nextCollectionTime : 0;
                  const interval = pos.fundingData ? pos.fundingData.collectionInterval * 1000 : 3600000;
                  const timeLeft = Math.max(0, nextCollection - currentTime);
                  const fraction = Math.min(1, Math.max(0, (interval - timeLeft) / interval));
                  const netAccrued = (pos.positionSide === 'LONG' ? -1 : 1) * (notionalValue * fundingRate) * fraction;
                  const isReceiving = netAccrued > 0;

                  return (
                    <tr key={pos.positionId} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          {getTokenLogo(pos.symbol) ? (
                            <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center p-1 border border-white/5 shrink-0">
                              <img 
                                src={getTokenLogo(pos.symbol)} 
                                alt="" 
                                className="w-full h-full object-contain"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            </div>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-white/10 shrink-0" />
                          )}
                          <span className="text-sm font-bold tracking-tight">{pos.symbol}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                            pos.positionSide === 'LONG' ? "bg-green-500/10 text-green-500/80" : "bg-red-500/10 text-red-500/80"
                          )}>
                            {pos.positionSide}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground/30">{pos.leverage}X</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-muted-foreground/60 tabular-nums">
                        ${pos.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-muted-foreground/60 tabular-nums">
                        ${notionalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className={cn("text-xs font-mono tabular-nums", fundingRate > 0 ? "text-green-500/70" : "text-red-500/70")}>
                            {(fundingRate * 100).toFixed(6)}%
                          </span>
                          <span className="text-[9px] text-muted-foreground/20 font-bold uppercase tracking-widest">Hourly</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-mono text-muted-foreground/60 tabular-nums">
                            {Math.floor(timeLeft / 60000)}:{(Math.floor((timeLeft % 60000) / 1000)).toString().padStart(2, '0')}
                          </span>
                          <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-muted-foreground/20" style={{ width: `${fraction * 100}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={cn("text-base font-bold tabular-nums", isReceiving ? "text-green-500" : "text-red-500")}>
                            {isReceiving ? '+' : '-'}${Math.abs(netAccrued).toFixed(6)}
                          </span>
                          <span className="text-[9px] text-muted-foreground/20 font-bold uppercase tracking-widest">
                            {isReceiving ? 'RECEIPT' : 'PAYMENT'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      
      <div className="flex items-center gap-2 px-1">
        <Info className="w-3 h-3 text-muted-foreground/20" />
        <p className="text-[8px] md:text-[10px] text-muted-foreground/20 font-medium uppercase tracking-wider">
          Estimates are calculated based on real-time mark price and linear time-decay since the last settlement.
        </p>
      </div>
    </div>
  );
}

export function AccruedFunding({ initialSearchAddress }: { initialSearchAddress?: string }) {
  const portfolio = usePortfolio();
  const [searchInput, setSearchInput] = useState(initialSearchAddress || '');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSyncedInitial, setHasSyncedInitial] = useState(false);

  const handleSearch = async (addressToSearch?: string) => {
    const valueToSearch = (addressToSearch || searchInput || '').trim();
    if (!valueToSearch) return;
    setIsLoading(true);
    setError(null);
    try {
      const foundUserId = await getUserIdByAddress(valueToSearch);
      setWalletAddress(valueToSearch);
      setUserId(foundUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet data');
      setWalletAddress(null);
      setUserId(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasSyncedInitial && initialSearchAddress && initialSearchAddress.trim()) {
      setSearchInput(initialSearchAddress);
      handleSearch(initialSearchAddress);
      setHasSyncedInitial(true);
    }
  }, [initialSearchAddress, hasSyncedInitial]);

  const handleClear = () => {
    setSearchInput('');
    setWalletAddress(null);
    setUserId(null);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/10 mb-4" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">Resolving Identity...</p>
      </div>
    );
  }

  if (!userId || !walletAddress) {
    return (
      <div className="flex min-h-[calc(100vh-13rem)] flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 bg-white/[0.01] p-6 md:p-10">
          <div className="mb-6 md:mb-8 space-y-2">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tighter text-foreground">Accrued Funding</h2>
            <p className="text-xs md:text-sm text-muted-foreground/40 font-medium">Enter a wallet address to inspect real-time funding accruals for open positions.</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="0x..."
                className="w-full h-12 md:h-14 rounded-xl md:rounded-2xl border border-white/5 bg-white/[0.02] pl-11 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/20 focus:outline-none focus:border-white/10 transition-all"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500/50" />
                <p className="text-[10px] md:text-xs font-medium text-red-500/70">{error}</p>
              </div>
            )}

            <button
              onClick={() => handleSearch()}
              disabled={isLoading || !searchInput.trim()}
              className="flex w-full h-12 md:h-14 items-center justify-center gap-2 rounded-xl md:rounded-2xl bg-foreground text-background transition-all active:scale-[0.98] hover:bg-foreground/90 disabled:opacity-20 font-bold text-sm"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Inspect Funding</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AccruedFundingContent 
      userId={userId} 
      walletAddress={walletAddress} 
      onClear={handleClear}
    />
  );
}
