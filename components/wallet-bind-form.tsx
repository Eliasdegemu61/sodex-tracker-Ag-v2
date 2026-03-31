'use client';

import React from "react"

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePortfolio } from '@/context/portfolio-context';
import { getUserIdByAddress, fetchAllPositions, enrichPositions } from '@/lib/sodex-api';
import { cacheManager } from '@/lib/cache';

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
      // Clear any cached data for this user to ensure fresh data
      cacheManager.clear();
      console.log('[v0] Cleared cache before binding new address');

      // Step 1: Get userId from address
      setStatus('Looking up your account...');
      const userId = await getUserIdByAddress(targetAddress);
      console.log('[v0] Found userId:', userId);

      // Step 2: Fetch positions
      setStatus('Fetching your positions...');
      const positions = await fetchAllPositions(userId);
      console.log('[v0] Fetched positions:', positions.length);

      // Step 3: Enrich positions with symbol data
      setStatus('Processing your data...');
      const enrichedPositions = await enrichPositions(positions);
      console.log('[v0] Enriched positions:', enrichedPositions.length);

      // Step 4: Save to portfolio context
      setStatus('Saving your account...');
      await setWalletAddress(targetAddress, userId, enrichedPositions);

      console.log('[v0] Successfully bound account');
      setStatus('Account bound successfully!');
      setAddress('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bind address';
      console.error('[v0] Bind error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && address.trim()) {
      handleBind();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[600px] px-4">
      <div className="p-8 sm:p-10 bg-card/40 dark:bg-[#141414]/90 border border-border/20 dark:border-white/5 rounded-[2rem] shadow-2xl max-w-2xl w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h2 className="text-2xl font-bold text-foreground dark:text-white mb-3 tracking-tight">Bind Your Trading Account</h2>
        <p className="text-muted-foreground/80 dark:text-muted-foreground/80 mb-8 text-sm leading-relaxed">Enter your wallet address to load your position history and trading data</p>

        <div className="space-y-4">
          <div className="relative group">
            <input
              type="text"
              placeholder="Enter wallet address (0x...)"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown as any}
              disabled={isLoading}
              className="w-full px-5 py-4 bg-secondary/50 dark:bg-[#1f1f1f] border border-border/20 dark:border-none rounded-2xl text-sm font-medium text-foreground dark:text-white placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-border/50 dark:focus:ring-zinc-700 transition-all duration-300"
            />
          </div>

          {status && <p className="text-sm px-2 text-blue-400 font-medium">{status}</p>}
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-xs font-medium">{error}</p>
            </div>
          )}
          <div className="pt-2">
            <button
              onClick={() => handleBind()}
              disabled={isLoading || !address.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 bg-zinc-400 hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 rounded-2xl font-semibold transition-all duration-300 active:scale-[0.98]"
            >
              {isLoading ? 'Loading...' : 'Bind Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

