'use client';

import { Card } from '@/components/ui/card';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Area, ReferenceLine } from 'recharts';
import { usePortfolio } from '@/context/portfolio-context';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PnLChartProps {
  title?: string;
}

export function PnLChart({ title = 'Profit & Loss' }: PnLChartProps) {
  const { positions } = usePortfolio();
  const [timePeriod, setTimePeriod] = useState<'all' | '1w' | '1m' | '3m' | '1y'>('all');

  const getFilteredPositions = useMemo(() => {
    if (!positions || positions.length === 0) {
      return [];
    }

    const now = new Date();
    let startDate = new Date(0); // Default: all time

    switch (timePeriod) {
      case '1w':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3m':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = new Date(0);
    }

    return positions.filter((pos) => new Date(pos.created_at) >= startDate);
  }, [positions, timePeriod]);

  const chartData = useMemo(() => {
    if (!getFilteredPositions || getFilteredPositions.length === 0) {
      return [];
    }

    // Group positions by day using ISO date key for proper sorting
    const dayMap = new Map<string, { pnl: number; fullDate: string }>();
    getFilteredPositions.forEach((position) => {
      const date = new Date(position.created_at);
      const isoDateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD for sorting
      const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });

      const current = dayMap.get(isoDateKey) || { pnl: 0, fullDate: displayDate };
      dayMap.set(isoDateKey, {
        pnl: current.pnl + position.realizedPnlValue,
        fullDate: displayDate,
      });
    });

    // Convert to array and sort by ISO date
    const sortedData = Array.from(dayMap.entries())
      .sort((a, b) => {
        // Sort by ISO date key (YYYY-MM-DD)
        return a[0].localeCompare(b[0]);
      })
      .map(([dateKey, { pnl, fullDate }]) => ({
        date: fullDate,
        pnl,
      }));

    // Calculate cumulative PnL
    let cumulativePnL = 0;
    return sortedData.map((day) => {
      const prevCumulative = cumulativePnL;
      cumulativePnL += day.pnl;
      return {
        ...day,
        cumulative: cumulativePnL,
        waterfall: [prevCumulative, cumulativePnL],
      };
    });
  }, [getFilteredPositions]);

  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { totalPnL: 0, percentageChange: '0', isPositive: true, displayValue: '$0' };
    }

    const totalPnL = chartData[chartData.length - 1].cumulative;
    const initialValue = 10000; // Starting value for percentage calculation
    const percentageChange = ((totalPnL / initialValue) * 100).toFixed(2);
    const isPositive = totalPnL >= 0;

    // Format display value - use K only if value > 999
    let displayValue: string;
    if (Math.abs(totalPnL) > 999) {
      displayValue = `$${(totalPnL / 1000).toFixed(1)}K`;
    } else {
      displayValue = `$${totalPnL.toFixed(2)}`;
    }

    return { totalPnL, percentageChange, isPositive, displayValue };
  }, [chartData]);

  const getBarColor = (value: number) => {
    return value >= 0 ? '#10b98166' : '#ef444466'; // Semi-transparent green for positive, red for negative
  };

  const hasData = chartData.length > 0;

  // New: Calculate synchronized domains to align the zero line
  const domains = useMemo(() => {
    if (!hasData) return { daily: [0, 0], cumulative: [0, 0] };

    const dailyValues = chartData.map(d => d.pnl);
    const cumValues = chartData.map(d => d.cumulative);

    const dMin = Math.min(...dailyValues, 0);
    const dMax = Math.max(...dailyValues, 0);
    const cMin = Math.min(...cumValues, 0);
    const cMax = Math.max(...cumValues, 0);

    // Make domains symmetric around 0 to guarantee alignment in the center
    const dAbs = Math.max(Math.abs(dMin), Math.abs(dMax)) * 1.1;
    const cAbs = Math.max(Math.abs(cMin), Math.abs(cMax)) * 1.25; // More headroom for the line

    return {
      daily: [-dAbs, dAbs],
      cumulative: [-cAbs, cAbs]
    };
  }, [chartData, hasData]);

  return (
    <Card className="p-5 bg-card/95 shadow-sm border border-border/20 rounded-3xl shadow-sm">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground/60">
            {title}
          </h3>
          <Select value={timePeriod} onValueChange={(value: any) => setTimePeriod(value)}>
            <SelectTrigger className="w-28 h-7 text-[10px] font-bold  bg-secondary/10 border-border/10 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/10">
              <SelectItem value="all" className="text-[10px]">All Time</SelectItem>
              <SelectItem value="1w" className="text-[10px]">1 Week</SelectItem>
              <SelectItem value="1m" className="text-[10px]">1 Month</SelectItem>
              <SelectItem value="3m" className="text-[10px]">3 Months</SelectItem>
              <SelectItem value="1y" className="text-[10px]">1 Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-baseline gap-2">
          <p className={`text-2xl font-bold tracking-tight ${stats.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {stats.displayValue}
          </p>
          <p className={`text-[10px] font-bold ${stats.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {stats.isPositive ? '+' : ''}{stats.percentageChange}%
          </p>
        </div>
      </div>

      <div className="h-[250px] w-full flex items-center justify-center relative">
        {!hasData ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/5 rounded-2xl border border-dashed border-border/10 transition-colors">
            <p className="text-[10px] text-muted-foreground/40 font-bold  ">No data available...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="date"
                stroke="#ffffff10"
                tick={{ fill: '#ffffff30', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="cumulative-axis"
                domain={domains.cumulative}
                stroke="#ffffff10"
                tick={{ fill: '#f97316', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }}
                tickFormatter={(value) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                axisLine={false}
                tickLine={false}
                orientation="left"
                hide={false}
              />
              <YAxis
                yAxisId="daily-axis"
                domain={domains.daily}
                stroke="#ffffff10"
                tick={{ fill: '#ffffff30', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }}
                tickFormatter={(value) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                axisLine={false}
                tickLine={false}
                orientation="right"
                hide={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(10px)'
                }}
                itemStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#fff' }}
                labelStyle={{ color: '#ffffff30', marginBottom: '4px', fontSize: '9px' }}
                cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }}
                formatter={(value: any, name: any, props: any) => {
                  const numValue = value as number;
                  const displayValue = Math.abs(numValue) > 999
                    ? `$${(numValue / 1000).toFixed(1)}K`
                    : `$${numValue.toFixed(2)}`;

                  if (name === 'cumulative') {
                    return [displayValue, 'Cumulative PnL'];
                  }
                  return [displayValue, 'Daily PnL'];
                }}
              />
              {/* Unified zero line using the cumulative axis (scales are aligned now) */}
              <ReferenceLine yAxisId="cumulative-axis" y={0} stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="4 4" />
              <Bar
                yAxisId="daily-axis"
                dataKey="pnl"
                radius={[4, 4, 0, 0]}
                barSize={8}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.pnl)} />
                ))}
              </Bar>
              <Line
                yAxisId="cumulative-axis"
                type="monotone"
                dataKey="cumulative"
                stroke="#f97316"
                strokeWidth={3}
                dot={false}
                isAnimationActive={true}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

