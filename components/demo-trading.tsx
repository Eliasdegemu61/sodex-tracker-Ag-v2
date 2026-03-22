'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Settings, Minimize2, Check, ChevronDown, Search, History } from 'lucide-react';
import { getTokenLogo } from '@/lib/token-logos';
import { cn } from '@/lib/utils';
import { useTheme } from '@/app/providers';

// --- Types ---
interface KlineData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

type MarginMode = 'Isolated' | 'Cross';

interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  margin: number;
  leverage: number;
  mode: MarginMode;
  openedAt: number;
  tpPrice?: number;
  slPrice?: number;
  sizeTokens: number;
}

const INTERVALS = ['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W'] as const;
type Interval = typeof INTERVALS[number];

export function DemoTrading() {
  const { theme } = useTheme();
  
  // -- Trading State (localStorage-persisted) --
  const [balance, setBalance] = useState<number>(() => {
    try { const v = localStorage.getItem('demo_balance'); return v ? parseFloat(v) : 10000; } catch { return 10000; }
  });
  const [positions, setPositions] = useState<Position[]>(() => {
    try { const v = localStorage.getItem('demo_positions'); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [openOrders, setOpenOrders] = useState<Position[]>(() => {
    try { const v = localStorage.getItem('demo_openOrders'); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [closedPositions, setClosedPositions] = useState<any[]>(() => {
    try { const v = localStorage.getItem('demo_closedPositions'); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [leverage, setLeverage] = useState<number>(() => {
    try { const v = localStorage.getItem('demo_leverage'); return v ? parseInt(v) : 10; } catch { return 10; }
  });
  const [marginMode, setMarginMode] = useState<MarginMode>(() => {
    try { const v = localStorage.getItem('demo_marginMode'); return (v as MarginMode) || 'Isolated'; } catch { return 'Isolated'; }
  });

  // -- Persist to localStorage on change --
  useEffect(() => { try { localStorage.setItem('demo_balance', balance.toString()); } catch {} }, [balance]);
  useEffect(() => { try { localStorage.setItem('demo_positions', JSON.stringify(positions)); } catch {} }, [positions]);
  useEffect(() => { try { localStorage.setItem('demo_openOrders', JSON.stringify(openOrders)); } catch {} }, [openOrders]);
  useEffect(() => { try { localStorage.setItem('demo_closedPositions', JSON.stringify(closedPositions)); } catch {} }, [closedPositions]);
  useEffect(() => { try { localStorage.setItem('demo_leverage', leverage.toString()); } catch {} }, [leverage]);
  useEffect(() => { try { localStorage.setItem('demo_marginMode', marginMode); } catch {} }, [marginMode]);

  // -- Non-persisted Trading State --
  const [symbols, setSymbols] = useState<string[]>(['BTC-USD', 'ETH-USD', 'LINK-USD', 'SOL-USD']);
  const [activeSymbol, setActiveSymbol] = useState<string>('BTC-USD');
  const [activeInterval, setActiveInterval] = useState<Interval>('1m');
  const [markPrices, setMarkPrices] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // -- Modals State --
  const [editingTpSlPosId, setEditingTpSlPosId] = useState<string | null>(null);
  const [modalTpPrice, setModalTpPrice] = useState('');
  const [modalSlPrice, setModalSlPrice] = useState('');

  const [closingLimitPosId, setClosingLimitPosId] = useState<string | null>(null);
  const [modalLimitClosePrice, setModalLimitClosePrice] = useState('');
  
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [showLeverageSelector, setShowLeverageSelector] = useState(false);
  const [tempLeverage, setTempLeverage] = useState(10);
  
  // -- 24h Stats --
  const [dayStats, setDayStats] = useState({ change: 0, volume: 0 });
  
  // -- Order Entry State --
  const [orderSide, setOrderSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [orderType, setOrderType] = useState<'Market' | 'Limit'>('Market');
  const [orderMargin, setOrderMargin] = useState('100');
  const [limitPrice, setLimitPrice] = useState('');
  const [balanceSlider, setBalanceSlider] = useState(0);
  const [useTpSl, setUseTpSl] = useState(false);
  const [tpPriceStr, setTpPriceStr] = useState('');
  const [slPriceStr, setSlPriceStr] = useState('');
  
  // -- View State --
  const [bottomTab, setBottomTab] = useState<'Positions' | 'OpenOrders' | 'History'>('Positions');

  // -- Chart State --
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<IChartApi | null>(null);
  const [candlestickSeries, setCandlestickSeries] = useState<ISeriesApi<"Candlestick"> | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(true);

  // Helper: Current price of the active symbol
  const activePrice = markPrices[activeSymbol] || 0;

  const fetchKlines = useCallback(async (symbol: string, interval: string) => {
    try {
      const res = await fetch(`https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?limit=1500&symbol=${symbol}&interval=${interval}`);
      if (!res.ok) return [];
      const json = await res.json();
      if (json.code !== 0 || !json.data) return [];
      
      const klines: KlineData[] = json.data.map((d: any) => ({
        time: Math.floor(d.t / 1000) as any,
        open: parseFloat(d.o),
        high: parseFloat(d.h),
        low: parseFloat(d.l),
        close: parseFloat(d.c),
      }));
      
      return klines.reverse();
    } catch (e) {
      console.error('Error fetching klines', e);
      return [];
    }
  }, []);

  const fetchLatestPriceOnly = useCallback(async (symbol: string) => {
    try {
      // Fetch just 1 candle to get latest close price for efficiency
      const res = await fetch(`https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?limit=1&symbol=${symbol}&interval=1m`);
      if (!res.ok) return null;
      const json = await res.json();
      if (json.code !== 0 || !json.data || json.data.length === 0) return null;
      return parseFloat(json.data[0].c);
    } catch {
      return null;
    }
  }, []);

  // Fetch all available pairs on mount
  useEffect(() => {
    fetch('https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/agg-tickers')
      .then(res => res.json())
      .then(json => {
        if (json.code === 0 && json.data) {
          const allSymbols: string[] = [];
          const initialPrices: Record<string, number> = {};
          
          json.data.forEach((ticker: any) => {
            if (ticker.s && ticker.s.endsWith('-USD')) {
               allSymbols.push(ticker.s);
               initialPrices[ticker.s] = parseFloat(ticker.c);
            }
          });
          
          if (allSymbols.length > 0) {
            // Sort to keep major pairs on top, then alphabetical
            const topPairs = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'LINK-USD'];
            const others = allSymbols.filter(s => !topPairs.includes(s)).sort();
            setSymbols([...topPairs.filter(s => allSymbols.includes(s)), ...others]);
          }
          
          setMarkPrices(prev => ({ ...initialPrices, ...prev }));
        }
      })
      .catch(console.error);
  }, []);

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.5)',
      },
      grid: {
        vertLines: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.05)' },
        horzLines: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.05)' },
      },
      crosshair: {
        mode: 1, 
        vertLine: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)' },
        horzLine: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)' }
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      },
      rightPriceScale: {
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        autoScale: true,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      handleScroll: {
        vertTouchDrag: false,
        pressedMouseMove: true,
        mouseWheel: true,
        horzTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true, // re-enable vertical drag on price scale
        },
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#2ebd85',
      downColor: '#e0294a',
      borderVisible: false,
      wickUpColor: '#2ebd85',
      wickDownColor: '#e0294a',
    });

    setChartInstance(chart);
    setCandlestickSeries(series as any);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [theme]);

  // Load Main Chart Data and Sync active price
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const loadData = async () => {
      setIsLoadingChart(true);
      const data = await fetchKlines(activeSymbol, activeInterval);
      if (candlestickSeries && data.length > 0) {
        candlestickSeries.setData(data);
        setMarkPrices(prev => ({ ...prev, [activeSymbol]: data[data.length - 1].close }));
        
        // Ensure chart fits new data and price scale resets
        if (chartInstance) {
          chartInstance.timeScale().fitContent();
          // Explicitly reset price scale to auto if it got stuck
          chartInstance.priceScale('right').applyOptions({ autoScale: true });
        }
      }
      setIsLoadingChart(false);
    };

    if (candlestickSeries) {
      loadData();
      
      // Fetch 1D stats
      fetchKlines(activeSymbol, '1D').then(data => {
        if (data && data.length > 0) {
          const latestDay = data[data.length - 1];
          const prevDayClose = data.length > 1 ? data[data.length - 2].close : latestDay.open;
          const changePercent = ((latestDay.close - prevDayClose) / prevDayClose) * 100;
          setDayStats({ change: changePercent, volume: 0 }); // Volume not in basic kline
        }
      });
    }
  }, [activeSymbol, activeInterval, candlestickSeries, fetchKlines]);

  const getLiquidationPrice = useCallback((pos: Position) => {
    if (pos.mode === 'Isolated') {
      if (pos.side === 'LONG') {
        return pos.entryPrice * (1 - 1 / pos.leverage);
      } else {
        return pos.entryPrice * (1 + 1 / pos.leverage);
      }
    } else {
      const totalMarginForLiq = pos.margin + balance; 
      if (pos.side === 'LONG') {
        const liq = pos.entryPrice - (totalMarginForLiq / pos.sizeTokens);
        return Math.max(0, liq); 
      } else {
        const liq = pos.entryPrice + (totalMarginForLiq / pos.sizeTokens);
        return liq;
      }
    }
  }, [balance]);

  // Global Price Poller (Updates active symbol's chart AND background active position prices)
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const pollPrices = async () => {
      // Determine unique symbols we need prices for
      const symbolsToFetch = new Set<string>();
      symbolsToFetch.add(activeSymbol);
      positions.forEach(p => symbolsToFetch.add(p.symbol));
      openOrders.forEach(o => symbolsToFetch.add(o.symbol));

      const newMarkPrices = { ...markPrices };

      await Promise.all(
        Array.from(symbolsToFetch).map(async (sym) => {
          if (sym === activeSymbol && candlestickSeries) {
            // Update active symbol via full klines to update the chart candle correctly
            const latest = await fetchKlines(sym, activeInterval);
            if (latest.length > 0) {
              const lastCandle = latest[latest.length - 1];
              candlestickSeries.update(lastCandle);
              newMarkPrices[sym] = lastCandle.close;
            }
          } else {
            // For background symbols, just get the latest close price
            const price = await fetchLatestPriceOnly(sym);
            if (price !== null) newMarkPrices[sym] = price;
          }
        })
      );

      setMarkPrices(newMarkPrices);

      // Check Open Orders to execute Limit Orders
      setOpenOrders(prev => {
         const remaining = [...prev];
         const toExecute: Position[] = [];
         for (let i = remaining.length - 1; i >= 0; i--) {
            const order = remaining[i];
            const livePx = newMarkPrices[order.symbol];
            if (!livePx) continue;
            
            let executed = false;
            // A basic check: if longing, price drops at/below limit. If shorting, price rises at/above limit.
            if (order.side === 'LONG' && livePx <= order.entryPrice) executed = true;
            if (order.side === 'SHORT' && livePx >= order.entryPrice) executed = true;
            
            if (executed) {
               toExecute.push(order);
               remaining.splice(i, 1);
            }
         }
         if (toExecute.length > 0) {
            setPositions(p => [...toExecute, ...p]);
         }
         return remaining;
      });

      // Check TP / SL or Liquidations
      positions.forEach(pos => {
        const livePx = newMarkPrices[pos.symbol];
        if (!livePx) return;
        
        let shouldClose = false;
        if (pos.side === 'LONG') {
          if (pos.tpPrice && livePx >= pos.tpPrice) shouldClose = true;
          if (pos.slPrice && livePx <= pos.slPrice) shouldClose = true;
          
          // Liquidation check
          const liqPx = pos.entryPrice * (1 - 1 / pos.leverage);
          if (livePx <= liqPx) shouldClose = true;
        } else {
          if (pos.tpPrice && livePx <= pos.tpPrice) shouldClose = true;
          if (pos.slPrice && livePx >= pos.slPrice) shouldClose = true;
          
          const liqPx = getLiquidationPrice(pos);
          if (livePx >= liqPx) shouldClose = true;
        }

        if (shouldClose) {
          handleClosePosition(pos.id, true); 
        }
      });
    };

    if (candlestickSeries) {
      intervalId = setInterval(pollPrices, 3000);
    }

    return () => clearInterval(intervalId);
  }, [activeSymbol, activeInterval, positions, markPrices, fetchKlines, candlestickSeries, getLiquidationPrice]); // Added getLiquidationPrice to deps

  // -- Trading Logic --
  const handleOpenPosition = () => {
    const margin = parseFloat(orderMargin);
    if (!activePrice || isNaN(margin) || margin <= 0 || margin > balance) {
      alert("Invalid margin or insufficient balance!");
      return;
    }

    if (orderType === 'Limit' && (!limitPrice || isNaN(parseFloat(limitPrice)))) {
       alert("Please enter a valid limit price.");
       return;
    }

    let tp = parseFloat(tpPriceStr);
    let sl = parseFloat(slPriceStr);

    const entryPx = orderType === 'Limit' ? parseFloat(limitPrice) : activePrice;
    const sizeTokens = (margin * leverage) / entryPx;

    const newPosition: Position = {
      id: Math.random().toString(36).substr(2, 9),
      symbol: activeSymbol,
      side: orderSide,
      entryPrice: entryPx,
      margin,
      leverage,
      mode: marginMode,
      openedAt: Date.now(),
      sizeTokens,
      tpPrice: useTpSl && !isNaN(tp) ? tp : undefined,
      slPrice: useTpSl && !isNaN(sl) ? sl : undefined,
    };

    setBalance(prev => prev - margin);
    if (orderType === 'Limit') {
      setOpenOrders(prev => [newPosition, ...prev]);
    } else {
      setPositions(prev => [newPosition, ...prev]);
    }
  };
  
  const handleCancelOrder = (id: string) => {
    setOpenOrders(prev => {
      const order = prev.find(o => o.id === id);
      if (order) setBalance(b => b + order.margin);
      return prev.filter(o => o.id !== id);
    });
  };

  const handleSliderChange = (val: number) => {
    setBalanceSlider(val);
    if (val === 0) {
      setOrderMargin('');
    } else {
      setOrderMargin((balance * (val / 100)).toFixed(2));
    }
  };

  const calculatePnL = useCallback((pos: Position, currentPrice: number) => {
    if (!currentPrice) return 0;
    const posValue = pos.margin * pos.leverage;
    if (pos.side === 'LONG') {
      return ((currentPrice - pos.entryPrice) / pos.entryPrice) * posValue;
    } else {
      return ((pos.entryPrice - currentPrice) / pos.entryPrice) * posValue;
    }
  }, []);

  const handleClosePosition = (id: string, isMarket: boolean, priceOverride?: number) => {
    setPositions(prev => {
      const pos = prev.find(p => p.id === id);
      if (!pos) return prev;
      
      if (!isMarket && priceOverride) {
         // Create a Limit order to close it natively
         const closeOrder: Position = {
           ...pos,
           id: Math.random().toString(36).substr(2, 9),
           side: pos.side === 'LONG' ? 'SHORT' : 'LONG', // Opposite side to close
           entryPrice: priceOverride, // The limit price
           openedAt: Date.now()
         };
         setOpenOrders(o => [closeOrder, ...o]);
         return prev.filter(p => p.id !== id); // Remove from active positions, wait, normally limit close doesn't remove the position until filled. 
         // For a basic demo simulator, we can just treat the limit close as "it will close when price hits".
      }
      
      // Market Close
      const px = priceOverride || markPrices[pos.symbol];
      const pnl = px ? calculatePnL(pos, px) : 0;
      
      // Update balance
      setBalance(b => b + pos.margin + pnl);
      setClosedPositions(c => [{ ...pos, closePrice: px, realizedPnl: pnl, closedAt: Date.now() }, ...c]);
      
      return prev.filter(p => p.id !== id);
    });
  };

  // Define UI chunks for responsive layout splitting without duplicating logic
  const orderFormTopUI = (
    <div className="w-full flex-none flex flex-col border-b border-border/50 lg:border-none">
       {/* Margin Mode & Leverage */}
       <div className="p-3 border-b border-border space-y-3">
         <div className="flex gap-2 relative">
           <div className="flex-1 bg-muted/50 rounded-lg p-1 flex">
             <button onClick={() => setMarginMode('Cross')} className={cn("flex-1 text-xs font-bold py-1.5 rounded-md transition-all", marginMode === 'Cross' ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>Cross</button>
             <button onClick={() => setMarginMode('Isolated')} className={cn("flex-1 text-xs font-bold py-1.5 rounded-md transition-all", marginMode === 'Isolated' ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>Isolated</button>
           </div>
           <button 
             onClick={() => {
               setTempLeverage(leverage);
               setShowLeverageSelector(!showLeverageSelector);
             }} 
             className="px-3 bg-muted/50 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1 border border-transparent hover:border-border focus:ring-1 focus:ring-border group outline-none"
           >
             {leverage}x
             <ChevronDown className={cn("w-3 h-3 transition-transform group-hover:text-foreground text-muted-foreground/50", showLeverageSelector && "rotate-180")} />
           </button>

           {/* Leverage Popover */}
           {showLeverageSelector && (
             <>
               <div className="fixed inset-0 z-40" onClick={() => setShowLeverageSelector(false)} />
               <div className="absolute top-12 right-0 w-64 bg-card border border-border shadow-2xl rounded-xl z-50 p-4 animate-in fade-in zoom-in-95 duration-100">
                 <div className="flex justify-between items-center mb-4 text-sm font-bold text-foreground">
                    <span>Adjust Leverage</span>
                    <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md border border-border">
                       <input 
                          type="number" 
                          min={1} 
                          max={100} 
                          value={tempLeverage} 
                          onChange={(e) => setTempLeverage(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-10 bg-transparent text-right outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                       />
                       <span className="text-muted-foreground text-xs">x</span>
                    </div>
                 </div>
                 <input 
                    type="range"
                    min={1}
                    max={100}
                    value={tempLeverage}
                    onChange={(e) => setTempLeverage(parseInt(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer mb-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary slider-thumb"
                    style={{
                       background: `linear-gradient(to right, #f97316 ${(tempLeverage - 1) * (100 / 99)}%, #3f3f46 ${(tempLeverage - 1) * (100 / 99)}%)`
                    }}
                 />
                 <button 
                    onClick={() => {
                       setLeverage(tempLeverage);
                       setShowLeverageSelector(false);
                    }}
                    className="w-full bg-foreground text-background font-bold text-sm py-2 rounded-lg hover:bg-foreground/90 transition-colors"
                 >
                    Confirm
                 </button>
               </div>
             </>
           )}
         </div>
       </div>
       
       <div className="flex divide-x divide-border/50 lg:divide-x-0 lg:flex-col">
         {/* Order Type Tabs */}
         <div className="flex-1 flex p-2 gap-1 lg:p-3 lg:gap-2">
           <button 
             onClick={() => setOrderType('Market')}
             className={cn("flex-1 py-1.5 rounded text-[11px] lg:text-xs transition-colors font-bold tracking-wide lg:tracking-normal uppercase lg:capitalize", orderType === 'Market' ? "bg-foreground text-background shadow-sm" : "text-muted-foreground lg:hover:bg-muted")}
           >
             Market
           </button>
           <button 
             onClick={() => setOrderType('Limit')}
             className={cn("flex-1 py-1.5 rounded text-[11px] lg:text-xs transition-colors font-bold tracking-wide lg:tracking-normal uppercase lg:capitalize", orderType === 'Limit' ? "bg-foreground text-background shadow-sm" : "text-muted-foreground lg:hover:bg-muted")}
           >
             Limit
           </button>
         </div>
         
         {/* Buy / Sell Tabs */}
         <div className="flex-1 flex p-2 gap-1 lg:px-3 lg:pb-3 lg:gap-2">
           <button 
             onClick={() => setOrderSide('LONG')}
             className={cn("flex-1 py-1.5 rounded font-bold text-[11px] lg:text-xs transition-colors tracking-wide lg:tracking-normal uppercase lg:capitalize", orderSide === 'LONG' ? "bg-emerald-500 text-white shadow-sm" : "bg-muted text-muted-foreground lg:hover:bg-muted/80")}
           >
             Buy / Long
           </button>
           <button 
             onClick={() => setOrderSide('SHORT')}
             className={cn("flex-1 py-1.5 rounded font-bold text-[11px] lg:text-xs transition-colors tracking-wide lg:tracking-normal uppercase lg:capitalize", orderSide === 'SHORT' ? "bg-red-500 text-white shadow-sm" : "bg-muted text-muted-foreground lg:hover:bg-muted/80")}
           >
             Sell / Short
           </button>
         </div>
       </div>
    </div>
  );

  const orderFormBottomUI = (
    <div className="px-4 py-4 space-y-4 flex-1 lg:overflow-y-auto">
      <div className="flex justify-between items-center text-xs font-semibold">
        <span className="text-muted-foreground">Available Balance</span>
        <span className="text-foreground font-mono">{balance.toFixed(2)} USDC</span>
      </div>
      
      {/* Limit Price Input */}
      {orderType === 'Limit' && (
        <div className="space-y-2 relative">
          <div className="relative group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground pointer-events-none group-focus-within:text-foreground/80 transition-colors">Order Price</span>
            <input 
              type="number" 
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="w-full h-9 bg-muted/50 border border-transparent rounded-lg text-right px-3 pl-20 text-xs font-mono text-foreground focus:outline-none focus:border-border focus:ring-1 focus:ring-border transition-all placeholder:text-muted-foreground/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              placeholder={activePrice.toFixed(2)}
            />
          </div>
        </div>
      )}
      
      {/* Margin/Amount Input */}
      <div className="space-y-2 relative">
        <div className="relative group">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none group-focus-within:text-foreground/80 transition-colors">Amount</span>
          <input 
             type="number" 
             value={orderMargin}
             onChange={(e) => {
               const val = e.target.value;
               setOrderMargin(val);
               const num = parseFloat(val);
               if (!isNaN(num) && balance > 0) {
                 setBalanceSlider(Math.min(100, Math.round((num / balance) * 100)));
               } else {
                 setBalanceSlider(0);
               }
             }}
             className="w-full h-10 bg-muted/50 border border-transparent rounded-lg text-right pr-[60px] pl-16 text-sm font-mono text-foreground focus:outline-none focus:border-border focus:ring-1 focus:ring-border transition-all placeholder:text-muted-foreground/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
           />
           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">USDC</span>
        </div>
      </div>
      
      <div className="pt-2 pb-1 relative">
        <input 
           type="range" 
           min={0} 
           max={100} 
           value={balanceSlider} 
           onChange={(e) => handleSliderChange(parseInt(e.target.value))}
           className="w-full h-1.5 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary slider-thumb relative z-10"
           style={{
             background: `linear-gradient(to right, #f97316 ${balanceSlider}%, #3f3f46 ${balanceSlider}%)`
           }}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground font-bold mt-2 font-mono">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
      
      {/* TP / SL Checkbox */}
      <div className="pt-2">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className={cn("w-4 h-4 rounded-sm flex items-center justify-center border transition-all", useTpSl ? "bg-primary border-primary" : "border-border bg-transparent group-hover:border-foreground/20")}>
            {useTpSl && <Check className="w-3 h-3 text-primary-foreground absolute" />}
          </div>
          <input type="checkbox" checked={useTpSl} onChange={(e) => setUseTpSl(e.target.checked)} className="hidden" />
          <span className="text-xs font-semibold text-foreground/80 group-hover:text-foreground transition-colors">Take Profit / Stop Loss</span>
        </label>
        
        {useTpSl && (
          <div className="space-y-2 mt-4 animate-in slide-in-from-top-2 fade-in duration-200">
             <div className="relative group">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground pointer-events-none">TP Price</span>
               <input 
                 type="number" 
                 value={tpPriceStr}
                 onChange={(e) => setTpPriceStr(e.target.value)}
                 placeholder="0.00"
                 className="w-full h-9 bg-muted/50 border border-transparent rounded text-right px-3 pl-16 text-xs font-mono text-foreground focus:outline-none focus:border-border transition-all placeholder:text-muted-foreground/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
               />
             </div>
             <div className="relative group">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground pointer-events-none">SL Price</span>
               <input 
                 type="number" 
                 value={slPriceStr}
                 onChange={(e) => setSlPriceStr(e.target.value)}
                 placeholder="0.00"
                 className="w-full h-9 bg-muted/50 border border-transparent rounded text-right px-3 pl-16 text-xs font-mono text-foreground focus:outline-none focus:border-border transition-all placeholder:text-muted-foreground/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
               />
             </div>
          </div>
        )}
      </div>
      
      {/* Action Button */}
      <div className="pt-4">
         <button 
           onClick={handleOpenPosition}
           className={cn(
             "w-full h-12 rounded-lg font-black text-[13px] uppercase tracking-widest text-white transition-all shadow-sm",
             orderSide === 'LONG' ? "bg-emerald-500 hover:bg-emerald-500/90" : "bg-red-500 hover:bg-red-500/90"
           )}
         >
           {orderSide === 'LONG' ? 'Buy / Long' : 'Sell / Short'}
         </button>
      </div>
      
      {/* Order Summaries */}
      <div className="space-y-2 pt-4 border-t border-border/50">
         <div className="flex justify-between text-xs font-medium">
           <span className="text-muted-foreground">Order Value</span>
           <span className="text-foreground/80 font-mono">{(parseFloat(orderMargin || '0') * leverage).toFixed(2)} USDC</span>
         </div>
         <div className="flex justify-between text-xs font-medium">
           <span className="text-muted-foreground">Margin Required</span>
           <span className="text-foreground/80 font-mono">{(parseFloat(orderMargin || '0')).toFixed(2)} USDC</span>
         </div>
         <div className="flex justify-between text-xs font-medium">
           <span className="text-muted-foreground">Estimated Fee</span>
           <span className="text-foreground/80 font-mono">0.038%</span>
         </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col animate-in fade-in duration-500 font-sans min-h-screen bg-background text-foreground">
      
      {/* --- Top Ticker Bar --- */}
      <div className="flex-none h-14 border-b border-border bg-card/50 flex items-center justify-between px-4 sticky top-0 z-10">
        
        <div className="flex items-center gap-6">
          <div className="relative">
            <button 
              onClick={() => setShowPairSelector(!showPairSelector)}
              className="flex items-center gap-2 hover:bg-muted/50 py-1.5 px-2 rounded-lg transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border overflow-hidden">
                {getTokenLogo(activeSymbol) ? (
                   <img src={getTokenLogo(activeSymbol)} alt={activeSymbol} className="w-full h-full object-cover" />
                ) : (
                   <span className="text-[10px] font-bold text-foreground">{activeSymbol.split('-')[0]}</span>
                )}
              </div>
              <div className="flex flex-col items-start translate-y-[1px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-tight text-foreground">{activeSymbol}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", showPairSelector && "rotate-180")} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-[0.05em] text-muted-foreground/80 leading-none">Perpetual</span>
              </div>
            </button>

            {/* Pair Selector Dropdown */}
            {showPairSelector && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPairSelector(false)} />
                <div className="absolute top-12 left-0 w-64 bg-card border border-border shadow-2xl rounded-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                   <div className="p-2 border-b border-border/50 bg-muted/20 relative">
                     <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                     <input 
                       type="text" 
                       placeholder="Search Pairs" 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full bg-transparent border-none text-xs font-medium focus:outline-none pl-8 text-foreground placeholder:text-muted-foreground/50"
                     />
                   </div>
                   <div className="flex flex-col py-1 max-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                     {symbols.filter(sym => sym.toLowerCase().includes(searchQuery.toLowerCase())).map(sym => (
                       <button
                         key={sym}
                         onClick={() => {
                           setActiveSymbol(sym);
                           setShowPairSelector(false);
                           setSearchQuery('');
                         }}
                         className={cn("flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors", activeSymbol === sym && "bg-muted/30")}
                       >
                         <div className="flex items-center gap-2">
                            {getTokenLogo(sym) && <img src={getTokenLogo(sym)} alt={sym} className="w-5 h-5 rounded-full bg-background/50 p-0.5 border border-border/10" />}
                            <span className="font-bold text-foreground">{sym}</span>
                         </div>
                         <span className="text-xs font-mono text-muted-foreground">
                            {markPrices[sym] ? markPrices[sym].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '--'}
                         </span>
                       </button>
                     ))}
                   </div>
                </div>
              </>
            )}
          </div>
          
          <div className="h-6 w-[1px] bg-border/50 hidden md:block"></div>
          
          <div className="flex flex-col">
            <span className="text-[9px] md:text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Mark Price</span>
            <span className={cn("text-xs md:text-sm font-bold tracking-tighter tabular-nums", activePrice > 0 ? "text-foreground" : "text-muted-foreground")}>
              {activePrice > 0 ? activePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '--'}
            </span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[9px] md:text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">24h Change</span>
            <span className={cn("text-xs md:text-sm font-bold tracking-tighter tabular-nums", dayStats.change >= 0 ? "text-emerald-500" : "text-red-500")}>
              {dayStats.change >= 0 ? '+' : ''}{dayStats.change.toFixed(2)}%
            </span>
          </div>
          
          <div className="flex flex-col hidden sm:flex">
            <span className="text-[9px] md:text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">24h Volume</span>
            <span className="text-xs md:text-sm font-bold text-foreground tracking-tighter tabular-nums">--</span>
          </div>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 lg:h-[calc(100vh-140px)] lg:overflow-hidden overflow-visible">
        
        {/* Left Side: Chart + Integrated Tables */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">

          {/* Mobile: Order Form Top (Above Chart) - hidden on desktop */}
          <div className="lg:hidden w-full bg-card/10 flex-none border-b border-border">
            {orderFormTopUI}
          </div>

          {/* Integrated Panel (Chart + Tables) */}
          <div className="flex-none lg:flex-1 flex flex-col min-h-[500px] lg:min-h-0 p-1.5 md:p-2 lg:p-4 min-w-0">
            <Card className="flex-1 flex flex-col overflow-hidden border-border/50 bg-card/30 shadow-xl">
              {/* Chart Tools Bar */}
              <div className="px-3 md:px-4 py-1.5 md:py-2 flex items-center justify-between bg-muted/20 border-b border-border/50">
                <div className="flex items-center gap-3 md:gap-4">
                  <span className="text-[9px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Time</span>
                  <div className="flex space-x-0.5">
                    {INTERVALS.map((int) => (
                      <button
                        key={int}
                        onClick={() => setActiveInterval(int)}
                        className={cn(
                          "px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-semibold rounded transition-all",
                          activeInterval === int ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {int}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1 hover:bg-muted rounded transition-colors">
                    <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              
              <div className="relative flex-1 min-h-0 overflow-hidden bg-background/50">
                {isLoadingChart && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                  </div>
                )}
                <div className="absolute inset-0">
                  <div ref={chartContainerRef} className="w-full h-full" />
                </div>
              </div>

              {/* Desktop: Positions & Orders Table (Integrated into Chart Card) */}
              <div className="hidden lg:flex h-[300px] flex-col border-t border-border bg-card/50">
                 <div className="flex items-center border-b border-border/50 px-4 bg-muted/10">
                    <button 
                      onClick={() => setBottomTab('Positions')}
                      className={cn("text-[10px] uppercase tracking-wider font-bold px-4 py-2.5 border-b-[2px] transition-all relative top-[1px]", bottomTab === 'Positions' ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}
                    >
                      Positions ({positions.length})
                    </button>
                    <button 
                      onClick={() => setBottomTab('OpenOrders')}
                      className={cn("text-[10px] uppercase tracking-wider font-bold px-4 py-2.5 border-b-[2px] transition-all relative top-[1px]", bottomTab === 'OpenOrders' ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}
                    >
                      Open Orders ({openOrders.length})
                    </button>
                    <button 
                      onClick={() => setBottomTab('History')}
                      className={cn("text-[10px] uppercase tracking-wider font-bold px-4 py-2.5 border-b-[2px] transition-all relative top-[1px] flex items-center gap-1.5", bottomTab === 'History' ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}
                    >
                      <History className="w-3 h-3" /> History
                    </button>
                 </div>
                 
                 <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                   {bottomTab === 'Positions' && (
                     <table className="w-full text-left whitespace-nowrap">
                       <thead className="sticky top-0 z-10">
                        <tr className="border-b border-border text-[9px] text-muted-foreground font-bold uppercase tracking-widest bg-muted/30 backdrop-blur-sm">
                          <th className="px-4 py-2 font-medium">Symbol</th>
                          <th className="px-4 py-2 font-medium text-right">Size</th>
                          <th className="px-4 py-2 font-medium text-right">Entry</th>
                          <th className="px-4 py-2 font-medium text-right">Mark</th>
                          <th className="px-4 py-2 font-medium text-right">Liq.</th>
                          <th className="px-4 py-2 font-medium text-right">Margin</th>
                          <th className="px-4 py-2 font-medium text-right">PnL (ROE%)</th>
                          <th className="px-4 py-2 font-medium text-right">TP/SL</th>
                          <th className="px-4 py-2 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {positions.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-xs text-muted-foreground font-semibold">No open positions</td>
                          </tr>
                        ) : positions.map(pos => {
                          const livePx = markPrices[pos.symbol] || pos.entryPrice;
                          const pnl = calculatePnL(pos, livePx);
                          const pnlROE = (pnl / pos.margin) * 100;
                          const liqPx = getLiquidationPrice(pos);

                          return (
                            <tr key={pos.id} className="hover:bg-muted/10 text-[11px] font-mono transition-colors">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className={cn("w-[2px] h-3 rounded-full", pos.side === 'LONG' ? "bg-emerald-500" : "bg-red-500")} />
                                  {getTokenLogo(pos.symbol) && <img src={getTokenLogo(pos.symbol)} alt={pos.symbol} className="w-4 h-4 rounded-full" />}
                                  <span className="font-bold text-foreground font-sans uppercase">{pos.symbol}</span>
                                  <span className={cn("text-[8px] font-bold px-1 rounded-sm", pos.side === 'LONG' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                                    {pos.leverage}x
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium text-foreground/80">{pos.sizeTokens.toFixed(4)}</td>
                              <td className="px-4 py-2.5 text-right font-medium text-foreground/80">{pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                              <td className="px-4 py-2.5 text-right font-medium text-foreground/80">{livePx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                              <td className="px-4 py-2.5 text-right font-medium text-primary">{liqPx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="px-4 py-2.5 text-right font-medium text-foreground/80">{pos.margin.toFixed(2)}</td>
                              <td className="px-4 py-2.5 text-right">
                                 <span className={cn("font-bold", pnl >= 0 ? "text-emerald-500" : "text-red-500")}>
                                   {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlROE >= 0 ? '+' : ''}{pnlROE.toFixed(2)}%)
                                 </span>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button 
                                  onClick={() => {
                                    setEditingTpSlPosId(pos.id);
                                    setModalTpPrice(pos.tpPrice ? pos.tpPrice.toString() : '');
                                    setModalSlPrice(pos.slPrice ? pos.slPrice.toString() : '');
                                  }}
                                  className="text-[9px] font-bold text-muted-foreground border-b border-dashed border-muted-foreground/50 hover:text-foreground hover:border-foreground/50 transition-colors"
                                >
                                  {pos.tpPrice || '--'} / {pos.slPrice || '--'}
                                </button>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="flex gap-1 justify-end">
                                  <button onClick={() => {
                                      setClosingLimitPosId(pos.id);
                                      setModalLimitClosePrice('');
                                    }} 
                                    className="text-[9px] uppercase font-bold text-muted-foreground border border-border px-1.5 py-0.5 rounded hover:text-foreground hover:border-foreground/30 transition-colors"
                                  >
                                    Limit
                                  </button>
                                  <button onClick={() => handleClosePosition(pos.id, true)} className="text-[9px] uppercase font-bold text-muted-foreground border border-border px-1.5 py-0.5 rounded hover:text-foreground hover:border-foreground/30 transition-colors">
                                    Market
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                     </table>
                   )}

                   {bottomTab === 'OpenOrders' && (
                     <table className="w-full text-left whitespace-nowrap">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-border text-[9px] text-muted-foreground font-bold uppercase tracking-widest bg-muted/30 backdrop-blur-sm">
                          <th className="px-4 py-2 font-medium">Symbol</th>
                          <th className="px-4 py-2 font-medium text-right">Size</th>
                          <th className="px-4 py-2 font-medium text-right">Order</th>
                          <th className="px-4 py-2 font-medium text-right">Mark</th>
                          <th className="px-4 py-2 font-medium text-right">Margin</th>
                          <th className="px-4 py-2 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {openOrders.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground font-semibold">No open limit orders</td>
                          </tr>
                        ) : openOrders.map(order => {
                          const livePx = markPrices[order.symbol] || order.entryPrice;
                          
                          return (
                            <tr key={order.id} className="hover:bg-muted/10 text-[11px] font-mono transition-colors">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className={cn("w-[2px] h-3 rounded-full", order.side === 'LONG' ? "bg-emerald-500" : "bg-red-500")} />
                                  <span className="font-bold text-foreground font-sans uppercase">{order.symbol}</span>
                                  <span className={cn("text-[8px] font-bold px-1 rounded-sm", order.side === 'LONG' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                                    {order.leverage}x
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium text-foreground/80">{order.sizeTokens.toFixed(4)}</td>
                              <td className="px-4 py-2.5 text-right font-medium text-foreground/80">{order.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                              <td className="px-4 py-2.5 text-right font-medium text-foreground/80">{livePx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                              <td className="px-4 py-2.5 text-right font-medium text-foreground/80">{order.margin.toFixed(2)} USDC</td>
                              <td className="px-4 py-2.5 text-right">
                                <button onClick={() => handleCancelOrder(order.id)} className="text-[9px] uppercase font-bold text-red-500 border border-red-500/50 px-1.5 py-0.5 rounded hover:bg-red-500 hover:text-white transition-colors">
                                  Cancel
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                     </table>
                   )}

                   {bottomTab === 'History' && (
                     <table className="w-full text-left whitespace-nowrap">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-border text-[9px] text-muted-foreground font-bold uppercase tracking-widest bg-muted/30 backdrop-blur-sm">
                          <th className="px-4 py-2 font-medium">Symbol</th>
                          <th className="px-4 py-2 font-medium text-right">Size</th>
                          <th className="px-4 py-2 font-medium text-right">Entry</th>
                          <th className="px-4 py-2 font-medium text-right">Close</th>
                          <th className="px-4 py-2 font-medium text-right">PnL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {closedPositions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-xs text-muted-foreground font-semibold">No position history</td>
                          </tr>
                        ) : closedPositions.map((pos, idx) => (
                          <tr key={idx} className="hover:bg-muted/10 text-[11px] font-mono transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className={cn("w-[2px] h-3 rounded-full", pos.side === 'LONG' ? "bg-emerald-500" : "bg-red-500")} />
                                {getTokenLogo(pos.symbol) && <img src={getTokenLogo(pos.symbol)} alt={pos.symbol} className="w-4 h-4 rounded-full" />}
                                <span className="font-bold text-foreground font-sans uppercase">{pos.symbol}</span>
                                <span className={cn("text-[8px] font-bold px-1 rounded-sm", pos.side === 'LONG' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                                  {pos.leverage}x
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-foreground/80">{pos.sizeTokens.toFixed(4)}</td>
                            <td className="px-4 py-2.5 text-right font-medium text-foreground/80">{pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                            <td className="px-4 py-2.5 text-right font-medium text-foreground/80">{pos.closePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                            <td className="px-4 py-2.5 text-right">
                               <span className={cn("font-bold", pos.realizedPnl >= 0 ? "text-emerald-500" : "text-red-500")}>
                                 {pos.realizedPnl >= 0 ? '+' : ''}{pos.realizedPnl.toFixed(2)}
                               </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                     </table>
                   )}
                 </div>
              </div>
            </Card>
          </div>

          {/* Mobile: Order Form Bottom (Below Chart) - hidden on desktop */}
          <div className="lg:hidden w-full border-t border-border bg-card/30 flex-none pb-4">
            {orderFormBottomUI}
          </div>


        </div>

        {/* Desktop: Full Order Form sidebar (Hidden on Mobile) */}
        <div className="hidden lg:flex w-[320px] flex-none border-l border-border bg-card/30 flex-col overflow-y-auto">
          {orderFormTopUI}
          {orderFormBottomUI}
        </div>
      </div>

      {/* Mobile Positions & Orders Tabs (Hidden on Desktop) */}
      <div className="lg:hidden flex flex-col border-t border-border bg-card flex-none">
         <div className="flex items-center border-b border-border px-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            <button 
              onClick={() => setBottomTab('Positions')}
              className={cn("whitespace-nowrap text-xs font-bold px-4 py-3 border-b-[2px] transition-all relative top-[1px]", bottomTab === 'Positions' ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}
            >
              Positions ({positions.length})
            </button>
            <button 
              onClick={() => setBottomTab('OpenOrders')}
              className={cn("whitespace-nowrap text-xs font-bold px-4 py-3 border-b-[2px] transition-all relative top-[1px]", bottomTab === 'OpenOrders' ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}
            >
              Open Orders ({openOrders.length})
            </button>
            <button 
              onClick={() => setBottomTab('History')}
              className={cn("whitespace-nowrap text-xs font-bold px-4 py-3 border-b-[2px] transition-all relative top-[1px] flex items-center gap-1.5", bottomTab === 'History' ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}
            >
              <History className="w-3.5 h-3.5" /> History
            </button>
         </div>
         
         <div className="p-3 space-y-3">
           {bottomTab === 'Positions' && (
             positions.length === 0 ? (
               <div className="py-8 text-center text-xs text-muted-foreground font-semibold">No open positions</div>
             ) : positions.map(pos => {
               const livePx = markPrices[pos.symbol] || pos.entryPrice;
               const pnl = calculatePnL(pos, livePx);
               const pnlROE = (pnl / pos.margin) * 100;
               const liqPx = getLiquidationPrice(pos);

               return (
                 <div key={pos.id} className="bg-muted/30 border border-border/50 rounded-lg p-4 space-y-4">
                   <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2">
                       <span className={cn("w-[2px] h-3 rounded-full", pos.side === 'LONG' ? "bg-emerald-500" : "bg-red-500")} />
                       {getTokenLogo(pos.symbol) && <img src={getTokenLogo(pos.symbol)} alt={pos.symbol} className="w-6 h-6 rounded-full" />}
                       <span className="font-bold text-base">{pos.symbol}</span>
                       <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-sm", pos.side === 'LONG' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                         {pos.side} {pos.leverage}x
                       </span>
                     </div>
                     <div className="text-right">
                       <div className={cn("font-bold text-base", pnl >= 0 ? "text-emerald-500" : "text-red-500")}>
                         {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                       </div>
                       <div className={cn("text-[10px] font-semibold", pnlROE >= 0 ? "text-emerald-500/80" : "text-red-500/80")}>
                         {pnlROE >= 0 ? '+' : ''}{pnlROE.toFixed(2)}%
                       </div>
                     </div>
                   </div>
                   <div className="grid grid-cols-3 gap-2 text-[10px]">
                     <div>
                       <div className="text-muted-foreground/70 mb-0.5">Size</div>
                       <div className="font-semibold">{pos.sizeTokens.toFixed(4)}</div>
                     </div>
                     <div>
                       <div className="text-muted-foreground/70 mb-0.5">Margin</div>
                       <div className="font-semibold">{pos.margin.toFixed(2)}</div>
                     </div>
                     <div>
                       <div className="text-muted-foreground/70 mb-0.5">Entry</div>
                       <div className="font-semibold">{pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div>
                     </div>
                     <div>
                       <div className="text-muted-foreground/70 mb-0.5">Mark</div>
                       <div className="font-semibold">{livePx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div>
                     </div>
                     <div>
                       <div className="text-muted-foreground/70 mb-0.5">Liq.</div>
                       <div className="font-semibold text-primary">{liqPx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                     </div>
                     <div>
                       <div className="text-muted-foreground/70 mb-0.5">TP/SL</div>
                       <button 
                          onClick={() => {
                            setEditingTpSlPosId(pos.id);
                            setModalTpPrice(pos.tpPrice ? pos.tpPrice.toString() : '');
                            setModalSlPrice(pos.slPrice ? pos.slPrice.toString() : '');
                          }}
                          className="font-bold text-muted-foreground border-b border-dashed border-muted-foreground/50"
                       >
                          {pos.tpPrice || '--'} / {pos.slPrice || '--'}
                       </button>
                     </div>
                   </div>
                   <div className="flex gap-2 pt-2 border-t border-border/50">
                      <button onClick={() => {
                          setClosingLimitPosId(pos.id);
                          setModalLimitClosePrice('');
                        }} 
                        className="flex-1 text-[11px] uppercase font-bold text-muted-foreground border border-border py-2 rounded hover:bg-muted transition-colors"
                      >
                        Limit Close
                      </button>
                      <button onClick={() => handleClosePosition(pos.id, true)} className="flex-1 text-[11px] uppercase font-bold text-muted-foreground border border-red-500/20 py-2 rounded text-red-500 hover:bg-red-500/10 transition-colors">
                        Market Close
                      </button>
                   </div>
                 </div>
               );
             })
           )}

           {bottomTab === 'OpenOrders' && (
             openOrders.length === 0 ? (
               <div className="py-8 text-center text-xs text-muted-foreground font-semibold">No open limit orders</div>
             ) : openOrders.map(order => {
               const livePx = markPrices[order.symbol] || order.entryPrice;
               return (
                 <div key={order.id} className="bg-muted/30 border border-border/50 rounded-lg p-4 space-y-4">
                   <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2">
                       <span className={cn("w-[2px] h-3 rounded-full", order.side === 'LONG' ? "bg-emerald-500" : "bg-red-500")} />
                       {getTokenLogo(order.symbol) && <img src={getTokenLogo(order.symbol)} alt={order.symbol} className="w-6 h-6 rounded-full" />}
                       <span className="font-bold text-base">{order.symbol}</span>
                       <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-sm", order.side === 'LONG' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                         {order.side} {order.leverage}x
                       </span>
                     </div>
                     <button onClick={() => handleCancelOrder(order.id)} className="text-[10px] uppercase font-bold text-red-500 border border-red-500/50 px-2 py-1 rounded hover:bg-red-500 hover:text-white transition-colors">
                        Cancel
                     </button>
                   </div>
                   <div className="grid grid-cols-2 gap-2 text-[10px]">
                     <div>
                       <div className="text-muted-foreground/70 mb-0.5">Size</div>
                       <div className="font-semibold">{order.sizeTokens.toFixed(4)}</div>
                     </div>
                     <div>
                       <div className="text-muted-foreground/70 mb-0.5">Order</div>
                       <div className="font-semibold">{order.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div>
                     </div>
                     <div>
                       <div className="text-muted-foreground/70 mb-0.5">Mark</div>
                       <div className="font-semibold">{livePx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div>
                     </div>
                     <div>
                       <div className="text-muted-foreground/70 mb-0.5">Margin</div>
                       <div className="font-semibold">{order.margin.toFixed(2)} USDC</div>
                     </div>
                   </div>
                 </div>
               );
             })
           )}

           {bottomTab === 'History' && (
             closedPositions.length === 0 ? (
               <div className="py-8 text-center text-xs text-muted-foreground font-semibold">No position history</div>
             ) : closedPositions.map((pos, idx) => (
               <div key={idx} className="bg-muted/30 border border-border/50 rounded-lg p-4 space-y-4">
                 <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     <span className={cn("w-[2px] h-3 rounded-full", pos.side === 'LONG' ? "bg-emerald-500" : "bg-red-500")} />
                     {getTokenLogo(pos.symbol) && <img src={getTokenLogo(pos.symbol)} alt={pos.symbol} className="w-6 h-6 rounded-full" />}
                     <span className="font-bold text-base">{pos.symbol}</span>
                     <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-sm", pos.side === 'LONG' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                       {pos.side} {pos.leverage}x
                     </span>
                   </div>
                   <div className="text-right">
                       <div className={cn("font-bold text-base", pos.realizedPnl >= 0 ? "text-emerald-500" : "text-red-500")}>
                         {pos.realizedPnl >= 0 ? '+' : ''}{pos.realizedPnl.toFixed(2)}
                       </div>
                   </div>
                 </div>
                 <div className="grid grid-cols-3 gap-2 text-[10px]">
                   <div>
                     <div className="text-muted-foreground/70 mb-0.5">Size</div>
                     <div className="font-semibold">{pos.sizeTokens.toFixed(4)}</div>
                   </div>
                   <div>
                     <div className="text-muted-foreground/70 mb-0.5">Entry</div>
                     <div className="font-semibold">{pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div>
                   </div>
                   <div>
                     <div className="text-muted-foreground/70 mb-0.5">Close</div>,StartLine:1100,TargetContent:
                     <div className="font-semibold">{pos.closePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div>
                   </div>
                 </div>
               </div>
             ))
           )}
         </div>
      </div>

      {/* TP / SL Edit Modal */}
      {editingTpSlPosId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-foreground">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-5 animate-in zoom-in-95 duration-200">
             {(() => {
                const pos = positions.find(p => p.id === editingTpSlPosId);
                if (!pos) return null;
                const pos_ = pos;
                const livePx = markPrices[pos_.symbol] || pos_.entryPrice;
                return (
                  <>
                    <h3 className="text-lg font-bold mb-4">TP/SL for {pos_.side === 'LONG' ? 'Long' : 'Short'} Position</h3>
                    
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Coin</span>
                        <span className="font-bold">{pos_.symbol}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Position</span>
                         <span className={cn("font-bold", pos_.side === 'LONG' ? "text-emerald-500" : "text-red-500")}>
                           {pos_.sizeTokens.toFixed(4)} {pos_.symbol.split('-')[0]}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Entry Price</span>
                         <span className="font-bold">{pos_.entryPrice.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Mark Price</span>
                        <span className="font-bold">{livePx.toFixed(4)}</span>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">TP Price</span>
                        <input 
                          type="number"
                          value={modalTpPrice}
                          onChange={(e) => setModalTpPrice(e.target.value)}
                          className="w-full bg-muted border border-border rounded-md py-2 px-3 pl-20 text-sm text-right focus:outline-none focus:border-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">SL Price</span>
                        <input 
                          type="number"
                          value={modalSlPrice}
                          onChange={(e) => setModalSlPrice(e.target.value)}
                          className="w-full bg-muted border border-border rounded-md py-2 px-3 pl-20 text-sm text-right focus:outline-none focus:border-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => setEditingTpSlPosId(null)}
                        className="flex-1 py-2 rounded-md font-bold text-sm bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          setPositions(prev => prev.map(p => {
                            if (p.id === editingTpSlPosId) {
                               return { 
                                 ...p, 
                                 tpPrice: modalTpPrice ? parseFloat(modalTpPrice) : undefined,
                                 slPrice: modalSlPrice ? parseFloat(modalSlPrice) : undefined
                               };
                            }
                            return p;
                          }));
                          setEditingTpSlPosId(null);
                        }}
                        className="flex-1 py-2 rounded-md font-bold text-sm bg-[#c36336] text-white hover:bg-[#c36336]/80 transition-colors"
                      >
                        Confirm
                      </button>
                    </div>
                  </>
                );
             })()}
          </div>
        </div>
      )}

      {/* Limit Close Modal */}
      {closingLimitPosId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-foreground">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-5 animate-in zoom-in-95 duration-200">
             {(() => {
                const pos = positions.find(p => p.id === closingLimitPosId);
                if (!pos) return null;
                const pos_ = pos;
                const livePx = markPrices[pos_.symbol] || pos_.entryPrice;
                const projectedPx = parseFloat(modalLimitClosePrice) || 0;
                const projectedPnl = projectedPx > 0 ? calculatePnL(pos_, projectedPx) : 0;

                return (
                  <>
                    <h3 className="text-lg font-bold mb-4">Close Position via Limit</h3>
                    
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Coin</span>
                        <span className="font-bold">{pos.symbol}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Mark Price</span>
                        <span className="font-bold">{livePx.toFixed(4)}</span>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">Limit Price</span>
                        <input 
                          type="number"
                          value={modalLimitClosePrice}
                          onChange={(e) => setModalLimitClosePrice(e.target.value)}
                          className="w-full bg-muted border border-border rounded-md py-2 px-3 pl-20 text-sm text-right focus:outline-none focus:border-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder={livePx.toFixed(4)}
                        />
                      </div>
                      
                      {projectedPx > 0 && (
                        <div className="p-3 bg-muted rounded-md border border-border/50">
                           <div className="flex justify-between text-xs font-semibold">
                             <span className="text-muted-foreground">Estimated PnL</span>
                             <span className={projectedPnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                               {projectedPnl >= 0 ? '+' : ''}{projectedPnl.toFixed(2)} USDC
                             </span>
                           </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => setClosingLimitPosId(null)}
                        className="flex-1 py-2 rounded-md font-bold text-sm bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          if (!modalLimitClosePrice || isNaN(parseFloat(modalLimitClosePrice))) {
                             alert("Enter a valid price");
                             return;
                          }
                          // This simulates treating a limit close as removing the position and adding equal but opposite Open Order natively
                           handleClosePosition(pos_.id, false, parseFloat(modalLimitClosePrice));
                          setClosingLimitPosId(null);
                        }}
                        className="flex-1 py-2 rounded-md font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Confirm
                      </button>
                    </div>
                  </>
                );
             })()}
          </div>
        </div>
      )}

    </div>
  );
}
