'use client';

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface EquityChartProps {
    data: {
        date: string;
        balance: number;
    }[];
}

export function EquityChart({ data }: EquityChartProps) {
    if (!data || data.length === 0) return null;

    // Format date for XAxis
    const chartData = data.map(point => ({
        ...point,
        formattedDate: new Date(point.date).toLocaleDateString(undefined, { 
            month: 'short', 
            day: 'numeric' 
        })
    }));

    // Find min/max for YAxis scaling
    const balances = chartData.map(d => d.balance);
    const minBalance = Math.min(...balances);
    const maxBalance = Math.max(...balances);
    const range = maxBalance - minBalance;
    const padding = range * 0.1 || 10;

    return (
        <div className="w-full h-[200px] md:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid 
                        strokeDasharray="3 3" 
                        vertical={false} 
                        stroke="currentColor"
                        className="opacity-[0.05]"
                    />
                    <XAxis 
                        dataKey="formattedDate" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 'bold', opacity: 0.2 }}
                        interval="preserveStartEnd"
                        minTickGap={30}
                    />
                    <YAxis 
                        hide
                        domain={[minBalance - padding, maxBalance + padding]}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-card border border-border/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                                        <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-1">
                                            {payload[0].payload.date}
                                        </p>
                                        <p className="text-sm font-bold text-foreground tabular-nums">
                                            ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
