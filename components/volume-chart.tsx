'use client'

import { VolumeChartClient } from '@/components/volume-chart-client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'

interface ChartDataPoint {
  day: string
  spot_vol: number
  futures_vol: number
  total_day_vol: number
}

export function VolumeChart() {
  const [chartData, setChartData] = useState<ChartDataPoint[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const { data: dbData, error: dbError } = await supabase
          .from('site_data')
          .select('data')
          .eq('key', 'volume_chart')
          .single()
        
        if (dbError) throw new Error(`Supabase error: ${dbError.message}`)
        if (!dbData || !dbData.data) throw new Error('Volume chart data not found')

        const data = dbData.data as ChartDataPoint[]
        console.log('[SUPABASE] Fetched volume chart data:', data.length, 'records')
        setChartData(data)
      } catch (error) {
        console.error('[SUPABASE] Error fetching volume data:', error)
        setChartData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return <VolumeChartClient data={null} chartData={chartData || undefined} />
}

