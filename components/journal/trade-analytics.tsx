'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
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
            <Card className="p-5 bg-background border border-border rounded-xl">
                <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-4">Trade Analytics</h3>
                <p className="text-sm text-muted-foreground/30 text-center py-8">No trades in this plan period</p>
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

    const SortTh = ({ label, field }: { label: string; field: keyof SymbolAnalytics }) => (
        <th
            onClick={() => toggleSort(field)}
            className={`py-2 px-2 text-right cursor-pointer select-none hover:text-foreground transition-colors text-[10px] font-black uppercase tracking-widest ${sortKey === field ? 'text-foreground border-b border-foreground' : 'text-muted-foreground/30'}`}
        >
            {label} {sortKey === field ? (sortDir === 'desc' ? '↓' : '↑') : ''}
        </th>
    );

    return (
        <Card className="p-5 bg-background border border-border rounded-xl">
            <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-4">Trade Analytics</h3>

            {/* Highlights */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="p-3 rounded-2xl bg-secondary/10 border border-border/10">
                    <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">Most Traded</p>
                    <p className="text-sm font-bold text-foreground/90 mt-1">{mostTraded?.symbol ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground/40">{mostTraded?.trades ?? 0} trades</p>
                </div>
                <div className="p-3 rounded-2xl bg-secondary/10 border border-emerald-500/10">
                    <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">Best Asset</p>
                    <p className="text-sm font-bold text-emerald-500 mt-1">{bestSymbol?.symbol ?? '—'}</p>
                    <p className="text-[10px] text-emerald-500/60">+${bestSymbol?.totalPnl?.toFixed(2) ?? '0'}</p>
                </div>
                <div className="p-3 rounded-2xl bg-secondary/10 border border-red-500/10">
                    <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">Worst Asset</p>
                    <p className="text-sm font-bold text-red-500 mt-1">{worstSymbol?.symbol ?? '—'}</p>
                    <p className="text-[10px] text-red-500/60">${worstSymbol?.totalPnl?.toFixed(2) ?? '0'}</p>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-separate border-spacing-y-1">
                    <thead>
                        <tr>
                            <th className="text-left py-2 px-2 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">Symbol</th>
                            <SortTh label="Trades" field="trades" />
                            <SortTh label="Win%" field="winRate" />
                            <SortTh label="Total P&L" field="totalPnl" />
                            <SortTh label="Avg P&L" field="avgPnl" />
                            <SortTh label="Best" field="bestTrade" />
                            <SortTh label="Worst" field="worstTrade" />
                            <SortTh label="Avg Hold" field="avgHoldingTimeMs" />
                            <SortTh label="Avg Lev" field="avgLeverage" />
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((row) => (
                            <tr key={row.symbol} className="bg-secondary/5 hover:bg-secondary/10 transition-colors">
                                <td className="py-2.5 px-2 first:rounded-l-xl font-black text-foreground/90">{row.symbol}</td>
                                <td className="py-2.5 px-2 text-right text-muted-foreground/60 tabular-nums">{row.trades}</td>
                                <td className={`py-2.5 px-2 text-right font-black tabular-nums ${row.winRate >= 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {row.winRate.toFixed(1)}%
                                </td>
                                <td className={`py-2.5 px-2 text-right font-black tabular-nums ${row.totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {row.totalPnl >= 0 ? '+' : ''}${row.totalPnl.toFixed(2)}
                                </td>
                                <td className={`py-2.5 px-2 text-right tabular-nums ${row.avgPnl >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                                    {row.avgPnl >= 0 ? '+' : ''}${row.avgPnl.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-2 text-right text-emerald-500/70 tabular-nums">+${row.bestTrade.toFixed(2)}</td>
                                <td className="py-2.5 px-2 text-right text-red-500/70 tabular-nums">${row.worstTrade.toFixed(2)}</td>
                                <td className="py-2.5 px-2 text-right text-muted-foreground/50 tabular-nums">{formatHoldingTime(row.avgHoldingTimeMs)}</td>
                                <td className="py-2.5 px-2 last:rounded-r-xl text-right text-muted-foreground/50 tabular-nums">
                                    {row.isSpot ? '—' : `${row.avgLeverage.toFixed(1)}x`}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
