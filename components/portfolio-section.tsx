'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Unplug } from 'lucide-react';
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

// Loading Spinner Component
function LoadingSpinner({ message }: { message: string }) {
  return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      <span className="text-sm font-medium text-muted-foreground animate-pulse">{message}</span>
    </div>
  );
}

export function PortfolioSection() {
  const {
    walletAddress,
    sourceWalletAddress,
    isLoading,
    error,
    clearWalletAddress,
  } = usePortfolio();
  const [showUnbindConfirm, setShowUnbindConfirm] = useState(false);

  const handleUnbind = () => {
    clearWalletAddress();
    setShowUnbindConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner message="Calculating portfolio data..." />
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
        <Card className="max-w-md border border-red-500/30 bg-card p-8 text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-3">Error Loading Portfolio</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => setShowUnbindConfirm(true)}
            className="text-primary hover:underline text-sm"
          >
            Reset Connection
          </button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 text-foreground">
        <div className="rounded-[1.75rem] border border-black/8 bg-white px-5 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground md:text-3xl">Portfolio</h1>
              <p className="max-w-3xl break-all text-sm text-muted-foreground">
                <span className="text-foreground">{walletAddress}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => setShowUnbindConfirm(true)}
              className="h-9 whitespace-nowrap rounded-2xl border-red-500/25 bg-red-500/8 px-3.5 text-[11px] font-semibold text-red-600 hover:bg-red-500/14 dark:text-red-300 md:flex-grow-0"
            >
              <Unplug className="mr-2 h-4 w-4" />
              Unbind Account
            </Button>
          </div>
        </div>
        </div>

        <PortfolioOverview />

        <div className="grid grid-cols-1 gap-6">
          <div>
            <PnLChart />
          </div>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unbind Your Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your wallet address and all associated data from this device. You can bind a different account later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Keep Bound</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnbind}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Unbind Account
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}

