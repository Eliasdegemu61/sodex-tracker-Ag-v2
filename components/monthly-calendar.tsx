'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { usePortfolio } from '@/context/portfolio-context';
import { useTheme } from '@/app/providers';
import { cn } from '@/lib/utils';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DayTrades {
  date: Date;
  pnl: number;
  trades: any[];
}

export function MonthlyCalendar() {
  const { positions } = usePortfolio();
  const { theme } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayTrades | null>(null);

  const dayData = useMemo(() => {
    if (!positions || positions.length === 0) {
      return new Map<string, DayTrades>();
    }
    const dateMap = new Map<string, DayTrades>();
    positions.forEach((position) => {
      const posDate = new Date(position.created_at);
      const year = posDate.getFullYear();
      const month = String(posDate.getMonth() + 1).padStart(2, '0');
      const day = String(posDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      const existing = dateMap.get(dateKey);
      const pnl = position.realizedPnlValue || 0;
      if (existing) {
        existing.pnl += pnl;
        existing.trades.push(position);
      } else {
        dateMap.set(dateKey, { date: posDate, pnl, trades: [position] });
      }
    });
    return dateMap;
  }, [positions]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.unshift({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Next month filler days
    const totalSlots = days.length > 35 ? 42 : 35;
    let nextDay = 1;
    while (days.length < totalSlots) {
      days.push({ date: new Date(year, month + 1, nextDay++), isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  const getDayPnL = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return dayData.get(`${year}-${month}-${day}`) || null;
  };

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const monthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthKeyPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    let totalPnL = 0, totalTrades = 0, winDays = 0, loseDays = 0;

    // Only iterate once through the map instead of daily calculations
    dayData.forEach((d, key) => {
      if (key.startsWith(monthKeyPrefix)) {
        totalPnL += d.pnl;
        totalTrades += d.trades.length;
        if (d.pnl > 0) winDays++;
        if (d.pnl < 0) loseDays++;
      }
    });
    return { totalPnL, totalTrades, winDays, loseDays };
  }, [dayData, currentDate]);

  return (
    <div className="w-full space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Net Return', value: `${monthStats.totalPnL >= 0 ? '+' : ''}$${Math.abs(monthStats.totalPnL).toFixed(0)}`, color: monthStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'Trades', value: monthStats.totalTrades, color: 'text-white/80' },
          { label: 'Green Days', value: monthStats.winDays, color: 'text-green-400' },
          { label: 'Red Days', value: monthStats.loseDays, color: 'text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-card/95 shadow-sm shadow-sm border border-border/20 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-widest">{stat.label}</span>
            <span className={`text-base font-bold ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <Card className="p-4 sm:p-6 bg-card/95 shadow-sm border border-border/20 rounded-[2.5rem] shadow-xl overflow-hidden">
        {/* Header Navigation - Modern Layout */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight select-none">
              {currentDate.toLocaleDateString('en-US', { month: 'long' })}
            </h3>
            <span className="text-xs font-medium text-muted-foreground/60">{currentDate.getFullYear()}</span>
          </div>

          <div className="flex items-center gap-2 bg-secondary/10 p-1 rounded-2xl border border-border/10">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-px h-4 bg-border/20 mx-1" />
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarDays.map((dayObj, idx) => {
            const { date, isCurrentMonth } = dayObj;
            const dayTrades = isCurrentMonth ? getDayPnL(date) : null;
            const hasActivity = !!dayTrades && dayTrades.pnl !== 0;
            const isPositive = hasActivity && (dayTrades?.pnl ?? 0) > 0;

            const now = new Date();
            const isToday =
              isCurrentMonth &&
              date.getDate() === now.getDate() &&
              date.getMonth() === now.getMonth() &&
              date.getFullYear() === now.getFullYear();

            let cellBg = '';
            let numColor = '';

            if (!isCurrentMonth) {
              cellBg = 'bg-secondary/10 opacity-30';
              numColor = 'text-muted-foreground/30';
            } else if (hasActivity) {
              cellBg = isPositive
                ? 'bg-green-500/10 border border-green-500/20 hover:border-green-500/40 text-green-600 dark:text-green-400'
                : 'bg-red-500/10 border border-red-500/20 hover:border-red-500/40 text-red-600 dark:text-red-400';
              numColor = 'text-foreground/80';
            } else if (isToday) {
              cellBg = 'bg-accent/5 border border-accent/20';
              numColor = 'text-foreground font-bold';
            } else {
              cellBg = 'bg-secondary/5 border border-border/10 hover:bg-secondary/10';
              numColor = 'text-muted-foreground/50';
            }

            return (
              <div
                key={idx}
                onClick={() => hasActivity && isCurrentMonth && setSelectedDay(dayTrades)}
                className={`relative rounded-xl sm:rounded-2xl transition-all duration-200 flex flex-col justify-between p-1.5 sm:p-2 
                  aspect-[3/2.4] sm:aspect-[3/2.2]
                  ${cellBg} ${hasActivity && isCurrentMonth ? 'cursor-pointer scale-[1.02] shadow-sm' : 'cursor-default'}`}
              >
                {/* Day number — top left */}
                <span className={`text-[10px] sm:text-[13px] font-bold leading-none ${numColor}`}>
                  {date.getDate()}
                </span>
                {/* Simplified PnL info — bottom right */}
                {hasActivity && isCurrentMonth && dayTrades && (
                  <div className="flex flex-col items-end text-right mt-auto gap-0.5 min-w-0 overflow-hidden">
                    <span className={cn(
                      "font-bold leading-tight tabular-nums truncate w-full",
                      (Math.abs(dayTrades.pnl).toFixed(2).length > 8) 
                        ? "text-[6px] sm:text-[9px]" 
                        : "text-[7px] sm:text-[10px]",
                      isPositive ? 'text-green-500' : 'text-red-500'
                    )}>
                      {isPositive ? '+' : '-'}${Math.abs(dayTrades.pnl).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Trade Details Popup */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-w-lg p-0 bg-card/90 border-border/20 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" showCloseButton={false}>
          {selectedDay && (
            <>
              <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between bg-secondary/10 space-y-0 text-left">
                <div className="flex flex-col">
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Trades for {selectedDay.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </DialogTitle>
                  <div className={`text-sm font-bold ${selectedDay.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    Daily PnL: {selectedDay.pnl >= 0 ? '+' : '-'}${Math.abs(selectedDay.pnl).toFixed(2)}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 rounded-full hover:bg-secondary/40 transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </DialogHeader>
              
              <div className="max-h-[60vh] overflow-y-auto p-2">
                <div className="space-y-2">
                  {selectedDay.trades.map((trade, i) => (
                    <div key={i} className="flex flex-col p-4 bg-secondary/5 rounded-xl border border-border/50 gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-base font-bold text-foreground">{trade.pairName}</span>
                          <div className="flex gap-2 items-center">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${trade.positionSideLabel === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                              {trade.positionSideLabel} {trade.leverage}x
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase">{new Date(trade.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <div className={`text-base font-bold ${trade.realizedPnlValue >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {trade.realizedPnlValue >= 0 ? '+' : '-'}${Math.abs(trade.realizedPnlValue).toFixed(2)}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 border-t border-border/30 pt-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Entry</span>
                          <span className="text-sm font-medium">${parseFloat(trade.avg_entry_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Exit</span>
                          <span className="text-sm font-medium">${parseFloat(trade.avg_close_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Size</span>
                          <span className="text-sm font-medium">{trade.closedSize.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-4 bg-secondary/5 border-t border-border flex justify-end">
                <button
                  onClick={() => setSelectedDay(null)}
                  className="px-6 py-2 bg-foreground text-background font-bold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
