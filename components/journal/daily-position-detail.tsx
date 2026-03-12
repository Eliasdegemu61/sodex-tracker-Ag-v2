'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CalendarDays, ArrowUpRight, ArrowDownRight, Clock, Target, CreditCard, Hash } from 'lucide-react';
import type { DayPerformance } from '@/lib/journal-types';
import type { EnrichedPosition } from '@/lib/sodex-api';
import { formatHoldingTime } from '@/lib/journal-engine';

interface DailyPositionDetailProps {
    dailyData: DayPerformance[];
    allPositions: EnrichedPosition[];
}

export function DailyPositionDetail({ dailyData, allPositions }: DailyPositionDetailProps) {
    // We only care about days that actually have trades
    const tradeDays = useMemo(() => dailyData.filter(d => d.trades > 0).reverse(), [dailyData]);
    const [selectedDayStr, setSelectedDayStr] = useState<string>(tradeDays[0]?.date || '');

    const selectedDayData = useMemo(() =>
        tradeDays.find(d => d.date === selectedDayStr),
        [tradeDays, selectedDayStr]);

    const positionsForDay = useMemo(() => {
        if (!selectedDayStr) return [];
        return allPositions.filter(p => {
            const date = new Date(p.created_at).toISOString().slice(0, 10);
            return date === selectedDayStr;
        });
    }, [allPositions, selectedDayStr]);

    if (tradeDays.length === 0) return null;

    return (
        <Card className="p-6 bg-card dark:bg-card/95 border border-border/20 shadow-lg rounded-[2.5rem] overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Position History</h3>
                    <p className="text-[9px] text-muted-foreground/20 leading-tight">Detailed log of executed trades</p>
                </div>

                {/* Day Selector */}
                <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    {tradeDays.slice(0, 7).map((day) => (
                        <button
                            key={day.date}
                            onClick={() => setSelectedDayStr(day.date)}
                            className={cn(
                                "px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all whitespace-nowrap",
                                selectedDayStr === day.date
                                    ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20"
                                    : "bg-secondary/20 border-border/10 text-muted-foreground/60 hover:border-orange-500/30 hover:text-foreground"
                            )}
                        >
                            {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </button>
                    ))}
                </div>
            </div>

            {selectedDayData && (
                <div className="space-y-6">
                    {/* Day Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-3xl bg-secondary/10 border border-border/5">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Daily P&L</span>
                            <span className={cn(
                                "text-sm font-black",
                                selectedDayData.dailyPnl >= 0 ? "text-green-500" : "text-red-500"
                            )}>
                                {selectedDayData.dailyPnl >= 0 ? "+" : ""}${selectedDayData.dailyPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Trades</span>
                            <span className="text-sm font-black text-foreground">{selectedDayData.trades}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Win Rate</span>
                            <span className="text-sm font-black text-foreground">{selectedDayData.winRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Status</span>
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest mt-1",
                                selectedDayData.dailyPnl >= 0 ? "text-green-500/80" : "text-red-500/80"
                            )}>
                                {selectedDayData.dailyPnl >= 0 ? "Profitable" : "Drawdown"}
                            </span>
                        </div>
                    </div>

                    {/* Positions Table */}
                    <div className="overflow-x-auto -mx-6 px-6">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border/10">
                                    <th className="text-left py-4 px-2 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Symbol</th>
                                    <th className="text-left py-4 px-2 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Side</th>
                                    <th className="text-right py-4 px-2 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Size</th>
                                    <th className="text-right py-4 px-2 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Entry / Close</th>
                                    <th className="text-right py-4 px-2 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">PnL</th>
                                    <th className="text-right py-4 px-2 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Fee</th>
                                    <th className="text-right py-4 px-2 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {positionsForDay.map((pos) => {
                                    const isWin = pos.realizedPnlValue > 0;
                                    const durationMs = pos.updated_at - pos.created_at;
                                    const pnlPercent = (pos.realizedPnlValue / (parseFloat(pos.initial_margin) || 1)) * 100;

                                    return (
                                        <tr key={pos.position_id} className="border-b border-border/5 hover:bg-secondary/5 transition-colors group">
                                            <td className="py-4 px-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/10 group-hover:bg-orange-500/20 transition-all">
                                                        <Hash className="w-3.5 h-3.5 text-orange-400" />
                                                    </div>
                                                    <span className="text-xs font-black text-foreground">{pos.pairName}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-2">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest",
                                                    pos.positionSideLabel === 'LONG'
                                                        ? "bg-green-500/10 text-green-500"
                                                        : "bg-red-500/10 text-red-500"
                                                )}>
                                                    {pos.positionSideLabel}
                                                </span>
                                            </td>
                                            <td className="py-4 px-2 text-right">
                                                <span className="text-xs font-bold text-foreground/80">{parseFloat(pos.cum_closed_size).toLocaleString()}</span>
                                            </td>
                                            <td className="py-4 px-2 text-right">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-foreground/90">${parseFloat(pos.avg_entry_price).toLocaleString()}</span>
                                                    <span className="text-[10px] font-bold text-muted-foreground/30">${parseFloat(pos.avg_close_price).toLocaleString()}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-2 text-right">
                                                <div className="flex flex-col">
                                                    <span className={cn(
                                                        "text-xs font-black",
                                                        isWin ? "text-green-500" : "text-red-500"
                                                    )}>
                                                        {isWin ? "+" : ""}${pos.realizedPnlValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[9px] font-bold",
                                                        isWin ? "text-green-500/40" : "text-red-500/40"
                                                    )}>
                                                        {isWin ? "+" : ""}{pnlPercent.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-2 text-right">
                                                <span className="text-[11px] font-bold text-muted-foreground/30">${pos.tradingFee.toFixed(2)}</span>
                                            </td>
                                            <td className="py-4 px-2 text-right">
                                                <div className="flex items-center justify-end gap-1.5 text-muted-foreground/30">
                                                    <Clock className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold">{formatHoldingTime(durationMs)}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Card>
    );
}
