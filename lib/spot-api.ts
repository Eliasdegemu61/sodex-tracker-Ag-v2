import { cacheManager } from './cache';
import { fetchAllSpotTrades } from './sodex-api';

export interface SpotTradesData {
  totalVolume: number;
  totalFees: number;
  tradeCount: number;
  progress?: {
    fetchedCount: number;
    estimatedRemainingMs?: number;
  };
}

export async function fetchSpotTradesData(
  userId: string | number,
  onProgress?: (progress: any) => void
): Promise<SpotTradesData> {
  const cacheKey = `spot_trades_data_${userId}`;

  return cacheManager.deduplicate(cacheKey, async () => {
    try {
      console.log('[v0] Fetching all spot trades for user:', userId);

      const allTrades = await fetchAllSpotTrades(userId, onProgress);

      let totalVolume = 0;
      let totalFees = 0;

      allTrades.forEach(trade => {
        const qty = parseFloat(trade.quantity || '0');
        const price = parseFloat(trade.price || '0');
        const fee = parseFloat(trade.fee || '0');
        
        totalVolume += qty * price;
        totalFees += fee;
      });

      console.log('[v0] Spot trades data aggregated:', {
        volume: totalVolume,
        fees: totalFees,
        trades: allTrades.length,
      });

      return {
        totalVolume,
        totalFees,
        tradeCount: allTrades.length,
      };
    } catch (error) {
      console.error('[v0] Failed to fetch spot trades data:', error);
      return {
        totalVolume: 0,
        totalFees: 0,
        tradeCount: 0,
      };
    }
  });
}
