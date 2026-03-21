'use client';

import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { usePortfolio } from '@/context/portfolio-context';
import { cn } from '@/lib/utils';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    AreaChart,
    Area
} from 'recharts';
import {
    Activity,
    Zap,
    ChevronDown,
    Filter,
    BarChart3,
    History,
    TrendingUp
} from 'lucide-react';

type TimeFrame = '7D' | '30D' | '3M' | 'ALL';

export function TradeAnalysis() {
    const { positions, isLoading } = usePortfolio();
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('ALL');
    const [selectedPair, setSelectedPair] = useState<string>('');

    // Filter positions based on timeframe
    const filteredPositions = useMemo(() => {
        if (!positions) return [];
        const now = Date.now();
        const limits: Record<TimeFrame, number> = {
            '7D': now - 7 * 24 * 60 * 60 * 1000,
            '30D': now - 30 * 24 * 60 * 60 * 1000,
            '3M': now - 90 * 24 * 60 * 60 * 1000,
            'ALL': 0
        };
        return positions.filter(p => new Date(p.created_at).getTime() >= limits[timeFrame]);
    }, [positions, timeFrame]);

    // Top Stats
    const stats = useMemo(() => {
        if (filteredPositions.length === 0) return null;

        let totalPnl = 0;
        let wins = 0;
        const pairCounts: Record<string, number> = {};
        const pairPnl: Record<string, number> = {};
        let totalLeverage = 0;

        filteredPositions.forEach(p => {
            totalPnl += p.realizedPnlValue;
            if (p.realizedPnlValue > 0) wins++;
            pairCounts[p.pairName] = (pairCounts[p.pairName] || 0) + 1;
            pairPnl[p.pairName] = (pairPnl[p.pairName] || 0) + p.realizedPnlValue;
            totalLeverage += p.leverage;
        });

        const mostTradedPair = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        const mostProfitablePair = Object.entries(pairPnl).sort((a, b) => b[1] - a[1])[0]?.[0];

        return {
            totalTrades: filteredPositions.length,
            winRate: (wins / filteredPositions.length) * 100,
            totalPnl,
            avgLeverage: totalLeverage / filteredPositions.length,
            mostTradedPair,
            mostProfitablePair
        };
    }, [filteredPositions]);

    // Chart Data: PNL by Pair
    const pnlByPairData = useMemo(() => {
        const pairPnl: Record<string, number> = {};
        filteredPositions.forEach(p => {
            pairPnl[p.pairName] = (pairPnl[p.pairName] || 0) + p.realizedPnlValue;
        });
        return Object.entries(pairPnl)
            .map(([name, pnl]) => ({ name, pnl }))
            .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
            .slice(0, 10);
    }, [filteredPositions]);

    // Chart Data: PNL by Leverage
    const leverageData = useMemo(() => {
        const tiers = [
            { name: '1-5x', min: 1, max: 5, pnl: 0, count: 0 },
            { name: '6-10x', min: 6, max: 10, pnl: 0, count: 0 },
            { name: '11-20x', min: 11, max: 20, pnl: 0, count: 0 },
            { name: '21-50x', min: 21, max: 50, pnl: 0, count: 0 },
            { name: '50x+', min: 51, max: 200, pnl: 0, count: 0 },
        ];

        filteredPositions.forEach(p => {
            const tier = tiers.find(t => p.leverage >= t.min && p.leverage <= t.max);
            if (tier) {
                tier.pnl += p.realizedPnlValue;
                tier.count++;
            }
        });

        return tiers.filter(t => t.count > 0);
    }, [filteredPositions]);

    // New: Performance Distribution (Weekly/Monthly) - similar to user image
    const distributionData = useMemo(() => {
        const groups: Record<string, { name: string; profit: number; loss: number }> = {};
        
        filteredPositions.forEach(p => {
            const date = new Date(p.created_at);
            const key = timeFrame === '7D' || timeFrame === '30D' 
                ? `${date.getMonth() + 1}/${date.getDate()}`
                : date.toLocaleString('default', { month: 'short' });
            
            if (!groups[key]) groups[key] = { name: key, profit: 0, loss: 0 };
            if (p.realizedPnlValue > 0) groups[key].profit += p.realizedPnlValue;
            else groups[key].loss += Math.abs(p.realizedPnlValue);
        });

        return Object.values(groups).slice(-12);
    }, [filteredPositions, timeFrame]);

    // Single Pair Analysis
    const pairAnalysis = useMemo(() => {
        if (!selectedPair) return null;
        const targetTrades = filteredPositions.filter(p => p.pairName === selectedPair);
        if (targetTrades.length < 2) return null;

        let pnlCurve = 0;
        const curveData = targetTrades.map((t, i) => {
            pnlCurve += t.realizedPnlValue;
            return { trade: i + 1, cumulativePnl: pnlCurve };
        });

        const bestTrade = Math.max(...targetTrades.map(t => t.realizedPnlValue));
        const worstTrade = Math.min(...targetTrades.map(t => t.realizedPnlValue));

        return {
            count: targetTrades.length,
            curveData,
            bestTrade,
            worstTrade,
            totalPairPnl: pnlCurve
        };
    }, [filteredPositions, selectedPair]);

    const activePairs = useMemo(() => {
      const counts: Record<string, number> = {};
      filteredPositions.forEach(p => counts[p.pairName] = (counts[p.pairName] || 0) + 1);
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);
    }, [filteredPositions]);

    if (isLoading || !positions || positions.length === 0) return null;

    return (
        <section className="space-y-6 mt-12 pb-12 animate-in fade-in duration-1000">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                        <BarChart3 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Trade Analysis</h2>
                        <p className="text-sm text-muted-foreground font-medium">Deep insights into your performance</p>
                    </div>
                </div>

                <div className="flex items-center bg-secondary/10 p-1 rounded-2xl border border-border/10 backdrop-blur-md">
                    {(['7D', '30D', '3M', 'ALL'] as TimeFrame[]).map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeFrame(tf)}
                            className={cn(
                                "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                                timeFrame === tf 
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/20"
                            )}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Win Rate', value: `${stats?.winRate.toFixed(1)}%`, icon: Zap, color: 'text-yellow-500' },
                    { label: 'Total PnL', value: `${(stats?.totalPnl || 0) >= 0 ? '+' : ''}$${Math.abs(stats?.totalPnl || 0).toFixed(2)}`, icon: Activity, color: (stats?.totalPnl || 0) >= 0 ? 'text-green-500' : 'text-red-500' },
                    { label: 'Avg Leverage', value: `${stats?.avgLeverage.toFixed(1)}x`, icon: History, color: 'text-primary' },
                    { label: 'Top Pair', value: stats?.mostTradedPair, icon: TrendingUp, color: 'text-blue-500' },
                ].map((item, i) => (
                    <Card key={i} className="p-5 border-border/10 bg-card/40 backdrop-blur-sm rounded-3xl hover:border-primary/20 transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-500">
                            <item.icon className="w-12 h-12" />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{item.label}</span>
                        <p className={cn("text-xl font-black mt-2 tracking-tight truncate", item.color)}>{item.value}</p>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Distribution Chart — Matches User Image Style */}
                <Card className="p-6 border-border/10 bg-card/40 rounded-[2.5rem] shadow-xl overflow-hidden min-h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Performance Volume</h3>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-[10px] text-muted-foreground font-bold uppercase">Profit</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-500" />
                                <span className="text-[10px] text-muted-foreground font-bold uppercase">Drawdown</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    contentStyle={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}
                                />
                                <Bar dataKey="profit" fill="#10b981" radius={[10, 10, 0, 0]} barSize={24} stackId="a" />
                                <Bar dataKey="loss" fill="#f97316" radius={[0, 0, 10, 10]} barSize={24} stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Leverage vs PnL Analysis */}
                <Card className="p-6 border-border/10 bg-card/40 rounded-[2.5rem] shadow-xl min-h-[400px]">
                    <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-8">Leverage Impact</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={leverageData}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }} />
                                <Bar dataKey="pnl" radius={[8, 8, 8, 8]} barSize={40}>
                                    {leverageData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.6} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Pair Deep Dive Section */}
            <Card className="p-8 border-border/10 bg-card/40 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -z-10" />
                
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                    <div className="space-y-1">
                        <h3 className="text-lg font-black text-foreground uppercase tracking-widest">Single Pair Insights</h3>
                        <p className="text-xs text-muted-foreground font-bold">Comprehensive analysis for active symbols</p>
                    </div>
                    
                    <div className="relative group">
                        <select 
                            value={selectedPair}
                            onChange={(e) => setSelectedPair(e.target.value)}
                            className="appearance-none bg-secondary/20 border border-border/10 rounded-2xl px-6 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer min-w-[200px]"
                        >
                            <option value="">Select a pair...</option>
                            {activePairs.map(pair => (
                                <option key={pair} value={pair}>{pair}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none group-hover:text-foreground transition-colors" />
                    </div>
                </div>

                {selectedPair && pairAnalysis ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <div className="p-6 bg-secondary/10 rounded-3xl border border-border/5">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">Frequency</span>
                                <p className="text-2xl font-black mt-1">{pairAnalysis.count} Trades</p>
                            </div>
                            <div className="p-6 bg-secondary/10 rounded-3xl border border-border/5">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">Realized PnL</span>
                                <p className={cn("text-2xl font-black mt-1", pairAnalysis.totalPairPnl >= 0 ? "text-green-500" : "text-red-500")}>
                                    ${pairAnalysis.totalPairPnl.toFixed(2)}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-green-500/5 rounded-2xl border border-green-500/10">
                                    <span className="text-[8px] font-bold text-green-500/50 uppercase">Best</span>
                                    <p className="text-sm font-black text-green-500 mt-1">+${pairAnalysis.bestTrade.toFixed(2)}</p>
                                </div>
                                <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                                    <span className="text-[8px] font-bold text-red-500/50 uppercase">Worst</span>
                                    <p className="text-sm font-black text-red-500 mt-1">${pairAnalysis.worstTrade.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 h-[260px] bg-secondary/5 rounded-[2rem] p-6 border border-border/5">
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Cumulative PnL Trend</h4>
                            <ResponsiveContainer width="100%" height="85%">
                                <AreaChart data={pairAnalysis.curveData}>
                                    <defs>
                                        <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="trade" hide />
                                    <YAxis hide />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}
                                        labelFormatter={(val) => `Trade #${val}`}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="cumulativePnl" 
                                        stroke="#10b981" 
                                        strokeWidth={4}
                                        fillOpacity={1} 
                                        fill="url(#colorPnl)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-secondary/5 rounded-3xl border border-dashed border-border/20">
                        <Filter className="w-12 h-12 text-muted-foreground/10 mb-4" />
                        <p className="text-muted-foreground/40 font-bold uppercase tracking-widest text-xs">
                            Select a symbol to start deep-dive analysis
                        </p>
                    </div>
                )}
            </Card>
        </section>
    );
}
