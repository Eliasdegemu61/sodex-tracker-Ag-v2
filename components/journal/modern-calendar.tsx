'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernCalendarProps {
    selectedDate: string; // YYYY-MM-DD
    onSelect: (date: string) => void;
    onClose: () => void;
}

export function ModernCalendar({ selectedDate, onSelect, onClose }: ModernCalendarProps) {
    const selected = new Date(selectedDate);
    const [viewDate, setViewDate] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const prevailingDays = firstDayOfMonth(year, month);
    const totalDays = daysInMonth(year, month);

    const prevMonthDays = daysInMonth(year, month - 1);

    const calendarDays: { day: number; currentMonth: boolean; date: string }[] = [];

    // Prev month days
    for (let i = prevailingDays - 1; i >= 0; i--) {
        const d = prevMonthDays - i;
        const m = month === 0 ? 11 : month - 1;
        const y = month === 0 ? year - 1 : year;
        calendarDays.push({
            day: d,
            currentMonth: false,
            date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
        calendarDays.push({
            day: d,
            currentMonth: true,
            date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        });
    }

    // Next month days to fill grid (7x6 usually)
    const remaining = 42 - calendarDays.length;
    for (let d = 1; d <= remaining; d++) {
        const m = month === 11 ? 0 : month + 1;
        const y = month === 11 ? year + 1 : year;
        calendarDays.push({
            day: d,
            currentMonth: false,
            date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        });
    }

    const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
    const prevMonth = () => setViewDate(new Date(year, month - 1, 1));

    return (
        <div className="p-4 bg-card border border-border/20 shadow-2xl rounded-[2rem] w-[280px] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-2">
                <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-secondary/20 rounded-xl text-muted-foreground transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[12px] font-black text-foreground uppercase tracking-widest">
                    {monthNames[month]} {year}
                </span>
                <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-secondary/20 rounded-xl text-muted-foreground transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                    <span key={d} className="text-[9px] font-bold text-muted-foreground/30 text-center uppercase py-2">
                        {d}
                    </span>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((item, idx) => {
                    const isSelected = item.date === selectedDate;
                    const isToday = item.date === new Date().toISOString().slice(0, 10);

                    return (
                        <button
                            key={idx}
                            onClick={() => {
                                onSelect(item.date);
                                onClose();
                            }}
                            className={cn(
                                "h-9 w-9 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center",
                                !item.currentMonth && "text-muted-foreground/10",
                                item.currentMonth && !isSelected && "text-muted-foreground/60 hover:bg-secondary/30",
                                isSelected && "bg-foreground text-background shadow-lg shadow-foreground/10 scale-110 z-10",
                                isToday && !isSelected && "text-orange-500 border border-orange-500/20"
                            )}
                        >
                            {item.day}
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-border/10 flex justify-center">
                <button
                    onClick={onClose}
                    className="text-[10px] font-black text-muted-foreground/30 hover:text-orange-500 uppercase tracking-[0.2em] transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
