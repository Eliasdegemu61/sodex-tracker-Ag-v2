import { processSpotTradesToPositions } from '../lib/spot-pnl-engine';
import { SpotTrade, SymbolData } from '../lib/sodex-api';

const mockSymbols = new Map<number, SymbolData>();
mockSymbols.set(1, { symbolID: 1, name: 'BTC/USDT', baseCoin: 'BTC', quoteCoin: 'USDT' });

const mockTrades: SpotTrade[] = [
    {
        account_id: 1061,
        symbol_id: 1,
        trade_id: 1,
        side: 1, // Buy
        user_id: 1061,
        order_id: 100,
        cl_ord_id: 'buy-1',
        price: '40000',
        quantity: '1.0',
        fee: '40', // 0.1% fee
        ts_ms: 1000,
        is_maker: true
    },
    {
        account_id: 1061,
        symbol_id: 1,
        trade_id: 2,
        side: 2, // Sell half
        user_id: 1061,
        order_id: 101,
        cl_ord_id: 'sell-1',
        price: '45000',
        quantity: '0.5',
        fee: '22.5',
        ts_ms: 2000,
        is_maker: true
    },
    {
        account_id: 1061,
        symbol_id: 1,
        trade_id: 3,
        side: 1, // Buy more
        user_id: 1061,
        order_id: 102,
        cl_ord_id: 'buy-2',
        price: '42000',
        quantity: '0.5',
        fee: '21',
        ts_ms: 3000,
        is_maker: true
    },
    {
        account_id: 1061,
        symbol_id: 1,
        trade_id: 4,
        side: 2, // Sell remaining 1.0 (0.5 from buy-1 and 0.5 from buy-2)
        user_id: 1061,
        order_id: 103,
        cl_ord_id: 'sell-2',
        price: '48000',
        quantity: '1.0',
        fee: '48',
        ts_ms: 4000,
        is_maker: true
    }
];

const positions = processSpotTradesToPositions(mockTrades, mockSymbols);

console.log('Processed Positions:');
positions.forEach(p => {
    console.log(`- ${p.pairName}: Qty ${p.closedSize}, PnL ${p.realizedPnlValue}, Fee ${p.tradingFee}, Entry ${p.avg_entry_price}, Exit ${p.avg_close_price}`);
});

// Calculations check:
// Trade 2 (Sell 0.5): 
//   Matches against 0.5 from Trade 1 (Buy 1.0 @ 40000)
//   Cost: 0.5 * 40000 = 20000
//   Rev: 0.5 * 45000 = 22500
//   Gross PnL: 2500
//   Matched Buy Fee: 0.5/1.0 * 40 = 20
//   Sell Fee: 22.5
//   Total Fee: 42.5
//   Net PnL: 2500 - 42.5 = 2457.5

// Trade 4 (Sell 1.0):
//   Matches 0.5 remaining from Trade 1 (Buy 1.0 @ 40000)
//   Matches 0.5 from Trade 3 (Buy 0.5 @ 42000)
//   Total Cost: (0.5 * 40000) + (0.5 * 42000) = 20000 + 21000 = 41000
//   Rev: 1.0 * 48000 = 48000
//   Gross PnL: 7000
//   Matched Buy Fee: (0.5/1.0 * 20 remaining) wait... 
//     Trade 1 initial fee 40. After trade 2, 20 remains. Match 0.5/0.5 * 20 = 20.
//     Trade 3 initial fee 21. Match 0.5/0.5 * 21 = 21.
//     Total Matched Buy Fee: 20 + 21 = 41
//   Sell Fee: 48
//   Total Fee: 89
//   Net PnL: 7000 - 89 = 6911
