'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SymbolAnalytics } from '@/lib/journal-types';
import { formatHoldingTime } from '@/lib/journal-engine';

interface TradeAnalyticsProps {
    analytics: SymbolAnalytics[];
}

export function TradeAnalytics({ analytics }: TradeAnalyticsProps) {
    const [sortKey, setSortKey] = useState<keyof SymbolAnalytics>('trades');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    if (analytics.length === 0) {
        return (
            <Card className="p-6 bg-card/30 backdrop-blur-md border border-border/10 rounded-2xl">
                <h3 className="text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-[0.2em] mb-6">Trade Analytics</h3>
                <p className="text-sm text-muted-foreground/20 text-center py-12 font-medium">No activity recorded</p>
            </Card>
        );
    }

    const sorted = [...analytics].sort((a, b) => {
        const av = a[sortKey] as number;
        const bv = b[sortKey] as number;
        return sortDir === 'desc' ? bv - av : av - bv;
    });

    const mostTraded = [...analytics].sort((a, b) => b.trades - a.trades)[0];
    const bestSymbol = [...analytics].sort((a, b) => b.totalPnl - a.totalPnl)[0];
    const worstSymbol = [...analytics].sort((a, b) => a.totalPnl - b.totalPnl)[0];

    const toggleSort = (key: keyof SymbolAnalytics) => {
        if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
        else { setSortKey(key); setSortDir('desc'); }
    };

    const SortTh = ({ label, field, align = 'right' }: { label: string; field: keyof SymbolAnalytics; align?: 'left' | 'right' }) => (
        <th
            onClick={() => toggleSort(field)}
            className={cn(
                "py-3 px-3 cursor-pointer select-none whitespace-nowrap transition-colors text-[9px] font-bold uppercase tracking-wider",
                align === 'right' ? 'text-right' : 'text-left',
                sortKey === field ? 'text-foreground' : 'text-muted-foreground/20'
            )}
        >
            <div className="flex items-center gap-1">
                {align === 'right' && sortKey === field && <span className="text-[8px] opacity-40">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                {label}
                {align === 'left' && sortKey === field && <span className="text-[8px] opacity-40">{sortDir === 'desc' ? '↓' : '↑'}</span>}
            </div>
        </th>
    );

    return (
        <Card className="p-6 bg-card/30 backdrop-blur-md border border-border/10 rounded-2xl shadow-sm">
            <h3 className="text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-[0.2em] mb-8">Asset Performance</h3>

            {/* Highlights */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-secondary/5 border border-border/5">
                    <p className="text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest mb-1.5">Highest Volume</p>
                    <p className="text-lg font-bold text-foreground/80 tracking-tight">{mostTraded?.symbol ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground/40 font-medium">{mostTraded?.trades ?? 0} trades</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-[9px] font-bold text-emerald-500/40 uppercase tracking-widest mb-1.5">Top Performer</p>
                    <p className="text-lg font-bold text-emerald-500 tracking-tight">{bestSymbol?.symbol ?? '—'}</p>
                    <p className="text-[10px] text-emerald-500/60 font-medium">${bestSymbol?.totalPnl?.toFixed(0) ?? '0'} Net</p>
                </div>
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                    <p className="text-[9px] font-bold text-red-500/40 uppercase tracking-widest mb-1.5">Worst Asset</p>
                    <p className="text-lg font-bold text-red-500 tracking-tight">{worstSymbol?.symbol ?? '—'}</p>
                    <p className="text-[10px] text-red-500/60 font-medium">${worstSymbol?.totalPnl?.toFixed(0) ?? '0'} Net</p>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full text-[11px] border-collapse">
                    <thead>
                        <tr className="border-b border-border/5">
                            <th className="text-left py-3 px-3 text-[9px] font-bold text-muted-foreground/20 uppercase tracking-wider">Symbol</th>
                            <SortTh label="Trades" field="trades" />
                            <SortTh label="Win%" field="winRate" />
                            <SortTh label="Net P&L" field="totalPnl" />
                            <SortTh label="Avg" field="avgPnl" />
                            <SortTh label="Best" field="bestTrade" />
                            <SortTh label="Hold" field="avgHoldingTimeMs" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/5">
                        {sorted.map((row) => (
                            <tr key={row.symbol} className="hover:bg-secondary/5 transition-colors group">
                                <td className="py-4 px-3 font-bold text-foreground/80">{row.symbol}</td>
                                <td className="py-4 px-3 text-right text-muted-foreground/50 tabular-nums font-medium">{row.trades}</td>
                                <td className={cn(
                                    "py-4 px-3 text-right tabular-nums font-bold",
                                    row.winRate >= 50 ? 'text-emerald-500/80' : 'text-red-500/80'
                                )}>
                                    {row.winRate.toFixed(1)}%
                                </td>
                                <td className={cn(
                                    "py-4 px-3 text-right tabular-nums font-bold",
                                    row.totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                                )}>
                                    {row.totalPnl >= 0 ? '+' : ''}${Math.abs(row.totalPnl).toFixed(2)}
                                </td>
                                <td className={cn(
                                    "py-4 px-3 text-right tabular-nums font-medium",
                                    row.avgPnl >= 0 ? 'text-emerald-500/60' : 'text-red-500/60'
                                )}>
                                    ${Math.abs(row.avgPnl).toFixed(1)}
                                </td>
                                <td className="py-4 px-3 text-right text-emerald-500/60 tabular-nums font-medium">+${row.bestTrade.toFixed(1)}</td>
                                <td className="py-4 px-3 text-right text-muted-foreground/30 tabular-nums font-medium lowercase italic">{formatHoldingTime(row.avgHoldingTimeMs)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
