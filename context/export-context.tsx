'use client';

import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { fetchAllTrades, RawTrade } from '@/lib/trade-export';
import { getUserIdByAddress } from '@/lib/sodex-api';

export type ExportStatus = 'idle' | 'resolving' | 'fetching' | 'building' | 'done' | 'error';

interface ExportContextType {
  address: string;
  setAddress: (addr: string) => void;
  status: ExportStatus;
  progress: number;
  error: string | null;
  resultMsg: string;
  lastMarket: 'spot' | 'perps' | null;
  collectedTrades: RawTrade[];
  currentCursor: string | undefined;
  startExport: (market: 'spot' | 'perps', isResume?: boolean) => Promise<void>;
  cancelExport: () => void;
}

const ExportContext = createContext<ExportContextType | undefined>(undefined);

export function ExportProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState('');
  
  const [lastMarket, setLastMarket] = useState<'spot' | 'perps' | null>(null);
  const [collectedTrades, setCollectedTrades] = useState<RawTrade[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  
  const abortRef = useRef<AbortController | null>(null);

  const startExport = async (market: 'spot' | 'perps', isResume = false) => {
    if (!address.trim()) return;

    setStatus('resolving');
    setError(null);
    setResultMsg('');
    abortRef.current = new AbortController();

    if (!isResume) {
      setProgress(0);
      setCollectedTrades([]);
      setCurrentCursor(undefined);
      setLastMarket(market);
    }

    try {
      const accountId = Number(await getUserIdByAddress(address.trim()));
      if (!accountId || isNaN(accountId)) {
        throw new Error('Could not resolve wallet address');
      }

      setStatus('fetching');

      const result = await fetchAllTrades(
        accountId,
        market,
        {
          onProgress: (count) => setProgress(count),
          signal: abortRef.current.signal,
          initialCursor: isResume ? currentCursor : undefined,
          initialTrades: isResume ? collectedTrades : []
        }
      );

      setCollectedTrades(result.trades);
      setCurrentCursor(result.nextCursor);

      if (!result.finished) {
        throw new Error('Export interrupted (rate limits). You can resume later.');
      }

      setStatus('building');
      // building logic will happen in the component because it needs symbolMap
      // but we store the result here.
      setResultMsg(`Successfully fetched ${result.trades.length.toLocaleString()} trades.`);
      setStatus('done');
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setError('Export cancelled.');
      } else {
        setError(e.message ?? 'Unexpected error');
      }
      setStatus('error');
    }
  };

  const cancelExport = () => {
    abortRef.current?.abort();
  };

  return (
    <ExportContext.Provider value={{
      address, setAddress,
      status, progress, error, resultMsg,
      lastMarket, collectedTrades, currentCursor,
      startExport, cancelExport
    }}>
      {children}
    </ExportContext.Provider>
  );
}

export function useExport() {
  const context = useContext(ExportContext);
  if (context === undefined) {
    throw new Error('useExport must be used within ExportProvider');
  }
  return context;
}
