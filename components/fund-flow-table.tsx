'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, Loader2, ExternalLink, ChevronLeft, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';

interface FundFlowData {
  account: string;
  amount: string;
  chain: string;
  coin: string;
  decimals: number;
  status: string;
  statusTime: number;
  type: 'CustodyDeposit' | 'CustodyWithdraw' | string;
  token: string;
  txHash: string;
  receiver?: string;
  sender?: string;
}

interface FundFlowTableProps {
  walletAddress: string;
}

export function FundFlowTable({ walletAddress }: FundFlowTableProps) {
  const [flows, setFlows] = useState<FundFlowData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'withdraw'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showingTxHash, setShowingTxHash] = useState<string | null>(null);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!walletAddress) return;
    fetchFundFlow();
  }, [walletAddress]);

  const fetchFundFlow = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/wallet/fund-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: walletAddress }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch fund flow data');
      }

      const data = await response.json();

      if (data.code === '0' && data.data?.accountFlows) {
        const fetchedFlows = data.data.accountFlows;
        setFlows(fetchedFlows);

        // Fetch USD prices for accurate netflow calculations
        const uniqueTokens = Array.from(new Set(fetchedFlows.map((f: FundFlowData) => f.coin)));
        import('@/lib/token-price-service').then(({ getTokenPrices }) => {
          getTokenPrices(uniqueTokens as string[]).then(prices => {
            setTokenPrices(prices);
          });
        });
      } else {
        throw new Error(data.message || 'No fund flow data found');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load fund flow';
      setError(errorMessage);
      setFlows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const isDeposit = (type: string) => type.includes('Deposit');
  const isWithdraw = (type: string) => type.includes('Withdraw');

  const displayFlows = useMemo(() => {
    return flows.filter(flow => {
      if (filterType === 'deposit') return isDeposit(flow.type);
      if (filterType === 'withdraw') return isWithdraw(flow.type);
      return true;
    });
  }, [flows, filterType]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleRowsPerPageChange = (newRows: number) => {
    setRowsPerPage(newRows);
    setCurrentPage(1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(displayFlows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedFlows = displayFlows.slice(startIndex, endIndex);

  const formatAmount = (amount: string, decimals: number) => {
    const num = parseFloat(amount) / Math.pow(10, decimals);
    return num.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  };

  // Calculate netflow stats
  const netflowStats = useMemo(() => {
    const deposits = flows
      .filter(f => isDeposit(f.type))
      .reduce((sum, f) => {
        const amount = parseFloat(f.amount) / Math.pow(10, f.decimals);
        const price = tokenPrices[f.coin] || (f.coin.toUpperCase().includes('USD') ? 1 : 0);
        return sum + (amount * price);
      }, 0);

    const withdrawals = flows
      .filter(f => isWithdraw(f.type))
      .reduce((sum, f) => {
        const amount = parseFloat(f.amount) / Math.pow(10, f.decimals);
        const price = tokenPrices[f.coin] || (f.coin.toUpperCase().includes('USD') ? 1 : 0);
        return sum + (amount * price);
      }, 0);

    const netflow = deposits - withdrawals;

    return { deposits, withdrawals, netflow };
  }, [flows, tokenPrices]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash);
  };

  const getStatusColor = (status: string) => {
    if (status === 'Success') {
      return 'bg-emerald-900/50 text-emerald-300';
    }
    return 'bg-amber-900/50 text-amber-300';
  };

  const getExplorerUrl = (txHash: string, chain: string) => {
    const chainMap: { [key: string]: string } = {
      // EVM Chains
      'ARB': 'https://arbiscan.io/tx/',
      'ARBITRUM': 'https://arbiscan.io/tx/',
      'ETH': 'https://etherscan.io/tx/',
      'ETHEREUM': 'https://etherscan.io/tx/',
      'POLYGON': 'https://polygonscan.com/tx/',
      'POLY': 'https://polygonscan.com/tx/',
      'OPTIMISM': 'https://optimistic.etherscan.io/tx/',
      'OPT': 'https://optimistic.etherscan.io/tx/',
      'BASE': 'https://basescan.org/tx/',
      'AVAX': 'https://snowtrace.io/tx/',
      'AVAXC': 'https://snowtrace.io/tx/',
      'AVALANCHE': 'https://snowtrace.io/tx/',
      'BSC': 'https://bscscan.com/tx/',
      'BSCSCAN': 'https://bscscan.com/tx/',
      'BINANCE': 'https://bscscan.com/tx/',
      'HYPERLIQUID': 'https://explorer.hyperliquid.xyz/tx/',
      'HYPE': 'https://explorer.hyperliquid.xyz/tx/',
      // Non-EVM Chains
      'SOLANA': 'https://solscan.io/tx/',
      'SOL': 'https://solscan.io/tx/',
      'SUI': 'https://suiscan.xyz/tx/',
      'TON': 'https://tonscan.org/tx/',
      'XLM': 'https://stellar.expert/explorer/public/tx/',
      'STELLAR': 'https://stellar.expert/explorer/public/tx/',
      'LTC': 'https://blockchair.com/litecoin/transaction/',
      'LITECOIN': 'https://blockchair.com/litecoin/transaction/',
      'BTC': 'https://www.blockchain.com/btc/tx/',
      'BITCOIN': 'https://www.blockchain.com/btc/tx/',
      'XRP': 'https://xrpscan.com/tx/',
      'RIPPLE': 'https://xrpscan.com/tx/',
      'DOGE': 'https://blockchair.com/dogecoin/transaction/',
      'DOGECOIN': 'https://blockchair.com/dogecoin/transaction/',
    };

    // Extract the chain name, handling formats like "BASE_ETH", "ARB_ETH", etc.
    const chainParts = chain.split('_');
    const chainName = chainParts[0].toUpperCase();

    const baseUrl = chainMap[chainName] || chainMap['ARB'];
    return `${baseUrl}${txHash}`;
  };

  if (isLoading) {
    return (
      <Card className="rounded-[2rem] border border-black/8 bg-white p-12 text-center text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col items-center justify-center p-8">
          <div className="mb-4 h-8 w-8 rounded-full border-2 border-black/15 border-t-black animate-spin dark:border-white/15 dark:border-t-white" />
          <p className="text-[10px] font-bold text-black/35 dark:text-white/35 uppercase tracking-[0.22em]">Interrogating ledgers</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-[2rem] border border-red-500/20 bg-white p-8 text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:bg-black dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400/40 mb-3" />
          <h3 className="mb-1 text-[10px] font-bold text-red-300 uppercase tracking-[0.22em]">Stream blocked</h3>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">{error}</p>
          <Button onClick={fetchFundFlow} variant="outline" size="sm" className="mt-4 rounded-xl border-black/10 bg-black/[0.03] text-[10px] font-semibold text-foreground hover:bg-black/[0.07] dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:bg-white/[0.07]">
            Retry Sync
          </Button>
        </div>
      </Card>
    );
  }

  if (flows.length === 0) {
    return (
      <Card className="rounded-[2rem] border border-black/8 bg-white p-12 text-center text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <h3 className="mb-2 text-[10px] font-bold text-black/35 dark:text-white/35 uppercase tracking-[0.22em]">Fund flow</h3>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/25 dark:text-white/25">No transfers detected</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-[2rem] border border-black/8 bg-white p-3 sm:p-5 text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
        <h3 className="text-[10px] font-bold text-black/35 dark:text-white/35 uppercase tracking-[0.22em]">Fund flow</h3>

        {/* Netflow Info */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1 rounded-2xl border border-green-500/18 bg-green-500/8 p-4">
            <p className="text-center text-[8px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">Inflow</p>
            <p className="text-center text-sm font-semibold text-green-400">
              ${netflowStats.deposits.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="space-y-1 rounded-2xl border border-red-500/18 bg-red-500/8 p-4">
            <p className="text-center text-[8px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">Outflow</p>
            <p className="text-center text-sm font-semibold text-red-400">
              ${netflowStats.withdrawals.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className={`space-y-1 rounded-2xl border p-4 ${netflowStats.netflow >= 0 ? 'border-green-500/18 bg-green-500/8' : 'border-red-500/18 bg-red-500/8'}`}>
            <p className="text-center text-[8px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">Net</p>
            <p className={`text-center text-sm font-semibold ${netflowStats.netflow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${(netflowStats.netflow >= 0 ? '+' : '')}{netflowStats.netflow.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="mb-8 flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All Transfers' },
          { id: 'deposit', label: 'Deposits' },
          { id: 'withdraw', label: 'Withdrawals' }
        ].map((type) => (
          <button
            key={type.id}
            onClick={() => {
              setFilterType(type.id as any);
              setCurrentPage(1);
            }}
            className={`rounded-xl border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all ${filterType === type.id
              ? type.id === 'deposit'
                ? 'border-green-500/25 bg-green-500/10 text-green-400'
                : type.id === 'withdraw'
                  ? 'border-red-500/25 bg-red-500/10 text-red-400'
                  : 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
              : 'border-black/10 bg-black/[0.03] text-black/40 hover:bg-black/[0.06] hover:text-black dark:border-white/10 dark:bg-white/[0.03] dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white'
              }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-[11px] border-separate border-spacing-y-1.5">
          <thead>
            <tr className="font-bold text-black/35 dark:text-white/35 uppercase tracking-[0.18em]">
              <th className="text-left py-2 px-3">Type</th>
              <th className="text-left py-2 px-3">Asset</th>
              <th className="text-right py-2 px-3">Amount</th>
              <th className="text-left py-2 px-3">Network</th>
              <th className="text-left py-2 px-3">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {paginatedFlows.map((flow, idx) => (
              <tr key={`${startIndex}-${idx}`} className="group relative rounded-xl bg-black/[0.03] transition-all hover:bg-black/[0.06] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
                <td className="py-3 px-3 first:rounded-l-xl last:rounded-r-xl">
                  <div className="flex items-center gap-2">
                    {isDeposit(flow.type) ? (
                      <ArrowDown className="w-3.5 h-3.5 text-green-400/60" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5 text-red-400/60" />
                    )}
                    <span className={`font-semibold uppercase tracking-[0.18em] ${isDeposit(flow.type) ? 'text-green-400' : 'text-red-400'}`}>
                      {isDeposit(flow.type) ? 'Deposit' : 'Withdraw'}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 font-semibold text-foreground">{flow.coin}</td>
                <td className={`py-3 px-2 text-right font-semibold ${isDeposit(flow.type) ? 'text-green-400' : 'text-red-400'}`}>
                  {isDeposit(flow.type) ? '+' : '-'} {formatAmount(flow.amount, flow.decimals)}
                </td>
                <td className="py-3 px-2">
                  <span className="rounded-lg bg-black/[0.04] px-2 py-0.5 text-[9px] font-semibold text-black/45 dark:bg-white/[0.04] dark:text-white/45">
                    {flow.chain.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3 px-3 first:rounded-l-xl last:rounded-r-xl text-left text-[9px] text-black/35 dark:text-white/35">{formatDate(flow.statusTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Expandable List */}
      <div className="md:hidden space-y-3">
        {paginatedFlows.map((flow, idx) => {
          const rowId = `${startIndex}-${idx}`;
          return (
            <div key={rowId} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all hover:bg-white/[0.05]">
              {/* Expandable Row Summary */}
              <button
                onClick={() => toggleExpand(rowId)}
                className="w-full p-4 text-left transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {isDeposit(flow.type) ? (
                      <ArrowDown className="w-4 h-4 text-green-400/60" />
                    ) : (
                      <ArrowUp className="w-4 h-4 text-red-400/60" />
                    )}
                    <span className={`font-semibold uppercase tracking-[0.18em] ${isDeposit(flow.type) ? 'text-green-400' : 'text-red-400'}`}>
                      {isDeposit(flow.type) ? 'Deposit' : 'Withdraw'}
                    </span>
                  </div>
                  <div className="text-[10px] text-white/35">
                    {flow.coin} • {flow.chain.replace('_', ' ')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`font-semibold ${isDeposit(flow.type) ? 'text-green-400' : 'text-red-400'}`}>
                      {isDeposit(flow.type) ? '+' : '-'} {formatAmount(flow.amount, flow.decimals)}
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-white/35 transition-transform duration-300 ${expandedRows.has(rowId) ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {/* Expandable Details */}
              {expandedRows.has(rowId) && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/8 bg-white/[0.02] p-4">
                  <div className="flex flex-col">
                    <span className="mb-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-white/30">Network</span>
                    <p className="text-[11px] font-semibold text-white">{flow.chain.replace('_', ' ')}</p>
                  </div>
                  <div className="flex flex-col">
                    <span className="mb-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-white/30">Timestamp</span>
                    <p className="text-[9px] font-semibold text-white/35">{formatDate(flow.statusTime)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="mb-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-white/30">Total Value</span>
                    <p className={`text-sm font-semibold ${isDeposit(flow.type) ? 'text-green-400' : 'text-red-400'}`}>
                      {isDeposit(flow.type) ? '+' : '-'} {formatAmount(flow.amount, flow.decimals)} {flow.coin}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      <div className="mt-8 flex flex-col items-center justify-between gap-6 border-t border-white/8 pt-8 md:flex-row">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Rows</span>
          <div className="flex gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] p-1">
            {[5, 10, 20, 50].map((value) => (
              <button
                key={value}
                onClick={() => handleRowsPerPageChange(value)}
                className={`rounded-lg px-3 py-1 text-[10px] font-semibold transition-all ${rowsPerPage === value
                  ? 'bg-white text-black'
                  : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
                  }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
          {startIndex + 1}-{Math.min(endIndex, displayFlows.length)} of {displayFlows.length}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            variant="outline"
            className="h-8 rounded-xl border-white/10 bg-white/[0.03] text-[10px] font-semibold text-white/60 transition-all hover:bg-white/[0.07] hover:text-white md:h-9"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Prev
          </Button>

          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-1.5">
            <span className="text-[10px] font-semibold text-white/45">
              {currentPage} / {totalPages}
            </span>
          </div>

          <Button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            variant="outline"
            className="h-8 rounded-xl border-white/10 bg-white/[0.03] text-[10px] font-semibold text-white/60 transition-all hover:bg-white/[0.07] hover:text-white md:h-9"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

