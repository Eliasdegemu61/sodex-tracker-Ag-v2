'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TrendingUp, HelpCircle } from 'lucide-react'
import { useVolumeData } from '@/context/volume-data-context'
import { getTokenLogo } from '@/lib/token-logos'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'

export function TopPairsWidget() {
  const { volumeData, isLoading } = useVolumeData()
  const [activeTab, setActiveTab] = useState('all')

  if (isLoading || !volumeData) {
    return (
      <Card className="p-8 bg-card/95 shadow-sm border border-border/20 rounded-[2.5rem] animate-pulse">
        <h3 className="text-xs font-semibold text-muted-foreground/60 mb-8">Auditing Volume</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-secondary/10 rounded-2xl" />
            <div className="h-16 bg-secondary/10 rounded-2xl" />
          </div>
          <div className="h-48 bg-secondary/10 rounded-2xl" />
        </div>
      </Card>
    )
  }

  const formatVolume = (volume: number | undefined) => {
    if (!volume) return '0'
    if (volume >= 1e9) return (volume / 1e9).toFixed(2) + 'B'
    if (volume >= 1e6) return (volume / 1e6).toFixed(2) + 'M'
    if (volume >= 1e3) return (volume / 1e3).toFixed(2) + 'K'
    return volume.toFixed(2)
  }

  const stats = volumeData.all_time_stats
  const allTopPairs = [...stats.top_5_spot, ...stats.top_5_futures]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5)

  // Configure chart data based on active tab
  let chartData: { name: string, value: number, category: string }[] = []
  if (activeTab === 'all') {
    chartData = allTopPairs.map(p => ({
      name: p.pair,
      value: p.volume,
      category: p.pair.includes('-') ? 'Futures' : 'Spot'
    }))
  } else if (activeTab === 'spot') {
    chartData = stats.top_5_spot.map(p => ({ name: p.pair, value: p.volume, category: 'Spot' }))
  } else {
    chartData = stats.top_5_futures.map(p => ({ name: p.pair, value: p.volume, category: 'Futures' }))
  }

  // Shades of orange for the 5 tokens
  const COLORS = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#ffedd5']

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-card border border-border p-3 rounded-xl shadow-xl flex flex-col gap-1">
          <div className="flex justify-between items-center gap-4">
            <span className="text-sm font-bold text-foreground">{data.name}</span>
            <span className="text-[10px] text-muted-foreground bg-secondary/10 px-2 py-0.5 rounded-md">{data.category}</span>
          </div>
          <span className="text-xs font-semibold text-orange-500">${formatVolume(data.value)}</span>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="p-8 bg-card/95 shadow-sm border border-border/20 rounded-[2.5rem] flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground/80 dark:text-muted-foreground/60">Historical Dominance</h3>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-popover text-popover-foreground border-border text-xs max-w-[220px]">
                <p>top spot and futures pairs with the highest trading volume</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <TrendingUp className="w-4 h-4 text-orange-400/40" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-secondary/5 border border-border/5 rounded-2xl flex flex-col items-center">
          <span className="text-[8px] text-muted-foreground/30 font-bold mb-1">Total Spot</span>
          <span className="text-xl font-bold text-orange-400">${formatVolume(stats.total_spot_volume)}</span>
        </div>
        <div className="p-4 bg-secondary/5 border border-border/5 rounded-2xl flex flex-col items-center">
          <span className="text-[8px] text-muted-foreground/30 font-bold mb-1">Total Futures</span>
          <span className="text-xl font-bold text-orange-600">${formatVolume(stats.total_futures_volume)}</span>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={(val) => setActiveTab(val)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start relative">

          {/* Left Side: Semi-circle Pie Chart */}
          <div className="h-[250px] w-full flex flex-col items-center justify-center -mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="100%" // Shift down to make it a perfect semi-circle at the bottom edge
                  startAngle={180}
                  endAngle={0}
                  innerRadius={70}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={true}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      className="hover:opacity-80 transition-opacity cursor-pointer duration-300"
                    />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} cursor={false} />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex justify-center flex-wrap gap-2 mt-2 max-w-sm">
              {chartData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 bg-secondary/5 px-2 py-1 rounded-md border border-border/5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[10px] font-semibold text-foreground/70">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Tabs List & Content */}
          <div className="w-full z-10">
            <TabsList className="grid grid-cols-3 bg-secondary/5 dark:bg-white/[0.03] p-1 rounded-2xl border border-border/10 dark:border-white/10 mb-6 w-full shadow-sm">
              <TabsTrigger value="all" className="text-[10px] font-bold py-2 rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all dark:text-muted-foreground/50 dark:data-[state=active]:text-white dark:hover:text-foreground/80">All</TabsTrigger>
              <TabsTrigger value="spot" className="text-[10px] font-bold py-2 rounded-xl data-[state=active]:bg-orange-400 data-[state=active]:text-white transition-all dark:text-muted-foreground/50 dark:data-[state=active]:text-white dark:hover:text-foreground/80">Spot</TabsTrigger>
              <TabsTrigger value="futures" className="text-[10px] font-bold py-2 rounded-xl data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all dark:text-muted-foreground/50 dark:data-[state=active]:text-white dark:hover:text-foreground/80">Futures</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-2 mt-0 outline-none">
              {allTopPairs.map((pair) => (
                <div key={pair.pair} className="group flex items-center justify-between p-3 bg-secondary/5 rounded-2xl border border-border/5 hover:bg-orange-500/5 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {getTokenLogo(pair.pair) ? (
                        <img
                          src={getTokenLogo(pair.pair)}
                          alt={pair.pair}
                          className="w-6 h-6 rounded-full flex-shrink-0 bg-background/50 p-0.5 border border-border/10 group-hover:border-orange-500/20"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center text-[8px] font-bold text-orange-400">{pair.pair.slice(0, 1)}</div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-foreground/80">{pair.pair}</span>
                      <span className="text-[7px] text-muted-foreground/20 font-bold">{pair.pair.includes('-') ? 'Futures' : 'Spot'}</span>
                    </div>
                  </div>
                  <span className="text-[12px] font-bold text-orange-400/90">${formatVolume(pair.volume)}</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="spot" className="space-y-2 mt-0 outline-none">
              {stats.top_5_spot.map((pair) => (
                <div key={pair.pair} className="group flex items-center justify-between p-3 bg-secondary/5 rounded-2xl border border-border/5 hover:bg-orange-400/5 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    {getTokenLogo(pair.pair) && <img src={getTokenLogo(pair.pair)} alt={pair.pair} className="w-6 h-6 rounded-full bg-background/50 p-0.5 border border-border/10" />}
                    <span className="text-[12px] font-bold text-foreground/80">{pair.pair}</span>
                  </div>
                  <span className="text-[12px] font-bold text-orange-400/90">${formatVolume(pair.volume)}</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="futures" className="space-y-2 mt-0 outline-none">
              {stats.top_5_futures.map((pair) => (
                <div key={pair.pair} className="group flex items-center justify-between p-3 bg-secondary/5 rounded-2xl border border-border/5 hover:bg-orange-600/5 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    {getTokenLogo(pair.pair) && <img src={getTokenLogo(pair.pair)} alt={pair.pair} className="w-6 h-6 rounded-full bg-background/50 p-0.5 border border-border/10" />}
                    <span className="text-[12px] font-bold text-foreground/80">{pair.pair}</span>
                  </div>
                  <span className="text-[12px] font-bold text-orange-600/90">${formatVolume(pair.volume)}</span>
                </div>
              ))}
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </Card>
  )
}

