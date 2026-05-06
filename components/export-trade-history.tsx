'use client';

import { useState, useEffect, useMemo } from 'react';
import { Download, FileDown, X, Loader2, CheckCircle2, AlertCircle, RefreshCcw, Clock, Info, BarChart3, Timer, Wallet as WalletIcon } from 'lucide-react';
import { fetchSymbols, type SymbolData } from '@/lib/sodex-api';
import { type RawTrade } from '@/lib/trade-export';
import { useExport } from '@/context/export-context';
import { cn } from '@/lib/utils';

// ─── CSV Builder ───────────────────────────────────────────────────────────────

function tradesToCsv(
  trades: RawTrade[],
  market: 'spot' | 'perps',
  symbolMap: Map<number, SymbolData>
): string {
  const header = [
    'trade_id',
    'timestamp',
    'date_utc',
    'symbol',
    'side',
    'price',
    'quantity',
    'usd_value',
    'fee_raw',
    'fee_usd',
    'is_maker',
    'order_id',
  ].join(',');

  const rows = trades.map((t) => {
    const sideLabel =
      market === 'spot'
        ? t.side === 1 ? 'BUY' : 'SELL'
        : t.side === 1 ? 'LONG' : 'SHORT';

    const price = parseFloat(t.price);
    const qty = parseFloat(t.quantity);
    const usdValue = price * qty;
    const symbolName = symbolMap.get(t.symbol_id)?.name ?? `SYMBOL_${t.symbol_id}`;
    const dateStr = new Date(t.ts_ms).toISOString();
    
    // Fee logic: In Spot Buy, fee is in Base asset. In Spot Sell or Perps, fee is in USD.
    let feeUsd = parseFloat(t.fee || '0');
    if (market === 'spot' && t.side === 1) {
      feeUsd = feeUsd * price;
    }

    return [
      t.trade_id,
      t.ts_ms,
      `"${dateStr}"`,
      `"${symbolName}"`,
      sideLabel,
      t.price,
      t.quantity,
      usdValue.toFixed(4),
      t.fee,
      feeUsd.toFixed(8),
      t.is_maker ? 'true' : 'false',
      t.order_id,
    ].join(',');
  });

  return `${header}\n${rows.join('\n')}`;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ExportTradeHistory() {
  const {
    address, setAddress,
    status, progress, error, resultMsg,
    lastMarket, collectedTrades,
    startExport, cancelExport
  } = useExport();

  const [localBuilding, setLocalBuilding] = useState(false);
  const [symbols, setSymbols] = useState<Map<number, SymbolData>>(new Map());

  // Load symbols for stats mapping
  useEffect(() => {
    fetchSymbols().then(setSymbols);
  }, []);

  // Prevent accidental tab closure during long export
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === 'fetching') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  const handleDownload = async () => {
    if (!lastMarket || collectedTrades.length === 0) return;
    
    setLocalBuilding(true);
    try {
      const csv = tradesToCsv(collectedTrades, lastMarket, symbols);

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${lastMarket}_trades_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setLocalBuilding(false);
    }
  };

  // ─── Stats Calculation ───────────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (collectedTrades.length === 0) return null;

    let totalFees = 0;
    let totalVolume = 0;
    const pairCounts: Record<string, number> = {};

    collectedTrades.forEach(t => {
      const feeRaw = parseFloat(t.fee || '0');
      const price = parseFloat(t.price);
      const qty = parseFloat(t.quantity);
      
      // Calculate USD Volume
      totalVolume += (price * qty);

      // Correct Fee Logic:
      // In Spot Buy (side 1), fee is denominated in the Base Asset (e.g. SOSO).
      // In Spot Sell (side 2) or Perps, fee is already denominated in Quote Asset (USD).
      if (lastMarket === 'spot' && t.side === 1) {
        totalFees += (feeRaw * price);
      } else {
        totalFees += feeRaw;
      }

      const pairName = symbols.get(t.symbol_id)?.name || `ID: ${t.symbol_id}`;
      pairCounts[pairName] = (pairCounts[pairName] || 0) + 1;
    });

    const topPairs = Object.entries(pairCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      totalTrades: collectedTrades.length,
      totalFees,
      totalVolume,
      topPairs
    };
  }, [collectedTrades, symbols, lastMarket]);

  const isWorking = status === 'resolving' || status === 'fetching' || status === 'building' || localBuilding;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="pb-8 border-b border-border/50">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Trade History</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] opacity-60">
              On-chain Export for Spot & Futures
            </p>
          </div>
          
          {/* Minimal Rate Notice (Compact) */}
          <div className="flex items-center gap-3 px-4 py-2 bg-secondary/5 border border-border/50 rounded-xl max-w-md">
            <Info className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-[10px] text-muted-foreground leading-tight">
              Throttled to <span className="text-foreground font-bold italic">1 request / 10s</span> to respect API limits. Background fetch enabled.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Section */}
      <div className="bg-background border border-border rounded-2xl p-6 sm:p-10 shadow-none space-y-8">
        {/* Address Input Refined */}
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <WalletIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
              Target Wallet Address
            </label>
          </div>
          <div className="relative group">
            <input
              type="text"
              placeholder="Enter 0x... address to fetch trade history"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={isWorking}
              className={cn(
                "w-full h-12 bg-secondary/5 border border-border rounded-xl px-4 font-mono text-sm text-foreground transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/50 disabled:opacity-50",
                "placeholder:text-muted-foreground/30 placeholder:font-sans placeholder:italic"
              )}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl pt-2">
          <button
            onClick={() => startExport('perps')}
            disabled={isWorking || !address.trim()}
            className={cn(
              "h-12 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border disabled:opacity-40",
              status === 'fetching' && lastMarket === 'perps'
                ? "bg-foreground text-background border-transparent"
                : "border-border text-foreground hover:bg-secondary/10"
            )}
          >
            <FileDown className="w-4 h-4" />
            Export Futures
          </button>

          <button
            onClick={() => startExport('spot')}
            disabled={isWorking || !address.trim()}
            className={cn(
              "h-12 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border disabled:opacity-40",
              status === 'fetching' && lastMarket === 'spot'
                ? "bg-foreground text-background border-transparent"
                : "border-border text-foreground hover:bg-secondary/10"
            )}
          >
            <FileDown className="w-4 h-4" />
            Export Spot
          </button>
        </div>
      </div>

      {/* Progress / Status (Sticky if needed, or just prominent) */}
      {isWorking && (
        <div className="bg-background border border-border rounded-2xl p-6 sm:p-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div className="absolute inset-0 bg-primary/20 blur-sm animate-pulse rounded-full" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {status === 'resolving' && 'Resolving Address…'}
                  {status === 'fetching' && `Live Sync: ${progress.toLocaleString()} trades fetched`}
                  {(status === 'building' || localBuilding) && 'Compiling CSV…'}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                  Active background process • 10s intervals
                </p>
              </div>
            </div>
            {status !== 'done' && (
              <button
                onClick={cancelExport}
                className="h-9 px-4 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-500 hover:border-red-500/50 transition-all flex items-center gap-2"
              >
                <X className="w-3.5 h-3.5" />
                Stop
              </button>
            )}
          </div>
          
          {status === 'fetching' && (
            <div className="mt-6 w-full h-1.5 bg-secondary/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-1000 animate-pulse" style={{ width: '100%' }} />
            </div>
          )}
        </div>
      )}

      {/* Done / Success State */}
      {status === 'done' && (
        <div className="bg-background border border-emerald-500/20 rounded-2xl p-6 sm:p-10 text-center space-y-6 animate-in zoom-in-95 duration-500 shadow-[0_0_50px_-12px_rgba(16,185,129,0.1)]">
          <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-bold text-foreground">{resultMsg}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest">Your data is ready for download</p>
          </div>
          <button
            onClick={handleDownload}
            disabled={localBuilding}
            className="h-12 px-10 bg-emerald-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-emerald-700 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-3 mx-auto"
          >
            {localBuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download CSV Report
          </button>
        </div>
      )}

      {/* Stats & Info Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Export Summary (2/3 width on desktop) */}
        <div className="xl:col-span-2 bg-background border border-border rounded-2xl p-6 sm:p-8 space-y-8">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-[0.15em]">Data Insights</h3>
          </div>
          
          {!stats ? (
            <div className="h-32 flex flex-col items-center justify-center text-center opacity-30 grayscale">
              <BarChart3 className="w-8 h-8 mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest">No active session data</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Trades</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{stats.totalTrades.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Fees (USD)</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">${stats.totalFees.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Volume</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">${stats.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Top Assets</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {stats.topPairs.map(([pair, count]) => (
                    <span key={pair} className="px-2 py-0.5 bg-secondary/10 rounded-md text-[9px] font-bold text-muted-foreground uppercase border border-border/50">
                      {pair.split('-')[0]} ({count})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Time Estimates (1/3 width) */}
        <div className="bg-background border border-border rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-[0.15em]">Sync Estimates</h3>
          </div>
          <div className="space-y-3.5">
            {[
              { label: '1k trades', time: '~20s' },
              { label: '10k trades', time: '~3.3m' },
              { label: '100k trades', time: '~33m' },
              { label: '250k trades', time: '~1.4h' },
              { label: '1M trades', time: '~5.5h' },
            ].map((est) => (
              <div key={est.label} className="flex items-center justify-between group">
                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">{est.label}</span>
                <div className="flex-1 mx-3 border-b border-border/10 border-dotted" />
                <span className="text-[11px] font-bold text-foreground tabular-nums">{est.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Guidelines */}
      <div className="bg-secondary/5 border border-border/50 rounded-2xl p-6 flex flex-col sm:flex-row gap-8 items-start sm:items-center">
        <div className="space-y-1 flex-1">
          <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">Protocol Rules</h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Data is fetched directly from SoDex Mainnet. Background persistence is active—you can browse other sections while the sync continues. Ensure your browser tab remains open.
          </p>
        </div>
        <div className="h-px sm:h-8 w-full sm:w-px bg-border/50" />
        <div className="flex items-center gap-4">
          <Clock className="w-5 h-5 text-muted-foreground opacity-30" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] whitespace-nowrap">
            Resumable Sessions Active
          </p>
        </div>
      </div>
    </div>
  );
}
