'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, Calendar, BarChart3, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DayPerformance } from '@/lib/journal-types';
import type { EnrichedPosition } from '@/lib/sodex-api';
import { CyberCard } from './cyber-elements';

interface DailyAnalysisProps {
    allPositions: EnrichedPosition[];
    dailyPerformance: DayPerformance[];
}

export function DailyAnalysis({ allPositions, dailyPerformance }: DailyAnalysisProps) {
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

    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState<string>(
        availableDates.includes(todayStr) ? todayStr : (availableDates[0] || todayStr)
    );

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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <BarChart3 className="w-5 h-5 text-white/60" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Daily Analysis</h3>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Performance Breakdown</p>
                    </div>
                </div>

                <div className="relative">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mask-fade-right">
                        {availableDates.length === 0 && (
                            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                                No data
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
                                        "flex flex-col items-center min-w-[64px] py-3 rounded-2xl border transition-all duration-300",
                                        isSelected 
                                            ? "bg-white border-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                                            : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10"
                                    )}
                                >
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-widest mb-1",
                                        isSelected ? "text-black/40" : "text-white/20"
                                    )}>
                                        {dayName}
                                    </span>
                                    <span className="text-sm font-black leading-none mb-1">
                                        {dayNum}
                                    </span>
                                    <span className={cn(
                                        "text-[9px] font-bold uppercase",
                                        isSelected ? "text-black/60" : "text-white/20"
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
                <CyberCard variant="slim" className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Daily PnL</span>
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-xl font-black tracking-tighter",
                            dailyStats.pnl >= 0 ? "text-green-400" : "text-red-400"
                        )}>
                            {dailyStats.pnl >= 0 ? '+' : ''}${Math.abs(dailyStats.pnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        {dailyStats.pnl !== 0 && (
                            dailyStats.pnl > 0 ? <TrendingUp className="w-4 h-4 text-green-400/50" /> : <TrendingDown className="w-4 h-4 text-red-400/50" />
                        )}
                    </div>
                </CyberCard>

                <CyberCard variant="slim" className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Trades / Win Rate</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black tracking-tighter text-white">{dailyStats.trades}</span>
                        <span className="text-[10px] font-bold text-white/40 font-mono">/</span>
                        <span className="text-sm font-bold text-white/80 font-mono">{dailyStats.winRate.toFixed(1)}%</span>
                    </div>
                </CyberCard>

                <CyberCard variant="slim" className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Status</span>
                    <div className="flex items-center gap-2">
                        {dailyStats.perf?.targetReached ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-green-500/10 border border-green-500/20">
                                <span className="text-[10px] font-black text-green-500 uppercase tracking-tighter">Target Reached</span>
                            </div>
                        ) : dailyStats.perf?.lossLimitHit ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/20">
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">Limit Hit</span>
                            </div>
                        ) : (
                            <span className="text-sm font-bold text-white/20 uppercase tracking-widest">Neutral</span>
                        )}
                    </div>
                </CyberCard>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <Calendar className="w-3.5 h-3.5 text-white/20" />
                    <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Daily Executions</h4>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.01]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px]">
                            <thead>
                                <tr className="border-b border-white/5 text-white/20 uppercase font-bold tracking-widest bg-white/[0.02]">
                                    <th className="px-6 py-4">Symbol</th>
                                    <th className="px-6 py-4">Side</th>
                                    <th className="px-6 py-4">Size</th>
                                    <th className="px-6 py-4 text-right">PnL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {dailyStats.positions.map((pos, i) => (
                                    <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white">{pos.pairName}</div>
                                            <div className="text-[9px] text-white/20 font-mono">{new Date(pos.created_at).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {pos.is_spot ? (
                                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                                                    SPOT
                                                </span>
                                            ) : (
                                                <span className={cn(
                                                    "font-bold px-2 py-0.5 rounded-md text-[10px]",
                                                    pos.positionSideLabel === 'LONG' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                                )}>
                                                    {pos.positionSideLabel}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-white/40 tabular-nums">{pos.closedSize}</td>
                                        <td className={cn(
                                            "px-6 py-4 text-right font-bold tabular-nums",
                                            pos.realizedPnlValue > 0 ? "text-green-400" : "text-red-400"
                                        )}>
                                            {pos.realizedPnlValue > 0 ? '+' : ''}{pos.realizedPnlValue.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                                {dailyStats.positions.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-white/10 uppercase font-bold tracking-widest italic">
                                            No trades recorded on this date
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

