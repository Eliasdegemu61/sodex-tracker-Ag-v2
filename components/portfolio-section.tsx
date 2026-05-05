'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Unplug, Calendar, ChevronRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PortfolioOverview } from './portfolio-overview';
import { PnLChart } from './pnl-chart';
import { PositionsTable } from './positions-table';
import { OpenPositions } from './open-positions';
import { WalletBindForm } from './wallet-bind-form';
import { FundFlowTable } from './fund-flow-table';
import { AssetFlowCard } from './asset-flow-card';
import { MonthlyCalendar } from './monthly-calendar';
import { usePortfolio } from '@/context/portfolio-context';
import { cn } from '@/lib/utils';

// Loading Spinner Component
function LoadingSpinner({ message, subMessage, onContinue, onAbort, isPaused, currentCount }: { 
  message: string, 
  subMessage?: string,
  onContinue?: () => void,
  onAbort?: () => void,
  isPaused?: boolean,
  currentCount?: number
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
      <div className="relative">
        <Loader2 className={cn("h-10 w-10 text-orange-500", !isPaused && "animate-spin")} />
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[8px] font-black uppercase text-orange-500">PAUSED</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <span className="block text-lg font-bold text-foreground italic uppercase tracking-tight">{message}</span>
        {subMessage && (
          <span className="block text-xs text-muted-foreground/60 max-w-md mx-auto">{subMessage}</span>
        )}
      </div>

      {isPaused && (
        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4">
          <div className="flex gap-3">
            <Button onClick={onAbort} variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 px-6 font-bold italic text-[10px] uppercase">
              Show Current ({currentCount?.toLocaleString()})
            </Button>
            <Button onClick={onContinue} className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 gap-2 italic text-[10px] uppercase">
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PortfolioSection() {
  const {
    walletAddress,
    sourceWalletAddress,
    isLoading,
    isPaused,
    fetchProgress,
    timeframe,
    setTimeframe,
    error,
    clearWalletAddress,
    handleContinue,
    handleAbortAndShow
  } = usePortfolio();
  const [showUnbindConfirm, setShowUnbindConfirm] = useState(false);

  const handleUnbind = () => {
    clearWalletAddress();
    setShowUnbindConfirm(false);
  };

  if (isLoading || isPaused) {
    const loadingMessage = isPaused 
      ? `Data limit reached` 
      : `Syncing history... (${fetchProgress.count.toLocaleString()} records)`;
    
    const loadingSubMessage = isPaused
      ? `Large history detected. You can view the current ${fetchProgress.count.toLocaleString()} records or continue indexing for full accuracy.`
      : `Optimizing portfolio view for high-frequency data. This may take a moment for large accounts.`;

    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <LoadingSpinner 
          message={loadingMessage} 
          subMessage={loadingSubMessage}
          isPaused={isPaused}
          onContinue={handleContinue}
          onAbort={handleAbortAndShow}
          currentCount={fetchProgress.count}
        />
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="text-foreground">
        <WalletBindForm />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-md border border-red-500/30 bg-card p-8 text-center rounded-[2.5rem] shadow-2xl">
          <h2 className="text-2xl font-bold text-red-400 mb-3 uppercase italic">Sync Failed</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={() => window.location.reload()} className="rounded-2xl">
              Retry Sync
            </Button>
            <button
              onClick={() => setShowUnbindConfirm(true)}
              className="text-muted-foreground/40 hover:text-red-400 text-[10px] uppercase font-bold tracking-widest transition-colors"
            >
              Reset Connection
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 text-foreground">
        <div className="rounded-[2.5rem] border border-black/8 bg-white px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl italic uppercase">Portfolio</h1>
                <div className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">SYNCED</span>
                </div>
              </div>
              <p className="max-w-3xl break-all text-xs font-mono text-muted-foreground/60">
                {walletAddress}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Timeframe Selector in Header */}
              <div className="flex bg-white/5 dark:bg-white/[0.03] rounded-2xl p-1 border border-white/5">
                {(['ALL', '30D'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest",
                      timeframe === t
                        ? "bg-white text-black shadow-lg"
                        : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Calendar className="w-3 h-3" />
                    {t === 'ALL' ? 'Full' : '30D'}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => setShowUnbindConfirm(true)}
                className="h-10 whitespace-nowrap rounded-2xl border-red-500/20 bg-red-500/5 px-4 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all"
              >
                <Unplug className="mr-2 h-4 w-4" />
                Unbind
              </Button>
            </div>
          </div>
        </div>

        <PortfolioOverview />

        <div className="grid grid-cols-1 gap-6">
          <PnLChart />
        </div>

        <PositionsTable />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {walletAddress && <FundFlowTable walletAddress={sourceWalletAddress || walletAddress} />}
          {walletAddress && <AssetFlowCard walletAddress={sourceWalletAddress || walletAddress} />}
        </div>

        <div className="space-y-6">
          <MonthlyCalendar />
          <OpenPositions />
        </div>
      </div>

      <AlertDialog open={showUnbindConfirm} onOpenChange={setShowUnbindConfirm}>
        <AlertDialogContent className="rounded-[2.5rem] bg-black border-white/10 p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black italic uppercase tracking-tight">Unbind Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              This will remove your wallet address and all cached performance data from this device. You will need to bind your wallet again to see these metrics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4 mt-6">
            <AlertDialogCancel className="rounded-2xl border-white/10 bg-white/5 text-white flex-1 font-bold uppercase text-[10px] tracking-widest">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnbind}
              className="bg-red-500 hover:bg-red-600 text-white rounded-2xl flex-1 font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-red-500/20"
            >
              Confirm Unbind
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
