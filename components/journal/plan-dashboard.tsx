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
import { DailyAnalysis } from './daily-analysis';

interface PlanDashboardProps {
    metrics: PlanMetrics;
    onEdit?: () => void;
    accountId?: string | null;
}

type DashboardTab = 'overview' | 'analytics' | 'history';

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: 'green' | 'red' | 'orange' }) {
    return (
        <div className="flex flex-col p-3 rounded-xl bg-secondary/5 border border-border/10">
            <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest mb-1">{label}</span>
            <div className="flex items-baseline justify-between">
                <span className={cn(
                    "text-xl font-bold tracking-tight",
                    accent === 'green' ? 'text-emerald-500' :
                    accent === 'red' ? 'text-red-500' :
                    'text-foreground'
                )}>
                    {value}
                </span>
                {sub && <span className="text-[10px] text-muted-foreground/30 font-bold tabular-nums">{sub}</span>}
            </div>
        </div>
    );
}

function GoalStat({ label, value, percent, color = "green" }: { percent: number, label: string, value: string, color?: "green" | "blue" }) {
    const barColor = color === 'green' ? 'bg-emerald-500' : 'bg-foreground';

    return (
        <div className="flex flex-col gap-3">
             <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">{label}</span>
                <span className="text-[11px] font-bold text-foreground tabular-nums">{value}</span>
            </div>
            <div className="h-1.5 w-full bg-secondary/10 rounded-full overflow-hidden">
                <div 
                    className={cn("h-full rounded-full transition-all duration-1000", barColor)} 
                    style={{ width: `${Math.min(100, percent)}%` }} 
                />
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-muted-foreground/30 uppercase">Progress</span>
                <span className={cn(color === 'green' ? 'text-emerald-500' : 'text-foreground')}>{Math.round(percent)}%</span>
            </div>
        </div>
    );
}

export function PlanDashboard({ metrics, onEdit, accountId }: PlanDashboardProps) {
    const { plan, totalPnl, pnlPercent, winRate, totalTrades, currentBalance, profitFactor, maxDrawdown, allPositions } = metrics;
    const isProfit = totalPnl >= 0;

    const [activeTab, setActiveTab] = React.useState<DashboardTab>('overview');
    const [historyPage, setHistoryPage] = React.useState(0);
    
    const availableDates = React.useMemo(() => {
        const dates = new Set<string>();
        metrics.dailyPerformance.forEach(d => dates.add(d.date));
        allPositions.forEach(p => {
            const date = new Date(p.created_at).toISOString().split('T')[0];
            dates.add(date);
        });
        return Array.from(dates).sort((a, b) => b.localeCompare(a));
    }, [metrics.dailyPerformance, allPositions]);

    const [selectedDate, setSelectedDate] = React.useState<string>(
        availableDates[0] || new Date().toISOString().split('T')[0]
    );

    const goalTarget = plan.overallProfitTarget > 0 
        ? plan.overallProfitTarget 
        : (plan.dailyProfitTarget * metrics.totalDays);

    const profitProgressPercent = goalTarget > 0
        ? Math.max(0, (totalPnl / goalTarget) * 100)
        : 0;

    const timeProgressPercent = Math.min(100, (metrics.daysCompleted / metrics.totalDays) * 100);

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
            {/* Header section - Extremely Compact */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/10">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">{plan.name}</h2>
                        {onEdit && (
                            <button onClick={onEdit} className="p-1 rounded-lg text-muted-foreground/20 hover:text-foreground hover:bg-secondary/10 transition-all">
                                <Settings2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.15em]">
                        <span>{new Date(plan.startDate).toLocaleDateString()}</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                        <span>{metrics.totalDays} Day Plan</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest mb-0.5">Balance</p>
                        <p className="text-xl font-bold tracking-tight text-foreground">${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>

            {/* Performance Grid - Compact 2x2 or 4x1 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard 
                    label="Current Balance" 
                    value={`$${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0 })}`} 
                    accent={currentBalance >= plan.startingBalance ? 'green' : 'red'}
                />
                <StatCard 
                    label="Total PnL" 
                    value={`${isProfit ? '+' : ''}$${Math.abs(totalPnl).toLocaleString(undefined, { minimumFractionDigits: 0 })}`} 
                    sub={`${isProfit ? '+' : ''}${pnlPercent.toFixed(1)}%`}
                    accent={isProfit ? 'green' : 'red'}
                />
                <StatCard label="Win Rate" value={`${winRate.toFixed(1)}%`} sub={`${totalTrades} trades`} />
                <StatCard label="Profit Factor" value={profitFactor.toFixed(2)} sub={`DD: ${maxDrawdown.toFixed(1)}%`} />
            </div>

            {/* Goal Row - Very Compact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary/5 border border-border/10 rounded-2xl p-4 sm:p-6">
                <GoalStat
                    percent={timeProgressPercent}
                    label="Cycle Progress"
                    value={`${metrics.daysCompleted} / ${metrics.totalDays} Days`}
                    color="blue"
                />
                <GoalStat
                    percent={profitProgressPercent}
                    label="Goal Progress"
                    value={`$${totalPnl.toFixed(0)} / $${goalTarget.toFixed(0)}`}
                    color={totalPnl > 0 ? "green" : "blue"}
                />
            </div>

            {/* View Tabs */}
            <div className="flex border-b border-border/10">
                {(['overview', 'analytics', 'history'] as DashboardTab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all",
                            activeTab === tab 
                                ? "border-foreground text-foreground" 
                                : "border-transparent text-muted-foreground/40 hover:text-foreground"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="bg-secondary/5 border border-border/10 rounded-2xl p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Equity Curve</h3>
                            <div className="text-[10px] font-bold text-muted-foreground/20 uppercase tracking-widest">Growth over time</div>
                        </div>
                        <EquityChart data={metrics.equityCurve} />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <PerformanceCalendar 
                            days={metrics.dailyPerformance} 
                            selectedDate={selectedDate}
                            onDateSelect={(date) => {
                                setSelectedDate(date);
                                setActiveTab('analytics');
                            }}
                        />
                        <PerformanceStreak days={metrics.dailyPerformance} />
                    </div>
                </div>
            )}

            {activeTab === 'analytics' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <DisciplineScore score={metrics.disciplineScore} />
                        <RuleViolations violations={metrics.violations} />
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Asset Analytics</h3>
                        <TradeAnalytics analytics={metrics.symbolAnalytics} />
                    </div>

                    <DailyAnalysis 
                        allPositions={allPositions} 
                        dailyPerformance={metrics.dailyPerformance} 
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                    />
                </div>
            )}

            {activeTab === 'history' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Active Positions</h3>
                        <OpenPositions accountId={accountId} />
                    </div>
                    
                    <DailyPerformanceHistory days={metrics.dailyPerformance} />


                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Execution Logs</h3>
                        <div className="flex gap-2">
                            <button 
                                disabled={historyPage === 0}
                                onClick={() => setHistoryPage(p => Math.max(0, p - 1))}
                                className="p-1 px-2 rounded-lg border border-border/10 bg-secondary/10 hover:bg-secondary/20 disabled:opacity-20 transition-all"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 text-foreground/60" />
                            </button>
                            <button 
                                disabled={(historyPage + 1) * 10 >= allPositions.length}
                                onClick={() => setHistoryPage(p => p + 1)}
                                className="p-1 px-2 rounded-lg border border-border/10 bg-secondary/10 hover:bg-secondary/20 disabled:opacity-20 transition-all"
                            >
                                <ChevronRight className="w-3.5 h-3.5 text-foreground/60" />
                            </button>
                        </div>
                    </div>
                <div className="overflow-x-auto rounded-2xl border border-border/10 bg-secondary/5 backdrop-blur-md">
                    <table className="w-full text-left text-[11px]">
                        <thead>
                            <tr className="border-b border-border/10 text-muted-foreground/30 uppercase font-black tracking-widest bg-secondary/10 px-6 py-4">
                                <th className="px-6 py-4">Symbol</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Size</th>
                                <th className="px-6 py-4 text-right">Result</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/10">
                            {allPositions.slice(historyPage * 10, (historyPage + 1) * 10).map((pos, i) => (
                                <tr key={i} className="group hover:bg-secondary/5 transition-colors">
                                    <td className="px-4 md:px-6 py-2.5 md:py-3">
                                        <div className="font-black text-foreground/90 text-[10px] md:text-xs tracking-tight">{pos.pairName}</div>
                                        <div className="text-[8px] text-muted-foreground/30 font-bold uppercase">{new Date(pos.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={cn(
                                            "text-[9px] font-bold tracking-widest",
                                            pos.is_spot ? "text-orange-500/60" :
                                            pos.positionSideLabel === 'LONG' ? "text-emerald-500/60" : "text-red-500/60"
                                        )}>
                                            {pos.is_spot ? "SPOT" : pos.positionSideLabel}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-muted-foreground/40 tabular-nums text-[10px]">{pos.closedSize}</td>
                                    <td className={cn(
                                        "px-6 py-3 text-right font-bold tabular-nums text-[11px]",
                                        pos.realizedPnlValue > 0 ? "text-emerald-500" : "text-red-500"
                                    )}>
                                        {pos.realizedPnlValue > 0 ? '+' : ''}{pos.realizedPnlValue.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {allPositions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground/20 uppercase font-bold tracking-widest">
                                        No executions logged
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-center mt-3">
                    <p className="text-[10px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em]">
                        Page {historyPage + 1} of {Math.ceil(allPositions.length / 10) || 1}
                    </p>
                </div>
            </div>
            )}
        </div>
    );
}
