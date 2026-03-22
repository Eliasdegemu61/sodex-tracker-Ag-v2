'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Share2, 
  Loader2,
  Copy,
  Download,
  Check
} from 'lucide-react';
import { 
  fetchDetailedBalance, 
  fetchUserRank, 
  fetchPnLOverview,
  getVolumeFromPnLOverview
} from '@/lib/sodex-api';
import { getTokenPrice } from '@/lib/token-price-service';
import { usePortfolio } from '@/context/portfolio-context';
import { cn } from '@/lib/utils';
import * as htmlToImage from 'html-to-image';

interface ShareStatsModalProps {
  walletAddress: string;
  userId: string;
  sourceWalletAddress?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function ShareStatsModal({ 
  walletAddress, 
  userId, 
  sourceWalletAddress,
  isOpen: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger 
}: ShareStatsModalProps) {
  const { positions } = usePortfolio();
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const onOpenChange = setControlledOpen || setInternalOpen;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [windowType, setWindowType] = useState<'24H' | '7D' | '30D' | 'ALL_TIME'>('30D');
  const [copied, setCopied] = useState(false);

  const isPositive = (data?.periodPnL || 0) >= 0;
  const accentColor = isPositive ? 'text-emerald-500' : 'text-rose-500';

  const formatCompact = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toFixed(2);
  };

  const getGroupedFlowString = (flows: any[]) => {
    const groups: Record<string, number> = {};
    flows.forEach(f => {
      const amount = parseFloat(f.amount) / Math.pow(10, f.decimals);
      groups[f.coin] = (groups[f.coin] || 0) + amount;
    });
    
    if (Object.keys(groups).length === 0) return '0';
    
    return Object.entries(groups)
      .map(([coin, amount]) => `${formatCompact(amount)} ${coin}`)
      .join(', ');
  };

  const fetchAllStats = async () => {
    setLoading(true);
    try {
      const addr = sourceWalletAddress || walletAddress;
      
      const [balanceData, rankData, vaultResponse, fundFlowResponse] = await Promise.all([
        fetchDetailedBalance(userId),
        fetchUserRank(addr, windowType, 'volume'),
        fetch('/api/sodex/vault-position', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: addr }),
        }).then(res => res.ok ? res.json() : null),
        fetch('/api/wallet/fund-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account: addr }),
        }).then(res => res.ok ? res.json() : null)
      ]);

      let vaultStats = { shares: 0, pnl: 0, usdValue: 0 };
      if (vaultResponse?.code === '0' && vaultResponse.data) {
        const mag7Price = await getTokenPrice('MAG7.ssi');
        vaultStats = {
          shares: vaultResponse.data.shares || 0,
          pnl: vaultResponse.data.pnl || 0,
          usdValue: (vaultResponse.data.shares || 0) * mag7Price
        };
      }

      // Fund Flow Logic with Timeframe Filtering and Token Names
      let depositsStr = '0';
      let withdrawalsStr = '0';
      if (fundFlowResponse?.code === '0' && fundFlowResponse.data?.accountFlows) {
        const allFlows = fundFlowResponse.data.accountFlows;
        
        let filteredFlows = allFlows;
        if (windowType !== 'ALL_TIME') {
          const now = Date.now();
          const msMap = { '24H': 86400000, '7D': 604800000, '30D': 2592000000 };
          const startTime = now - msMap[windowType as keyof typeof msMap];
          
          filteredFlows = allFlows.filter((f: any) => {
            const ts = f.statusTime > 1e12 ? f.statusTime : f.statusTime * 1000;
            return ts >= startTime;
          });
        }

        const dFlows = filteredFlows.filter((f: any) => f.type.includes('Deposit'));
        const wFlows = filteredFlows.filter((f: any) => f.type.includes('Withdraw'));
        
        depositsStr = getGroupedFlowString(dFlows);
        withdrawalsStr = getGroupedFlowString(wFlows);
      }

      // Use leaderboard data for PnL and Volume for consistency
      const periodPnL = parseFloat(rankData?.pnl_usd || '0');
      const volume = parseFloat(rankData?.volume_usd || '0');

      setData({
        totalBalance: balanceData.totalUsdValue + vaultStats.usdValue,
        vaultStats,
        depositsStr,
        withdrawalsStr,
        rank: rankData?.rank || '---',
        volume,
        periodPnL
      });
    } catch (err) {
      console.error('[ShareStats] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllStats();
    }
  }, [isOpen, windowType, positions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const copyImageToClipboard = async () => {
    if (!cardRef.current) return false;
    try {
      const blob = await htmlToImage.toBlob(cardRef.current, {
        cacheBust: true,
        backgroundColor: '#050505',
        style: { borderRadius: '0' }
      });
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        return true;
      }
    } catch (err) {
      console.error('[ShareStats] Error copying image:', err);
    }
    return false;
  };

  const handleCopy = async () => {
    const success = await copyImageToClipboard();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      const text = `Verified SoDex Performance: ${formatCurrency(data?.periodPnL || 0)} PnL. Check SoDexTracker.com`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        cacheBust: true,
        backgroundColor: '#050505',
        style: { borderRadius: '2.5rem' }
      });
      const link = document.createElement('a');
      link.download = `sodex-stats.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('[ShareStats] Error downloading image:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20">
            <Share2 className="w-4 h-4" />
            Share Stats
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-black border-white/10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-[90vw] md:w-full">
        <div ref={cardRef} className="relative aspect-[4/5] w-full overflow-hidden bg-[#050505] p-6 md:p-10 flex flex-col justify-between">
          
          <div className={cn("absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full", isPositive ? "bg-emerald-500" : "bg-rose-500")} />

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] md:text-sm font-black tracking-[0.3em] text-white opacity-40 uppercase">SoDex Tracker</h3>
              <div className="flex bg-white/5 rounded-xl p-1 no-screenshot">
                {(['24H', '7D', '30D', 'ALL_TIME'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setWindowType(t)}
                    className={cn(
                      "px-2 md:px-3 py-0.5 md:py-1 rounded-lg text-[6px] md:text-[8px] font-black transition-all uppercase tracking-wider",
                      windowType === t
                        ? "bg-white text-black"
                        : "text-white/40 hover:text-white"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-[8px] md:text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
              <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-white/20 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6 md:space-y-10">
              <div className="space-y-1 md:space-y-2">
                <span className="text-[8px] md:text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Net Performance ({windowType})</span>
                <p className={cn("text-3xl md:text-5xl font-black italic tracking-tighter leading-none", accentColor)}>
                  {isPositive ? '+' : '-'}{formatCurrency(Math.abs(data?.periodPnL || 0))}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-6 md:gap-x-12 gap-y-4 md:gap-y-6">
                <div className="space-y-1">
                  <span className="text-[7px] md:text-[9px] font-black text-white/20 uppercase tracking-widest">Balance</span>
                  <p className="text-sm md:text-lg font-black italic text-white leading-none">{formatCurrency(data?.totalBalance || 0)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[7px] md:text-[9px] font-black text-white/20 uppercase tracking-widest">Rank (Volume) [{windowType}]</span>
                  <p className="text-sm md:text-lg font-black italic text-orange-500 leading-none">#{data?.rank}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[7px] md:text-[9px] font-black text-white/20 uppercase tracking-widest">Vault</span>
                  <p className="text-sm md:text-lg font-black italic text-white leading-none">{data?.vaultStats?.shares.toFixed(1)} <span className="text-[6px] md:text-[8px] text-white/20">MAG7</span></p>
                </div>
                <div className="space-y-1">
                  <span className="text-[7px] md:text-[9px] font-black text-white/20 uppercase tracking-widest">Volume ({windowType})</span>
                  <p className="text-sm md:text-lg font-black italic text-white leading-none">${formatCompact(data?.volume || 0)}</p>
                </div>
                {/* Fund Flow with Token Names */}
                <div className="space-y-1 h-fit">
                  <span className="text-[7px] md:text-[9px] font-black text-white/20 uppercase tracking-widest">Deposits ({windowType})</span>
                  <p className="text-[9px] md:text-[11px] font-black italic text-emerald-500 leading-tight">{data?.depositsStr}</p>
                </div>
                <div className="space-y-1 h-fit">
                  <span className="text-[7px] md:text-[9px] font-black text-white/20 uppercase tracking-widest">Withdrawals ({windowType})</span>
                  <p className="text-[9px] md:text-[11px] font-black italic text-rose-500 leading-tight">{data?.withdrawalsStr}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between opacity-20 mt-4 md:mt-0">
            <span className="text-[7px] md:text-[9px] font-black italic tracking-[0.4em] text-white">SoDexTracker.com</span>
            <div className="h-px bg-white/20 flex-1 ml-4 md:ml-6" />
          </div>
        </div>

        <div className="p-6 md:p-8 pt-0 flex items-center justify-center gap-4 md:gap-6 bg-[#050505] pb-6 md:pb-10">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/10 transition-all group"
            onClick={handleCopy}
            title="Copy Image to Clipboard"
          >
            {copied ? <Check className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" /> : <Copy className="w-4 h-4 md:w-5 md:h-5 text-white/40 group-hover:text-white" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/10 transition-all group"
            onClick={handleDownload}
            title="Download Snapshot"
          >
            <Download className="w-4 h-4 md:w-5 md:h-5 text-white/40 group-hover:text-white" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
