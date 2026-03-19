// Spot PnL Engine - Matches buy/sell trades via FIFO
import { EnrichedPosition, SpotTrade, SymbolData, SpotMatchDetail } from './sodex-api';

/**
 * Processes a list of individual spot trades into "Positions" (round trips)
 * suitable for the journal engine.
 */
export function processSpotTradesToPositions(
    trades: SpotTrade[],
    symbolMap: Map<number, SymbolData>
): EnrichedPosition[] {
    // 1. Group by symbol
    const groups = new Map<number, SpotTrade[]>();
    for (const t of trades) {
        if (!groups.has(t.symbol_id)) groups.set(t.symbol_id, []);
        groups.get(t.symbol_id)!.push(t);
    }

    const positions: EnrichedPosition[] = [];

    // 2. Process each symbol
    for (const [symbolId, symbolTrades] of groups.entries()) {
        // Sort trades by timestamp ascending
        const sortedTrades = [...symbolTrades].sort((a, b) => a.ts_ms - b.ts_ms);
        
        // buyQueue tracks unfulfilled buy orders for FIFO matching
        const buyQueue: { trade_id: number; quantity: number; price: number; ts: number; fee: number }[] = [];
        
        const symbol = symbolMap.get(symbolId);
        const pairName = symbol?.name || `SYMBOL_${symbolId}`;

        for (const trade of sortedTrades) {
            const price = parseFloat(trade.price);
            const quantity = parseFloat(trade.quantity);
            const fee = parseFloat(trade.fee || '0');

            if (trade.side === 1) { // Buy
                buyQueue.push({ trade_id: trade.trade_id, quantity, price, ts: trade.ts_ms, fee });
            } else if (trade.side === 2) { // Sell
                let remainingSellQty = quantity;
                let totalGrossPnL = 0;
                let totalMatchedCost = 0;
                let earliestBuyTs = trade.ts_ms;
                let totalMatchedBuyFee = 0;
                
                // Match this sell against the buy queue (FIFO)
                const matches: SpotMatchDetail[] = [];
                while (remainingSellQty > 0 && buyQueue.length > 0) {
                    const buy = buyQueue[0];
                    const matchQty = Math.min(remainingSellQty, buy.quantity);
                    
                    if (buy.ts < earliestBuyTs) earliestBuyTs = buy.ts;

                    const cost = matchQty * buy.price;
                    const revenue = matchQty * price;
                    const pnl = revenue - cost;
                    
                    // Calculate proportion of the original buy fee that applies to this match
                    const buyFeePortion = (matchQty / (buy.quantity + (matchQty > 0 ? 0 : 1))) * buy.fee;
                    const sellFeePortion = (matchQty / quantity) * fee;
                    totalMatchedBuyFee += buyFeePortion;
                    
                    matches.push({
                        buy_trade_id: buy.trade_id,
                        buy_price: buy.price,
                        buy_qty: matchQty,
                        buy_fee: buyFeePortion,
                        buy_ts: buy.ts,
                        sell_trade_id: trade.trade_id,
                        sell_price: price,
                        sell_qty: matchQty,
                        sell_fee: sellFeePortion,
                        sell_ts: trade.ts_ms,
                        pnl: pnl - buyFeePortion - sellFeePortion
                    });

                    totalGrossPnL += pnl;
                    totalMatchedCost += cost;
                    remainingSellQty -= matchQty;
                    
                    // Update remaining quantity and fee in the buy queue item
                    buy.quantity -= matchQty;
                    buy.fee -= buyFeePortion;

                    if (buy.quantity <= 0.0000000001) { // Small epsilon for float safety
                        buyQueue.shift();
                    }
                }

                // Only create a position if we actually matched something
                if (totalMatchedCost > 0) {
                    const totalFees = totalMatchedBuyFee + fee;
                    const netPnl = totalGrossPnL - totalFees;
                    const matchedQty = quantity - remainingSellQty;
                    const avgEntryPrice = totalMatchedCost / matchedQty;

                    positions.push({
                        account_id: trade.account_id,
                        position_id: trade.trade_id, // Use trade_id as position_id or a composite
                        user_id: trade.user_id,
                        symbol_id: trade.symbol_id,
                        margin_mode: 1, // ISOLATED mapping
                        position_side: 2, // LONG (Spot sells close long positions)
                        size: matchedQty.toString(),
                        initial_margin: totalMatchedCost.toString(),
                        avg_entry_price: avgEntryPrice.toString(),
                        cum_open_cost: totalMatchedCost.toString(),
                        cum_trading_fee: totalFees.toString(),
                        cum_closed_size: matchedQty.toString(),
                        avg_close_price: price.toString(),
                        max_size: matchedQty.toString(),
                        realized_pnl: netPnl.toString(),
                        frozen_size: '0',
                        leverage: 1,
                        active: false,
                        is_taken_over: false,
                        take_over_price: '0',
                        created_at: earliestBuyTs,
                        updated_at: trade.ts_ms,
                        // Enriched fields for Journal Engine
                        pairName,
                        marginModeLabel: 'SPOT',
                        positionSideLabel: 'LONG',
                        realizedPnlValue: netPnl,
                        tradingFee: totalFees,
                        closedSize: matchedQty,
                        createdAtFormatted: new Date(earliestBuyTs).toLocaleString(),
                        // Spot-specific details
                        is_spot: true,
                        matches: matches
                    } as EnrichedPosition);
                }
            }
        }
    }

    return positions;
}
