'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight, AlertCircle, ChevronDown, Loader2 } from 'lucide-react';
import { usePortfolio } from '@/context/portfolio-context';
import { useMemo, useState, useEffect, useRef } from 'react';
import { fetchOpenPositions, fetchAccountDetails, type OpenPositionData, type BalanceData, type OpenOrderData } from '@/lib/sodex-api';
import { cacheManager } from '@/lib/cache';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { getTokenLogo } from '@/lib/token-logos';
import { Clock, Target, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

export function OpenPositions({ accountId }: { accountId?: string | null }) {
  const portfolio = usePortfolio();
  const userId = accountId || portfolio?.userId;
  const [openPositions, setOpenPositions] = useState<OpenPositionData[]>([]);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [openOrders, setOpenOrders] = useState<OpenOrderData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const historyRef = useRef<{ [key: string]: { time: string; pnl: number }[] }>({});

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const loadOpenPositions = async (skipCache = false) => {
    if (!userId) return;

    try {
      if (skipCache) {
        cacheManager.delete(`accountDetails_${userId}`);
      }

      const accountData = await fetchAccountDetails(userId);
      const positions = accountData.positions;

      // Update PnL history for each position
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      positions.forEach(pos => {
        const pId = pos.symbol + pos.positionSide; // Use symbol+side as unique key for history tracking
        const currentPnl = parseFloat(pos.unrealizedProfit);

        if (!historyRef.current[pId]) {
          historyRef.current[pId] = [];
        }

        // Keep last 30 points
        const newHistory = [...historyRef.current[pId], { time: now, pnl: currentPnl }].slice(-30);
        historyRef.current[pId] = newHistory;
      });

      setOpenPositions(positions);
      setBalanceData(accountData.balances[0] || null);
      setOpenOrders(accountData.openOrders || []);
      setLastUpdateTime(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch open positions';
      setError(errorMessage);
    }
  };

  // Initial fetch when component mounts or userId changes - ALWAYS FRESH DATA
  useEffect(() => {
    if (!userId) return;

    setIsLoading(true);
    // Clear cache before initial fetch to get fresh data on page load
    cacheManager.delete(`accountDetails_${userId}`);
    console.log('[v0] Cleared cache for fresh data on page load');
    loadOpenPositions().then(() => setIsLoading(false));
  }, [userId]);

  // Auto-refresh every 1 second with cache bypass
  useEffect(() => {
    if (!userId) return;

    const refreshInterval = setInterval(() => {
      setIsRefreshing(true);
      loadOpenPositions(true).then(() => setIsRefreshing(false)); // true = skip cache
    }, 5000); // 5 seconds

    return () => clearInterval(refreshInterval);
  }, [userId]);

  const displayPositions = useMemo(() => {
    return openPositions.map((position) => {
      const pId = position.symbol + position.positionSide;

      let tp = "None";
      let sl = "None";

      // Map open orders to find TP/SL relating to this position
      if (openOrders && Array.isArray(openOrders)) {
        openOrders.forEach((order) => {
          if (String(order.positionId) === String(position.positionId)) {
            if (order.triggerProfitPrice) tp = order.triggerProfitPrice;
            if (order.triggerStopPrice) sl = order.triggerStopPrice;
          }
        });
      }

      return {
        id: pId,
        symbol: position.symbol,
        side: position.positionSide,
        size: parseFloat(position.positionSize),
        entry: parseFloat(position.entryPrice),
        liquidation: parseFloat(position.liquidationPrice),
        margin: parseFloat(position.isolatedMargin),
        leverage: position.leverage,
        unrealized: parseFloat(position.unrealizedProfit),
        realized: parseFloat(position.realizedProfit),
        fee: parseFloat(position.cumTradingFee),
        createdAt: new Date(position.createdTime).toLocaleString(),
        history: historyRef.current[pId] || [],
        tp: tp,
        sl: sl,
        positionId: position.positionId,
        margin_type: position.positionType
      };
      // Sort by positionId ascending for a stable, consistent order on every refresh
    }).sort((a, b) => String(a.positionId).localeCompare(String(b.positionId)));
  }, [openPositions, openOrders]);

  // Pagination logic
  const totalPages = Math.ceil(displayPositions.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedPositions = displayPositions.slice(startIndex, endIndex);

  const totalMarginInUse = useMemo(() => {
    return displayPositions.reduce((sum, pos) => sum + pos.margin, 0);
  }, [displayPositions]);

  const handleRowsPerPageChange = (newRows: number) => {
    setRowsPerPage(newRows);
    setCurrentPage(1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (!userId) {
    return (
      <Card className="rounded-[2rem] border border-black/8 bg-white p-12 text-center text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <AlertCircle className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/35 dark:text-white/35">No account bound</h3>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">Bind your account to view open positions</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="rounded-[2rem] border border-black/8 bg-white p-12 text-center text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col items-center justify-center p-8">
          <div className="mb-4 h-8 w-8 rounded-full border-2 border-black/15 border-t-black animate-spin dark:border-white/15 dark:border-t-white" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/35 dark:text-white/35">Scanning perimeter</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-[2rem] border border-red-500/20 bg-white p-8 text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:bg-black dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400/40 mb-3" />
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-red-300">Signal interrupted</h3>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">{error}</p>
        </div>
      </Card>
    );
  }

  if (openPositions.length === 0) {
    return (
      <Card className="rounded-[2rem] border border-black/8 bg-white p-12 text-center text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/35 dark:text-white/35">No open positions</h3>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/25 dark:text-white/25">All systems clear</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-[2rem] border border-black/8 bg-white p-5 text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/35 dark:text-white/35">Open positions</h3>
          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-black/12 bg-black/[0.03] dark:border-white/12 dark:bg-white/[0.03]">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse" />
          </div>
        </div>
        {lastUpdateTime && (
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/30 dark:text-white/30">
            Sync: {lastUpdateTime}
          </span>
        )}
      </div>

      {/* Balance Info */}
      {balanceData && (
        <div className="grid grid-cols-3 gap-2 mb-8">
          <div className="space-y-1 rounded-2xl border border-black/8 bg-black/[0.03] p-2 md:p-4 dark:border-white/8 dark:bg-white/[0.03]">
            <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">Wallet balance</p>
            <p className="text-sm font-semibold tracking-[-0.03em] text-foreground md:text-xl">${parseFloat(balanceData.walletBalance).toFixed(2)}</p>
            <p className="hidden text-[7px] font-semibold uppercase tracking-[0.16em] text-black/20 dark:text-white/20 sm:block">perpetuals (usdc)</p>
          </div>
          <div className="space-y-1 rounded-2xl border border-green-500/18 bg-green-500/8 p-2 md:p-4">
            <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">Liquidity</p>
            <p className="text-sm font-semibold tracking-[-0.03em] text-green-400 md:text-xl">${parseFloat(balanceData.availableBalance).toFixed(2)}</p>
            <p className="hidden text-[7px] font-semibold uppercase tracking-[0.16em] text-black/20 dark:text-white/20 sm:block">Available to trade</p>
          </div>
          <div className="space-y-1 rounded-2xl border border-black/8 bg-black/[0.03] p-2 md:p-4 dark:border-white/8 dark:bg-white/[0.03]">
            <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">Exposure</p>
            <p className="text-sm font-semibold tracking-[-0.03em] text-foreground md:text-xl">${totalMarginInUse.toFixed(2)}</p>
            <p className="hidden text-[7px] font-semibold uppercase tracking-[0.16em] text-black/20 dark:text-white/20 sm:block">Margin in use</p>
          </div>
        </div>
      )}

      {/* Grid of Position Cards (Unified Design) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {paginatedPositions.map((pos) => {
          const isProfit = pos.unrealized >= 0;
          return (
            <Card key={pos.id} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition-all hover:bg-white/[0.05]">
              <div className={`absolute right-0 top-0 h-32 w-32 blur-[60px] opacity-10 transition-colors ${isProfit ? 'bg-green-500' : 'bg-red-500'}`} />

              <div className="p-4 md:p-5 space-y-3">
                {/* Top row: token info + PnL */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] md:h-10 md:w-10">
                      {getTokenLogo(pos.symbol) ? (
                        <img
                          src={getTokenLogo(pos.symbol)}
                          alt={pos.symbol}
                          className="w-5 h-5 md:w-6 md:h-6 object-contain"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-white/45">{pos.symbol.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="truncate text-xs font-semibold tracking-tight text-white md:text-sm">{pos.symbol}</h3>
                        <span className={`shrink-0 rounded px-1 py-0.5 text-[7px] font-semibold uppercase tracking-[0.18em] md:text-[8px] ${pos.side === 'LONG' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {pos.side} {pos.leverage}x
                        </span>
                      </div>
                      <p className="text-[8px] text-white/28">#{pos.positionId}</p>
                    </div>
                  </div>

                  {/* Minimal Graph */}
                  <div className="flex-1 h-8 md:h-10 mx-2 md:mx-4 max-w-[80px] md:max-w-[120px] opacity-70 hover:opacity-100 transition-opacity">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={pos.history}>
                        <defs>
                          <linearGradient id={`pnlGradient-${pos.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isProfit ? '#4ade80' : '#f87171'} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={isProfit ? '#4ade80' : '#f87171'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="pnl"
                          stroke={isProfit ? '#4ade80' : '#f87171'}
                          strokeWidth={1.5}
                          fillOpacity={1}
                          fill={`url(#pnlGradient-${pos.id})`}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-base font-semibold tracking-[-0.03em] md:text-xl ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                      {isProfit ? '+' : ''}${Math.abs(pos.unrealized).toFixed(2)}
                    </p>
                    <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-[0.18em] text-white/30 md:text-[8px]">unrealized pnl</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'entry', val: `$${pos.entry.toFixed(2)}` },
                    { label: 'size', val: pos.size.toFixed(4) },
                    { label: 'margin', val: `$${pos.margin.toFixed(2)}`, color: 'text-primary/70' },
                    { label: 'liq. price', val: `$${pos.liquidation.toFixed(2)}`, color: 'text-red-500/70' }
                  ].map((stat, i) => (
                    <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.03] p-2.5">
                      <p className="mb-0.5 text-[7px] font-semibold uppercase tracking-[0.18em] leading-none text-white/35">{stat.label}</p>
                      <p className={`truncate text-[10px] font-semibold ${stat.color || 'text-white'}`}>{stat.val}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-green-500/18 bg-green-500/[0.06] p-2.5">
                      <p className="mb-1 text-[6px] font-semibold uppercase tracking-[0.16em] text-green-300/70">take profit</p>
                      <p className="text-[10px] font-semibold text-white">{pos.tp === "None" ? 'none' : `$${pos.tp}`}</p>
                    </div>
                    <div className="rounded-2xl border border-red-500/18 bg-red-500/[0.06] p-2.5">
                      <p className="mb-1 text-[6px] font-semibold uppercase tracking-[0.16em] text-red-300/70">stop loss</p>
                      <p className="text-[10px] font-semibold text-white">{pos.sl === "None" ? 'none' : `$${pos.sl}`}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/8 pt-4 text-[8px] font-semibold text-white/25">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><Clock className="w-2.5 h-2.5" /> {pos.createdAt.split(',')[1]}</span>
                    <span className="opacity-50">fees: ${pos.fee.toFixed(2)}</span>
                  </div>
                  <span className="rounded bg-white/[0.04] px-1.5 py-0.5">{pos.margin_type}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>


    </Card>
  );
}

