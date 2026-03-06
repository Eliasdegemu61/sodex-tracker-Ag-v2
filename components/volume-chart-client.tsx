'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { CachedVolumeData, ChartDataPoint } from '@/lib/volume-service'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type TimeRange = '1w' | '1m' | '3m' | '6m' | '1y'

interface VolumeChartClientProps {
  data: CachedVolumeData | null
  chartData?: ChartDataPoint[]
}

function filterChartData(chartData: ChartDataPoint[] | undefined, timeRange: TimeRange) {
  if (!chartData || chartData.length === 0) return []

  const now = new Date()
  let cutoffDate = new Date()

  switch (timeRange) {
    case '1w':
      cutoffDate.setDate(now.getDate() - 7)
      break
    case '1m':
      cutoffDate.setMonth(now.getMonth() - 1)
      break
    case '3m':
      cutoffDate.setMonth(now.getMonth() - 3)
      break
    case '6m':
      cutoffDate.setMonth(now.getMonth() - 6)
      break
    case '1y':
      cutoffDate.setFullYear(now.getFullYear() - 1)
      break
  }

  return chartData
    .filter((day) => {
      const dayDate = new Date(day.day)
      return dayDate >= cutoffDate
    })
    .map((day) => {
      return {
        date: day.day,
        spot: Number((day.spot_vol / 1e6).toFixed(2)),
        futures: Number((day.futures_vol / 1e6).toFixed(2)),
        total: Number((day.total_day_vol / 1e6).toFixed(2)),
      }
    })
}

export function VolumeChartClient({ data, chartData }: VolumeChartClientProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1m')
  const processedChartData = filterChartData(chartData, timeRange)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <Card className="p-4 lg:p-8 bg-card/95 shadow-sm border border-border/20 rounded-[2.5rem] shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4 lg:mb-8">
        <h3 className="text-xs font-semibold text-muted-foreground/80 dark:text-muted-foreground/60">volume trend</h3>
        <div className="flex gap-1 bg-secondary/10 p-1 rounded-xl border border-border/5">
          {(['1w', '1m', '3m', '6m', '1y'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`text-[9px] font-bold  px-3 py-1.5 rounded-lg transition-all ${timeRange === range
                ? 'bg-orange-500 text-black shadow-lg'
                : 'text-muted-foreground/40 hover:text-foreground hover:bg-secondary/20'
                }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={processedChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSpot" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fb923c" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorFutures" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
            <XAxis
              dataKey="date"
              stroke="currentColor"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'currentColor', opacity: 0.2, fontWeight: 'bold' }}
              interval={Math.floor(processedChartData.length / 6)}
              dy={10}
            />
            <YAxis
              stroke="currentColor"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'currentColor', opacity: 0.2, fontWeight: 'bold' }}
              tickFormatter={(value) => `${value}M`}
              dx={-10}
            />
            <Tooltip
              cursor={{ stroke: 'currentColor', strokeWidth: 1, strokeOpacity: 0.1 }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-card/90 border border-border/20 p-4 rounded-2xl shadow-2xl min-w-[140px]">
                      <p className="text-[9px] text-muted-foreground/40 font-bold   mb-3">{label}</p>
                      <div className="space-y-2">
                        {payload.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="text-[10px] text-foreground/60 font-medium">{entry.name}</span>
                            </div>
                            <span className="text-[11px] font-bold text-foreground/80">${entry.value}M</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey="spot"
              stroke="#fb923c"
              fill="url(#colorSpot)"
              strokeWidth={2}
              isAnimationActive={!isMobile}
              animationDuration={1500}
              name="Spot"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#fb923c' }}
            />
            <Area
              type="monotone"
              dataKey="futures"
              stroke="#ea580c"
              fill="url(#colorFutures)"
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={1500}
              name="Futures"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#ea580c' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 lg:mt-8 pt-3 lg:pt-6 border-t border-border/10 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span className="text-[8px] text-muted-foreground/30 font-bold  ">spot</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-600" />
            <span className="text-[8px] text-muted-foreground/30 font-bold  ">futures</span>
          </div>
        </div>
        <span className="text-[8px] text-muted-foreground/10 ">UNIT: MILLION_USD</span>
      </div>
    </Card>
  )
}

