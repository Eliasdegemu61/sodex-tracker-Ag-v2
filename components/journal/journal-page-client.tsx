'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
    Shield, 
    Loader2, 
    RefreshCcw, 
    Terminal as TerminalIcon, 
    LayoutGrid, 
    BarChart3, 
    Settings, 
    MessageSquare,
    User as UserIcon,
    Plus,
    X,
    ChevronRight,
    Cloud,
    CloudOff,
    LogOut,
    AlertTriangle,
    Activity
} from 'lucide-react';
import { getPlans, deletePlan, syncLocalPlansToCloud } from '@/lib/journal-store';
import { computePlanMetrics } from '@/lib/journal-engine';
import type { TradingPlan, PlanMetrics } from '@/lib/journal-types';
import { PlanForm } from './plan-form';
import { PlanList } from './plan-list';
import { PlanDashboard } from './plan-dashboard';
import { fetchTotalBalance, fetchAllPositions, enrichPositions, fetchSymbols, type EnrichedPosition } from '@/lib/sodex-api';
import { cn } from '@/lib/utils';
import { CyberCard, GlowLine, CyberButton } from './cyber-elements';
import { supabase } from '@/lib/supabase-client';
import { AuthModal } from './auth-modal';
import { Button } from '@/components/ui/button';

type View = 'list' | 'create' | 'edit' | 'dashboard' | 'address_prompt';

const IDENTITY_STORAGE_KEY = 'sodex_journal_exclusive_v2';

const saveIdentityLocal = (addr: string, uid: string | null) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify({ address: addr, userId: uid }));
    } catch (e) {}
};

// Internal Loading Spinner for Journal
function LoadingSpinner({ message, subMessage, onContinue, onAbort, isPaused, currentCount }: { 
    message: string, 
    subMessage?: string,
    onContinue?: () => void,
    onAbort?: () => void,
    isPaused?: boolean,
    currentCount?: number
  }) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12 text-center animate-in fade-in duration-500">
        <div className="relative">
          <Loader2 className={cn("h-10 w-10 text-primary", !isPaused && "animate-spin")} />
          {isPaused && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[8px] font-bold uppercase text-primary">LIMIT</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2 px-4">
          <span className="block text-lg font-bold text-foreground uppercase tracking-tight">{message}</span>
          {subMessage && (
            <span className="block text-xs text-muted-foreground/60 max-w-md mx-auto font-medium leading-relaxed">{subMessage}</span>
          )}
        </div>
  
        {isPaused && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4 px-4 w-full max-w-sm">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button onClick={onAbort} variant="outline" className="rounded-xl border-border/10 hover:bg-muted/50 px-6 font-bold text-[10px] uppercase tracking-widest h-12 flex-1">
                Show Current ({currentCount?.toLocaleString()})
              </Button>
              <Button onClick={onContinue} className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold px-8 gap-2 text-[10px] uppercase tracking-widest h-12 flex-1">
                Continue Sync <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

function AddressPrompt({ onSetAddress }: { onSetAddress: (addr: string) => void }) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleManualLink = async () => {
        const addrOrId = input.trim();
        if (!addrOrId) return;
        setIsLoading(true);
        setError(null);
        try {
            // 1. Detect if it's a numeric User ID
            const isNumericId = /^\d+$/.test(addrOrId);
            
            if (isNumericId) {
                // Bypass registry phase
                onSetAddress(addrOrId);
                return; // Early return, setIsLoading(false) not needed as component will unmount
            }

            // 2. Otherwise treatment as address with registry lookup
            const { lookupWalletAddress } = await import('@/lib/client-api');
            const foundId = await lookupWalletAddress(addrOrId);
            if (foundId) {
                onSetAddress(addrOrId);
            } else {
                setError('Authorization failed');
            }
        } catch (err) {
            setError('Registry error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 min-h-[400px] animate-in fade-in duration-1000">
            <div className="max-w-lg w-full space-y-6 md:space-y-8 text-center bg-secondary/5 p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] border border-border/10">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tighter mb-1">Journal</h2>
                    <p className="text-[10px] md:text-xs text-muted-foreground/40 font-medium tracking-wider">link wallet to sync history</p>
                </div>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="0x..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full h-11 md:h-12 bg-secondary/10 border border-border/20 rounded-xl px-4 text-xs md:text-sm outline-none focus:border-border transition-all placeholder:text-muted-foreground/20 text-center font-medium"
                    />
                    {error && <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">{error}</p>}
                    <button 
                        onClick={handleManualLink} 
                        className="w-full h-11 md:h-12 bg-foreground text-background rounded-xl font-bold text-[10px] md:text-xs tracking-[0.2em] hover:bg-foreground/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        disabled={!input.trim() || isLoading}
                    >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Connect Wallet'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function JournalPageClient({ isDashboard = false }: { isDashboard?: boolean }) {
    const [view, setView] = useState<View>('list');
    const [plans, setPlans] = useState<TradingPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<TradingPlan | null>(null);
    const [isAddressPromptFinished, setIsAddressPromptFinished] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Data state
    const [planPositions, setPlanPositions] = useState<EnrichedPosition[]>([]);
    const [planBalance, setPlanBalance] = useState<number>(0);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [fetchProgress, setFetchProgress] = useState<{ count: number, isLong: boolean, nextCursor?: string }>({ count: 0, isLong: false });
    const [pendingPositions, setPendingPositions] = useState<any[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);

    const [tempAddress, setTempAddress] = useState<string | null>(null);
    const [manualUserId, setManualUserId] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    // Auth state
    const [user, setUser] = useState<any>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // 1. Immediate Hydration
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const loadPlans = useCallback(async () => {
        const p = await getPlans();
        setPlans(p);
    }, []);

    useEffect(() => { if (isMounted) loadPlans(); }, [loadPlans, isMounted]);

    // 2. Data & Auth Initialization
    useEffect(() => {
        if (!isMounted) return;

        const init = async () => {
            try {
                // Initial local identity
                const cacheStr = localStorage.getItem(IDENTITY_STORAGE_KEY);
                if (cacheStr) {
                    const identity = JSON.parse(cacheStr);
                    if (identity?.address) {
                        setTempAddress(identity.address);
                        setManualUserId(identity.userId || null);
                        setIsAddressPromptFinished(true);
                    }
                }

                // Auth session
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);

                if (session?.user) {
                    setIsSyncing(true);
                    try {
                        await syncLocalPlansToCloud();
                        await loadPlans();
                    } catch (e) {
                        console.error('[Journal] Cloud sync error:', e);
                    } finally {
                        setIsSyncing(false);
                    }
                }
            } catch (e) {
                console.error('[Journal] Init failed:', e);
            }
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                setIsAuthModalOpen(false);
                setIsSyncing(true);
                try {
                    await syncLocalPlansToCloud();
                    await loadPlans();
                } catch (e) {
                    console.error('[Journal] Auth change sync error:', e);
                } finally {
                    setIsSyncing(false);
                }
            } else {
                await loadPlans();
            }
        });

        return () => subscription.unsubscribe();
    }, [isMounted, loadPlans]);

    const handleSetAddress = async (addrOrId: string) => {
        if (!addrOrId) return;
        
        const isNumericId = /^\d+$/.test(addrOrId);
        
        if (isNumericId) {
            // Bypass registry flow
            setTempAddress(`ID: ${addrOrId}`);
            setManualUserId(addrOrId);
            setIsAddressPromptFinished(true);
            saveIdentityLocal(`ID: ${addrOrId}`, addrOrId);
            return;
        }

        // Standard address flow
        setTempAddress(addrOrId);
        setIsAddressPromptFinished(true);
        try {
            const { lookupWalletAddress } = await import('@/lib/client-api');
            const foundId = await lookupWalletAddress(addrOrId);
            if (foundId) {
                setManualUserId(foundId);
                saveIdentityLocal(addrOrId, foundId);
            } else throw new Error("Not found");
        } catch (e) {
            setIsAddressPromptFinished(false);
            setTempAddress(null);
            alert("Identity not authorized.");
        }
    };

    const fetchPlanData = useCallback(async (isAuto = false, cursor?: string, accumulated: any[] = []) => {
        if (!selectedPlan?.userId) return;
        
        // Reset abort controller for manual refresh or initial load
        if (!isAuto && !cursor) {
            if (abortControllerRef.current) abortControllerRef.current.abort();
            const controller = new AbortController();
            abortControllerRef.current = controller;
            setPendingPositions([]);
            setFetchProgress({ count: 0, isLong: false });
        }

        const controller = abortControllerRef.current!;

        if (!isAuto) setIsDataLoading(true);
        setIsPaused(false);

        // Long fetch timer
        const longFetchTimer = setTimeout(() => {
            setFetchProgress(prev => ({ ...prev, isLong: true }));
        }, 4000);

        try {
            const [result, bal] = await Promise.all([
                fetchAllPositions(
                    selectedPlan.userId, 
                    (count) => setFetchProgress(prev => ({ ...prev, count: accumulated.length + count })),
                    undefined,
                    controller.signal,
                    undefined, // Remove SOFT_LIMIT to fetch complete history
                    cursor
                ),
                fetchTotalBalance(selectedPlan.userId)
            ]);
            
            const total = [...accumulated, ...result.positions];

            if (result.nextCursor) {
                // If there's more data, we continue fetching automatically with the 3s delay (handled in fetchAllPositions)
                // The current fetchAllPositions implementation already loops and delays.
                // We only reach here if fetchAllPositions finishes or is aborted.
            }

            const enrichedFutures = await enrichPositions(total);
            
            if (!controller.signal.aborted) {
                // Sort by date descending
                const allPos = [...enrichedFutures].sort((a, b) => b.created_at - a.created_at);
                setPlanPositions(allPos);
                setPlanBalance(bal.totalBalance);
                setLastRefresh(new Date());
                clearTimeout(longFetchTimer);
            }
        } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') return;
            console.error('[Journal] Data fetch failed:', e);
        } finally { 
            if (abortControllerRef.current === controller && !isPaused) {
                if (!isAuto) setIsDataLoading(false); 
            }
        }
    }, [selectedPlan]);

    useEffect(() => {
        if (selectedPlan) {
            fetchPlanData(false);
            
            // Set up polling interval (15 seconds)
            const interval = setInterval(() => {
                fetchPlanData(true);
            }, 15000);

            return () => clearInterval(interval);
        }
    }, [selectedPlan, fetchPlanData]);

    const handleContinueSync = () => {
        if (selectedPlan && fetchProgress.nextCursor) {
            fetchPlanData(false, fetchProgress.nextCursor, pendingPositions);
        }
    };

    const handleAbortAndAnalyze = async () => {
        if (pendingPositions.length === 0) return;
        setIsDataLoading(true);
        setIsPaused(false);
        try {
            const enriched = await enrichPositions(pendingPositions);
            const allPos = [...enriched].sort((a, b) => b.created_at - a.created_at);
            setPlanPositions(allPos);
            // Balance is already being fetched or can be refetched
        } catch (err) {
            console.error('[Journal] Failed to process current data');
        } finally {
            setIsDataLoading(false);
            if (abortControllerRef.current) abortControllerRef.current.abort();
        }
    };

    const metrics: PlanMetrics | null = useMemo(() => {
        if (!selectedPlan) return null;
        return computePlanMetrics(selectedPlan, planPositions, planBalance || undefined);
    }, [selectedPlan, planPositions, planBalance]);

    const handleDisconnect = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(IDENTITY_STORAGE_KEY);
        }
        setTempAddress(null);
        setManualUserId(null);
        setIsAddressPromptFinished(false);
        setSelectedPlan(null);
        setView('list');
    };

    if (!isMounted) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <Loader2 className="w-10 h-10 text-muted-foreground/20 animate-spin" />
                    <p className="text-[10px] font-bold text-muted-foreground/20 uppercase tracking-[0.3em]">Booting Terminal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground",
            !isDashboard && "min-h-screen bg-background"
        )}>
            {/* Header */}
            {!isDashboard && (
                <header className="h-14 md:h-16 border-b border-border/10 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 bg-background z-50">
                    <div className="flex items-center gap-4">
                        <div 
                            className="text-xs font-bold tracking-widest cursor-pointer hover:text-foreground/80 transition-colors opacity-50"
                            onClick={() => setView('list')}
                        >
                            JOURNAL
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Identity Status */}
                        {isAddressPromptFinished && (
                            <div className="flex items-center gap-2 md:gap-3 mr-1">
                                <div className="hidden sm:flex flex-col items-end">
                                    <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest leading-none mb-0.5">Connected</span>
                                    <span className="text-[10px] text-muted-foreground/60 leading-none">
                                        {tempAddress?.slice(0, 6)}...{tempAddress?.slice(-4)}
                                    </span>
                                </div>
                                <button 
                                    onClick={handleDisconnect}
                                    className="w-8 h-8 md:w-7 md:h-7 flex items-center justify-center rounded-lg bg-secondary/5 border border-border/10 text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all group"
                                    title="Disconnect Address"
                                >
                                    <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        )}

                        <div className="w-px h-4 bg-border/20 mx-1 hidden sm:block" />

                        {/* Cloud Sync Status */}
                        <button
                            onClick={() => user ? supabase.auth.signOut() : setIsAuthModalOpen(true)}
                            className={cn(
                                "flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest shadow-sm",
                                user 
                                    ? "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20" 
                                    : "bg-secondary/5 border-border/10 text-muted-foreground/40 hover:bg-secondary/10 hover:text-foreground"
                            )}
                        >
                            {isSyncing ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : user ? (
                                <Cloud className="w-3 h-3" />
                            ) : (
                                <CloudOff className="w-3 h-3" />
                            )}
                            <span className="hidden sm:inline">
                                {isSyncing ? 'Syncing' : user ? 'Cloud' : 'Guest'}
                            </span>
                            {user && <LogOut className="w-2.5 h-2.5 ml-0.5 opacity-40 hidden sm:inline" />}
                        </button>
                    </div>
                </header>
            )}

            <main className="flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-20">
                <div className="max-w-[1800px] mx-auto w-full px-2 sm:px-6 pt-4 md:pt-12">
                    {!isAddressPromptFinished ? (
                        <AddressPrompt onSetAddress={handleSetAddress} />
                    ) : (
                        <div className="space-y-6 md:space-y-12">
                            {/* Breadcrumbs for Dashboard View */}
                            {view === 'dashboard' && selectedPlan && (
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30 overflow-x-auto whitespace-nowrap no-scrollbar pb-1">
                                    <span onClick={() => setView('list')} className="cursor-pointer hover:text-foreground transition-colors shrink-0">Portfolios</span>
                                    <ChevronRight className="w-3 h-3 shrink-0" />
                                    <span className="text-muted-foreground/60 truncate">{selectedPlan.name}</span>
                                </div>
                            )}

                            {view === 'list' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                        <div>
                                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 text-foreground">Portfolios</h1>
                                            <p className="text-sm text-muted-foreground/40 tracking-wide">Manage and track your active trading plans.</p>
                                        </div>
                                        <CyberButton onClick={() => setView('create')} className="h-11 md:h-10 w-full sm:w-auto">New Plan</CyberButton>
                                    </div>
                                    <PlanList
                                        plans={plans}
                                        onView={(p) => { setSelectedPlan(p); setView('dashboard'); }}
                                        onDelete={async (id) => { if(confirm('Delete this plan?')) { await deletePlan(id); loadPlans(); } }}
                                        onCreateNew={() => setView('create')}
                                    />
                                </div>
                            )}

                            {view === 'dashboard' && selectedPlan && (
                                <>
                                    {isDataLoading || isPaused ? (
                                        <div className="py-12 md:py-20 flex items-center justify-center min-h-[400px]">
                                            <LoadingSpinner 
                                                message={isPaused ? "Data Limit Reached" : `Syncing plan... (${fetchProgress.count.toLocaleString()} records)`}
                                                subMessage={isPaused ? "The history is extremely large. Continue indexing or analyze the current batch." : "Downloading and indexing trading history for this portfolio."}
                                                isPaused={isPaused}
                                                onContinue={handleContinueSync}
                                                onAbort={handleAbortAndAnalyze}
                                                currentCount={fetchProgress.count}
                                            />
                                        </div>
                                    ) : metrics ? (
                                        <PlanDashboard 
                                            metrics={metrics} 
                                            accountId={selectedPlan.userId}
                                            onEdit={() => setView('edit')}
                                        />
                                    ) : (
                                        <div className="py-20 flex flex-col items-center gap-4">
                                            <Activity className="w-8 h-8 text-muted-foreground/20" />
                                            <p className="text-xs font-bold text-muted-foreground/30 uppercase tracking-widest">No metrics generated</p>
                                        </div>
                                    )}
                                </>
                            )}

                            {(view === 'create' || view === 'edit') && (
                                <div className="max-w-xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                                     <PlanForm
                                        walletAddress={tempAddress || ''}
                                        userId={manualUserId || undefined}
                                        initialPlan={view === 'edit' ? selectedPlan : null}
                                        onSave={(p) => { loadPlans(); setSelectedPlan(p); setView('dashboard'); }}
                                        onCancel={() => setView('list')}
                                     />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
            />

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
