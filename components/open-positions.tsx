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

export function OpenPositions() {
  const { userId } = usePortfolio();
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
    }, 1000); // 1 second

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
      <Card className="p-12 bg-card/95 shadow-sm border border-border/20 rounded-3xl text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
        <h3 className="text-xs font-semibold text-muted-foreground/60 mb-2">No Account Bound</h3>
        <p className="text-[10px] text-muted-foreground/30 font-bold uppercase ">Bind your account to view open positions</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-12 bg-card/95 shadow-sm border border-border/20 rounded-3xl text-center">
        <div className="flex flex-col items-center justify-center p-8">
          <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin mb-4" />
          <p className="text-[10px] text-muted-foreground/40 font-bold  ">scanning perimeter...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 bg-card/95 shadow-sm border border-red-500/20 rounded-3xl">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400/40 mb-3" />
          <h3 className="text-[10px] font-bold  text-red-400/60  mb-1">Signal Interrupted</h3>
          <p className="text-[10px] text-muted-foreground/30 font-bold uppercase ">{error}</p>
        </div>
      </Card>
    );
  }

  if (openPositions.length === 0) {
    return (
      <Card className="p-12 bg-card/95 shadow-sm border border-border/20 rounded-3xl text-center">
        <h3 className="text-xs font-semibold text-muted-foreground/60 mb-2">No Open Positions</h3>
        <p className="text-[10px] text-muted-foreground/20 font-bold  ">All systems clear</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 bg-card/95 shadow-sm border border-border/20 rounded-3xl shadow-sm overflow-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold text-muted-foreground/60">Open Positions</h3>
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/10 border border-accent/20">
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
          </div>
        </div>
        {lastUpdateTime && (
          <span className="text-[9px] text-muted-foreground/30 font-bold  ">
            Sync: {lastUpdateTime}
          </span>
        )}
      </div>

      {/* Balance Info */}
      {balanceData && (
        <div className="grid grid-cols-2 gap-2 mb-8">
          <div className="p-2 md:p-4 rounded-2xl bg-secondary/5 border border-border/5 space-y-1">
            <p className="text-[7px] text-muted-foreground/30 font-bold">Wallet Balance</p>
            <p className="text-sm md:text-xl font-bold tracking-tight text-foreground/80">${parseFloat(balanceData.walletBalance).toFixed(2)}</p>
            <p className="text-[7px] text-muted-foreground/20 font-bold hidden sm:block">perpetuals (usdc)</p>
          </div>
          <div className="p-2 md:p-4 rounded-2xl bg-secondary/5 border border-border/5 space-y-1">
            <p className="text-[7px] text-muted-foreground/30 font-bold">Exposure</p>
            <p className="text-sm md:text-xl font-bold tracking-tight text-orange-400">${totalMarginInUse.toFixed(2)}</p>
            <p className="text-[7px] text-muted-foreground/20 font-bold hidden sm:block">Margin in use</p>
          </div>
        </div>
      )}

      {/* Grid of Position Cards (Unified Design) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {paginatedPositions.map((pos) => {
          const isProfit = pos.unrealized >= 0;
          return (
            <Card key={pos.id} className="group relative overflow-hidden bg-card/95 shadow-sm border border-border/20 rounded-3xl transition-all hover:border-accent/10">
              <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 transition-colors ${isProfit ? 'bg-green-500' : 'bg-red-500'}`} />

              <div className="p-4 md:p-5 space-y-3">
                {/* Top row: token info + PnL */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-xl bg-secondary/30 flex items-center justify-center overflow-hidden border border-border/10">
                      {getTokenLogo(pos.symbol) ? (
                        <img
                          src={getTokenLogo(pos.symbol)}
                          alt={pos.symbol}
                          className="w-5 h-5 md:w-6 md:h-6 object-contain"
                        />
                      ) : (
                        <span className="font-bold text-xs text-muted-foreground">{pos.symbol.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs md:text-sm font-bold tracking-tight truncate">{pos.symbol}</h3>
                        <span className={`px-1 py-0.5 rounded text-[7px] md:text-[8px] uppercase font-bold tracking-wider shrink-0 ${pos.side === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-400'}`}>
                          {pos.side} {pos.leverage}x
                        </span>
                      </div>
                      <p className="text-[8px] text-muted-foreground/30">#{pos.positionId}</p>
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
                    <p className={`text-base md:text-xl font-bold tracking-tighter ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                      {isProfit ? '+' : ''}${Math.abs(pos.unrealized).toFixed(2)}
                    </p>
                    <p className="text-[7px] md:text-[8px] text-muted-foreground/40 uppercase font-bold tracking-widest mt-0.5">unrealized pnl</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'entry', val: `$${pos.entry.toFixed(2)}` },
                    { label: 'size', val: pos.size.toFixed(4) },
                    { label: 'margin', val: `$${pos.margin.toFixed(2)}`, color: 'text-orange-400/80' },
                    { label: 'liq. price', val: `$${pos.liquidation.toFixed(2)}`, color: 'text-red-500/80' }
                  ].map((stat, i) => (
                    <div key={i} className="p-2.5 rounded-2xl bg-secondary/10 border border-border/5">
                      <p className="text-[7px] text-muted-foreground/40 uppercase font-bold mb-0.5">{stat.label}</p>
                      <p className={`text-[10px] font-bold truncate ${stat.color || ''}`}>{stat.val}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-2xl border border-green-500/10 bg-green-500/[0.02]">
                      <p className="text-[6px] text-green-500/40 uppercase font-bold mb-1">take profit</p>
                      <p className="text-[10px] font-bold">{pos.tp === "None" ? 'none' : `$${pos.tp}`}</p>
                    </div>
                    <div className="p-2.5 rounded-2xl border border-red-500/10 bg-red-500/[0.02]">
                      <p className="text-[6px] text-red-500/40 uppercase font-bold mb-1">stop loss</p>
                      <p className="text-[10px] font-bold">{pos.sl === "None" ? 'none' : `$${pos.sl}`}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between text-[8px] text-muted-foreground/20 font-bold border-t border-border/5">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><Clock className="w-2.5 h-2.5" /> {pos.createdAt.split(',')[1]}</span>
                    <span className="opacity-50">fees: ${pos.fee.toFixed(2)}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-secondary/20">{pos.margin_type}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>


    </Card>
  );
}

