'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DayPerformance } from '@/lib/journal-types';

interface DailyPerformanceTableProps {
    daily: DayPerformance[];
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
    });
}

export function DailyPerformanceTable({ daily }: DailyPerformanceTableProps) {
    const [showAll, setShowAll] = useState(false);

    // Filter out future dates (safety, engine should handle this)
    const todayStr = new Date().toISOString().slice(0, 10);
    const visibleDays = daily.filter(d => d.date <= todayStr);

    // By default, only show days that were actually traded
    const tradingDays = visibleDays.filter((d) => d.trades > 0);

    const displayed = showAll
        ? visibleDays.slice().reverse()
        : tradingDays.slice(-10).reverse(); // latest 10 trading days

    return (
        <Card className="p-6 bg-card dark:bg-card/95 border border-border/20 shadow-lg rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                        Daily Performance
                    </h3>
                    <p className="text-[9px] text-muted-foreground/20 leading-tight">Log of all trading activities</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-[9px] font-bold text-muted-foreground/30 uppercase block">Total Days</span>
                        <span className="text-sm font-black text-foreground">{tradingDays.length}</span>
                    </div>
                </div>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-[11px] border-separate border-spacing-y-1.5">
                    <thead>
                        <tr className="text-muted-foreground/30 font-bold uppercase tracking-widest text-[9px]">
                            <th className="text-left py-2 px-3">Date</th>
                            <th className="text-center py-2 px-3">Trades</th>
                            <th className="text-right py-2 px-3">Daily P&L</th>
                            <th className="text-right py-2 px-3">Cum P&L</th>
                            <th className="text-center py-2 px-3">Target</th>
                            <th className="text-center py-2 px-3">Violations</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayed.map((day) => {
                            const hasViolation = day.violations.length > 0;
                            const rowClass = day.lossLimitHit
                                ? 'bg-red-500/[0.03] dark:bg-red-500/5 hover:bg-red-500/10'
                                : day.targetReached
                                    ? 'bg-green-500/[0.03] dark:bg-green-500/5 hover:bg-green-500/10'
                                    : 'bg-secondary/30 dark:bg-secondary/5 hover:bg-secondary/10';

                            return (
                                <tr key={day.date} className={cn("rounded-2xl transition-colors cursor-default border border-transparent hover:border-border/10", rowClass)}>
                                    <td className="py-3 px-3 first:rounded-l-2xl font-bold text-foreground/80">
                                        {formatDate(day.date)}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                        <span className="px-2 py-0.5 rounded-lg bg-secondary/50 text-muted-foreground text-[10px] font-bold">
                                            {day.trades}
                                        </span>
                                    </td>
                                    <td className={cn("py-3 px-3 text-right font-black", day.dailyPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                        {day.dailyPnl >= 0 ? '+' : ''}${Math.abs(day.dailyPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className={cn("py-3 px-3 text-right font-bold opacity-60", day.cumulativePnl >= 0 ? "text-green-600/70" : "text-red-600/70")}>
                                        {day.cumulativePnl >= 0 ? '+' : ''}${Math.abs(day.cumulativePnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                        {day.targetReached ? (
                                            <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center mx-auto border border-green-500/20">
                                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground/10">—</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-3 last:rounded-r-2xl text-center">
                                        {hasViolation ? (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
                                                <AlertTriangle className="w-2.5 h-2.5" />
                                                <span className="text-[10px] font-black">{day.violations.length}</span>
                                            </div>
                                        ) : (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500/20 mx-auto" />
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile list */}
            <div className="sm:hidden space-y-3">
                {displayed.map((day) => (
                    <div
                        key={day.date}
                        className={cn(
                            "p-4 rounded-[2rem] border border-border/10",
                            day.lossLimitHit ? "bg-red-500/5" : day.targetReached ? "bg-green-500/5" : "bg-secondary/20"
                        )}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{formatDate(day.date)}</span>
                            <span className={cn("text-base font-black", day.dailyPnl >= 0 ? "text-green-500" : "text-red-500")}>
                                {day.dailyPnl >= 0 ? '+' : ''}${Math.abs(day.dailyPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-secondary text-[9px] font-bold text-muted-foreground">{day.trades} trades</span>
                            {day.targetReached && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                            {day.violations.length > 0 && (
                                <div className="flex items-center gap-1 text-[9px] font-bold text-red-500">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    {day.violations.length}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {visibleDays.length > 10 && (
                <button
                    onClick={() => setShowAll((s) => !s)}
                    className="mt-6 flex items-center gap-2 mx-auto px-6 py-2 rounded-2xl bg-secondary/30 hover:bg-secondary/50 text-[10px] font-black text-muted-foreground/60 hover:text-foreground transition-all uppercase tracking-widest"
                >
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", showAll ? "rotate-180" : "")} />
                    {showAll ? 'Show Only Traded' : `Show All History`}
                </button>
            )}
        </Card>
    );
}
