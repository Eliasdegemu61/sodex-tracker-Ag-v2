'use client';

import React, { useState } from 'react';
import { usePortfolio } from '@/context/portfolio-context';
import { getUserIdByAddress, fetchAllPositions, enrichPositions } from '@/lib/sodex-api';
import { cacheManager } from '@/lib/cache';
import { Loader2, Search } from 'lucide-react';

export function WalletBindForm() {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const { setWalletAddress } = usePortfolio();

  const handleBind = async (addr?: string) => {
    const targetAddress = (addr || address).trim();
    if (!targetAddress) {
      setError('Please enter a wallet address');
      return;
    }
    setIsLoading(true);
    setError(null);
    setStatus(null);
    try {
      cacheManager.clear();
      setStatus('Looking up your account...');
      const userId = await getUserIdByAddress(targetAddress);
      setStatus('Fetching your positions...');
      const positions = await fetchAllPositions(userId);
      setStatus('Processing your data...');
      const enrichedPositions = await enrichPositions(positions);
      setStatus('Saving your account...');
      await setWalletAddress(targetAddress, userId, enrichedPositions);
      setStatus('Account bound successfully!');
      setAddress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bind address');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && address.trim()) handleBind();
  };

  return (
    <div className="flex flex-col items-center pt-12 md:pt-24 min-h-[500px] px-4">
      <div className="p-8 sm:p-10 bg-background border border-border rounded-[24px] max-w-md w-full shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight mb-2">Bind your address</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            to load your sodex portfolio in a new way
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Enter wallet address"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setError(null); }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-secondary/5 border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-border transition-all disabled:opacity-50"
            />
          </div>

          {status && (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{status}</p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <p className="text-red-400 text-xs font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={() => handleBind()}
            disabled={isLoading || !address.trim()}
            className="w-full py-3 bg-muted-foreground/60 hover:bg-muted-foreground/80 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Bind Account</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
