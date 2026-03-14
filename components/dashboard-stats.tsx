'use client'

import { Card } from '@/components/ui/card'
import { useState, useEffect } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { formatNumber } from '@/lib/format-number'
import { useDexData } from '@/context/dex-data-context'
import { useVolumeData } from '@/context/volume-data-context'
import { TrendingUp } from 'lucide-react'

interface UserDataEntry {
  day_date: string
  timestamp: number
  newUsers: number
  cumulativeUsers: number
}

interface DashboardStatsProps {
  variant?: 'default' | 'compact'
}

export function DashboardStats({ variant = 'default' }: DashboardStatsProps) {
  const { overallStats, isLoading: dexLoading } = useDexData()
  const { volumeData, isLoading: volumeLoading } = useVolumeData()
  const [userData, setUserData] = useState<UserDataEntry[]>([])
  const [userLoading, setUserLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setUserLoading(true)
        const today = new Date().toISOString().split('T')[0]
        const response = await fetch(`https://mainnet-data.sodex.dev/api/v1/dashboard/users?start_date=2024-01-01&end_date=${today}`)
        const json = await response.json()
        if (json.code === 0 && json.data?.data) {
          setUserData(json.data.data)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setUserLoading(false)
      }
    }
    fetchUserData()
  }, [])

  const isLoading = (dexLoading || volumeLoading || userLoading) && (!volumeData && userData.length === 0)

  useEffect(() => {
    console.log('[DEBUG] DashboardStats:', { dexLoading, volumeLoading, userLoading, overallStats, volumeData, userDataLength: userData.length })
  }, [dexLoading, volumeLoading, userLoading, overallStats, volumeData, userData])

  if (isLoading || (!overallStats && dexLoading) || !volumeData) {
    return (
      <div className="space-y-2 mb-4">
        {variant === 'compact' ? (
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
            <Card className="p-2 md:p-3 bg-card/50 border-border h-20" />
            <Card className="p-2 md:p-3 bg-card/50 border-border h-20" />
          </div>
        ) : (
          <>
            <Card className="p-3 bg-card/50 border-border h-16" />
            <Card className="p-3 bg-card/50 border-border h-16" />
            <Card className="p-3 bg-card/50 border-border h-16" />
          </>
        )}
      </div>
    )
  }

  const latestUserEntry = userData[userData.length - 1]
  const previousUserEntry = userData[userData.length - 2]
  const totalUsers = latestUserEntry?.cumulativeUsers || 0
  const userGain = totalUsers - (previousUserEntry?.cumulativeUsers || 0)
  const userGainPercent = previousUserEntry?.cumulativeUsers
    ? (userGain / previousUserEntry.cumulativeUsers) * 100
    : 0

  const spotVolume = volumeData?.all_time_stats?.total_spot_volume || 0
  const futuresVolume = volumeData?.all_time_stats?.total_futures_volume || 0
  const totalVolume = spotVolume + futuresVolume

  const pieData = [
    { name: 'Spot', value: spotVolume },
    { name: 'Futures', value: futuresVolume },
  ]

  // Prepare chart data for the small graph - past 7 days
  const chartData = userData.slice(-7).map(entry => ({
    name: entry.day_date,
    users: entry.cumulativeUsers,
    new: entry.newUsers
  }))

  // Revised User and Volume Cards for Mobile Merger
  const StatsHeader = () => {
    const SharedCard = ({ children }: { children: React.ReactNode }) => (
      <Card className="p-4 lg:p-5 bg-card/95 shadow-sm border border-border/20 rounded-3xl group">
        {children}
      </Card>
    );

    const UserStats = () => (
      <div className="flex-1 min-w-0">
        <h3 className="text-[10px] lg:text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1 whitespace-nowrap text-zinc-500">Total Users</h3>
        <div className="flex flex-col">
          <div className="text-xl lg:text-2xl font-bold tracking-tight text-foreground leading-none mb-1 lg:mb-2">
            {totalUsers.toLocaleString()}
          </div>
          {userGain > 0 && (
            <div className="flex items-center text-[11px] font-bold text-emerald-500 w-fit">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{userGain.toLocaleString()} <span className="text-[9px] ml-1 opacity-80 font-medium tracking-tight">({userGainPercent.toFixed(2)}%)</span>
            </div>
          )}
        </div>
      </div>
    );

    const VolumeStats = () => (
      <div className="flex-1 min-w-0">
        <h3 className="text-[10px] lg:text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1 whitespace-nowrap text-zinc-500">Total Volume</h3>
        <div className="text-xl lg:text-2xl font-bold tracking-tight text-foreground">${formatNumber(totalVolume)}</div>
      </div>
    );

    return (
      <div className="space-y-2 lg:space-y-3 mb-0 lg:mb-4">
        {/* Mobile View: Merged Card */}
        <div className="block lg:hidden">
          <SharedCard>
            <div className="flex items-center justify-between gap-6 divide-x divide-border/10">
              <UserStats />
              <div className="pl-6 flex-1">
                <VolumeStats />
              </div>
            </div>
          </SharedCard>
        </div>

        {/* Desktop View: Separate Cards */}
        <div className="hidden lg:grid grid-cols-1 gap-3">
          <SharedCard>
            <UserStats />
          </SharedCard>
          <SharedCard>
            <VolumeStats />
          </SharedCard>
        </div>
      </div>
    );
  };

  if (variant === 'compact') {
    return <StatsHeader />;
  }

  // Default variant - show all cards
  return (
    <div className="space-y-1 lg:space-y-3 mb-0 lg:mb-6">
      <StatsHeader />

      {/* Spot vs Futures Volume */}
      <Card className="hidden lg:block p-5 bg-card/95 shadow-sm border border-border/20 rounded-3xl shadow-sm overflow-hidden group">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground/80 dark:text-muted-foreground/60 text-zinc-500 uppercase tracking-wider">Volume Split</h3>
        </div>

        <div className="relative w-full h-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-orange-500/5 blur-3xl rounded-full scale-50 opacity-50" />
          <ResponsiveContainer width="100%" height="100%">
            <PieChart className="animate-spin hover:scale-105 transition-transform duration-700" style={{ animationDuration: '20s' }}>
              <defs>
                <filter id="pieGlow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={65}
                paddingAngle={4}
                dataKey="value"
                isAnimationActive={!isMobile}
                stroke="none"
              >
                <Cell fill="#fb923c" className="drop-shadow-[0_0_8px_rgba(251,146,60,0.4)]" />
                <Cell fill="#ea580c" className="drop-shadow-[0_0_8px_rgba(234,88,12,0.4)]" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-[8px] text-muted-foreground/30 font-bold  uppercase">Futures</span>
            <span className="text-xs font-bold text-foreground/80">
              {((futuresVolume / totalVolume) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="p-3 bg-secondary/10 rounded-2xl border border-border/5 space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span className="text-[8px] text-muted-foreground/70 dark:text-muted-foreground/40 font-bold  uppercase">Spot</span>
            </div>
            <p className="text-xs font-bold text-foreground/80">${formatNumber(spotVolume)}</p>
          </div>
          <div className="p-3 bg-secondary/10 rounded-2xl border border-border/5 space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-600" />
              <span className="text-[8px] text-muted-foreground/70 dark:text-muted-foreground/40 font-bold  uppercase">Futures</span>
            </div>
            <p className="text-xs font-bold text-foreground/80">${formatNumber(futuresVolume)}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

