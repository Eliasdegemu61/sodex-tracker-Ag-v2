'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { DayPerformance } from '@/lib/journal-types';
import { ChevronLeft, ChevronRight, CheckCheck, XCircle } from 'lucide-react';

interface DailyPerformanceHistoryProps {
    days: DayPerformance[];
}

export function DailyPerformanceHistory({ days }: DailyPerformanceHistoryProps) {
    const [page, setPage] = React.useState(0);
    const pageSize = 5;

    // Filter to days with trades, sorted by newest first
    const tradingDays = React.useMemo(() => {
        return [...days]
            .filter(d => d.trades > 0)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [days]);

    const totalPages = Math.ceil(tradingDays.length / pageSize) || 1;
    const paginatedDays = tradingDays.slice(page * pageSize, (page + 1) * pageSize);

    return (
        <div className="space-y-6 flex flex-col h-full">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Daily Performance</h3>
                <div className="flex gap-2">
                    <button 
                        disabled={page === 0}
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        className="p-1 px-2 rounded-lg border border-border/10 hover:bg-secondary/10 disabled:opacity-20 transition-all"
                    >
                        <ChevronLeft className="w-3.5 h-3.5 text-foreground/80" />
                    </button>
                    <button 
                        disabled={(page + 1) * pageSize >= tradingDays.length}
                        onClick={() => setPage(p => p + 1)}
                        className="p-1 px-2 rounded-lg border border-border/10 hover:bg-secondary/10 disabled:opacity-20 transition-all"
                    >
                        <ChevronRight className="w-3.5 h-3.5 text-foreground/80" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto rounded-xl border border-border/10">
                <table className="w-full text-left text-[10px]">
                    <thead>
                        <tr className="border-b border-border/10 text-muted-foreground/30 uppercase font-bold tracking-widest text-[9px] bg-secondary/5">
                            <th className="px-4 md:px-6 py-3">Date</th>
                            <th className="px-4 md:px-6 py-3 text-center">Trades</th>
                            <th className="px-4 md:px-6 py-3 text-right">Daily PnL</th>
                            <th className="px-4 md:px-6 py-3 text-center">Target</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                        {paginatedDays.map((day, i) => (
                            <tr key={day.date} className="group hover:bg-white/5 transition-colors">
                                <td className="px-4 md:px-6 py-3">
                                    <div className="font-bold text-white/80">
                                        <span className="md:hidden">{new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                        <span className="hidden md:inline">{new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                </td>
                                <td className="px-4 md:px-6 py-3 text-center text-white/40 font-bold tabular-nums">
                                    {day.trades}
                                </td>
                                <td className={cn(
                                    "px-4 md:px-6 py-3 text-right font-bold tabular-nums text-[11px]",
                                    day.dailyPnl > 0 ? "text-emerald-500" : day.dailyPnl < 0 ? "text-red-500" : "text-white/20"
                                )}>
                                    {day.dailyPnl > 0 ? '+' : ''}{day.dailyPnl.toFixed(2)}
                                </td>
                                <td className="px-4 md:px-6 py-3 text-center">
                                    <div className="flex justify-center">
                                        {day.targetReached ? (
                                            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                                        ) : (
                                            <div className="w-1 h-1 rounded-full bg-white/5" />
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {tradingDays.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground/20 uppercase font-bold tracking-widest">
                                    No logs available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-center mt-2">
                <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">
                    Page {page + 1} of {totalPages}
                </p>
            </div>
        </div>
    );
}
