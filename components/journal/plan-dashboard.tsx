'use client';

import React from 'react';
import { CalendarDays, Trophy, BookOpen, Settings2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatHoldingTime } from '@/lib/journal-engine';
import type { PlanMetrics } from '@/lib/journal-types';

interface PlanDashboardProps {
    metrics: PlanMetrics;
    onEdit?: () => void;
    accountId?: string | null;
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: 'green' | 'red' | 'orange' }) {
    const accentClass =
        accent === 'green' ? 'text-green-600 dark:text-green-400' :
            accent === 'red' ? 'text-red-600 dark:text-red-400' :
                accent === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                    'text-foreground';

    return (
        <div className="flex flex-col gap-1 p-4 rounded-2xl bg-secondary/30 dark:bg-secondary/10 border border-border/10">
            <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">{label}</span>
            <span className={`text-xl font-black ${accentClass}`}>{value}</span>
            {sub && <span className="text-[10px] text-muted-foreground/40">{sub}</span>}
        </div>
    );
}

function CreativeProgressBar({ percent, label, sub }: { percent: number, label: string, sub: string }) {
    const segments = 10;
    const activeSegments = Math.round((percent / 100) * segments);

    return (
        <div className="w-full">
            <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{label}</span>
                <span className="text-[11px] font-black text-orange-500">{sub}</span>
            </div>
            <div className="flex gap-1 h-2 w-full">
                {Array.from({ length: segments }).map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex-1 rounded-sm transition-all duration-500",
                            i < activeSegments
                                ? "bg-gradient-to-t from-orange-600 to-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                                : "bg-secondary/20 dark:bg-secondary/10"
                        )}
                    />
                ))}
            </div>
            <div className="flex justify-between mt-1 text-[8px] font-bold text-muted-foreground/20 uppercase tracking-tighter">
                <span>START</span>
                <span>TARGET REACHED</span>
            </div>
        </div>
    );
}

export function PlanDashboard({ metrics, onEdit, accountId }: PlanDashboardProps) {
    const { plan, totalPnl, pnlPercent, winRate, totalTrades, currentBalance } = metrics;
    const isProfit = totalPnl >= 0;

    const profitProgressPercent = plan.dailyProfitTarget > 0
        ? Math.min(100, (totalPnl / (plan.dailyProfitTarget * metrics.totalDays)) * 100)
        : 0;

    const timeProgressPercent = Math.min(100, (metrics.daysCompleted / metrics.totalDays) * 100);

    return (
        <div className="space-y-6">
            {/* Plan Header */}
            <Card className="p-6 bg-card dark:bg-card/95 border border-border/20 shadow-xl rounded-[2.5rem] overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                    <BookOpen className="w-32 h-32 rotate-12" />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-black text-foreground tracking-tight">{plan.name}</h2>
                            <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-[9px] font-bold uppercase tracking-wider border border-orange-500/20">
                                Active Plan
                            </span>
                            {accountId && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[9px] font-bold uppercase tracking-wider border border-blue-500/20 flex items-center gap-1">
                                    <span className="opacity-50">ID:</span> {accountId}
                                </span>
                            )}
                            {onEdit && (
                                <button
                                    onClick={onEdit}
                                    className="p-1.5 rounded-lg bg-secondary/50 hover:bg-orange-500/20 hover:text-orange-500 text-muted-foreground/30 transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border border-transparent hover:border-orange-500/20"
                                >
                                    <Settings2 className="w-3.5 h-3.5" />
                                    Edit
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>{new Date(plan.startDate).toLocaleDateString()}</span>
                            <span className="opacity-30">—</span>
                            <span>{new Date(plan.endDate).toLocaleDateString()}</span>
                            <div className="ml-2 px-2 py-0.5 rounded-md bg-secondary text-foreground/60 font-medium">
                                Day {metrics.daysCompleted} of {metrics.totalDays}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">Discipline Score</span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 transition-all duration-1000"
                                        style={{ width: `${metrics.disciplineScore.overall}%` }}
                                    />
                                </div>
                                <span className="text-sm font-black text-foreground">{metrics.disciplineScore.overall}%</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                            <Trophy className="w-6 h-6 text-orange-500" />
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <CreativeProgressBar
                        percent={timeProgressPercent}
                        label="Time Elapsed"
                        sub={`${metrics.daysCompleted}/${metrics.totalDays} Days`}
                    />
                    <CreativeProgressBar
                        percent={profitProgressPercent}
                        label="Profit Progress"
                        sub={plan.dailyProfitTarget > 0 ? `${profitProgressPercent.toFixed(1)}%` : 'N/A'}
                    />
                </div>
            </Card>

            {/* Overview Stats */}
            <Card className="p-6 bg-card dark:bg-card/95 border border-border/20 shadow-lg rounded-[2.5rem]">
                <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-4">Plan Overview</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard
                        label="Starting"
                        value={`$${plan.startingBalance.toLocaleString()}`}
                    />
                    <StatCard
                        label="Current"
                        value={`$${currentBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                        accent={currentBalance >= plan.startingBalance ? 'green' : 'red'}
                    />
                    <StatCard
                        label="Total P&L"
                        value={`${isProfit ? '+' : ''}$${Math.abs(totalPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                        sub={`${isProfit ? '+' : ''}${pnlPercent.toFixed(2)}%`}
                        accent={isProfit ? 'green' : 'red'}
                    />
                    <StatCard label="Trades" value={String(totalTrades)} />
                    <StatCard
                        label="Win Rate"
                        value={`${winRate.toFixed(1)}%`}
                        accent={winRate >= 50 ? 'green' : 'red'}
                    />
                    <StatCard
                        label="Remaining"
                        value={String(metrics.daysRemaining)}
                        accent="orange"
                    />
                </div>
            </Card>

            {/* Performance Metrics */}
            <Card className="p-6 bg-card dark:bg-card/95 border border-border/20 shadow-lg rounded-[2.5rem]">
                <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-4">Detailed Performance</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard
                        label="Avg Win"
                        value={metrics.avgWin > 0 ? `+$${metrics.avgWin.toFixed(2)}` : '$0'}
                        accent="green"
                    />
                    <StatCard
                        label="Avg Loss"
                        value={metrics.avgLoss < 0 ? `-$${Math.abs(metrics.avgLoss).toFixed(2)}` : '$0'}
                        accent="red"
                    />
                    <StatCard
                        label="Best Trade"
                        value={metrics.largestWin > 0 ? `+$${metrics.largestWin.toFixed(2)}` : '$0'}
                        accent="green"
                    />
                    <StatCard
                        label="Worst Trade"
                        value={metrics.largestLoss < 0 ? `-$${Math.abs(metrics.largestLoss).toFixed(2)}` : '$0'}
                        accent="red"
                    />
                    <StatCard
                        label="Avg Hold"
                        value={formatHoldingTime(metrics.avgHoldingTimeMs)}
                    />
                    <StatCard
                        label="Violations"
                        value={String(metrics.violations.length)}
                        accent={metrics.violations.length > 0 ? 'red' : 'green'}
                    />
                </div>
            </Card>
        </div>
    );
}
