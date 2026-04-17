'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, Calendar, BarChart3, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DayPerformance } from '@/lib/journal-types';
import type { EnrichedPosition } from '@/lib/sodex-api';
import { Card } from '@/components/ui/card';

interface DailyAnalysisProps {
    allPositions: EnrichedPosition[];
    dailyPerformance: DayPerformance[];
    selectedDate: string;
    onDateSelect: (date: string) => void;
}

export function DailyAnalysis({ allPositions, dailyPerformance, selectedDate, onDateSelect }: DailyAnalysisProps) {
    // Get unique dates from both performance and positions for the dropdown
    const availableDates = useMemo(() => {
        const dates = new Set<string>();
        dailyPerformance.forEach(d => dates.add(d.date));
        allPositions.forEach(p => {
            const date = new Date(p.created_at).toISOString().split('T')[0];
            dates.add(date);
        });
        return Array.from(dates).sort((a, b) => b.localeCompare(a));
    }, [dailyPerformance, allPositions]);

    const dailyStats = useMemo(() => {
        const perf = dailyPerformance.find(d => d.date === selectedDate);
        const positions = allPositions.filter(p => 
            new Date(p.created_at).toISOString().split('T')[0] === selectedDate
        );

        const totalPnl = positions.reduce((sum, p) => sum + p.realizedPnlValue, 0);
        const winsAvailable = positions.filter(p => p.realizedPnlValue > 0).length;
        const lossesAvailable = positions.filter(p => p.realizedPnlValue <= 0).length;
        const winRate = positions.length > 0 ? (winsAvailable / positions.length) * 100 : 0;

        return {
            trades: positions.length,
            pnl: totalPnl,
            winRate: winRate,
            positions: positions,
            perf: perf
        };
    }, [selectedDate, allPositions, dailyPerformance]);

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-secondary/5 border border-border/5">
                        <BarChart3 className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground/90 tracking-tight">Daily Breakdown</h3>
                        <p className="text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-widest">Execution Deep-Dive</p>
                    </div>
                </div>

                <div className="relative">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                        {availableDates.length === 0 && (
                            <div className="px-4 py-2 rounded-xl bg-secondary/5 border border-border/10 text-[10px] font-bold text-muted-foreground/20 uppercase tracking-widest">
                                No data available
                            </div>
                        )}
                        {availableDates.map(date => {
                            const isSelected = selectedDate === date;
                            const d = new Date(date);
                            const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
                            const dayNum = d.toLocaleDateString(undefined, { day: 'numeric' });
                            const monthName = d.toLocaleDateString(undefined, { month: 'short' });

                            return (
                                <button
                                    key={date}
                                    onClick={() => setSelectedDate(date)}
                                    className={cn(
                                        "flex flex-col items-center min-w-[56px] py-2.5 rounded-xl border transition-all duration-300",
                                        isSelected 
                                            ? "bg-foreground border-foreground text-background shadow-lg shadow-foreground/10" 
                                            : "bg-secondary/5 border-border/10 text-muted-foreground/30 hover:bg-secondary/10 hover:border-border/20"
                                    )}
                                >
                                    <span className={cn(
                                        "text-[8px] font-bold uppercase tracking-widest mb-1",
                                        isSelected ? "opacity-60" : "opacity-40"
                                    )}>
                                        {dayName}
                                    </span>
                                    <span className="text-sm font-bold leading-none mb-1">
                                        {dayNum}
                                    </span>
                                    <span className={cn(
                                        "text-[8px] font-semibold uppercase opacity-40"
                                    )}>
                                        {monthName}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 flex flex-col gap-1.5 bg-card/30 backdrop-blur-md border border-border/10 rounded-2xl">
                    <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">Net Realized</span>
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-xl font-bold tracking-tight",
                            dailyStats.pnl >= 0 ? "text-emerald-500" : "text-red-500"
                        )}>
                            {dailyStats.pnl >= 0 ? '+' : ''}${Math.abs(dailyStats.pnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        {dailyStats.pnl !== 0 && (
                            dailyStats.pnl > 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500/40" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500/40" />
                        )}
                    </div>
                </Card>

                <Card className="p-5 flex flex-col gap-1.5 bg-card/30 backdrop-blur-md border border-border/10 rounded-2xl">
                    <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">Executions / Accuracy</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold tracking-tight text-foreground/90">{dailyStats.trades}</span>
                        <span className="text-[10px] font-medium text-muted-foreground/20">/</span>
                        <span className="text-sm font-bold text-muted-foreground/60 tabular-nums">{dailyStats.winRate.toFixed(1)}%</span>
                    </div>
                </Card>

                <Card className="p-5 flex flex-col gap-1.5 bg-card/30 backdrop-blur-md border border-border/10 rounded-2xl">
                    <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">Session Result</span>
                    <div className="flex items-center gap-2">
                        {dailyStats.perf?.targetReached ? (
                            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Target Achieved</span>
                        ) : dailyStats.perf?.lossLimitHit ? (
                            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Limit Incurred</span>
                        ) : (
                            <span className="text-xs font-bold text-muted-foreground/20 uppercase tracking-wider">In Progress</span>
                        )}
                    </div>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <Calendar className="w-3 h-3 text-muted-foreground/20" />
                    <h4 className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">Activity Log</h4>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/10 bg-card/30 backdrop-blur-sm shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                                <tr className="border-b border-border/5 text-muted-foreground/20 uppercase font-bold tracking-wider bg-secondary/5">
                                    <th className="px-6 py-3.5">Asset</th>
                                    <th className="px-6 py-3.5">Direction</th>
                                    <th className="px-6 py-3.5">Volume</th>
                                    <th className="px-6 py-3.5 text-right">Result</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/5">
                                {dailyStats.positions.map((pos, i) => (
                                    <tr key={i} className="group hover:bg-secondary/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-foreground/80">{pos.pairName}</div>
                                            <div className="text-[9px] text-muted-foreground/30 font-medium tabular-nums">{new Date(pos.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "font-bold text-[10px] tracking-wide",
                                                pos.is_spot ? "text-orange-500/60" :
                                                pos.positionSideLabel === 'LONG' ? "text-emerald-500/80" : "text-red-500/80"
                                            )}>
                                                {pos.is_spot ? "SPOT" : pos.positionSideLabel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground/40 tabular-nums font-medium">{pos.closedSize}</td>
                                        <td className={cn(
                                            "px-6 py-4 text-right font-bold tabular-nums",
                                            pos.realizedPnlValue > 0 ? "text-emerald-500" : "text-red-500"
                                        )}>
                                            {pos.realizedPnlValue > 0 ? '+' : ''}${Math.abs(pos.realizedPnlValue).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                                {dailyStats.positions.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-16 text-center text-muted-foreground/15 uppercase font-bold tracking-widest text-[9px]">
                                            No data for this session
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

