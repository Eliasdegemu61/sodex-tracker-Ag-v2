'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { DayPerformance } from '@/lib/journal-types';
import { ChevronLeft, ChevronRight, Activity, TrendingUp, TrendingDown, CheckCheck } from 'lucide-react';

interface PerformanceCalendarProps {
    days: DayPerformance[];
}

export function PerformanceCalendar({ days }: PerformanceCalendarProps) {
    const [viewDate, setViewDate] = React.useState(new Date());

    const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    
    // Group days by date string for easy lookup
    const dayMap = React.useMemo(() => {
        const map = new Map<string, DayPerformance>();
        days.forEach(d => map.set(d.date, d));
        return map;
    }, [days]);

    const title = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Calendar grid calculation
    const startDayOfWeek = monthStart.getDay(); // 0 is Sunday
    const totalDays = monthEnd.getDate();
    
    // Adjust for Monday start if preferred (as in reference image)
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
        const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
        setViewDate(next);
    };

    return (
        <div className="space-y-8">
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

            <div className="grid grid-cols-7 gap-1 md:gap-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                    <div key={i} className="text-center py-1">
                        <span className="text-[8px] font-bold text-muted-foreground/30 uppercase">{day}</span>
                    </div>
                ))}
                
                {daysArray.map((day, i) => {
                    if (!day) return <div key={i} />;
                    
                    const isProfit = day.data && day.data.dailyPnl > 0;
                    const isLoss = day.data && day.data.dailyPnl < 0;
                    const now = new Date();
                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const isToday = day.dateStr === todayStr;

                    return (
                        <div 
                            key={i} 
                            className={cn(
                                "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-300",
                                isToday ? "bg-white/10 border border-white/20" : "bg-black border border-white/5",
                                day.data && day.data.trades > 0 ? "hover:bg-white/5 cursor-pointer" : ""
                            )}
                        >
                            <span className={cn(
                                "text-[10px] font-bold tabular-nums",
                                isToday ? "text-white" : day.data && day.data.trades > 0 ? "text-white/60" : "text-white/10"
                            )}>
                                {day.dayNumber}
                            </span>
                            
                            {day.data && day.data.trades > 0 && (
                                <div className={cn(
                                    "absolute bottom-1.5 w-1 h-1 rounded-full",
                                    isProfit ? "bg-emerald-500" : 
                                    isLoss ? "bg-red-500" : 
                                    "bg-white/20"
                                )} />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center gap-4 px-2 justify-center">
                <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    <span className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest">Profit</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-red-500" />
                    <span className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest">Loss</span>
                </div>
            </div>
        </div>
    );
}
