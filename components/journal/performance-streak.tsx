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
            <div className="p-4 md:p-6 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between group overflow-hidden relative">
                <div className="space-y-0.5 md:space-y-1 relative z-10">
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Active Streak</p>
                    <p className={cn(
                        "text-xl md:text-2xl font-bold tracking-tight",
                        isWinning ? "text-green-400" : isLosing ? "text-red-400" : "text-white/40"
                    )}>
                        {currentStreak} Days
                    </p>
                </div>
                <div className={cn(
                    "p-2.5 rounded-xl relative z-10",
                    isWinning ? "bg-green-400/10 text-green-400" : 
                    isLosing ? "bg-red-400/10 text-red-400" : 
                    "bg-white/5 text-white/20"
                )}>
                    <Flame className={cn("w-4 h-4 md:w-5 md:h-5", currentStreak > 3 && "animate-pulse")} />
                </div>
                {/* Background flourish */}
                <div className={cn(
                    "absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-10 rounded-full",
                    isWinning ? "bg-green-400" : isLosing ? "bg-red-400" : "bg-white"
                )} />
            </div>

            {/* Best Win Streak */}
            <div className="p-4 md:p-6 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                <div className="space-y-0.5 md:space-y-1">
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Best Win Streak</p>
                    <p className="text-xl md:text-2xl font-bold tracking-tight text-white">
                        {bestWinStreak} Days
                    </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 text-white/40">
                    <Trophy className="w-4 h-4 md:w-5 md:h-5" />
                </div>
            </div>

            {/* Worst Loss Streak */}
            <div className="p-4 md:p-6 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                <div className="space-y-0.5 md:space-y-1">
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Max Drawdown Run</p>
                    <p className="text-xl md:text-2xl font-bold tracking-tight text-white">
                        {worstLossStreak} Days
                    </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 text-white/40">
                    <TrendingDown className="w-4 h-4 md:w-5 md:h-5" />
                </div>
            </div>
        </div>
    );
}
