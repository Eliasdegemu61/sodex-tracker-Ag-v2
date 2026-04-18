'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { usePortfolio } from '@/context/portfolio-context';
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
          { label: 'Trades', value: monthStats.totalTrades, color: 'text-foreground' },
          { label: 'Green Days', value: monthStats.winDays, color: 'text-green-400' },
          { label: 'Red Days', value: monthStats.loseDays, color: 'text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-1 rounded-2xl border border-black/8 bg-white p-4 text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
            <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">{stat.label}</span>
            <span className={`text-base font-semibold ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <Card className="overflow-hidden rounded-[2rem] border border-black/8 bg-white p-4 text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-6">
        {/* Header Navigation - Modern Layout */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col">
            <h3 className="select-none text-xl font-semibold tracking-[-0.04em] text-foreground sm:text-2xl">
              {currentDate.toLocaleDateString('en-US', { month: 'long' })}
            </h3>
            <span className="text-xs font-medium text-black/45 dark:text-white/45">{currentDate.getFullYear()}</span>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-black/[0.03] p-1 dark:border-white/10 dark:bg-white/[0.03]">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="rounded-xl p-2 text-black/55 transition-all hover:bg-black/[0.06] hover:text-black active:scale-90 dark:text-white/55 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="mx-1 h-4 w-px bg-black/10 dark:bg-white/10" />
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="rounded-xl p-2 text-black/55 transition-all hover:bg-black/[0.06] hover:text-black active:scale-90 dark:text-white/55 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <div className="min-w-[560px] sm:min-w-0">
            <div className="mb-2 grid grid-cols-7 gap-2">
              {weekDays.map((d) => (
                <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
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
              cellBg = 'bg-black/[0.015] border border-black/6 opacity-35 dark:bg-white/[0.015] dark:border-white/6';
              numColor = 'text-black/20 dark:text-white/20';
            } else if (hasActivity) {
              cellBg = isPositive
                ? 'border border-green-500/22 bg-green-500/10 hover:border-green-500/45'
                : 'border border-red-500/22 bg-red-500/10 hover:border-red-500/45';
              numColor = 'text-foreground';
            } else if (isToday) {
              cellBg = 'border border-black/20 bg-black/[0.04] dark:border-white/20 dark:bg-white/[0.04]';
              numColor = 'text-foreground font-semibold';
            } else {
              cellBg = 'border border-black/8 bg-black/[0.02] hover:bg-black/[0.05] dark:border-white/8 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]';
              numColor = 'text-black/45 dark:text-white/45';
            }

            return (
              <div
                key={idx}
                onClick={() => hasActivity && isCurrentMonth && setSelectedDay(dayTrades)}
                className={`relative flex aspect-[1/1.18] flex-col justify-between rounded-xl p-2 transition-all duration-200 sm:rounded-2xl sm:aspect-[3/2.2] sm:p-2
                  ${cellBg} ${hasActivity && isCurrentMonth ? 'cursor-pointer scale-[1.02] shadow-sm' : 'cursor-default'}`}
              >
                {/* Day number — top left */}
                <span className={`text-[13px] font-bold leading-none sm:text-[13px] ${numColor}`}>
                  {date.getDate()}
                </span>
                {/* Simplified PnL info — bottom right */}
                {hasActivity && isCurrentMonth && dayTrades && (
                  <div className="flex flex-col items-end text-right mt-auto gap-0.5 min-w-0 overflow-hidden">
                    <span className={cn(
                      "w-full truncate rounded-full px-1.5 py-1 text-right font-bold leading-tight tabular-nums",
                      (Math.abs(dayTrades.pnl).toFixed(2).length > 8) 
                        ? "text-[9px] sm:text-[9px]" 
                        : "text-[10px] sm:text-[10px]",
                      isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    )}>
                      {isPositive ? '+' : '-'}${Math.abs(dayTrades.pnl).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Trade Details Popup */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-w-lg overflow-hidden border-black/10 bg-white p-0 text-foreground shadow-2xl animate-in zoom-in-95 duration-200 dark:border-white/10 dark:bg-[#050505] dark:text-white" showCloseButton={false}>
          {selectedDay && (
            <>
              <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b border-black/10 bg-black/[0.03] p-4 text-left dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex flex-col">
                  <DialogTitle className="text-lg font-semibold text-foreground">
                    Trades for {selectedDay.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </DialogTitle>
                  <div className={`text-sm font-semibold ${selectedDay.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    Daily PnL: {selectedDay.pnl >= 0 ? '+' : '-'}${Math.abs(selectedDay.pnl).toFixed(2)}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="rounded-full p-2 transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.06]"
                >
                  <X className="h-5 w-5 text-black/55 dark:text-white/55" />
                </button>
              </DialogHeader>
              
              <div className="max-h-[60vh] overflow-y-auto p-2">
                <div className="space-y-2">
                  {selectedDay.trades.map((trade, i) => (
                    <div key={i} className="flex flex-col gap-3 rounded-xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-base font-semibold text-foreground">{trade.pairName}</span>
                          <div className="flex gap-2 items-center">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${trade.positionSideLabel === 'LONG' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                              {trade.positionSideLabel} {trade.leverage}x
                            </span>
                            <span className="text-[10px] uppercase text-black/35 dark:text-white/35">{new Date(trade.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <div className={`text-base font-semibold ${trade.realizedPnlValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.realizedPnlValue >= 0 ? '+' : '-'}${Math.abs(trade.realizedPnlValue).toFixed(2)}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 border-t border-black/8 pt-3 dark:border-white/8">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-semibold uppercase text-black/35 dark:text-white/35">Entry</span>
                          <span className="text-sm font-medium text-foreground">${parseFloat(trade.avg_entry_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-semibold uppercase text-black/35 dark:text-white/35">Exit</span>
                          <span className="text-sm font-medium text-foreground">${parseFloat(trade.avg_close_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-semibold uppercase text-black/35 dark:text-white/35">Size</span>
                          <span className="text-sm font-medium text-foreground">{trade.closedSize.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end border-t border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
                <button
                  onClick={() => setSelectedDay(null)}
                  className="rounded-xl bg-white px-6 py-2 font-semibold text-black transition-opacity hover:opacity-90"
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
