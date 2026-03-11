'use client';

import { BookOpen, Trash2, TrendingUp, TrendingDown, CalendarDays, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { TradingPlan } from '@/lib/journal-types';

interface PlanListProps {
    plans: TradingPlan[];
    onView: (plan: TradingPlan) => void;
    onDelete: (id: string) => void;
    onCreateNew: () => void;
}

function planDateRange(plan: TradingPlan): string {
    const fmt = (d: string) =>
        new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmt(plan.startDate)} — ${fmt(plan.endDate)}`;
}

function daysBetween(a: string, b: string): number {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000) + 1;
}

export function PlanList({ plans, onView, onDelete, onCreateNew }: PlanListProps) {
    if (plans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-5">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                    <BookOpen className="w-7 h-7 text-orange-400" />
                </div>
                <div className="text-center">
                    <p className="text-base font-bold text-foreground/80">No trading plans yet</p>
                    <p className="text-sm text-muted-foreground/40 mt-1">Create your first plan to start tracking your progress</p>
                </div>
                <button
                    onClick={onCreateNew}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-orange-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Create First Plan
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* New plan card */}
            <button
                onClick={onCreateNew}
                className="group h-[180px] flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border/20 hover:border-orange-500/40 hover:bg-orange-500/[0.03] transition-all"
            >
                <div className="w-10 h-10 rounded-xl bg-secondary/10 group-hover:bg-orange-500/10 flex items-center justify-center transition-colors">
                    <Plus className="w-5 h-5 text-muted-foreground/40 group-hover:text-orange-400 transition-colors" />
                </div>
                <span className="text-sm font-medium text-muted-foreground/40 group-hover:text-orange-400 transition-colors">
                    New Plan
                </span>
            </button>

            {plans.map((plan) => {
                const totalDays = daysBetween(plan.startDate, plan.endDate);
                const created = new Date(plan.createdAt).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric'
                });
                return (
                    <Card
                        key={plan.id}
                        className="p-5 bg-card/95 border border-border/20 rounded-3xl flex flex-col gap-4 hover:border-orange-500/20 transition-all group"
                    >
                        {/* Top */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-foreground truncate">{plan.name}</h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <CalendarDays className="w-3 h-3 text-muted-foreground/30" />
                                    <span className="text-[10px] text-muted-foreground/40">{planDateRange(plan)}</span>
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(plan.id); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/20 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Balance */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">Starting</span>
                                <span className="text-sm font-bold text-foreground">${plan.startingBalance.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">Duration</span>
                                <span className="text-sm font-bold text-foreground">{totalDays} days</span>
                            </div>
                        </div>

                        {/* Rules summary */}
                        <div className="flex flex-wrap gap-1.5">
                            {plan.dailyProfitTarget > 0 && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-green-500/10 text-green-400 text-[9px] font-bold">
                                    <TrendingUp className="w-2.5 h-2.5" />
                                    +${plan.dailyProfitTarget}/day
                                </span>
                            )}
                            {plan.dailyLossLimit > 0 && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/10 text-red-400 text-[9px] font-bold">
                                    <TrendingDown className="w-2.5 h-2.5" />
                                    -${plan.dailyLossLimit} limit
                                </span>
                            )}
                            {plan.maxTradesPerDay > 0 && (
                                <span className="px-2 py-0.5 rounded-lg bg-secondary/20 text-muted-foreground/50 text-[9px] font-bold">
                                    {plan.maxTradesPerDay} trades/day
                                </span>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/10">
                            <span className="text-[10px] text-muted-foreground/30">Created {created}</span>
                            <button
                                onClick={() => onView(plan)}
                                className="px-4 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white text-[11px] font-bold transition-all"
                            >
                                View Dashboard
                            </button>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
