'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { DayPerformance } from '@/lib/journal-types';
import { Flame, Trophy, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface PerformanceStreakProps {
    days: DayPerformance[];
}

export function PerformanceStreak({ days }: PerformanceStreakProps) {
    // Calculate streaks from daily performance
    const tradingDays = days.filter(d => d.trades > 0);
    
    let currentStreak = 0;
    let currentStreakType: 'win' | 'loss' | null = null;
    let bestWinStreak = 0;
    let worstLossStreak = 0;
    
    // Iterate from oldest to newest to find current and best streaks
    for (const day of tradingDays) {
        const isWin = day.dailyPnl > 0;
        const isLoss = day.dailyPnl < 0;
        
        if (isWin) {
            if (currentStreakType === 'win') {
                currentStreak++;
            } else {
                currentStreak = 1;
                currentStreakType = 'win';
            }
            if (currentStreak > bestWinStreak) bestWinStreak = currentStreak;
        } else if (isLoss) {
            if (currentStreakType === 'loss') {
                currentStreak++;
            } else {
                currentStreak = 1;
                currentStreakType = 'loss';
            }
            if (currentStreak > worstLossStreak) worstLossStreak = currentStreak;
        } else {
            // Flat day breaks streak or we could treat it as neutral
            currentStreak = 0;
            currentStreakType = null;
        }
    }

    const isWinning = currentStreakType === 'win';
    const isLosing = currentStreakType === 'loss';

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {/* Current Streak */}
            <div className="p-4 rounded-xl bg-secondary/5 border border-border/10 flex items-center justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">Active Streak</p>
                    <p className={cn(
                        "text-xl font-bold tracking-tight",
                        isWinning ? "text-emerald-500" : isLosing ? "text-red-500" : "text-muted-foreground/20"
                    )}>
                        {currentStreak} Days
                    </p>
                </div>
                <div className={cn(
                    "p-2 rounded-lg",
                    isWinning ? "bg-emerald-500/5 text-emerald-500" : 
                    isLosing ? "bg-red-500/5 text-red-500" : 
                    "bg-secondary/10 text-muted-foreground/10"
                )}>
                    <Flame className={cn("w-4 h-4", currentStreak > 3 && "animate-pulse")} />
                </div>
            </div>

            {/* Best Win Streak */}
            <div className="p-4 rounded-xl bg-secondary/5 border border-border/10 flex items-center justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">Best Win Streak</p>
                    <p className="text-xl font-bold tracking-tight text-foreground">
                        {bestWinStreak} Days
                    </p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/10 text-emerald-500/40">
                    <Trophy className="w-4 h-4" />
                </div>
            </div>

            {/* Worst Loss Streak */}
            <div className="p-4 rounded-xl bg-secondary/5 border border-border/10 flex items-center justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">Max DD Streak</p>
                    <p className="text-xl font-bold tracking-tight text-foreground">
                        {worstLossStreak} Days
                    </p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/10 text-red-500/40">
                    <TrendingDown className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}
