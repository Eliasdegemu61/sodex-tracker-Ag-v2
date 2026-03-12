'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, BookOpen, Plus, Loader2, RefreshCcw, Cloud, CloudOff, LogOut, Home } from 'lucide-react';
import Link from 'next/link';
import { getPlans, deletePlan, syncLocalPlansToCloud } from '@/lib/journal-store';
import { supabase } from '@/lib/supabase-client';
import { AuthModal } from './auth-modal';
import { computePlanMetrics } from '@/lib/journal-engine';
import type { TradingPlan, PlanMetrics } from '@/lib/journal-types';
import { PlanForm } from './plan-form';
import { PlanList } from './plan-list';
import { PlanDashboard } from './plan-dashboard';
import { DailyPerformanceTable } from './daily-performance-table';
import { EquityCurveChart } from './equity-curve-chart';
import { DailyWinRateChart } from './daily-win-rate-chart';
import { RuleViolations } from './rule-violations';
import { DisciplineScore } from './discipline-score';
import { TradeAnalytics } from './trade-analytics';
import { DailyPositionDetail } from './daily-position-detail';
import { fetchTotalBalance, fetchAllPositions, enrichPositions, type EnrichedPosition } from '@/lib/sodex-api';
import { cn } from '@/lib/utils';

type View = 'list' | 'create' | 'edit' | 'dashboard' | 'address_prompt';

const IDENTITY_STORAGE_KEY = 'sodex_journal_active_identity';

function AddressPrompt({
    onSetAddress
}: {
    onSetAddress: (addr: string) => void
}) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleManualLink = async () => {
        const addr = input.trim();
        if (!addr) return;

        setIsLoading(true);
        setError(null);
        try {
            const { lookupWalletAddress } = await import('@/lib/client-api');
            const foundId = await lookupWalletAddress(addr);
            if (foundId) {
                onSetAddress(addr);
            } else {
                setError('Address not found in registry');
            }
        } catch (err) {
            console.error('[Journal] Address lookup failed:', err);
            setError('Address not found in registry');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="w-20 h-20 rounded-[2.5rem] bg-orange-500/10 flex items-center justify-center mb-8 border border-orange-500/20 shadow-xl shadow-orange-500/5">
                <BookOpen className="w-10 h-10 text-orange-500" />
            </div>

            <h2 className="text-3xl font-black text-foreground mb-3 tracking-tight">Personalize Your Journal</h2>
            <p className="text-sm text-muted-foreground/50 mb-10 max-w-sm leading-relaxed">
                Connect your trade history by entering a wallet address or using your connected portfolio.
            </p>

            <div className="w-full space-y-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Or enter manually (0x...)"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            setError(null);
                        }}
                        disabled={isLoading}
                        className={cn(
                            "w-full px-5 py-4 rounded-2xl bg-secondary/10 border outline-none text-sm font-mono transition-all text-center",
                            error ? "border-red-500/40 bg-red-500/5" : "border-border/20 focus:border-orange-500/40 focus:bg-secondary/20"
                        )}
                    />
                </div>

                {error && (
                    <p className="text-[10px] font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
                        {error}
                    </p>
                )}

                <button
                    onClick={handleManualLink}
                    disabled={!input.trim() || isLoading}
                    className="w-full py-4 rounded-2xl bg-foreground text-background font-black text-sm transition-all shadow-lg shadow-foreground/5 disabled:opacity-30 uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isLoading ? 'Searching...' : 'Link Address'}
                </button>
            </div>
        </div>
    );
}

export function JournalPageClient() {
    const [view, setView] = useState<View>('list');
    const [plans, setPlans] = useState<TradingPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<TradingPlan | null>(null);
    const [isAddressPromptFinished, setIsAddressPromptFinished] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem(IDENTITY_STORAGE_KEY);
                if (cached) {
                    const { address } = JSON.parse(cached);
                    return !!address;
                }
            } catch (e) { return false; }
        }
        return false;
    });

    // Data state
    const [planPositions, setPlanPositions] = useState<EnrichedPosition[]>([]);
    const [planBalance, setPlanBalance] = useState<number>(0);
    const [isDataLoading, setIsDataLoading] = useState(false);

    // Identity state initialized from local cache (prevents prompt on refresh)
    const [tempAddress, setTempAddress] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem(IDENTITY_STORAGE_KEY);
                if (cached) return JSON.parse(cached).address || null;
            } catch (e) { return null; }
        }
        return null;
    });
    const [manualUserId, setManualUserId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem(IDENTITY_STORAGE_KEY);
                if (cached) return JSON.parse(cached).userId || null;
            } catch (e) { return null; }
        }
        return null;
    });

    // Auth state
    const [user, setUser] = useState<any>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);

    const loadPlans = useCallback(async (autoBypassIfNotEmpty = false) => {
        const p = await getPlans();
        setPlans(p);

        // If we want to bypass the prompt and we have plans...
        if (autoBypassIfNotEmpty && p.length > 0) {
            const mostRecent = p[0];
            if (mostRecent.walletAddress) {
                console.log('[Journal] Auto-recovering identity from plans for address:', mostRecent.walletAddress);
                const addr = mostRecent.walletAddress;
                const uid = mostRecent.userId || null;
                
                setTempAddress(addr);
                setManualUserId(uid);
                setIsAddressPromptFinished(true);
                
                // Persist to local cache so refresh works next time
                localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify({ address: addr, userId: uid }));
            }
        }
    }, []);

    // Initial setup state (for prompt)
    const [sessionBalance, setSessionBalance] = useState<number>(0);

    const walletAddress = isAddressPromptFinished ? tempAddress : null;

    // Strict resolved ID: No fallback to portfolio.userId unless the address matches the portfolio address
    const userId = useMemo(() => {
        if (!isAddressPromptFinished) return null;
        if (tempAddress) return manualUserId; // If we have a temp address, strictly use its manual ID

        // STALENESS PREVENTION: We NO LONGER fall back to portfolio.userId because it might be stuck at 1061.
        // We always use manualUserId which is resolved from the lookup.
        return manualUserId;
    }, [isAddressPromptFinished, tempAddress, manualUserId]);

    // Load plans on mount
    useEffect(() => {
        loadPlans(false);
    }, [loadPlans]);

    // 2. Background Auth & Cloud Sync Tracker
    useEffect(() => {
        let isActuallyMounted = true;

        const initAuth = async () => {
            console.log('[Journal] Background sync starting...');
            setIsBackgroundSyncing(true);
            
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                
                if (currentUser) {
                    // Logged in: Sync and fetch cloud data in the background
                    try {
                        await syncLocalPlansToCloud();
                        await loadPlans(true); // Update from cloud and potentially sync identity
                        console.log('[Journal] Background cloud sync complete.');
                    } catch (err) {
                        console.error('[Journal] Background sync failed:', err);
                    }
                } else {
                    // Not logged in: Just ensure local plans are loaded
                    await loadPlans(false);
                }
            } catch (err) {
                console.error('[Journal] Auth check failed:', err);
            } finally {
                if (isActuallyMounted) {
                    setIsBackgroundSyncing(false);
                }
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setUser(session?.user ?? null);
            if (event === 'SIGNED_IN') {
                setIsAuthModalOpen(false);
                setIsBackgroundSyncing(true);
                try {
                    await syncLocalPlansToCloud();
                    await loadPlans(true);
                } finally {
                    setIsBackgroundSyncing(false);
                }
            } else if (event === 'SIGNED_OUT') {
                await loadPlans(false);
                // Clear identity ONLY on explicit logout
                localStorage.removeItem(IDENTITY_STORAGE_KEY);
                setTempAddress(null);
                setManualUserId(null);
                setIsAddressPromptFinished(false);
            }
        });

        return () => {
            isActuallyMounted = false;
            subscription.unsubscribe();
        };
    }, [loadPlans]);



    // Fetch initial balance if prompt is finished
    useEffect(() => {
        if (!userId) return;
        fetchTotalBalance(userId)
            .then((b) => setSessionBalance(b.futuresBalance))
            .catch(() => { });
    }, [userId]);

    // Handle initial address setup
    const handleSetAddress = async (addr: string) => {
        if (!addr) return;

        setTempAddress(addr);
        setIsAddressPromptFinished(true);

        console.log('[STRICT-ID] Journal Identity Lock START for address:', addr);

        // MANDATORY: We ALWAYS verify from registry even if it's the connected wallet.
        // This is the ONLY way to prevent the sticky "1061" ID from leaking in.
        try {
            const { lookupWalletAddress } = await import('@/lib/client-api');
            const foundId = await lookupWalletAddress(addr);

            if (foundId) {
                setManualUserId(foundId);
                console.log('[STRICT-ID] Journal Identity Lock SUCCESS:', { address: addr, userId: foundId });
                // Persist locally
                localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify({ address: addr, userId: foundId }));
            } else {
                throw new Error("Address not found in registry");
            }
        } catch (e) {
            console.error('[STRICT-ID] Journal Identity Lock CRITICAL FAILURE', e);
            // Block progress completely if ID cannot be resolved
            setManualUserId(null);
            setIsAddressPromptFinished(false);
            setTempAddress(null);
            alert("This address is not in the registry. Your trades cannot be synced until the registry is updated.");
        }
    };

    // Shared data fetching logic
    const fetchPlanData = useCallback(async (isAuto = false) => {
        const activePlan = selectedPlan;
        if (!activePlan) return;

        console.log('[STRICT-ID] Fetching plan data with verification for:', activePlan.name);

        // Deep verification: Always re-verify the map against registry before fetch to squash ANY ID leak
        let planUserId = activePlan.userId;
        try {
            if (!activePlan.walletAddress) throw new Error("Plan missing wallet address");

            const { lookupWalletAddress } = await import('@/lib/client-api');
            const freshId = await lookupWalletAddress(activePlan.walletAddress);

            if (freshId && freshId !== planUserId) {
                console.warn('[STRICT-ID] CORRECTING ID MISMATCH:', { plan: activePlan.name, old: planUserId, fresh: freshId });
                planUserId = freshId;

                // Update persistent store immediately
                const { updatePlan } = await import('@/lib/journal-store');
                const updatedPlan = await updatePlan(activePlan.id, { userId: freshId });
                if (updatedPlan) {
                    setSelectedPlan(updatedPlan);
                    setPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
                }
            }
        } catch (e) {
            console.error('[STRICT-ID] ID verification failed for plan. Skipping fetch to prevent leak.', e);
            return;
        }

        if (!planUserId) {
            console.error('[STRICT-ID] FATAL: No valid User ID for plan', activePlan.name);
            return;
        }

        if (!isAuto) setIsDataLoading(true);

        try {
            // Fetch everything fresh for the plan using the resolved ID
            const [raw, bal] = await Promise.all([
                fetchAllPositions(planUserId),
                fetchTotalBalance(planUserId)
            ]);

            console.log('[Journal] Data fetch successful for:', planUserId);

            const enriched = await enrichPositions(raw);
            setPlanPositions(enriched);
            setPlanBalance(bal.futuresBalance);
            setLastRefresh(new Date());
        } catch (e) {
            console.error('Failed to fetch plan data', e);
        } finally {
            if (!isAuto) setIsDataLoading(false);
        }
    }, [selectedPlan, userId]);

    // Manual refresh handler
    const handleRefreshManual = () => {
        fetchPlanData(false);
    };

    // Refetch when plan changes
    useEffect(() => {
        if (selectedPlan) {
            fetchPlanData(false);
        } else {
            setPlanPositions([]);
            setPlanBalance(0);
            setLastRefresh(null);
        }
    }, [selectedPlan, fetchPlanData]);

    // Auto-refresh timer (every 60 seconds)
    useEffect(() => {
        if (!selectedPlan || view !== 'dashboard') return;

        const interval = setInterval(() => {
            console.log('[Journal] Auto-refreshing plan data...');
            fetchPlanData(true);
        }, 60000);

        return () => clearInterval(interval);
    }, [selectedPlan, view, fetchPlanData]);

    // Compute metrics for selected plan
    const metrics: PlanMetrics | null = useMemo(() => {
        if (!selectedPlan) return null;
        return computePlanMetrics(selectedPlan, planPositions, planBalance || undefined);
    }, [selectedPlan, planPositions, planBalance]);

    const handleSavePlan = (plan: TradingPlan) => {
        loadPlans();
        setSelectedPlan(plan);
        setView('dashboard');
    };

    const handleViewPlan = (plan: TradingPlan) => {
        setSelectedPlan(plan);
        setView('dashboard');
    };

    const handleEditPlan = () => {
        setView('edit');
    };

    const handleDeletePlan = async (id: string) => {
        await deletePlan(id);
        await loadPlans();
        if (selectedPlan?.id === id) {
            setSelectedPlan(null);
            setView('list');
        }
    };

    const handleBack = () => {
        setView('list');
        setSelectedPlan(null);
    };

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 py-6 pb-16">
                {/* Page Header */}
                <div className="flex items-center gap-3 mb-8">
                    <Link 
                        href="/"
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary/20 hover:bg-secondary/40 text-muted-foreground/60 hover:text-foreground transition-all mr-2"
                        title="Back to Home"
                    >
                        <Home className="w-4 h-4" />
                    </Link>

                    {walletAddress && view !== 'list' && (
                        <button
                            onClick={handleBack}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary/20 hover:bg-secondary/40 text-muted-foreground/60 hover:text-foreground transition-all"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
                            <BookOpen className="w-4.5 h-4.5 text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-foreground leading-tight">
                                {view === 'dashboard' && selectedPlan
                                    ? selectedPlan.name
                                    : view === 'create'
                                        ? 'New Trading Plan'
                                        : view === 'edit'
                                            ? 'Edit Plan'
                                            : 'Trading Journal'}
                            </h1>
                            <div className="flex items-center gap-2">
                                <p className="text-[11px] text-muted-foreground/40">
                                    {walletAddress
                                        ? view === 'list'
                                            ? `${plans.length} plan${plans.length !== 1 ? 's' : ''}`
                                            : 'Plan Configuration'
                                        : 'Identity Configuration'}
                                </p>
                                {lastRefresh && view === 'dashboard' && (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500/40 uppercase tracking-tighter">
                                        <div className="w-1 h-1 rounded-full bg-orange-500 animate-pulse" />
                                        <span>Live</span>
                                    </div>
                                )}
                                {isBackgroundSyncing && (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500/40 uppercase tracking-tighter">
                                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                        <span>Syncing</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="ml-auto flex items-center gap-2">
                        {/* Auth Button */}
                        <button
                            onClick={() => {
                                if (user) {
                                    supabase.auth.signOut();
                                    // Local cleanup is handled in the auth state listener
                                } else {
                                    setIsAuthModalOpen(true);
                                }
                            }}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border",
                                user 
                                    ? "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20" 
                                    : "bg-secondary/20 border-border/20 text-muted-foreground/60 hover:text-foreground hover:bg-secondary/40"
                            )}
                        >
                            {user ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{user ? 'Cloud Sync On' : 'Guest Mode'}</span>
                            {user && <LogOut className="w-3 h-3 ml-1 opacity-40" />}
                        </button>

                        {view === 'dashboard' && (
                            <button
                                onClick={handleRefreshManual}
                                disabled={isDataLoading}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary/20 hover:bg-orange-500/10 text-muted-foreground/60 hover:text-orange-500 transition-all border border-transparent hover:border-orange-500/20 disabled:opacity-30"
                                title="Refresh data"
                            >
                                <RefreshCcw className={cn("w-3.5 h-3.5", isDataLoading && "animate-spin")} />
                            </button>
                        )}
                        {view === 'list' && plans.length > 0 && walletAddress && (
                            <button
                                onClick={() => setView('create')}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-[12px] font-bold transition-all shadow-lg shadow-orange-500/20"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                New Plan
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                {isAddressPromptFinished ? (
                    null // Main views handled below
                ) : isBackgroundSyncing ? (
                    /* Only show a blocker IF we have no local identity yet */
                    !walletAddress && (
                        <div className="flex flex-col items-center justify-center py-40 gap-4">
                            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                            <p className="text-sm font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Synchronizing Identity...</p>
                        </div>
                    )
                ) : !isAddressPromptFinished ? (
                    <AddressPrompt
                        onSetAddress={handleSetAddress}
                    />
                ) : null}

                {/* Main Views */}
                {walletAddress && view === 'list' && (
                    <PlanList
                        plans={plans}
                        onView={handleViewPlan}
                        onDelete={handleDeletePlan}
                        onCreateNew={() => setView('create')}
                    />
                )}

                {(view === 'create' || view === 'edit') && (
                    <PlanForm
                        walletAddress={walletAddress}
                        userId={userId || undefined}
                        startingBalanceSuggestion={sessionBalance}
                        initialPlan={view === 'edit' ? selectedPlan : null}
                        onSave={handleSavePlan}
                        onCancel={handleBack}
                    />
                )}

                {view === 'dashboard' && selectedPlan && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {isDataLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Fetching Plan History...</p>
                            </div>
                        ) : metrics ? (
                            <>
                                <PlanDashboard
                                    metrics={metrics}
                                    accountId={selectedPlan.userId || userId}
                                    onEdit={handleEditPlan}
                                />

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    <EquityCurveChart
                                        data={metrics.equityCurve}
                                        startingBalance={selectedPlan.startingBalance}
                                    />
                                    <DailyWinRateChart data={metrics.dailyPerformance} />
                                </div>

                                <DailyPerformanceTable daily={metrics.dailyPerformance} />

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <DisciplineScore score={metrics.disciplineScore} />
                                    <RuleViolations violations={metrics.violations} />
                                </div>

                                <TradeAnalytics analytics={metrics.symbolAnalytics} />

                                <DailyPositionDetail
                                    dailyData={metrics.dailyPerformance}
                                    allPositions={planPositions}
                                />
                            </>
                        ) : (
                            <div className="p-12 text-center text-muted-foreground/40 italic">
                                Failed to compute metrics for this plan.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
            />
        </div>
    );
}
