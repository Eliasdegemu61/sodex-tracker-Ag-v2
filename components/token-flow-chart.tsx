'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Card } from '@/components/ui/card'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts'
import { formatNumber } from '@/lib/format-number'
import { ChevronDown, Check, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type TimeFrame = '7day' | '30day' | '6month' | '1year'

interface DailyFlow {
    date: string
    timestamp: number
    token: string
    depo: number
    wth: number
}

export function TokenFlowChart() {
    const [dailyFlows, setDailyFlows] = useState<DailyFlow[]>([])
    const [selectedToken, setSelectedToken] = useState<string>('USDC')
    const [timeRange, setTimeRange] = useState<TimeFrame>('30day')
    const [isLoading, setIsLoading] = useState(true)
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        async function fetchData() {
            try {
                const dailyRes = await fetch('/api/site-data/daily-flows')
                if (!dailyRes.ok) throw new Error('Failed to fetch daily flows')
                const dailyData = await dailyRes.json() as string[][]

                const processed: DailyFlow[] = []
                for (let i = 1; i < dailyData.length; i++) {
                    const values = dailyData[i]
                    if (values.length >= 4) {
                        const dateStr = values[0].trim()
                        processed.push({
                            date: dateStr,
                            timestamp: new Date(dateStr).getTime(),
                            token: values[1].trim(),
                            depo: parseFloat(values[2].trim()),
                            wth: parseFloat(values[3].trim())
                        })
                    }
                }

                // Pre-sort once on fetch
                processed.sort((a, b) => a.timestamp - b.timestamp)
                setDailyFlows(processed)

                // Set default token if USDC not available
                const tokens = Array.from(new Set(processed.map(f => f.token)))
                if (tokens.length > 0 && !tokens.includes('USDC')) {
                    const firstToken = tokens.sort()[0]
                    setSelectedToken(firstToken)
                }
            } catch (err) {
                console.error('Error fetching token flow data:', err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [])

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

    // Pre-group by token for O(1) lookup during interaction
    const flowsByToken = useMemo(() => {
        const map: Record<string, DailyFlow[]> = {}
        dailyFlows.forEach(f => {
            if (!map[f.token]) map[f.token] = []
            map[f.token].push(f)
        })
        return map
    }, [dailyFlows])

    const availableTokens = useMemo(() => {
        return Object.keys(flowsByToken).sort()
    }, [flowsByToken])

    const chartData = useMemo(() => {
        const tokenData = flowsByToken[selectedToken] || []
        if (tokenData.length === 0) return []

        const now = new Date()
        let cutoff = now.getTime()
        const DAY_MS = 24 * 60 * 60 * 1000

        switch (timeRange) {
            case '7day': cutoff -= 7 * DAY_MS; break;
            case '30day': cutoff -= 30 * DAY_MS; break;
            case '6month': cutoff -= 182 * DAY_MS; break;
            case '1year': cutoff -= 365 * DAY_MS; break;
        }

        // Optimized filtering using pre-sorted timestamp
        const filtered = tokenData.filter(f => f.timestamp >= cutoff)

        return filtered.map(f => ({
            date: f.date,
            deposits: f.depo,
            withdrawals: -f.wth,
            rawWth: f.wth
        }))
    }, [flowsByToken, selectedToken, timeRange])

    const stats = useMemo(() => {
        let totalDepo = 0
        let totalWth = 0
        for (let i = 0; i < chartData.length; i++) {
            totalDepo += chartData[i].deposits
            totalWth += chartData[i].rawWth
        }
        return { totalDepo, totalWth, net: totalDepo - totalWth }
    }, [chartData])

    if (isLoading) {
        return <div className="w-full h-[500px] bg-secondary/5 border border-border animate-pulse rounded-xl mb-6" />
    }

    return (
        <Card className="p-6 md:p-8 bg-background border border-border rounded-xl relative overflow-hidden mb-6">

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 relative z-20">
                <div className="flex items-center gap-4 flex-wrap">
                    <div>
                        <h2 className="text-base font-bold text-foreground tracking-tight">Token Flow Analysis</h2>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Daily deposit vs withdrawal volume</p>
                    </div>

                    {/* Token Selector Dropdown */}
                    <div className="relative ml-2" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 transition-all rounded-lg border text-sm font-bold",
                                isDropdownOpen
                                    ? "bg-background border-foreground text-foreground"
                                    : "bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                            )}
                        >
                            <span className="text-foreground/90 font-black">{selectedToken}</span>
                            <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isDropdownOpen && "rotate-180")} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-52 bg-background border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-2 border-b border-border">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/40">Select Token</span>
                                </div>
                                <div className="max-h-64 overflow-y-auto p-1.5 custom-scrollbar">
                                    {availableTokens.map((token) => (
                                        <button
                                            key={token}
                                            onClick={() => {
                                                setSelectedToken(token)
                                                setIsDropdownOpen(false)
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 mb-1 last:mb-0",
                                                selectedToken === token ? "bg-foreground/5 text-foreground" : "hover:bg-secondary/20 text-foreground/70"
                                            )}
                                        >
                                            <span className="text-sm font-bold">{token}</span>
                                            {selectedToken === token && <Check className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-1">
                    {(['7day', '30day', '6month', '1year'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={cn(
                                "text-[11px] font-bold px-2 py-1 transition-all pb-[3px]",
                                timeRange === range
                                    ? "border-b border-foreground text-foreground"
                                    : "text-muted-foreground/40 hover:text-foreground"
                            )}
                        >
                            {range.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Row - 3 Columns on Mobile */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
                <div className="p-3 md:p-4 rounded-xl bg-background border border-border flex flex-col gap-0.5 md:gap-1">
                    <div className="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-1">
                        <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" />
                        <span className="text-[7px] md:text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest truncate">Deposits</span>
                    </div>
                    <span className="text-xs md:text-xl font-black text-emerald-400 truncate">{formatNumber(stats.totalDepo)} {selectedToken}</span>
                </div>
                <div className="p-3 md:p-4 rounded-xl bg-background border border-border flex flex-col gap-0.5 md:gap-1">
                    <div className="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-1">
                        <ArrowDownRight className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
                        <span className="text-[7px] md:text-[10px] font-bold text-red-500/60 uppercase tracking-widest truncate">Withdrawals</span>
                    </div>
                    <span className="text-xs md:text-xl font-black text-red-400 truncate">{formatNumber(stats.totalWth)} {selectedToken}</span>
                </div>
                <div className="p-3 md:p-4 rounded-xl bg-background border border-border flex flex-col gap-0.5 md:gap-1">
                    <div className="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-1">
                        <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-foreground/40" />
                        <span className="text-[7px] md:text-[10px] font-bold text-foreground/40 uppercase tracking-widest truncate">Net Flow</span>
                    </div>
                    <span className="text-xs md:text-xl font-black text-foreground truncate">{formatNumber(stats.net)} {selectedToken}</span>
                </div>
            </div>

            <div className="h-[350px] w-full mt-4 -mx-4 md:mx-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 0, left: 0, bottom: 5 }}
                        stackOffset="sign"
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10, fontWeight: 'bold' }}
                            tickFormatter={(val) => {
                                const d = new Date(val)
                                return `${d.getMonth() + 1}/${d.getDate()}`
                            }}
                            dy={10}
                            padding={{ left: 0, right: 0 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10, fontWeight: 'bold' }}
                            tickFormatter={(val) => formatNumber(Math.abs(val))}
                            width={42}
                            dx={0}
                        />
                        <RechartsTooltip
                            cursor={false}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    const d = new Date(label as string)
                                    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                    return (
                                        <div className="bg-background border border-border p-4 rounded-xl shadow-xl min-w-[180px]">
                                            <p className="text-[10px] text-muted-foreground/60 font-black mb-3 uppercase tracking-widest">{dateStr}</p>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                        <span className="text-xs font-bold text-foreground/80">Deposits</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-emerald-400">+{formatNumber(payload[0].value as number)}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                                        <span className="text-xs font-bold text-foreground/80">Withdrawals</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-red-400">-{formatNumber(Math.abs(payload[1].value as number))}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                                return null
                            }}
                        />
                        <ReferenceLine y={0} stroke="currentColor" opacity={0.1} />
                        <Bar
                            dataKey="deposits"
                            stackId="a"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                            isAnimationActive={false} // Performance optimization
                        />
                        <Bar
                            dataKey="withdrawals"
                            stackId="a"
                            fill="#ef4444"
                            radius={[0, 0, 4, 4]}
                            maxBarSize={40}
                            isAnimationActive={false} // Performance optimization
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </Card>
    )
}
