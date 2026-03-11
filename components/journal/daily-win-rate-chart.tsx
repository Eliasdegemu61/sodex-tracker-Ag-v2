'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';
import { cn } from '@/lib/utils';

interface DailyWinRateChartProps {
    data: { date: string; winRate: number }[];
}

export function DailyWinRateChart({ data }: DailyWinRateChartProps) {
    return (
        <Card className="p-6 bg-card dark:bg-card/95 border border-border/20 shadow-lg rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Daily Win Rate</h3>
                    <p className="text-[9px] text-muted-foreground/20 leading-tight">Win rate trend per trading session</p>
                </div>
            </div>

            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <defs>
                            <linearGradient id="winRateGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/10" />
                        <XAxis
                            dataKey="date"
                            hide
                        />
                        <YAxis
                            domain={[0, 100]}
                            fontSize={10}
                            fontWeight="bold"
                            tickFormatter={(v) => `${v}%`}
                            axisLine={false}
                            tickLine={false}
                            className="text-muted-foreground/30"
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border) / 0.2)',
                                borderRadius: '1rem',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: 'hsl(var(--foreground))'
                            }}
                            itemStyle={{ color: '#f97316' }}
                            formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, 'Win Rate']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Line
                            type="monotone"
                            dataKey="winRate"
                            stroke="#f97316"
                            strokeWidth={3}
                            dot={{ fill: '#f97316', strokeWidth: 2, r: 3, stroke: 'hsl(var(--card))' }}
                            activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
