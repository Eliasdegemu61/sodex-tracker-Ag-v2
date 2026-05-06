'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { EnrichedPosition } from '@/lib/sodex-api';
import {
  fetchAllPositions,
  enrichPositions,
  getUserIdByAddress,
  fetchTotalBalance
} from '@/lib/sodex-api';

interface PortfolioContextType {
  walletAddress: string | null;
  sourceWalletAddress: string | null;
  userId: string | null;
  positions: EnrichedPosition[];
  vaultBalance: number;
  isLoading: boolean;
  isPaused: boolean;
  fetchProgress: { count: number; nextCursor?: string };
  timeframe: '30D' | 'ALL';
  error: string | null;
  setWalletAddress: (address: string, userId: string, positions: EnrichedPosition[]) => Promise<void>;
  setTimeframe: (timeframe: '30D' | 'ALL') => void;
  setVaultBalance: (balance: number) => void;
  clearWalletAddress: () => void;
  handleContinue: () => Promise<void>;
  handleAbortAndShow: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({
  children,
  initialUserId,
  initialPositions,
  initialWalletAddress,
  initialSourceWalletAddress
}: {
  children: React.ReactNode;
  initialUserId?: string | null;
  initialPositions?: EnrichedPosition[];
  initialWalletAddress?: string | null;
  initialSourceWalletAddress?: string | null;
}) {
  const [walletAddress, setWalletAddressState] = useState<string | null>(initialWalletAddress || null);
  const [sourceWalletAddress, setSourceWalletAddressState] = useState<string | null>(initialSourceWalletAddress || null);
  const [userId, setUserIdState] = useState<string | null>(initialUserId || null);
  const [positions, setPositions] = useState<EnrichedPosition[]>(initialPositions || []);
  const [vaultBalance, setVaultBalanceState] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<{ count: number; nextCursor?: string }>({ count: 0 });
  const [timeframe, setTimeframeState] = useState<'30D' | 'ALL'>('ALL');
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingPositionsRef = useRef<any[]>([]);

  // Load timeframe from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolio_timeframe') as '30D' | 'ALL';
      if (saved) setTimeframeState(saved);
    }
  }, []);

  const setTimeframe = useCallback((t: '30D' | 'ALL') => {
    setTimeframeState(t);
    localStorage.setItem('portfolio_timeframe', t);
  }, []);

  const loadPositions = async (
    targetUserId: string, 
    cursor?: string, 
    accumulated: any[] = []
  ) => {
    setIsLoading(true);
    setIsPaused(false);
    setError(null);

    if (!cursor) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      pendingPositionsRef.current = [];
    }

    const controller = abortControllerRef.current!;
    try {
      const minTimestamp = timeframe === '30D' ? Date.now() - 30 * 24 * 60 * 60 * 1000 : undefined;

      const { positions: fetched, nextCursor } = await fetchAllPositions(
        targetUserId,
        (count) => setFetchProgress(prev => ({ ...prev, count: accumulated.length + count })),
        minTimestamp,
        controller.signal,
        undefined, // Remove SOFT_LIMIT to fetch complete history
        cursor
      );

      const total = [...accumulated, ...fetched];
      pendingPositionsRef.current = total;

      if (nextCursor) {
        // fetchAllPositions now handles the full loop with 3s delay
      }

      const enriched = await enrichPositions(total);
      if (!controller.signal.aborted) {
        setPositions(enriched);
        const balance = await fetchTotalBalance(targetUserId);
        setVaultBalanceState(balance.futuresBalance);
      }
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message === 'Fetch aborted')) return;
      setError(err instanceof Error ? err.message : 'Failed to load positions');
    } finally {
      if (abortControllerRef.current === controller && !isPaused) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleContinue = async () => {
    if (userId && fetchProgress.nextCursor) {
      await loadPositions(userId, fetchProgress.nextCursor, pendingPositionsRef.current);
    }
  };

  const handleAbortAndShow = async () => {
    if (!userId || pendingPositionsRef.current.length === 0) return;
    setIsLoading(true);
    setIsPaused(false);
    try {
      const enriched = await enrichPositions(pendingPositionsRef.current);
      setPositions(enriched);
      const balance = await fetchTotalBalance(userId);
      setVaultBalanceState(balance.futuresBalance);
    } catch (err) {
      setError('Failed to process existing data');
    } finally {
      setIsLoading(false);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    }
  };

  // Initialize from localStorage
  useEffect(() => {
    const init = async () => {
      if (initialUserId || initialWalletAddress) return;

      const savedAddress = localStorage.getItem('portfolio_wallet_address');
      const savedUserId = localStorage.getItem('portfolio_user_id');

      if (savedAddress && savedUserId) {
        setWalletAddressState(savedAddress);
        setUserIdState(savedUserId);
        await loadPositions(savedUserId);
      }
    };

    if (typeof window !== 'undefined') init();
  }, [initialUserId, initialWalletAddress, timeframe]);

  const setWalletAddress = useCallback(
    async (address: string, id: string, enriched: EnrichedPosition[]) => {
      localStorage.setItem('portfolio_wallet_address', address);
      localStorage.setItem('portfolio_user_id', id);
      setWalletAddressState(address);
      setUserIdState(id);
      setPositions(enriched);
      const balance = await fetchTotalBalance(id);
      setVaultBalanceState(balance.futuresBalance);
    },
    []
  );

  const setVaultBalance = useCallback((balance: number) => {
    setVaultBalanceState(balance);
  }, []);

  const clearWalletAddress = useCallback(() => {
    localStorage.removeItem('portfolio_wallet_address');
    localStorage.removeItem('portfolio_user_id');
    setWalletAddressState(null);
    setSourceWalletAddressState(null);
    setUserIdState(null);
    setPositions([]);
    setVaultBalanceState(0);
    setError(null);
  }, []);

  return (
    <PortfolioContext.Provider
      value={{
        walletAddress,
        sourceWalletAddress,
        userId,
        positions,
        vaultBalance,
        isLoading,
        isPaused,
        fetchProgress,
        timeframe,
        error,
        setWalletAddress,
        setTimeframe,
        setVaultBalance,
        clearWalletAddress,
        handleContinue,
        handleAbortAndShow,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) throw new Error('usePortfolio must be used within PortfolioProvider');
  return context;
}
