'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { formatNumber } from '@/lib/format-number'

export function TVLCard() {
  const [tvl, setTvl] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTVL() {
      try {
        const response = await fetch('/api/sodex/tvl', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        if (data.tvl !== undefined) {
          setTvl(data.tvl)
        } else {
          throw new Error('Invalid TVL data')
        }
      } catch (err) {
        console.error('[v0] Error fetching TVL data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch TVL')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTVL()
  }, [])

  if (isLoading) {
    return (
      <Card className="p-5 bg-card/95 shadow-sm border border-border/20 rounded-3xl animate-pulse">
        <div className="h-[40px] bg-secondary/10 rounded-xl" />
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-5 bg-card/95 shadow-sm border border-red-500/20 rounded-3xl">
        <h3 className="text-[10px] font-bold  text-red-400/60  mb-2">Sync Error</h3>
        <p className="text-[10px] text-muted-foreground/30 font-bold uppercase ">TVL connectivity lost</p>
      </Card>
    )
  }

  return (
    <Card className="p-5 bg-card/95 shadow-sm border border-border/20 rounded-3xl shadow-sm group hover:border-orange-500/20 transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground/80 dark:text-muted-foreground/60">Value Locked</h3>
        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-xl font-bold tracking-tight text-foreground">
          {formatNumber(tvl)}
        </div>
        <div className="text-[8px] text-muted-foreground/30 font-bold   group-hover:text-orange-400/40 transition-colors">
          MAG7.SSI
        </div>
      </div>
    </Card>
  )
}

