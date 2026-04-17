'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { DayPerformance } from '@/lib/journal-types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PerformanceCalendarProps {
    days: DayPerformance[];
    selectedDate: string;
    onDateSelect: (date: string) => void;
}

export function PerformanceCalendar({ days, selectedDate, onDateSelect }: PerformanceCalendarProps) {
    const [viewDate, setViewDate] = React.useState(new Date());

    const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    
    // Group days by date string for easy lookup
    const dayMap = React.useMemo(() => {
        const map = new Map<string, DayPerformance>();
        days.forEach(d => map.set(d.date, d));
        return map;
    }, [days]);

    // Calculate monthly summary
    const monthlyStats = React.useMemo(() => {
        const currentYear = viewDate.getFullYear();
        const currentMonth = viewDate.getMonth();
        
        let totalPnl = 0;
        let activeDays = 0;
        let wins = 0;
        
        days.forEach(d => {
            const date = new Date(d.date);
            if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
                totalPnl += d.dailyPnl;
                if (d.trades > 0) {
                    activeDays++;
                    if (d.dailyPnl > 0) wins++;
                }
            }
        });
        
        return {
            totalPnl,
            activeDays,
            winRate: activeDays > 0 ? (wins / activeDays) * 100 : 0
        };
    }, [days, viewDate]);

    const title = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Calendar grid calculation
    const startDayOfWeek = monthStart.getDay(); // 0 is Sunday
    const totalDays = monthEnd.getDate();
    
    // Adjust for Monday start
    const adjustedStart = (startDayOfWeek + 6) % 7;
    
    const daysArray = Array.from({ length: 42 }, (_, i) => {
        const dayNumber = i - adjustedStart + 1;
        if (dayNumber <= 0 || dayNumber > totalDays) return null;
        
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNumber);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return {
            dateStr,
            dayNumber,
            data: dayMap.get(dateStr)
        };
    });

    const changeMonth = (offset: number) => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">{title}</h3>
                    <div className="flex gap-1.5 md:gap-2">
                        <button 
                            onClick={() => changeMonth(-1)}
                            className="p-1 px-1.5 rounded-lg border border-border/10 bg-secondary/5 hover:bg-secondary/10 transition-colors"
                        >
                            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/40" />
                        </button>
                        <button 
                            onClick={() => changeMonth(1)}
                            className="p-1 px-1.5 rounded-lg border border-border/10 bg-secondary/5 hover:bg-secondary/10 transition-colors"
                        >
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-0.5 px-2">
                        <span className="text-[8px] font-bold text-muted-foreground/20 uppercase tracking-widest">Monthly Net</span>
                        <span className={cn(
                            "text-sm font-bold tabular-nums tracking-tight",
                            monthlyStats.totalPnl >= 0 ? "text-emerald-500" : "text-red-500"
                        )}>
                            {monthlyStats.totalPnl >= 0 ? '+' : ''}${Math.abs(monthlyStats.totalPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5 px-2">
                        <span className="text-[8px] font-bold text-muted-foreground/20 uppercase tracking-widest">Active Days</span>
                        <span className="text-sm font-bold text-foreground/80">{monthlyStats.activeDays}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 px-2">
                        <span className="text-[8px] font-bold text-muted-foreground/20 uppercase tracking-widest">Accuracy</span>
                        <span className="text-sm font-bold text-foreground/80">{monthlyStats.winRate.toFixed(1)}%</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 md:gap-1.5">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                    <div key={i} className="text-center py-1">
                        <span className="text-[8px] font-bold text-muted-foreground/30 uppercase">{day}</span>
                    </div>
                ))}
                
                {daysArray.map((day, i) => {
                    if (!day) return <div key={i} />;
                    
                    const isSelected = day.dateStr === selectedDate;
                    const isProfit = day.data && day.data.dailyPnl > 0;
                    const isLoss = day.data && day.data.dailyPnl < 0;
                    
                    const maxMagnitude = 500;
                    const magnitude = Math.min(1, Math.abs(day.data?.dailyPnl || 0) / maxMagnitude);
                    const shadingOpacity = day.data && day.data.trades > 0 ? (0.05 + magnitude * 0.15) : 0;

                    return (
                        <div 
                            key={i}
                            className={cn(
                                "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-300 border",
                                isProfit ? "bg-emerald-500/10 border-emerald-500/20" : 
                                isLoss ? "bg-red-500/10 border-red-500/20" : 
                                "bg-black/40 border-white/5 opacity-40"
                            )}
                        >
                            <span className="text-[10px] font-bold tabular-nums text-foreground/70">
                                {day.dayNumber}
                            </span>
                            
                            {day.data && day.data.trades > 0 && (
                                <span className={cn(
                                    "text-[8px] font-bold tabular-nums mt-0.5",
                                    isProfit ? "text-emerald-500" : "text-red-500"
                                )}>
                                    {isProfit ? '+' : ''}{Math.round(day.data.dailyPnl)}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center gap-4 px-2 justify-center pt-2 border-t border-border/5">
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
                    <span className="text-[8px] font-bold text-muted-foreground/20 uppercase tracking-widest">Profit</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500/20 border border-red-500/30" />
                    <span className="text-[8px] font-bold text-muted-foreground/20 uppercase tracking-widest">Loss</span>
                </div>
            </div>
        </div>
    );
}
