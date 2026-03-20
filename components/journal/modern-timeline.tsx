'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { DayPerformance } from '@/lib/journal-types';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { CyberCard } from './cyber-elements';
import { Activity } from 'lucide-react';

interface ModernTimelineProps {
    daily: DayPerformance[];
}

export function ModernTimeline({ daily }: ModernTimelineProps) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const visibleDays = daily.filter(d => d.date <= todayStr);

    if (visibleDays.length === 0) return null;

    return (
        <CyberCard className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">
                            Temporal Sequence
                        </h3>
                        <p className="text-[9px] text-muted-foreground/20 italic leading-tight uppercase font-bold">Historical Data Log</p>
                    </div>
                </div>
                <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span>Objective_Met</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        <span>Leakage_Alert</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary/20" />
                        <span>Idle</span>
                    </div>
                </div>
            </div>

            <TooltipProvider delayDuration={100}>
                <div className="flex flex-wrap gap-2">
                    {visibleDays.map((day) => {
                        const isNoTrade = day.trades === 0;
                        const isProfit = day.dailyPnl > 0;
                        const hasViolation = day.violations.length > 0;

                        return (
                            <Tooltip key={day.date}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={cn(
                                            "w-4 h-10 rounded-lg transition-all duration-300 hover:scale-125 cursor-pointer relative overflow-hidden group/tile",
                                            isNoTrade 
                                                ? "bg-secondary/10 hover:bg-secondary/20 border border-border/5" 
                                                : isProfit 
                                                    ? "bg-emerald-500/80 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                                                    : "bg-red-500/80 hover:bg-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                        )}
                                    >
                                        {hasViolation && !isNoTrade && (
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500 animate-pulse" />
                                        )}
                                        
                                        {!isNoTrade && (
                                            <div 
                                                className="absolute inset-0 bg-foreground/10 opacity-0 group-hover/tile:opacity-100 transition-opacity"
                                            />
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="p-4 bg-card/95 border border-border/10 rounded-2xl shadow-2xl backdrop-blur-xl">
                                    <div className="space-y-2 min-w-[140px]">
                                        <div className="flex justify-between items-center gap-8 border-b border-border/5 pb-2">
                                            <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest font-mono">{day.date}</span>
                                            {day.targetReached && (
                                                <span className="text-[8px] font-black text-emerald-500 uppercase px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">OBJ_MET</span>
                                            )}
                                        </div>
                                        <p className={cn("text-lg font-mono font-black tracking-tighter", isProfit ? "text-emerald-500" : day.dailyPnl < 0 ? "text-red-500" : "text-muted-foreground/40")}>
                                            {day.dailyPnl >= 0 ? '+' : ''}${Math.abs(day.dailyPnl).toLocaleString()}
                                        </p>
                                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                            <span>{day.trades} SIGNALS</span>
                                            {hasViolation && (
                                                <span className="text-orange-500">VIOLATIONS: {day.violations.length}</span>
                                            )}
                                        </div>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>
            </TooltipProvider>
            
            <div className="mt-8 flex justify-between text-[8px] font-black text-muted-foreground/20 uppercase tracking-[0.4em] border-t border-border/5 pt-6 select-none">
                <span>Initialization_Point</span>
                <span>Active_Execution_Flow</span>
            </div>
        </CyberCard>
    );
}
