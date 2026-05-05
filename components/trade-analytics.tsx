'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  ShieldAlert,
  Percent,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Award,
  AlertTriangle,
  Layers,
  Target,
  ChevronRight,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserIdByAddress, fetchAllPositions, enrichPositions, fetchSymbols, type EnrichedPosition } from '@/lib/sodex-api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie,
  Legend,
  AreaChart,
  Area
} from 'recharts';

// --- Types ---

interface AnalyticsData {
  portfolio_summary: any;
  pair_analysis: any[];
  direction_analysis: any;
  pnl_distribution: any;
  holding_time_analysis: any[];
  leverage_analysis: any[];
  fee_analysis: any;
  edge_detection: any;
}

// --- Helper Components ---

function LoadingSpinner({ message, subMessage, onContinue, onAbort, isPaused, currentCount }: {
  message: string,
  subMessage?: string,
  onContinue?: () => void,
  onAbort?: () => void,
  isPaused?: boolean,
  currentCount?: number
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 text-center animate-in fade-in duration-500">
      <div className="relative">
        <Loader2 className={cn("h-10 w-10 text-primary", !isPaused && "animate-spin")} />
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[8px] font-black uppercase text-primary">LIMIT</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <span className="block text-lg font-bold text-foreground italic uppercase tracking-tight">{message}</span>
        {subMessage && (
          <span className="block text-xs text-muted-foreground/60 max-w-md mx-auto font-medium leading-relaxed">{subMessage}</span>
        )}
      </div>

      {isPaused && (
        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4">
          <div className="flex gap-3">
            <Button onClick={onAbort} variant="outline" className="rounded-xl border-border/10 hover:bg-muted/50 px-6 font-bold text-[10px] uppercase tracking-widest h-11">
              Analyze Current ({currentCount?.toLocaleString()})
            </Button>
            <Button onClick={onContinue} className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold px-8 gap-2 text-[10px] uppercase tracking-widest h-11">
              Continue Sync <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const isPositive = value >= 0;

    return (
      <div className="bg-card/80 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-2xl min-w-[140px] animate-in fade-in zoom-in duration-300 relative overflow-hidden">
        <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-2">{label}</p>
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest">Net PnL</span>
          <p className={cn(
            "text-lg font-black italic tracking-tighter tabular-nums",
            isPositive ? "text-emerald-500" : "text-orange-500"
          )}>
            {isPositive ? '+' : ''}${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Decorative corner accent */}
        <div className={cn(
          "absolute top-0 right-0 w-8 h-8 opacity-10 blur-xl rounded-full",
          isPositive ? "bg-emerald-500" : "bg-orange-500"
        )} />
      </div>
    );
  }
  return null;
}

function MetricCard({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  className
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: any;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  return (
    <Card className={cn(
      "p-3 min-[380px]:p-4 sm:p-6 bg-background border border-border rounded-lg relative overflow-hidden group transition-all duration-300",
      className
    )}>
      <div className="flex flex-col gap-1 sm:gap-2 relative z-10 w-full">
        <div className="flex items-center justify-between mb-1 sm:mb-2 w-full">
          <div className="flex items-center w-full">
            <span className="text-[7px] min-[380px]:text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest sm:tracking-[0.2em] truncate">{label}</span>
          </div>
        </div>
        <div className="flex flex-col gap-0.5 sm:gap-1 w-full">
          <h4 className={cn(
            "text-base min-[380px]:text-lg sm:text-2xl font-black tracking-tighter tabular-nums transition-all duration-500 group-hover:translate-x-1 truncate",
            trend === 'up' ? "text-emerald-500" : trend === 'down' ? "text-orange-500" : "text-foreground"
          )}>
            {value}
          </h4>
          {subValue && (
            <div className="flex items-center w-full mt-1">
              <span className="text-[6px] min-[380px]:text-[7px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest sm:tracking-widest truncate">{subValue}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// --- Metrics Engine ---

function calculateAnalytics(positions: EnrichedPosition[]): AnalyticsData {
  if (!Array.isArray(positions) || positions.length === 0) {
    return {
      portfolio_summary: {},
      pair_analysis: [],
      direction_analysis: {},
      pnl_distribution: {},
      holding_time_analysis: [],
      leverage_analysis: [],
      fee_analysis: {},
      edge_detection: {}
    };
  }

  // Common data transformation
  const trades = positions.map(p => {
    const raw_pnl = p.realizedPnlValue;
    const fee = p.tradingFee;
    const net_pnl = raw_pnl - fee;
    // holding_time is in ms based on created_at and updated_at
    const holding_time_ms = p.updated_at - p.created_at;
    const holding_time_min = holding_time_ms / (1000 * 60);

    return {
      pair: p.pairName,
      leverage: p.leverage,
      side: p.positionSideLabel.toLowerCase(), // 'long' or 'short'
      holding_time: holding_time_min,
      realized_pnl: raw_pnl,
      fee: fee,
      net_pnl: net_pnl,
      is_spot: p.is_spot || false
    };
  });

  // 1. Portfolio Summary
  const total_trades = trades.length;
  const total_gross_pnl = trades.reduce((acc, t) => acc + t.realized_pnl, 0);
  const total_fees = trades.reduce((acc, t) => acc + t.fee, 0);
  const total_net_pnl = total_gross_pnl - total_fees;
  const wins = trades.filter(t => t.realized_pnl > 0);
  const losses = trades.filter(t => t.realized_pnl <= 0);
  const win_rate = (wins.length / total_trades) * 100;
  const avg_win = wins.length > 0 ? wins.reduce((acc, t) => acc + t.realized_pnl, 0) / wins.length : 0;
  const avg_loss = losses.length > 0 ? Math.abs(losses.reduce((acc, t) => acc + t.realized_pnl, 0) / losses.length) : 0;
  const profit_factor = (losses.length === 0 || avg_loss === 0) ? 999 : wins.reduce((acc, t) => acc + t.realized_pnl, 0) / Math.abs(losses.reduce((acc, t) => acc + t.realized_pnl, 0));
  const avg_leverage = trades.reduce((acc, t) => acc + t.leverage, 0) / total_trades;
  const avg_holding_time = trades.reduce((acc, t) => acc + t.holding_time, 0) / total_trades;
  const overall_expectancy = (win_rate / 100 * avg_win) - ((1 - win_rate / 100) * avg_loss);

  const portfolio_summary = {
    total_trades,
    total_net_pnl,
    total_gross_pnl,
    total_fees,
    overall_win_rate: win_rate,
    overall_expectancy,
    profit_factor,
    avg_leverage,
    avg_holding_time
  };

  // 2. Pair Analysis
  const pairGroups: Record<string, any[]> = {};
  trades.forEach(t => {
    if (!pairGroups[t.pair]) pairGroups[t.pair] = [];
    pairGroups[t.pair].push(t);
  });

  const pair_analysis = Object.entries(pairGroups).map(([pair, pTrades]) => {
    const pWins = pTrades.filter(t => t.realized_pnl > 0);
    const pLosses = pTrades.filter(t => t.realized_pnl <= 0);
    const pGross = pTrades.reduce((acc, t) => acc + t.realized_pnl, 0);
    const pFees = pTrades.reduce((acc, t) => acc + t.fee, 0);
    const pNet = pGross - pFees;

    return {
      pair,
      trade_count: pTrades.length,
      net_pnl: pNet,
      gross_pnl: pGross,
      total_fees: pFees,
      win_rate: (pWins.length / pTrades.length) * 100,
      avg_win: pWins.length > 0 ? pWins.reduce((acc, t) => acc + t.realized_pnl, 0) / pWins.length : 0,
      avg_loss: pLosses.length > 0 ? Math.abs(pLosses.reduce((acc, t) => acc + t.realized_pnl, 0) / pLosses.length) : 0,
      profit_factor: (pLosses.length === 0) ? 999 : pWins.reduce((acc, t) => acc + t.realized_pnl, 0) / Math.abs(pLosses.reduce((acc, t) => acc + t.realized_pnl, 0)),
      avg_leverage: pTrades.reduce((acc, t) => acc + t.leverage, 0) / pTrades.length,
      avg_holding_time: pTrades.reduce((acc, t) => acc + t.holding_time, 0) / pTrades.length,
      pnl_contribution_percent: (pNet / total_net_pnl) * 100,
      is_spot: pTrades.every((t: any) => t.is_spot)
    };
  }).sort((a, b) => b.net_pnl - a.net_pnl);

  // 3. Direction Analysis
  const longs = trades.filter(t => t.side === 'long');
  const shorts = trades.filter(t => t.side === 'short');

  const getDirectionStats = (dirTrades: any[]) => {
    if (!Array.isArray(dirTrades) || dirTrades.length === 0) return { count: 0, net_pnl: 0, win_rate: 0, expectancy: 0 };
    const wins = dirTrades.filter(t => t.realized_pnl > 0);
    const dGross = dirTrades.reduce((acc, t) => acc + t.realized_pnl, 0);
    const dFees = dirTrades.reduce((acc, t) => acc + t.fee, 0);
    const wr = (wins.length / dirTrades.length) * 100;
    const aw = wins.length > 0 ? wins.reduce((acc, t) => acc + t.realized_pnl, 0) / wins.length : 0;
    const losses = dirTrades.filter(t => t.realized_pnl <= 0);
    const al = losses.length > 0 ? Math.abs(losses.reduce((acc, t) => acc + t.realized_pnl, 0) / losses.length) : 0;
    return {
      count: dirTrades.length,
      net_pnl: dGross - dFees,
      win_rate: wr,
      expectancy: (wr / 100 * aw) - ((1 - wr / 100) * al)
    };
  };

  const direction_analysis = {
    overall: {
      long: getDirectionStats(longs),
      short: getDirectionStats(shorts)
    }
  };

  // 4. PnL Distribution
  const netPnls = trades.map(t => t.net_pnl).sort((a, b) => a - b);
  const mean_trade_pnl = netPnls.reduce((acc, v) => acc + v, 0) / netPnls.length;
  const median_trade_pnl = netPnls[Math.floor(netPnls.length / 2)];
  const variance = netPnls.reduce((acc, v) => acc + Math.pow(v - mean_trade_pnl, 2), 0) / netPnls.length;
  const std_dev_pnl = Math.sqrt(variance);

  const pnl_distribution = {
    mean_trade_pnl,
    median_trade_pnl,
    std_dev_pnl,
    largest_win: Math.max(...trades.map(t => t.realized_pnl)),
    largest_loss: Math.min(...trades.map(t => t.realized_pnl)),
    percentiles: {
      p10: netPnls[Math.floor(netPnls.length * 0.1)],
      p25: netPnls[Math.floor(netPnls.length * 0.25)],
      p75: netPnls[Math.floor(netPnls.length * 0.75)],
      p90: netPnls[Math.floor(netPnls.length * 0.9)]
    }
  };

  // 5. Holding Time Analysis (8+ divisions)
  const holdBuckets = [
    { label: '<10m', min: 0, max: 10 },
    { label: '10-30m', min: 10, max: 30 },
    { label: '30-60m', min: 30, max: 60 },
    { label: '1-2h', min: 60, max: 120 },
    { label: '2-4h', min: 120, max: 240 },
    { label: '4-8h', min: 240, max: 480 },
    { label: '8-24h', min: 480, max: 1440 },
    { label: '24h+', min: 1440, max: Infinity }
  ];

  const holding_time_analysis = holdBuckets.map(b => {
    const bTrades = trades.filter(t => t.holding_time >= b.min && t.holding_time < b.max);
    const stats = getDirectionStats(bTrades);
    return {
      bucket: b.label,
      trade_count: bTrades.length,
      net_pnl: stats.count > 0 ? stats.net_pnl : 0,
      win_rate: stats.win_rate,
      expectancy: stats.expectancy,
      avg_leverage: bTrades.length > 0 ? bTrades.reduce((acc, t) => acc + t.leverage, 0) / bTrades.length : 0
    };
  });

  // 6. Leverage Analysis (up to 25x, filtered)
  const leverage_analysis = [];
  for (let i = 1; i <= 25; i++) {
    const bTrades = trades.filter(t => Math.floor(t.leverage) === i);
    if (bTrades.length > 0) {
      const bGross = bTrades.reduce((acc, t) => acc + t.realized_pnl, 0);
      const bFees = bTrades.reduce((acc, t) => acc + t.fee, 0);
      const wins = bTrades.filter(t => t.realized_pnl > 0);
      leverage_analysis.push({
        bucket: `${i}x`,
        trade_count: bTrades.length,
        net_pnl: bGross - bFees,
        win_rate: (wins.length / bTrades.length) * 100,
        avg_pnl_per_trade: (bGross - bFees) / bTrades.length,
        avg_fee_per_trade: bFees / bTrades.length
      });
    }
  }

  // 7. Fee Analysis
  const profitable_after_fees = trades.filter(t => t.net_pnl > 0).length;
  const flipped_by_fees = trades.filter(t => t.realized_pnl > 0 && t.net_pnl < 0).length;

  const fee_analysis = {
    total_fees,
    fees_as_percent_of_gross_profit: total_gross_pnl > 0 ? (total_fees / total_gross_pnl) * 100 : 0,
    avg_fee_per_trade: total_fees / total_trades,
    profitable_trades_after_fees_percent: (profitable_after_fees / total_trades) * 100,
    trades_flipped_by_fees: flipped_by_fees
  };

  const getBestForDirection = (side: 'long' | 'short') => {
    const list = Object.entries(pairGroups).map(([pair, pTrades]) => {
      const filtered = pTrades.filter(t => t.side === side);
      const net = filtered.reduce((acc, t) => acc + t.net_pnl, 0);
      return { pair, net, trades: filtered };
    }).sort((a, b) => b.net - a.net);
    return list[0];
  };

  const bestPair = pair_analysis[0];
  const worstPair = pair_analysis[pair_analysis.length - 1];
  const bestLong = getBestForDirection('long');
  const bestShort = getBestForDirection('short');

  const edge_detection = {
    best_pair: bestPair ? {
      name: bestPair.pair,
      profit: bestPair.net_pnl,
      leverage: bestPair.avg_leverage,
      side: bestPair.trade_count > 0 ? (trades.filter(t => t.pair === bestPair.pair && t.side === 'long').length >= trades.filter(t => t.pair === bestPair.pair && t.side === 'short').length ? 'long' : 'short') : 'N/A'
    } : null,
    worst_pair: worstPair ? {
      name: worstPair.pair,
      profit: worstPair.net_pnl,
      leverage: worstPair.avg_leverage
    } : null,
    best_long: (bestLong && bestLong.net > 0) ? bestLong : null,
    best_short: (bestShort && bestShort.net > 0) ? bestShort : null
  };

  return {
    portfolio_summary,
    pair_analysis,
    direction_analysis,
    pnl_distribution,
    holding_time_analysis,
    leverage_analysis,
    fee_analysis,
    edge_detection
  };
}

// --- Main Component ---

export function TradeAnalytics() {
  const [searchInput, setSearchInput] = useState('');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | number | null>(null);
  const [futuresPositions, setFuturesPositions] = useState<EnrichedPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '3m' | 'all'>('all');
  const [fetchProgress, setFetchProgress] = useState<{ count: number, isLong: boolean, nextCursor?: string }>({ count: 0, isLong: false });
  const [pendingPositions, setPendingPositions] = useState<any[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [sortConfig, setSortConfig] = useState<{ key: 'net_pnl' | 'trade_count' | 'profit_factor', direction: 'asc' | 'desc' }>({
    key: 'net_pnl',
    direction: 'desc'
  });

  const positions = futuresPositions;

  useEffect(() => {
    const storedAddress = localStorage.getItem('trade_analytics_address');
    if (storedAddress) {
      setSearchInput(storedAddress);
      handleSearch(storedAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const analytics = useMemo(() => {
    if (!Array.isArray(positions) || positions.length === 0) return null;

    // Filter positions by timeframe
    const filteredPositions = positions.filter(p => {
      if (timeframe === 'all') return true;
      const now = new Date();
      const tradeDate = new Date(p.created_at);
      const diffMs = now.getTime() - tradeDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (timeframe === '7d') return diffDays <= 7;
      if (timeframe === '30d') return diffDays <= 30;
      if (timeframe === '3m') return diffDays <= 90;
      return true;
    });

    if (filteredPositions.length === 0) return null;
    return calculateAnalytics(filteredPositions);
  }, [futuresPositions, timeframe]);

  const sortedPairAnalysis = useMemo(() => {
    if (!analytics || !Array.isArray(analytics.pair_analysis)) return [];
    return [...analytics.pair_analysis].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [analytics, sortConfig]);

  const handleSearch = async (val?: string, cursor?: string, accumulated: any[] = []) => {
    const address = (val || searchInput).trim();
    if (!address) return;

    // Reset abort controller for new search
    if (!cursor) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setPendingPositions([]);
      setFetchProgress({ count: 0, isLong: false });
    }

    const controller = abortControllerRef.current!;

    setIsLoading(true);
    setIsPaused(false);
    setError(null);

    // Long fetch timer
    const longFetchTimer = setTimeout(() => {
      setFetchProgress(prev => ({ ...prev, isLong: true }));
    }, 4000);

    try {
      const foundUserId = cursor ? userId! : await getUserIdByAddress(address);
      if (!cursor) {
        setWalletAddress(address);
        setUserId(foundUserId);
        localStorage.setItem('trade_analytics_address', address);
      }

      // Soft limit of 10k records for segmented fetching
      const SOFT_LIMIT = 10000;

      const { positions: fetched, nextCursor } = await fetchAllPositions(
        foundUserId,
        (count) => setFetchProgress(prev => ({ ...prev, count: accumulated.length + count })),
        undefined, // no time limit here, we handle timeframe filter in useMemo for analytics
        controller.signal,
        SOFT_LIMIT,
        cursor
      );

      const total = [...accumulated, ...fetched];

      if (nextCursor && total.length >= SOFT_LIMIT) {
        setPendingPositions(total);
        setFetchProgress(prev => ({ ...prev, count: total.length, nextCursor }));
        setIsPaused(true);
        clearTimeout(longFetchTimer);
        return;
      }

      const enrichedFutures = await enrichPositions(total);

      if (!controller.signal.aborted) {
        setFuturesPositions(enrichedFutures);
        clearTimeout(longFetchTimer);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Registry lookup failed');
    } finally {
      if (abortControllerRef.current === controller && !isPaused) {
        setIsLoading(false);
      }
    }
  };

  const handleContinue = () => {
    if (walletAddress && fetchProgress.nextCursor) {
      handleSearch(walletAddress, fetchProgress.nextCursor, pendingPositions);
    }
  };

  const handleAbortAndShow = async () => {
    if (pendingPositions.length === 0) return;
    setIsLoading(true);
    setIsPaused(false);
    try {
      const enriched = await enrichPositions(pendingPositions);
      setFuturesPositions(enriched);
    } catch (err) {
      setError('Failed to process current data');
    } finally {
      setIsLoading(false);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    }
  };

  const handleClear = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setWalletAddress(null);
    setUserId(null);
    setFuturesPositions([]);
    setSearchInput('');
    setPendingPositions([]);
    setFetchProgress({ count: 0, isLong: false });
    setIsPaused(false);
    localStorage.removeItem('trade_analytics_address');
  };

  if (!walletAddress) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-xl space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">Trade Analytics</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto font-medium leading-relaxed">
              enter your wallet to generate perps performance report.
            </p>
          </div>

          <Card className="p-8 bg-background border border-border rounded-xl shadow-none relative overflow-hidden">
            <div className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Wallet Address</label>
                <div className="relative group">
                  <Input
                    placeholder="Search address..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="bg-background/50 border-border h-14 rounded-2xl px-6 text-foreground placeholder:text-muted-foreground/30 focus:border-primary/30 transition-all duration-300"
                  />
                </div>
              </div>

              <Button
                onClick={() => handleSearch()}
                disabled={isLoading || !searchInput.trim()}
                className="w-full h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-bold text-[11px] uppercase tracking-[0.2em] transition-all duration-300 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                ) : "Analyze Performance"}
              </Button>


              {error && <p className="text-xs font-bold text-orange-500 text-center">{error}</p>}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading || isPaused) {
    const loadingMessage = isPaused
      ? `Data limit reached`
      : `Syncing history... (${fetchProgress.count.toLocaleString()} records)`;

    const loadingSubMessage = isPaused
      ? `Large history detected. You can analyze the current ${fetchProgress.count.toLocaleString()} records or continue syncing for full accuracy.`
      : `Optimizing report for high-frequency data. This may take a moment for large accounts.`;

    return (
      <div className="flex items-center justify-center min-h-[600px] font-sans">
        <LoadingSpinner
          message={loadingMessage}
          subMessage={loadingSubMessage}
          isPaused={isPaused}
          onContinue={handleContinue}
          onAbort={handleAbortAndShow}
          currentCount={fetchProgress.count}
        />
      </div>
    );
  }

  const renderHeader = (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 pb-8 border-b border-border">
      <div className="flex items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Trade Analytics</h1>
            <div className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-md">
              <span className="text-[8px] font-bold text-primary uppercase tracking-widest">BETA</span>
            </div>
          </div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.4em] flex items-center gap-3">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center p-1 bg-muted border border-border rounded-xl">
          {(['7d', '30d', '3m', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={cn(
                "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                timeframe === t
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={handleClear}
          className="rounded-xl border-border bg-card hover:bg-muted text-foreground/60 hover:text-foreground h-10 px-4 transition-all duration-300"
        >
          <X className="w-3.5 h-3.5 mr-2" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Change</span>
        </Button>
      </div>
    </div>
  );

  if (!analytics || positions.length === 0) {
    return (
      <div className="space-y-12 pb-24 animate-in fade-in duration-500 font-sans">
        {renderHeader}
        <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted/20 border border-border/10 flex items-center justify-center mb-2">
            <Activity className="w-6 h-6 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-bold text-foreground tracking-tight">No Trades Found</h3>
          <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-widest max-w-sm">
            This wallet has no history in the selected timeframe.
          </p>
        </div>
      </div>
    );
  }

  const {
    portfolio_summary: summary,
    pair_analysis,
    direction_analysis,
    pnl_distribution: pnlDist,
    holding_time_analysis: holdAnalysis,
    leverage_analysis: levAnalysis,
    fee_analysis: feeAnalysis,
    edge_detection: edge
  } = analytics;

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-500 font-sans">
      {/* Header */}
      {renderHeader}

      {/* Primary Performance Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Net PnL" value={`$${summary.total_net_pnl.toFixed(2)}`} subValue="After fees" trend={summary.total_net_pnl >= 0 ? 'up' : 'down'} />
        <MetricCard label="Win Rate" value={`${summary.overall_win_rate.toFixed(1)}%`} subValue={`${summary.total_trades} trades`} trend={summary.overall_win_rate >= 50 ? 'up' : 'neutral'} />
        <MetricCard label="Profit Factor" value={summary.profit_factor > 99 ? '> 99' : summary.profit_factor.toFixed(2)} subValue="Wins ÷ losses" />
        <MetricCard label="Expectancy" value={`$${summary.overall_expectancy.toFixed(2)}`} subValue="per trade" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Exposure Matrix */}
        <Card className="lg:col-span-2 p-6 sm:p-8 bg-background border border-border rounded-xl shadow-none overflow-hidden relative group">

          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-[0.25em]">Pair Breakdown</h3>
                <p className="text-[9px] font-semibold text-muted-foreground/20 uppercase tracking-widest mt-1">Performance per pair</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortConfig({ key: 'net_pnl', direction: 'desc' })}
                className={cn("h-7 px-2 text-[9px] font-bold uppercase tracking-widest transition-all pb-0.5", sortConfig.key === 'net_pnl' && sortConfig.direction === 'desc' ? "border-b border-foreground text-foreground" : "text-muted-foreground/30 hover:text-foreground/50")}
              >
                Best
              </button>
              <button
                onClick={() => setSortConfig({ key: 'net_pnl', direction: 'asc' })}
                className={cn("h-7 px-2 text-[9px] font-bold uppercase tracking-widest transition-all pb-0.5", sortConfig.key === 'net_pnl' && sortConfig.direction === 'asc' ? "border-b border-foreground text-foreground" : "text-muted-foreground/30 hover:text-foreground/50")}
              >
                Worst
              </button>
            </div>
          </div>

          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/10">
                  <th className="pb-4 sm:pb-6 text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-muted-foreground/20 font-black">Pair</th>
                  <th className="pb-4 sm:pb-6 text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-muted-foreground/20 font-black text-right">Trades</th>
                  <th className="pb-4 sm:pb-6 text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-muted-foreground/20 font-black text-right whitespace-nowrap">Net PnL</th>
                  <th className="pb-4 sm:pb-6 text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-muted-foreground/20 font-black text-right">Profit Factor</th>
                  <th className="pb-4 sm:pb-6 text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-muted-foreground/20 font-black text-right">PnL %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {sortedPairAnalysis.slice(0, 10).map((p, i) => (
                  <tr key={i} className="group/row hover:bg-muted/50 transition-all duration-500">
                    <td className="py-3 sm:py-5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover/row:bg-primary transition-colors duration-500" />
                        <span className="text-[10px] sm:text-xs font-bold text-foreground tracking-tight group-hover/row:translate-x-1 transition-transform duration-500 uppercase">{p.pair}</span>
                      </div>
                    </td>
                    <td className="py-3 sm:py-5 text-[10px] sm:text-xs font-bold text-foreground/30 text-right tabular-nums">{p.trade_count}</td>
                    <td className={cn(
                      "py-3 sm:py-5 text-[10px] sm:text-xs font-bold text-right tabular-nums tracking-tighter",
                      p.net_pnl >= 0 ? "text-emerald-500" : "text-orange-500"
                    )}>
                      {p.net_pnl >= 0 ? '+' : ''}${Math.abs(p.net_pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 sm:py-5 text-[10px] sm:text-xs font-bold text-foreground/40 text-right tabular-nums">
                      <span className={cn(
                        "px-1.5 sm:px-2 py-0.5 rounded-md bg-muted/30 border border-border/30",
                        p.profit_factor >= 2 ? "text-emerald-400 border-emerald-500/20" : ""
                      )}>
                        {p.profit_factor > 10 ? '>10' : p.profit_factor.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 sm:py-5 text-right font-mono text-[8px] sm:text-[10px] text-muted-foreground/20">
                      {p.pnl_contribution_percent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Tactical Edge Detection */}
        <div className="space-y-6">
          <Card className="p-6 bg-background border border-border rounded-xl shadow-none relative overflow-hidden">

            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-[0.2em]">Top Pairs</h3>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="space-y-4 relative z-10">
                {[
                  {
                    label: 'Best Pair',
                    value: edge.best_pair?.name,
                    sub: `${edge.best_pair?.profit >= 0 ? '+' : ''}$${edge.best_pair?.profit?.toFixed(0) || 0} • ${edge.best_pair?.leverage?.toFixed(0) || 0}x • ${edge.best_pair?.side || ''}`,
                    color: 'text-emerald-500'
                  },
                  {
                    label: 'Worst Pair',
                    value: edge.worst_pair?.name,
                    sub: `$${edge.worst_pair?.profit?.toFixed(0) || 0} • ${edge.worst_pair?.leverage?.toFixed(0) || 0}x`,
                    color: 'text-orange-500'
                  },
                  {
                    label: 'Best Long',
                    value: edge.best_long?.pair,
                    sub: `+$${edge.best_long?.net?.toFixed(0) || 0} profit`
                  },
                  {
                    label: 'Best Short',
                    value: edge.best_short?.pair,
                    sub: `+$${edge.best_short?.net?.toFixed(0) || 0} profit`
                  }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col group/item">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[8px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em]">{item.label}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 border border-border/50 rounded-xl group-hover/item:border-white/10 transition-all duration-500">
                      <span className={cn("text-xs font-bold tracking-tight uppercase", item.color || "text-foreground")}>{item.value || '--'}</span>
                      <span className="text-[8px] font-semibold text-muted-foreground/20 uppercase tracking-widest">{item.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-background border border-border rounded-xl shadow-none overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-[0.2em]">Long vs Short</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-card border-border/50 rounded-2xl space-y-4 hover:border-emerald-500/20 transition-all duration-500 group/long">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-emerald-500/50 uppercase">LONG</span>
                </div>
                <div className="space-y-1">
                  <p className="text-base sm:text-xl font-bold text-foreground tracking-tighter tabular-nums">${direction_analysis.overall.long.net_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-[7px] sm:text-[9px] font-semibold text-muted-foreground/20 uppercase tracking-widest">Win Rate: {direction_analysis.overall.long.win_rate.toFixed(0)}%</p>
                </div>
              </div>
              <div className="p-6 bg-card border-border/50 rounded-2xl space-y-4 hover:border-orange-500/20 transition-all duration-500 group/short">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-orange-500/50 uppercase">SHORT</span>
                </div>
                <div className="space-y-1">
                  <p className="text-base sm:text-xl font-bold text-foreground tracking-tighter tabular-nums">${direction_analysis.overall.short.net_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-[7px] sm:text-[9px] font-semibold text-muted-foreground/20 uppercase tracking-widest">Win Rate: {direction_analysis.overall.short.win_rate.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Statistical Distribution */}
        <Card className="p-6 sm:p-8 bg-background border border-border rounded-xl shadow-none relative overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-[0.2em]">PnL Distribution</h3>
              <p className="text-[9px] font-semibold text-muted-foreground/20 uppercase tracking-widest mt-1">Breakdown of trade results</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-8 sm:gap-y-12 gap-x-4 sm:gap-x-8">
            <div className="space-y-1">
              <span className="text-[7px] sm:text-[8px] font-bold text-muted-foreground/20 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Avg Trade</span>
              <p className="text-base sm:text-xl font-bold text-foreground tracking-tight">${pnlDist.mean_trade_pnl.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[7px] sm:text-[8px] font-bold text-muted-foreground/20 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Median Trade</span>
              <p className="text-base sm:text-xl font-bold text-foreground tracking-tight">${pnlDist.median_trade_pnl.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[7px] sm:text-[8px] font-bold text-muted-foreground/20 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Std Dev</span>
              <p className="text-base sm:text-xl font-bold text-orange-400 tracking-tight">± ${pnlDist.std_dev_pnl.toFixed(0)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[7px] sm:text-[8px] font-bold text-muted-foreground/20 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Biggest Win</span>
              <p className="text-base sm:text-xl font-bold text-emerald-500 tracking-tight">+${pnlDist.largest_win.toFixed(0)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[7px] sm:text-[8px] font-bold text-muted-foreground/20 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Biggest Loss</span>
              <p className="text-base sm:text-xl font-bold text-orange-500 tracking-tight">-${Math.abs(pnlDist.largest_loss).toFixed(0)}</p>
            </div>
          </div>
        </Card>

        {/* Holding Time Analysis */}
        <Card className="p-6 sm:p-8 bg-background border border-border rounded-xl shadow-none">
          <div className="flex items-center gap-4 mb-8">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-[0.2em]">Duration vs Edge</h3>
              <p className="text-[9px] font-semibold text-muted-foreground/20 uppercase tracking-widest mt-1">PnL by holding time</p>
            </div>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={holdAnalysis} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="bucket"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: 700 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: 700 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="net_pnl" radius={[4, 4, 0, 0]}>
                  {holdAnalysis.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.net_pnl >= 0 ? '#10b981' : '#f97316'} fillOpacity={0.4} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Leverage Efficiency */}
      <Card className="p-6 sm:p-8 bg-background border border-border rounded-xl shadow-none">
        <div className="flex items-center gap-4 mb-8">
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-[0.2em]">Leverage Efficiency</h3>
            <p className="text-[9px] font-semibold text-muted-foreground/20 uppercase tracking-widest mt-1">Profitability by leverage tier</p>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={levAnalysis} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis
                dataKey="bucket"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 700 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 700 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar dataKey="net_pnl" radius={[6, 6, 0, 0]} barSize={24}>
                {levAnalysis.map((entry: any, index: number) => (
                  <Cell key={index} fill={entry.net_pnl >= 0 ? '#10b981' : '#f97316'} fillOpacity={0.5} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Fee Impact Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-8 bg-background border border-border rounded-xl shadow-none flex flex-col items-center justify-center text-center space-y-6">
          <div className="p-4 rounded-full bg-orange-500/5 border border-orange-500/10">
            <Scale className="w-8 h-8 text-orange-500/40" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight">${feeAnalysis.total_fees.toFixed(2)}</h3>
            <p className="text-[9px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em]">Total Lifetime Fees</p>
          </div>
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-orange-500/30" style={{ width: `${Math.min(feeAnalysis.fees_as_percent_of_gross_profit, 100)}%` }} />
          </div>
          <p className="text-[9px] font-semibold text-muted-foreground/30 uppercase tracking-widest">
            {feeAnalysis.fees_as_percent_of_gross_profit.toFixed(1)}% of gross profit
          </p>
        </Card>

        <Card className="p-8 bg-background border border-border rounded-xl shadow-none flex flex-col items-center justify-center text-center space-y-6">
          <div className="p-4 rounded-full bg-primary/5 border border-primary/10">
            <Percent className="w-8 h-8 text-primary/40" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight">{feeAnalysis.profitable_trades_after_fees_percent.toFixed(1)}%</h3>
            <p className="text-[9px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em]">Net Profitability</p>
          </div>
          <p className="text-[9px] font-semibold text-muted-foreground/30 uppercase tracking-widest max-w-[180px]">
            {feeAnalysis.trades_flipped_by_fees} trades were winners before fees
          </p>
        </Card>

        <Card className="p-8 bg-background border border-border rounded-xl shadow-none flex flex-col items-center justify-center text-center space-y-6">
          <div className="p-4 rounded-full bg-emerald-500/5 border border-emerald-500/10">
            <Target className="w-8 h-8 text-emerald-500/40" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight">${feeAnalysis.avg_fee_per_trade.toFixed(2)}</h3>
            <p className="text-[9px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em]">Avg Fee per Trade</p>
          </div>
          <p className="text-[9px] font-semibold text-muted-foreground/30 uppercase tracking-widest">
            Strategy efficiency metric
          </p>
        </Card>
      </div>
    </div>
  );
}
