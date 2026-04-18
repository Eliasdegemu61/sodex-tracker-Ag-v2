'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
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
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts'
import { fetchTokenPrices, type TokenPriceMap, normalizeTokenName } from '@/lib/price-service'
import { TokenFlowChart } from '@/components/token-flow-chart'
import { cn } from '@/lib/utils'

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

export function AssetsSkeleton() {
    return (
        <div className="space-y-6 w-full max-w-7xl mx-auto pb-12">
            <div className="relative overflow-hidden rounded-xl border border-border bg-background px-4 py-3">
                <div className="absolute inset-y-0 left-[-35%] w-[35%] bg-gradient-to-r from-transparent via-foreground/10 to-transparent animate-[pulse_1.8s_ease-in-out_infinite]" />
                <div className="relative flex items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="h-2 w-24 rounded-full bg-secondary/20" />
                        <div className="h-3 w-40 rounded-full bg-secondary/10" />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-foreground/50 animate-pulse" />
                        <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/55">
                            Processing asset flow
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
                {[1, 2, 3].map(i => (
                    <Card key={i} className="relative overflow-hidden p-3 md:p-6 bg-background border border-border rounded-lg h-24 md:h-32">
                        <div className="absolute inset-y-0 left-[-45%] w-[45%] bg-gradient-to-r from-transparent via-foreground/8 to-transparent animate-[pulse_1.6s_ease-in-out_infinite]" />
                        <div className="relative flex h-full flex-col justify-between">
                            <div className="h-2 w-16 md:w-24 rounded-full bg-secondary/20" />
                            <div className="h-5 w-14 md:h-7 md:w-24 rounded-full bg-secondary/10" />
                            <div className="h-1.5 w-10 md:w-16 rounded-full bg-secondary/15" />
                        </div>
                    </Card>
                ))}
            </div>
            <Card className="relative overflow-hidden p-6 md:p-8 bg-background border border-border rounded-lg h-[550px]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />
                <div className="absolute inset-y-0 left-[-30%] w-[30%] bg-gradient-to-r from-transparent via-foreground/7 to-transparent animate-[pulse_1.7s_ease-in-out_infinite]" />

                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                    <div className="space-y-3">
                        <div className="h-2 w-20 rounded-full bg-secondary/20" />
                        <div className="h-6 w-48 bg-secondary/10 rounded-full" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-8 w-24 bg-secondary/10 rounded-full" />
                        <div className="h-8 w-32 bg-secondary/10 rounded-full" />
                    </div>
                </div>

                <div className="relative h-[400px] overflow-hidden rounded-lg border border-border/60 bg-secondary/[0.035] p-4 md:p-6">
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,transparent_23px,rgba(127,127,127,0.06)_24px)] bg-[length:100%_24px]" />
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-foreground/[0.06] via-foreground/[0.02] to-transparent" />
                    <div className="relative flex h-full items-end gap-2 md:gap-3">
                        {[38, 54, 46, 70, 58, 82, 68, 88, 74, 92, 64, 84].map((height, index) => (
                            <div key={index} className="flex-1">
                                <div
                                    className="w-full rounded-t-full bg-gradient-to-t from-foreground/15 to-foreground/5 animate-pulse"
                                    style={{
                                        height: `${height}%`,
                                        animationDelay: `${index * 120}ms`,
                                        animationDuration: '1.8s',
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
            <Card className="relative overflow-hidden p-6 bg-background border border-border rounded-lg h-96">
                <div className="absolute inset-y-0 left-[-40%] w-[40%] bg-gradient-to-r from-transparent via-foreground/8 to-transparent animate-[pulse_1.9s_ease-in-out_infinite]" />
                <div className="relative">
                    <div className="h-6 w-48 bg-secondary/10 rounded-full mb-8" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center gap-4 rounded-2xl border border-border/50 bg-secondary/[0.035] px-4 py-4">
                                <div className="h-10 w-10 rounded-2xl bg-secondary/10" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-20 rounded-full bg-secondary/20" />
                                    <div className="h-2 w-32 rounded-full bg-secondary/10" />
                                </div>
                                <div className="space-y-2 text-right">
                                    <div className="ml-auto h-3 w-16 rounded-full bg-secondary/20" />
                                    <div className="ml-auto h-2 w-12 rounded-full bg-secondary/10" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 flex items-center justify-center">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/45">
                            Building comparative view
                        </span>
                    </div>
                </div>
            </Card>
        </div>
    )
}

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
    const [isMetricOpen, setIsMetricOpen] = useState(false)
    const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false)
    const metricRef = useRef<HTMLDivElement>(null)
    const timeRef = useRef<HTMLDivElement>(null)

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
            if (metricRef.current && !metricRef.current.contains(event.target as Node)) {
                setIsMetricOpen(false)
            }
            if (timeRef.current && !timeRef.current.contains(event.target as Node)) {
                setIsTimeRangeOpen(false)
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

                // 2. Fetch data directly from Server APIs
                const [totalsRes, dailyRes] = await Promise.all([
                    fetch('/api/site-data/overall-totals'),
                    fetch('/api/site-data/daily-flows')
                ]);

                if (!totalsRes.ok || !dailyRes.ok) throw new Error('Failed to fetch from API');

                const totalsData = await totalsRes.json() as string[][];
                const dailyData = await dailyRes.json() as string[][];

                // Process daily flows
                const dailyFlowsByToken: Record<string, { date: string, net: number, depo: number, wth: number }[]> = {}

                // Assuming first row is header, skip it
                for (let i = 1; i < dailyData.length; i++) {
                    const values = dailyData[i]
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
                // Process totals (totalsData is string[][] from Supabase)
                for (let i = 1; i < totalsData.length; i++) {
                    const values = totalsData[i]
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

        const selectedTokensData = data.filter(t => selectedTokens.includes(t.token))
        
        // PERFORMANCE: Create lookup maps with PRE-CALCULATED deltas for O(1) access
        const tokenFlowMaps = selectedTokensData.map(t => {
            const map = new Map<string, { depo: number, wth: number, retention: number }>()
            t.history.forEach((h, i) => {
                const prev = i > 0 ? t.history[i - 1] : null

                const depo_val = prev 
                    ? (t.has_price ? (h.cumulative_depo_usd || 0) - (prev.cumulative_depo_usd || 0) : h.cumulative_depo - prev.cumulative_depo)
                    : (t.has_price ? (h.cumulative_depo_usd || 0) : h.cumulative_depo)
                
                const wth_val = prev
                    ? (t.has_price ? (h.cumulative_wth_usd || 0) - (prev.cumulative_wth_usd || 0) : h.cumulative_wth - prev.cumulative_wth)
                    : (t.has_price ? (h.cumulative_wth_usd || 0) : h.cumulative_wth)

                map.set(h.date, {
                    depo: Math.max(0, depo_val),
                    wth: -Math.max(0, wth_val),
                    retention: t.has_price ? (h.cumulative_usd || 0) : h.cumulative
                })
            })
            return { token: t.token, map }
        })

        const dateSet = new Set<string>()
        selectedTokensData.forEach(t => {
            t.history.forEach(h => dateSet.add(h.date))
        })

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

        const merged: any[] = []
        
        sortedDates.forEach((date) => {
            const point: any = { date }

            tokenFlowMaps.forEach(({ token, map }) => {
                const flow = map.get(date)
                
                if (flow) {
                    point[`${token}_depo`] = flow.depo
                    point[`${token}_wth`] = flow.wth
                    point[`${token}_retention`] = flow.retention
                } else {
                    point[`${token}_depo`] = 0
                    point[`${token}_wth`] = 0
                    point[`${token}_retention`] = 0
                }
            })
            merged.push(point)
        })

        return merged
    }, [data, selectedTokens, timeRange])


    if (isLoading || !mounted) {
        return <AssetsSkeleton />
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
        <div className="space-y-6 w-full max-w-7xl mx-auto pb-12 animate-in fade-in duration-1000 slide-in-from-bottom-2">
            {/* Prone to error notice */}
            <div className="flex items-center justify-center px-4 py-2 bg-secondary/5 border border-border rounded-lg">
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground tracking-tight">
                    Notice: This section is prone to data inaccuracies or reporting delays.
                </span>
            </div>

            {/* Aggregate Intelligence Header - 3 Column Stats on Mobile */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
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
            <Card className="p-6 md:p-8 bg-background border border-border rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-0 h-0" />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 relative z-50">
                    <div className="flex items-center gap-4 flex-wrap">
                        <h2 className="text-base font-bold text-foreground tracking-tight">Asset Overview</h2>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Custom Dropdown for Token Selection */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`flex items-center gap-2 px-3 py-1.5 transition-all rounded-full border text-[10px] font-black uppercase tracking-widest ${
                                        isDropdownOpen
                                            ? 'bg-foreground border-foreground text-background'
                                            : 'bg-transparent border-border text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Compare Assets
                                    <span className="opacity-30">/</span>
                                    <span className={isDropdownOpen ? 'text-background' : 'text-foreground'}>{selectedTokens.length}</span>
                                    <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-56 bg-background border border-border rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                                        <div className="max-h-64 overflow-y-auto p-1.5 [&::-webkit-scrollbar]:hidden">
                                            {allTokens.map((t, index) => {
                                                const isSelected = selectedTokens.includes(t.token)
                                                const color = activeColors[index % activeColors.length]
                                                return (
                                                    <button
                                                        key={t.token}
                                                        onClick={() => toggleToken(t.token)}
                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 text-left mb-1 last:mb-0 ${
                                                            isSelected ? 'bg-secondary/20' : 'hover:bg-secondary/10'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                                            <span className={`text-[11px] font-bold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{t.token}</span>
                                                        </div>
                                                        {isSelected && <Check className="w-3 h-3 text-foreground" strokeWidth={3} />}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Metric Selection Dropdown */}
                            <div className="relative" ref={metricRef}>
                                <button
                                    onClick={() => setIsMetricOpen(!isMetricOpen)}
                                    className={`flex items-center gap-2 px-3 py-2 transition-all rounded-lg border text-[11px] md:text-sm font-bold ${
                                        isMetricOpen
                                            ? 'bg-background border-foreground text-foreground'
                                            : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                                    }`}
                                >
                                    <Activity className="w-3.5 h-3.5" />
                                    {metricType}
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isMetricOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isMetricOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-40 bg-background border border-border rounded-xl shadow-xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                                        <div className="p-1.5">
                                            {(['Retention', 'Deposits', 'Withdrawals'] as const).map((m) => (
                                                <button
                                                    key={m}
                                                    onClick={() => { setMetricType(m); setIsMetricOpen(false); }}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 text-left mb-0.5 last:mb-0 ${
                                                        metricType === m ? 'bg-secondary/20 text-foreground font-bold' : 'hover:bg-secondary/10 text-muted-foreground'
                                                    }`}
                                                >
                                                    <span className="text-xs">{m}</span>
                                                    {metricType === m && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Timeframe Selection Dropdown */}
                            <div className="relative" ref={timeRef}>
                                <button
                                    onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}
                                    className={`flex items-center gap-2 px-3 py-2 transition-all rounded-lg border text-[11px] md:text-sm font-bold ${
                                        isTimeRangeOpen
                                            ? 'bg-background border-foreground text-foreground'
                                            : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                                    }`}
                                >
                                    <span className="text-muted-foreground/40 font-mono text-[9px] mr-1">T:</span>
                                    {timeRange}
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isTimeRangeOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isTimeRangeOpen && (
                                    <div className="absolute top-full right-0 lg:left-0 mt-2 w-36 bg-background border border-border rounded-xl shadow-xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                                        <div className="p-1.5">
                                            {(['24hr', '7day', '30day', '3month', '6month', '1year', 'All Time'] as const).map((range) => (
                                                <button
                                                    key={range}
                                                    onClick={() => { setTimeRange(range); setIsTimeRangeOpen(false); }}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 text-left mb-0.5 last:mb-0 ${
                                                        timeRange === range ? 'bg-secondary/20 text-foreground font-bold' : 'hover:bg-secondary/10 text-muted-foreground'
                                                    }`}
                                                >
                                                    <span className="text-xs">{range}</span>
                                                    {timeRange === range && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
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
                <div className="h-[400px] w-full mt-4 -mx-4 md:mx-0">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => {
                                        const d = new Date(val);
                                        return `${d.getMonth() + 1}/${d.getDate()}`
                                    }}
                                    stroke="currentColor"
                                    fontSize={9}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: 'currentColor', opacity: 0.3, fontWeight: 'medium' }}
                                    dy={10}
                                    padding={{ left: 0, right: 0 }}
                                />
                                <YAxis
                                    tickFormatter={(val) => val === 0 ? '0' : `$${formatNumber(Math.abs(val))}`}
                                    stroke="currentColor"
                                    fontSize={9}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: 'currentColor', opacity: 0.3, fontWeight: 'medium' }}
                                    dx={-10}
                                />
                                <Tooltip
                                    cursor={false}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const totalDepo = payload
                                                .filter(p => p.dataKey?.toString().endsWith('_depo'))
                                                .reduce((sum, p) => sum + (Number(p.value) || 0), 0)
                                            const totalWth = payload
                                                .filter(p => p.dataKey?.toString().endsWith('_wth'))
                                                .reduce((sum, p) => sum + (Math.abs(Number(p.value)) || 0), 0)

                                            // Determine which parts to show based on metricType
                                            const showDepo = metricType !== 'Withdrawals'
                                            const showWth = metricType !== 'Deposits'

                                            return (
                                                <div className="bg-background/95 backdrop-blur-xl border border-border p-3 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="mb-2.5 pb-2 border-b border-border/10">
                                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                                            {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {selectedTokens.map((token, index) => {
                                                            const color = activeColors[index % activeColors.length]
                                                            const depo = payload.find(p => p.dataKey === `${token}_depo`)?.value as number || 0
                                                            const wth = Math.abs(payload.find(p => p.dataKey === `${token}_wth`)?.value as number || 0)
                                                            if (depo === 0 && wth === 0) return null
                                                            
                                                            return (
                                                                <div key={token} className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
                                                                        <span className="text-[10px] font-black text-foreground uppercase tracking-tight">{token}</span>
                                                                    </div>
                                                                    <div className="flex flex-col gap-0.5 pl-3">
                                                                        {showDepo && depo > 0 && (
                                                                            <div className="flex items-center justify-between gap-4">
                                                                                <span className="text-[8px] text-muted-foreground uppercase font-bold">Inflow</span>
                                                                                <span className="text-[10px] font-black text-emerald-500">${formatNumber(depo)}</span>
                                                                            </div>
                                                                        )}
                                                                        {showWth && wth > 0 && (
                                                                            <div className="flex items-center justify-between gap-4">
                                                                                <span className="text-[8px] text-muted-foreground uppercase font-bold">Outflow</span>
                                                                                <span className="text-[10px] font-black text-rose-500">${formatNumber(wth)}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                        <div className="pt-2 mt-2 border-t border-border/20 space-y-1">
                                                            {showDepo && totalDepo > 0 && (
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[8px] text-muted-foreground/60 uppercase font-bold">Total In</span>
                                                                    <span className="text-[10px] font-black text-foreground tracking-tighter">${formatNumber(totalDepo)}</span>
                                                                </div>
                                                            )}
                                                            {showWth && totalWth > 0 && (
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[8px] text-muted-foreground/60 uppercase font-bold">Total Out</span>
                                                                    <span className="text-[10px] font-black text-foreground tracking-tighter">${formatNumber(totalWth)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                {selectedTokens.map((token, index) => {
                                    const color = activeColors[index % activeColors.length]
                                    return (
                                        <React.Fragment key={token}>
                                            {(metricType === 'Retention' || metricType === 'Deposits') && (
                                                <Bar 
                                                    dataKey={`${token}_depo`} 
                                                    stackId="a" 
                                                    fill={color} 
                                                    radius={[2, 2, 0, 0]} 
                                                    animationDuration={1000}
                                                />
                                            )}
                                            {(metricType === 'Retention' || metricType === 'Withdrawals') && (
                                                <Bar 
                                                    dataKey={`${token}_wth`} 
                                                    stackId="a" 
                                                    fill={color} 
                                                    opacity={0.5}
                                                    radius={[0, 0, 2, 2]}
                                                    animationDuration={1000}
                                                />
                                            )}
                                        </React.Fragment>
                                    )
                                })}
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center border-2 border-dashed border-border/10 rounded-3xl">
                            <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">Select tokens to compare flows</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* New Flow Chart above Directory */}
            <TokenFlowChart />

            {/* Token Table - Detailed View */}
            <Card className="p-6 bg-background border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-bold text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                        <Layers className="w-3.5 h-3.5" />
                        Complete Asset Directory
                    </h3>
                    <div className="px-3 py-1 bg-secondary/10 border border-border rounded-lg text-[10px] font-bold text-muted-foreground uppercase">
                        {data.length} Assets
                    </div>
                </div>
                {/* Responsive Table/Card View */}
                <div className="mt-4">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
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
                                    <tr key={item.token} className="group hover:bg-secondary/5 transition-colors">
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
                                                <div className="flex-1 max-w-[80px] h-1 bg-secondary/20 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-foreground/60 rounded-full"
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

                    {/* Mobile Card-Based View */}
                    <div className="md:hidden space-y-4">
                        {data.map((item) => (
                            <div key={item.token} className="p-4 bg-secondary/5 rounded-2xl border border-border/5 group active:bg-secondary/10 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center font-black text-xs text-foreground/60 shrink-0">
                                            {item.token.substring(0, 2)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-foreground">{item.token}</div>
                                            {!item.has_price && <div className="text-[8px] text-orange-400 font-bold uppercase">No USD Price</div>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xs font-black ${item.has_price ? 'text-emerald-400' : 'text-foreground/40'}`}>
                                            {item.has_price ? `$${formatNumber(item.net_remaining_usd || 0)}` : '-'}
                                        </div>
                                        <div className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Net Remaining</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/5">
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest mb-0.5">Total Inflow</div>
                                            <div className="text-[10px] font-bold text-foreground/80">{item.has_price ? `$${formatNumber(item.deposit_usd || 0)}` : formatNumber(item.overall_deposit)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest mb-0.5">Total Outflow</div>
                                            <div className="text-[10px] font-bold text-foreground/80">{item.has_price ? `$${formatNumber(item.withdrawal_usd || 0)}` : formatNumber(item.overall_withdrawal)}</div>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col justify-end space-y-3">
                                        <div>
                                            <div className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest mb-0.5">Retention Rate</div>
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="text-[10px] font-bold text-foreground/90">{item.retention_rate.toFixed(1)}%</span>
                                                <div className="w-12 h-1 bg-secondary/20 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500/60" style={{ width: `${Math.min(item.retention_rate, 100)}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest mb-0.5">Balance</div>
                                            <div className="text-[10px] font-bold text-foreground">{formatNumber(item.net_remaining)} {item.token}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    )
}

function SummaryCard({ title, value, color }: { title: string, value: string, color: string }) {
    return (
        <Card className="p-3 md:p-5 bg-background border border-border rounded-lg relative overflow-hidden">
            <div className="space-y-0.5 md:space-y-1">
                <h4 className="text-[8px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{title}</h4>
                <div className="text-sm md:text-xl font-bold tracking-tight text-foreground">{value}</div>
            </div>
        </Card>
    )
}
