'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { formatNumber } from '@/lib/format-number'
import {
    Activity,
    ShieldCheck,
    Zap,
    Layers,
    ChevronDown,
    Check
} from 'lucide-react'
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
} from 'recharts'
import { fetchTokenPrices, type TokenPriceMap, normalizeTokenName } from '@/lib/price-service'

interface TokenFlow {
    token: string
    overall_deposit: number
    overall_withdrawal: number
    net_remaining: number
    retention_rate: number
    price?: number
    deposit_usd?: number
    withdrawal_usd?: number
    net_remaining_usd?: number
    has_price: boolean
    history: {
        date: string,
        cumulative: number,
        cumulative_usd?: number,
        cumulative_depo: number,
        cumulative_depo_usd?: number,
        cumulative_wth: number,
        cumulative_wth_usd?: number
    }[]
}

const RETENTION_COLORS = [
    '#f97316', '#ea580c', '#c2410c', '#facc15', '#eab308',
    '#ca8a04', '#fef08a', '#fdba74', '#fed7aa', '#fb923c'
]

const DEPOSIT_COLORS = [
    '#22c55e', '#16a34a', '#15803d', '#166534', '#4ade80',
    '#86efac', '#bbf7d0', '#10b981', '#059669', '#047857'
]

const WITHDRAWAL_COLORS = [
    '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#f87171',
    '#fca5a5', '#fecaca', '#f43f5e', '#e11d48', '#be123c'
]

export function OverallDepositsCard() {
    return <AssetIntelligenceDashboard />
}

export function NetRemainingCard() {
    return null
}

type TimeFrame = '24hr' | '7day' | '30day' | '3month' | '6month' | '1year' | 'All Time'
type MetricType = 'Retention' | 'Deposits' | 'Withdrawals'

export function AssetIntelligenceDashboard() {
    const [data, setData] = useState<TokenFlow[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [mounted, setMounted] = useState(false)

    // Chart Controls State
    const [timeRange, setTimeRange] = useState<TimeFrame>('30day')
    const [metricType, setMetricType] = useState<MetricType>('Retention')
    const [selectedTokens, setSelectedTokens] = useState<string[]>([])
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        setMounted(true)
        async function fetchData() {
            try {
                // 1. Fetch current prices
                const prices: TokenPriceMap = await fetchTokenPrices()

                // 2. Fetch CSV data
                const [response, dailyResponse] = await Promise.all([
                    fetch('https://raw.githubusercontent.com/Eliasdegemu61/Fund-flow-sodex/main/overall_sodex_totals.csv'),
                    fetch('https://raw.githubusercontent.com/Eliasdegemu61/Fund-flow-sodex/main/daily_net_flows.csv')
                ])
                const csvText = await response.text()
                const dailyText = await dailyResponse.text()

                const lines = csvText.trim().split('\n')
                const dailyLines = dailyText.trim().split('\n')

                if (lines.length < 2) return

                // Process daily flows
                const dailyFlowsByToken: Record<string, { date: string, net: number, depo: number, wth: number }[]> = {}
                for (let i = 1; i < dailyLines.length; i++) {
                    const values = dailyLines[i].split(',')
                    if (values.length >= 4) {
                        const date = values[0].trim()
                        const token = values[1].trim()
                        const depo = parseFloat(values[2].trim())
                        const wth = parseFloat(values[3].trim())
                        if (!dailyFlowsByToken[token]) dailyFlowsByToken[token] = []
                        dailyFlowsByToken[token].push({ date, net: depo - wth, depo, wth })
                    }
                }

                // Calculate cumulative history for sparklines
                const historyByToken: Record<string, { date: string, cumulative: number, cumulative_depo: number, cumulative_wth: number }[]> = {}
                for (const [token, flows] of Object.entries(dailyFlowsByToken)) {
                    flows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    let cum = 0
                    let cum_depo = 0
                    let cum_wth = 0
                    historyByToken[token] = flows.map(f => {
                        cum += f.net
                        cum_depo += f.depo
                        cum_wth += f.wth
                        return { date: f.date, cumulative: cum, cumulative_depo: cum_depo, cumulative_wth: cum_wth }
                    })
                }

                const parsed: TokenFlow[] = []
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',')
                    if (values.length >= 3) {
                        const token = values[0].trim()
                        const overall_deposit = parseFloat(values[1].trim())
                        const overall_withdrawal = parseFloat(values[2].trim())
                        const net_remaining = overall_deposit - overall_withdrawal
                        const retention_rate = overall_deposit > 0 ? (net_remaining / overall_deposit) * 100 : 0

                        // Match with price
                        const normalizedCSV = normalizeTokenName(token)
                        let price = prices[normalizedCSV]

                        const has_price = price !== undefined && price > 0

                        const history = historyByToken[token] || []
                        const historyWithUSD = history.map(h => ({
                            date: h.date,
                            cumulative: h.cumulative,
                            cumulative_usd: has_price ? h.cumulative * price! : undefined,
                            cumulative_depo: h.cumulative_depo,
                            cumulative_depo_usd: has_price ? h.cumulative_depo * price! : undefined,
                            cumulative_wth: h.cumulative_wth,
                            cumulative_wth_usd: has_price ? h.cumulative_wth * price! : undefined
                        }))

                        parsed.push({
                            token,
                            overall_deposit,
                            overall_withdrawal,
                            net_remaining,
                            retention_rate,
                            price,
                            deposit_usd: has_price ? overall_deposit * price! : undefined,
                            withdrawal_usd: has_price ? overall_withdrawal * price! : undefined,
                            net_remaining_usd: has_price ? net_remaining * price! : undefined,
                            has_price,
                            history: historyWithUSD
                        })
                    }
                }

                // Sort by net remaining USD descending
                parsed.sort((a, b) => {
                    if (a.has_price && b.has_price) {
                        return (b.net_remaining_usd || 0) - (a.net_remaining_usd || 0)
                    }
                    if (a.has_price) return -1
                    if (b.has_price) return 1
                    return b.net_remaining - a.net_remaining
                })
                setData(parsed)

                // Select USDC, SOSO, ETH by default (explicitly — never SMAG7.SSI)
                if (parsed.length > 0) {
                    const WANTED = ['USDC', 'SOSO', 'ETH']
                    const defaultTokens = parsed
                        .filter(t => WANTED.includes(t.token.toUpperCase().trim()) || WANTED.includes(normalizeTokenName(t.token).toUpperCase().trim()))
                        .map(t => t.token)
                    setSelectedTokens(defaultTokens.length > 0 ? defaultTokens : parsed.slice(0, 3).map(t => t.token))
                }

            } catch (err) {
                console.error('Failed to fetch overall token flow data', err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [])

    const stats = useMemo(() => {
        if (!data.length) return { totalInflow: 0, totalOutflow: 0, totalRetained: 0, avgRetention: 0 }

        const pricedTokens = data.filter(t => t.has_price)
        const totalInflow = pricedTokens.reduce((acc, curr) => acc + (curr.deposit_usd || 0), 0)
        const totalOutflow = pricedTokens.reduce((acc, curr) => acc + (curr.withdrawal_usd || 0), 0)
        const totalRetained = totalInflow - totalOutflow
        const avgRetention = totalInflow > 0 ? (totalRetained / totalInflow) * 100 : 0

        return { totalInflow, totalOutflow, totalRetained, avgRetention }
    }, [data])

    // Use all tokens for the dropdown instead of top 10
    const allTokens = useMemo(() => data, [data])

    // Determine active color palette
    const activeColors = useMemo(() => {
        if (metricType === 'Deposits') return DEPOSIT_COLORS
        if (metricType === 'Withdrawals') return WITHDRAWAL_COLORS
        return RETENTION_COLORS
    }, [metricType])

    // Build Time Series Data for Market Overview Chart
    const chartData = useMemo(() => {
        if (selectedTokens.length === 0 || data.length === 0) return []

        // 1. Gather all unique dates across selected tokens
        const selectedTokensData = data.filter(t => selectedTokens.includes(t.token))
        const dateSet = new Set<string>()
        selectedTokensData.forEach(t => {
            t.history.forEach(h => dateSet.add(h.date))
        })

        // 2. Filter dates based on timeRange
        const now = new Date()
        let cutoff = new Date(now)
        switch (timeRange) {
            case '24hr': cutoff.setDate(now.getDate() - 1); break;
            case '7day': cutoff.setDate(now.getDate() - 7); break;
            case '30day': cutoff.setDate(now.getDate() - 30); break;
            case '3month': cutoff.setMonth(now.getMonth() - 3); break;
            case '6month': cutoff.setMonth(now.getMonth() - 6); break;
            case '1year': cutoff.setFullYear(now.getFullYear() - 1); break;
            case 'All Time': cutoff = new Date(0); break;
        }
        const cutoffTime = cutoff.getTime()

        let sortedDates = Array.from(dateSet)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

        if (timeRange !== 'All Time') {
            sortedDates = sortedDates.filter(d => new Date(d).getTime() >= cutoffTime)
        }

        // 3. Construct unified data points
        const merged: any[] = []

        // Track last known values for forward filling
        const lastKnownValues: Record<string, number> = {}

        sortedDates.forEach(date => {
            const point: any = { date }
            selectedTokensData.forEach(t => {
                const historyPoint = t.history.find(h => h.date === date)
                if (historyPoint) {
                    let val = 0;
                    if (metricType === 'Retention') val = t.has_price ? (historyPoint.cumulative_usd || 0) : historyPoint.cumulative
                    if (metricType === 'Deposits') val = t.has_price ? (historyPoint.cumulative_depo_usd || 0) : historyPoint.cumulative_depo
                    if (metricType === 'Withdrawals') val = t.has_price ? (historyPoint.cumulative_wth_usd || 0) : historyPoint.cumulative_wth

                    point[t.token] = val
                    lastKnownValues[t.token] = val
                } else {
                    // Forward fill missing dates
                    point[t.token] = lastKnownValues[t.token] || 0
                }
            })
            merged.push(point)
        })

        return merged
    }, [data, selectedTokens, timeRange, metricType])


    if (isLoading || !mounted) {
        return (
            <Card className="col-span-full p-8 bg-card/40 backdrop-blur-xl border-border/20 rounded-[2.5rem] animate-pulse">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-secondary/20" />
                    <div className="h-4 w-48 bg-secondary/20 rounded-lg" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-secondary/10 rounded-3xl" />
                    ))}
                </div>
                <div className="h-96 bg-secondary/5 rounded-3xl" />
            </Card>
        )
    }

    const toggleToken = (token: string) => {
        setSelectedTokens(prev => {
            if (prev.includes(token)) {
                return prev.filter(t => t !== token)
            } else {
                if (prev.length >= 10) return prev // Max 10 limits? (Actually top 10 is the limit anyway)
                return [...prev, token]
            }
        })
    }

    return (
        <div className="space-y-6 w-full max-w-7xl mx-auto pb-12">
            {/* Aggregate Intelligence Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard
                    title="Total Ecosystem Inflow"
                    value={`$${formatNumber(stats.totalInflow)}`}
                    color="blue"
                />
                <SummaryCard
                    title="Net Retention (USD)"
                    value={`$${formatNumber(stats.totalRetained)}`}
                    color="emerald"
                />
                <SummaryCard
                    title="Active Token Pairs"
                    value={data.length.toString()}
                    color="orange"
                />
            </div>

            {/* Premium Market Overview Chart */}
            <Card className="p-6 md:p-8 bg-card/60 backdrop-blur-2xl border-border/10 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mr-32 -mt-32 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full pointer-events-none" />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 relative z-50">
                    <div className="flex items-center gap-4 flex-wrap">
                        <h2 className="text-xl font-bold text-foreground tracking-tight">Market Overview</h2>

                        {/* Custom Dropdown for Token Selection */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`flex items-center gap-3 px-5 py-2.5 transition-all duration-300 rounded-2xl border text-sm font-bold shadow-lg ${isDropdownOpen
                                    ? 'bg-card/90 border-orange-500/50 text-orange-400 shadow-orange-500/20'
                                    : 'bg-card/40 border-border/10 text-foreground/80 hover:bg-card/60 hover:border-border/20'
                                    } backdrop-blur-xl`}
                            >
                                <div className="flex -space-x-2 mr-1">
                                    {selectedTokens.slice(0, 3).map((token) => {
                                        const index = allTokens.findIndex(t => t.token === token)
                                        const color = index !== -1 ? activeColors[index % activeColors.length] : '#888'
                                        return (
                                            <div key={token} className="w-4 h-4 rounded-full border border-background z-10" style={{ backgroundColor: color }} />
                                        )
                                    })}
                                </div>
                                Compare Assets
                                <div className="bg-secondary/30 px-2 py-0.5 rounded-md text-[10px]">
                                    {selectedTokens.length}/10
                                </div>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-orange-400' : 'text-muted-foreground/60'}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 mt-3 w-72 bg-card/95 backdrop-blur-2xl border border-border/10 rounded-2xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-4 bg-secondary/20 border-b border-border/5 flex items-center justify-between">
                                        <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Available Ecosystem Assets</span>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto p-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                        {allTokens.map((t, index) => {
                                            const isSelected = selectedTokens.includes(t.token)
                                            const color = activeColors[index % activeColors.length]
                                            return (
                                                <button
                                                    key={t.token}
                                                    onClick={() => toggleToken(t.token)}
                                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-left mb-1 last:mb-0 ${isSelected ? 'bg-orange-500/10' : 'hover:bg-secondary/20'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-3 h-3 rounded-full shadow-sm ${isSelected ? 'shadow-current' : ''}`} style={{ backgroundColor: color, color: color }} />
                                                        <span className={`text-sm font-bold ${isSelected ? 'text-foreground' : 'text-foreground/70'}`}>{t.token}</span>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-orange-500 border-orange-500 text-black' : 'border-border/20 text-transparent'
                                                        }`}>
                                                        <Check className="w-3 h-3" strokeWidth={3} />
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timeframe & Metric Selectors */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                        {/* Metric Selector */}
                        <div className="flex flex-wrap gap-1 bg-secondary/10 p-1 rounded-2xl border border-border/5">
                            {(['Retention', 'Deposits', 'Withdrawals'] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMetricType(m)}
                                    className={`text-[10px] font-bold px-4 py-2 rounded-xl transition-all ${metricType === m
                                        ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                                        : 'text-muted-foreground/50 hover:text-foreground hover:bg-secondary/20'
                                        }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>

                        {/* Timeframe Selector */}
                        <div className="flex flex-wrap gap-1 bg-secondary/10 p-1 rounded-2xl border border-border/5">
                            {(['24hr', '7day', '30day', '3month', '6month', '1year', 'All Time'] as const).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`text-[10px] font-bold px-3 py-2 rounded-xl transition-all ${timeRange === range
                                        ? 'bg-secondary/40 text-foreground shadow-sm'
                                        : 'text-muted-foreground/50 hover:text-foreground hover:bg-secondary/20'
                                        }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Active Selection Legend */}
                {selectedTokens.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 mb-6 relative z-10">
                        {selectedTokens.map(token => {
                            const index = allTokens.findIndex(t => t.token === token)
                            const color = index !== -1 ? activeColors[index % activeColors.length] : '#888'
                            return (
                                <div key={token} className="flex items-center gap-2 px-3 py-1 bg-secondary/10 border border-border/10 rounded-lg">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="text-[10px] font-bold text-foreground/80">{token}</span>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* The Chart */}
                <div className="h-[400px] w-full mt-4 -mx-4 lg:mx-0">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <defs>
                                    {selectedTokens.map((token) => {
                                        const index = allTokens.findIndex(t => t.token === token)
                                        const color = index !== -1 ? activeColors[index % activeColors.length] : '#888'
                                        return (
                                            <linearGradient key={`grad-${token}`} id={`color-${token}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                                            </linearGradient>
                                        )
                                    })}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => {
                                        const d = new Date(val);
                                        return `${d.getMonth() + 1}/${d.getDate()}`
                                    }}
                                    stroke="currentColor"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: 'currentColor', opacity: 0.4, fontWeight: 'bold' }}
                                    dy={10}
                                />
                                <YAxis
                                    tickFormatter={(val) => val === 0 ? '0' : `$${formatNumber(val)}`}
                                    stroke="currentColor"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: 'currentColor', opacity: 0.4, fontWeight: 'bold' }}
                                    width={60}
                                    dx={-10}
                                />
                                <RechartsTooltip
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const d = new Date(label as string | number)
                                            const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : label;
                                            return (
                                                <div className="bg-card/95 backdrop-blur-md border border-border/20 p-4 rounded-2xl shadow-2xl min-w-[200px]">
                                                    <p className="text-[10px] text-muted-foreground/60 font-bold mb-3 uppercase">{dateStr}</p>
                                                    <div className="space-y-3">
                                                        {payload.map((entry: any, i: number) => (
                                                            <div key={i} className="flex items-center justify-between gap-6">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                    <span className="text-xs font-bold text-foreground/80">{entry.name}</span>
                                                                </div>
                                                                <span className={`text-xs font-bold ${entry.value < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                    {entry.value > 1000 || entry.value < -1000 ? `$${formatNumber(Math.abs(entry.value))}${entry.value < 0 ? ' ↓' : ''}` : entry.value.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                {selectedTokens.map((token) => {
                                    const index = allTokens.findIndex(t => t.token === token)
                                    const color = index !== -1 ? activeColors[index % activeColors.length] : '#888'
                                    return (
                                        <Area
                                            key={token}
                                            type="monotone"
                                            dataKey={token}
                                            name={token}
                                            stroke={color}
                                            fillOpacity={1}
                                            fill={`url(#color-${token})`}
                                            strokeWidth={3}
                                            isAnimationActive={true}
                                            animationDuration={1500}
                                            activeDot={{ r: 6, strokeWidth: 0, fill: color }}
                                        />
                                    )
                                })}
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center border-2 border-dashed border-border/10 rounded-3xl">
                            <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">Select tokens to compare flows</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Token Table - Detailed View */}
            <Card className="p-6 bg-card/40 backdrop-blur-xl border-border/10 rounded-[2.5rem] overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-orange-400" />
                        Complete Asset Directory
                    </h3>
                    <div className="px-3 py-1 bg-secondary/20 rounded-full text-[10px] font-bold text-muted-foreground/60 uppercase">
                        {data.length} Tracked Assets
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border/5 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-bold">
                                <th className="pb-3 pl-2">Asset</th>
                                <th className="pb-3">Total Inflow</th>
                                <th className="pb-3">Total Outflow</th>
                                <th className="pb-3">Retention Rate</th>
                                <th className="pb-3 text-right pr-2">Net Remaining</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/5">
                            {data.map((item) => (
                                <tr key={item.token} className="group hover:bg-orange-500/5 transition-colors">
                                    <td className="py-4 pl-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 border border-border/5">
                                                <span className="text-[10px] font-bold text-foreground/70 uppercase">{item.token.substring(0, 2)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-foreground/90">{item.token}</span>
                                                {!item.has_price && (
                                                    <span className="text-[8px] text-orange-400 font-bold uppercase">No USD Price</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 text-sm font-medium text-foreground/70">
                                        <div className="flex flex-col">
                                            <span>{item.has_price ? `$${formatNumber(item.deposit_usd || 0)}` : '-'}</span>
                                            <span className="text-[10px] text-muted-foreground/60">{formatNumber(item.overall_deposit)} {item.token}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 text-sm font-medium text-foreground/70">
                                        <div className="flex flex-col">
                                            <span>{item.has_price ? `$${formatNumber(item.withdrawal_usd || 0)}` : '-'}</span>
                                            <span className="text-[10px] text-muted-foreground/60">{formatNumber(item.overall_withdrawal)} {item.token}</span>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-foreground/80 w-12">{item.retention_rate.toFixed(1)}%</span>
                                            <div className="flex-1 max-w-[80px] h-1.5 bg-secondary/20 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-orange-500/60 rounded-full"
                                                    style={{ width: `${Math.min(item.retention_rate, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 text-right pr-2">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-sm font-bold ${item.has_price ? 'text-emerald-400' : 'text-foreground/40'}`}>
                                                {item.has_price ? `$${formatNumber(item.net_remaining_usd || 0)}` : '-'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/60">{formatNumber(item.net_remaining)} {item.token}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}

function SummaryCard({ title, value, color }: { title: string, value: string, color: string }) {
    return (
        <Card className="p-6 bg-card/40 border-border/5 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
            {/* Minimal Corner Glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 blur-[60px] opacity-10 bg-current transition-opacity group-hover:opacity-20 text-orange-400" />

            <div className="space-y-1 relative z-10 mt-2">
                <h4 className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">{title}</h4>
                <div className="text-2xl font-black tracking-tight text-foreground">{value}</div>
            </div>
        </Card>
    )
}
