'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface EquityCurveChartProps {
    data: { date: string; balance: number; cumulativePnl: number; dailyPnl: number }[];
    startingBalance: number;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

const CustomTooltip = ({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: any[];
    label?: string;
}) => {
    if (!active || !payload?.length) return null;

    // Areas: [0]=Balance, [1]=Cumulative P&L, [2]=Daily P&L (if we add it as hidden or just access from payload)
    // Actually payload is an array of data for each series.
    const data = payload[0]?.payload; // Access the raw data point
    const balance = data.balance;
    const cumulativePnl = data.cumulativePnl;
    const dailyPnl = data.dailyPnl;

    return (
        <div className="bg-card dark:bg-[#0D0D0D] border border-border/20 rounded-2xl p-4 shadow-2xl text-[11px] min-w-[150px]">
            <p className="text-muted-foreground/40 font-bold uppercase tracking-tighter mb-2">{label}</p>
            <div className="space-y-1.5">
                <div className="flex justify-between items-center gap-4">
                    <span className="text-muted-foreground/60">Balance</span>
                    <span className="font-black text-foreground">${balance?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                    <span className="text-muted-foreground/60">Daily P&L</span>
                    <span className={`font-black ${dailyPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {dailyPnl >= 0 ? '+' : ''}${Math.abs(dailyPnl)?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                </div>
                <div className="flex justify-between items-center gap-4">
                    <span className="text-muted-foreground/60">Total P&L</span>
                    <span className={`font-black ${cumulativePnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {cumulativePnl >= 0 ? '+' : ''}${Math.abs(cumulativePnl)?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                </div>
            </div>
        </div>
    );
};

export function EquityCurveChart({ data, startingBalance }: EquityCurveChartProps) {
    const hasData = data.some((d) => d.balance !== startingBalance);
    const formatted = data.map((d) => ({ ...d, date: formatDate(d.date) }));

    const latestBalance = data.at(-1)?.balance ?? startingBalance;
    const totalPnl = latestBalance - startingBalance;
    const isProfit = totalPnl >= 0;

    return (
        <Card className="p-6 bg-card dark:bg-card/95 border border-border/20 shadow-lg rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Equity Curve</h3>
                    <p className="text-[9px] text-muted-foreground/20 leading-tight">Net worth & cumulative returns</p>
                </div>
                <div className="text-right">
                    <span className="text-[9px] font-bold text-muted-foreground/30 uppercase block">Current Balance</span>
                    <span className={`text-lg font-black tracking-tight ${isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${latestBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                </div>
            </div>

            {!hasData ? (
                <div className="h-[200px] flex flex-col items-center justify-center text-sm text-muted-foreground/20 italic">
                    <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mb-2">
                        <BarChart3 className="w-5 h-5 opacity-20" />
                    </div>
                    No trading activity detected
                </div>
            ) : (
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={formatted} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={isProfit ? '#22c55e' : '#ef4444'} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={isProfit ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
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
                                tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 'bold' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                                width={60}
                                className="text-muted-foreground/20"
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine y={startingBalance} stroke="currentColor" strokeDasharray="4 4" className="text-border/30" />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke={isProfit ? '#22c55e' : '#ef4444'}
                                strokeWidth={3}
                                fill="url(#balanceGrad)"
                                name="Balance"
                                dot={false}
                                animationDuration={1500}
                            />
                            <Area
                                type="monotone"
                                dataKey="cumulativePnl"
                                stroke="#f97316"
                                strokeWidth={2}
                                fill="url(#pnlGrad)"
                                name="Cumulative P&L"
                                dot={false}
                                strokeDasharray="5 5"
                                animationDuration={2000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-6 mt-6 justify-center border-t border-border/5 pt-4">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isProfit ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide">Account Portfolio</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide">Cumm. Profits</span>
                </div>
            </div>
        </Card>
    );
}
