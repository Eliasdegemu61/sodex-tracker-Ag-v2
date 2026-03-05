'use client'

import { Card } from '@/components/ui/card'
import { PerpsLeaderboard } from '@/components/perps-leaderboard'

export function LeaderboardPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col space-y-2">
      {/* Content */}

      {/* Content */}
      <div className="flex-1">
        <PerpsLeaderboard />
      </div>
    </div>
  )
}

