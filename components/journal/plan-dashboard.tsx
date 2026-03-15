'use client';

import React from 'react';
import { CalendarDays, Trophy, BookOpen, Settings2, Zap, Target, Activity, ArrowUpRight, ArrowDownRight, ChevronRight, ChevronLeft, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatHoldingTime } from '@/lib/journal-engine';
import type { PlanMetrics } from '@/lib/journal-types';
import { CyberCard, GlowLine } from './cyber-elements';
import { PerformanceCalendar } from './performance-calendar';
import { PerformanceStreak } from './performance-streak';
import { DailyPerformanceHistory } from './daily-performance-history';
import { EquityChart } from './equity-chart';
import { OpenPositions } from '@/components/open-positions';
import { TradeAnalytics } from './trade-analytics';
import { DisciplineScore } from './discipline-score';
import { RuleViolations } from './rule-violations';

interface PlanDashboardProps {
    metrics: PlanMetrics;
    onEdit?: () => void;
    accountId?: string | null;
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: 'green' | 'red' | 'orange' }) {
    return (
        <div className="flex flex-col gap-0.5 p-3 md:p-4 rounded-2xl bg-black/40 border border-white/5">
            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{label}</span>
            <div className="flex items-baseline gap-1.5">
                <span className={cn(
                    "text-xl font-bold tracking-tight",
                    accent === 'green' ? 'text-green-400' :
                    accent === 'red' ? 'text-red-400' :
                    'text-white'
                )}>
                    {value}
                </span>
                {sub && <span className="text-[9px] text-white/20 font-medium">{sub}</span>}
            </div>
        </div>
    );
}

function MiniProgressBar({ percent, label, value, subValue, color = "white" }: { 
    percent: number, 
    label: string, 
    value: string, 
    subValue?: string,
    color?: "white" | "green" | "blue"
}) {
    const barColor = color === 'green' ? 'bg-green-400' : color === 'blue' ? 'bg-blue-400' : 'bg-white/40';
    const glowColor = color === 'green' ? 'shadow-[0_0_8px_rgba(74,222,128,0.4)]' : color === 'blue' ? 'shadow-[0_0_8px_rgba(96,165,250,0.4)]' : 'shadow-[0_0_8px_rgba(255,255,255,0.1)]';

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-baseline">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.15em]">{label}</span>
                    <span className="text-sm font-bold text-white tracking-tight">{value}</span>
                </div>
                <div className="text-right flex flex-col items-end gap-0.5">
                    <span className="text-lg font-mono font-bold text-white/80 leading-none">{Math.round(percent)}%</span>
                    {subValue && <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{subValue}</span>}
                </div>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                <div 
                    className={cn(
                        "h-full rounded-full transition-all duration-1000 ease-out relative",
                        barColor,
                        glowColor
                    )} 
                    style={{ width: `${Math.min(100, percent)}%` }} 
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                </div>
            </div>
        </div>
    );
}

export function PlanDashboard({ metrics, onEdit, accountId }: PlanDashboardProps) {
    const { plan, totalPnl, pnlPercent, winRate, totalTrades, currentBalance, profitFactor, maxDrawdown, allPositions } = metrics;
    const isProfit = totalPnl >= 0;

    const [historyPage, setHistoryPage] = React.useState(0);

    const goalTarget = plan.overallProfitTarget > 0 
        ? plan.overallProfitTarget 
        : (plan.dailyProfitTarget * metrics.totalDays);

    const profitProgressPercent = goalTarget > 0
        ? Math.max(0, (totalPnl / goalTarget) * 100)
        : 0;

    const timeProgressPercent = Math.min(100, (metrics.daysCompleted / metrics.totalDays) * 100);

    return (
        <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header section */}
            <div className="pb-4 md:pb-8 border-b border-white/5 space-y-3 md:space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-4">
                        <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white">{plan.name}</h2>
                        <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white/40">
                            Live
                        </div>
                    </div>
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="p-1.5 rounded-xl text-white/20 hover:text-white hover:bg-white/5 transition-all"
                        >
                            <Settings2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                
                <div className="flex items-center gap-3 text-[9px] font-bold text-white/20 uppercase tracking-widest">
                    <span>{new Date(plan.startDate).toLocaleDateString()}</span>
                    <ChevronRight className="w-2.5 h-2.5" />
                    <span>{new Date(plan.endDate).toLocaleDateString()}</span>
                </div>
            </div>

            {/* Performance Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard 
                    label="Current Balance" 
                    value={`$${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                    accent={currentBalance >= plan.startingBalance ? 'green' : 'red'}
                />
                <StatCard 
                    label="Total PnL" 
                    value={`${isProfit ? '+' : ''}$${Math.abs(totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                    sub={`${isProfit ? '+' : ''}${pnlPercent.toFixed(2)}%`}
                    accent={isProfit ? 'green' : 'red'}
                />
                <StatCard 
                    label="Profit Factor" 
                    value={profitFactor.toFixed(2)} 
                />
                <StatCard 
                    label="Drawdown" 
                    value={`${maxDrawdown.toFixed(1)}%`} 
                    accent={maxDrawdown > 5 ? 'red' : undefined}
                />
            </div>

            {/* Progress Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 bg-black/20 border border-white/5 rounded-3xl p-8 md:p-10">
                <MiniProgressBar
                    percent={timeProgressPercent}
                    label="Current Cycle"
                    value={`${metrics.daysCompleted} / ${metrics.totalDays} Days`}
                    subValue="Time Elapsed"
                    color="blue"
                />
                <MiniProgressBar
                    percent={profitProgressPercent}
                    label="Goal Progress"
                    value={`$${totalPnl.toFixed(0)} / $${goalTarget.toFixed(0)}`}
                    subValue={plan.overallProfitTarget > 0 ? "Fixed Target" : "Aggregated Target"}
                    color={totalPnl > 0 ? "green" : "white"}
                />
            </div>

            {/* Balance Chart */}
            <div className="bg-black/20 border border-white/5 rounded-3xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">Account Balance</h3>
                        <p className="text-xl font-bold text-white tracking-tight">${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white/40">
                        Equity Curve
                    </div>
                </div>
                <EquityChart data={metrics.equityCurve} />
            </div>

            {/* Active Positions Section */}
            <div className="space-y-6">
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Active Positions</h3>
                <OpenPositions accountId={accountId} />
            </div>

            {/* Streak & Calendar Section */}
            <div className="space-y-12">
                <PerformanceStreak days={metrics.dailyPerformance} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <PerformanceCalendar days={metrics.dailyPerformance} />
                    <DailyPerformanceHistory days={metrics.dailyPerformance} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                    <DisciplineScore score={metrics.disciplineScore} />
                    <RuleViolations violations={metrics.violations} />
                </div>
            </div>

            {/* Trade Analytics Section */}
            <div className="space-y-6">
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Asset Analytics</h3>
                <TradeAnalytics analytics={metrics.symbolAnalytics} />
            </div>

            {/* Detailed States */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                <div className="p-3 md:p-4 rounded-xl border border-white/5 space-y-0.5 md:space-y-1">
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Win Rate</p>
                    <p className="text-[13px] font-bold text-white tracking-tight tabular-nums">{winRate.toFixed(1)}%</p>
                </div>
                <div className="p-3 md:p-4 rounded-xl border border-white/5 space-y-0.5 md:space-y-1">
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Avg Win</p>
                    <p className="text-[13px] font-bold text-green-400">+${metrics.avgWin.toFixed(0)}</p>
                </div>
                <div className="p-3 md:p-4 rounded-xl border border-white/5 space-y-0.5 md:space-y-1">
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Avg Loss</p>
                    <p className="text-[13px] font-bold text-red-400">-${Math.abs(metrics.avgLoss).toFixed(0)}</p>
                </div>
                <div className="p-3 md:p-4 rounded-xl border border-white/5 space-y-0.5 md:space-y-1">
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Total Trades</p>
                    <p className="text-[13px] font-bold text-white/60">{totalTrades}</p>
                </div>
                <div className="p-3 md:p-4 rounded-xl border border-white/5 space-y-0.5 md:space-y-1">
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Avg Time</p>
                    <p className="text-[13px] font-bold text-white/60">{formatHoldingTime(metrics.avgHoldingTimeMs)}</p>
                </div>
                <div className="p-3 md:p-4 rounded-xl border border-white/5 space-y-0.5 md:space-y-1">
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Violations</p>
                    <p className={cn("text-[13px] font-bold", metrics.violations.length > 0 ? "text-red-400" : "text-white/20")}>
                        {metrics.violations.length}
                    </p>
                </div>
            </div>

            {/* Position History */}
            <div className="space-y-4 md:space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Position History</h3>
                    <div className="flex gap-2">
                        <button 
                            disabled={historyPage === 0}
                            onClick={() => setHistoryPage(p => Math.max(0, p - 1))}
                            className="p-1 px-2 rounded-lg border border-white/5 hover:bg-white/5 disabled:opacity-20 transition-all"
                        >
                            <ChevronLeft className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button 
                            disabled={(historyPage + 1) * 5 >= allPositions.length}
                            onClick={() => setHistoryPage(p => p + 1)}
                            className="p-1 px-2 rounded-lg border border-white/5 hover:bg-white/5 disabled:opacity-20 transition-all"
                        >
                            <ChevronRight className="w-3.5 h-3.5 text-white" />
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.01]">
                    <table className="w-full text-left text-[11px]">
                        <thead>
                            <tr className="border-b border-white/5 text-white/20 uppercase font-bold tracking-widest">
                                <th className="px-6 py-4">Symbol</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Size</th>
                                <th className="px-6 py-4 text-right">Result</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {allPositions.slice(historyPage * 5, (historyPage + 1) * 5).map((pos, i) => (
                                <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 md:px-6 py-3 md:py-4">
                                        <div className="font-bold text-white text-[11px] md:text-xs">{pos.pairName}</div>
                                        <div className="text-[9px] text-white/20">{new Date(pos.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "font-bold",
                                            pos.positionSideLabel === 'LONG' ? "text-green-500/60" : "text-red-500/60"
                                        )}>
                                            {pos.positionSideLabel}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-white/40">{pos.closedSize}</td>
                                    <td className={cn(
                                        "px-6 py-4 text-right font-bold",
                                        pos.realizedPnlValue > 0 ? "text-green-400" : "text-red-400"
                                    )}>
                                        {pos.realizedPnlValue > 0 ? '+' : ''}{pos.realizedPnlValue.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {allPositions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-white/10 uppercase font-bold tracking-widest">
                                        No executions logged
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-center mt-2">
                    <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest">
                        Page {historyPage + 1} of {Math.ceil(allPositions.length / 5) || 1}
                    </p>
                </div>
            </div>
        </div>
    );
}
