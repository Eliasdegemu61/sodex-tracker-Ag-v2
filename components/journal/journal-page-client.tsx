'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
    LogOut
} from 'lucide-react';
import { getPlans, deletePlan, syncLocalPlansToCloud } from '@/lib/journal-store';
import { computePlanMetrics } from '@/lib/journal-engine';
import type { TradingPlan, PlanMetrics } from '@/lib/journal-types';
import { PlanForm } from './plan-form';
import { PlanList } from './plan-list';
import { PlanDashboard } from './plan-dashboard';
import { fetchTotalBalance, fetchAllPositions, enrichPositions, type EnrichedPosition } from '@/lib/sodex-api';
import { cn } from '@/lib/utils';
import { CyberCard, GlowLine, CyberButton } from './cyber-elements';
import { supabase } from '@/lib/supabase-client';
import { AuthModal } from './auth-modal';

type View = 'list' | 'create' | 'edit' | 'dashboard' | 'address_prompt';

const IDENTITY_STORAGE_KEY = 'sodex_journal_exclusive_v2';

const saveIdentityLocal = (addr: string, uid: string | null) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify({ address: addr, userId: uid }));
    } catch (e) {}
};

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
        <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[60vh] animate-in fade-in duration-1000">
            <div className="max-w-md w-full space-y-8 text-center">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight mb-2">Connect Journal</h2>
                    <p className="text-xs text-white/40 font-medium leading-relaxed">Enter your wallet address to sync your trading history.</p>
                </div>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="0x..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 font-mono text-sm outline-none focus:border-white/20 transition-all placeholder:text-white/20 text-center"
                    />
                    {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
                    <button 
                        onClick={handleManualLink} 
                        className="w-full h-11 bg-white text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        disabled={!input.trim() || isLoading}
                    >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Continue'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function JournalPageClient() {
    const [view, setView] = useState<View>('list');
    const [plans, setPlans] = useState<TradingPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<TradingPlan | null>(null);
    const [isAddressPromptFinished, setIsAddressPromptFinished] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Data state
    const [planPositions, setPlanPositions] = useState<EnrichedPosition[]>([]);
    const [planBalance, setPlanBalance] = useState<number>(0);
    const [isDataLoading, setIsDataLoading] = useState(false);
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

    const fetchPlanData = useCallback(async (isAuto = false) => {
        if (!selectedPlan?.userId) return;
        if (!isAuto) setIsDataLoading(true);
        try {
            const [raw, bal] = await Promise.all([
                fetchAllPositions(selectedPlan.userId),
                fetchTotalBalance(selectedPlan.userId)
            ]);
            const enriched = await enrichPositions(raw);
            setPlanPositions(enriched);
            setPlanBalance(bal.futuresBalance);
            setLastRefresh(new Date());
        } catch (e) {} finally { if (!isAuto) setIsDataLoading(false); }
    }, [selectedPlan]);

    useEffect(() => {
        if (selectedPlan) {
            fetchPlanData(false);
            
            // Set up polling interval (10 seconds)
            const interval = setInterval(() => {
                fetchPlanData(true);
            }, 10000);

            return () => clearInterval(interval);
        }
    }, [selectedPlan, fetchPlanData]);

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
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <Loader2 className="w-10 h-10 text-white/20 animate-spin" />
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Booting Terminal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-white selection:text-black">
            {/* Header */}
            <header className="h-12 md:h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 bg-[#050505]/80 backdrop-blur-xl z-50">
                <div className="flex items-center gap-4">
                    <div 
                        className="text-xs font-black tracking-widest cursor-pointer hover:text-white/80 transition-colors opacity-50"
                        onClick={() => setView('list')}
                    >
                        JOURNAL
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Identity Status */}
                    {isAddressPromptFinished && (
                        <div className="flex items-center gap-3 mr-1">
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-none mb-0.5">Connected</span>
                                <span className="text-[10px] font-mono text-white/60 leading-none">
                                    {tempAddress?.slice(0, 6)}...{tempAddress?.slice(-4)}
                                </span>
                            </div>
                            <button 
                                onClick={handleDisconnect}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all group"
                                title="Disconnect Address"
                            >
                                <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    )}

                    <div className="w-px h-4 bg-white/10 mx-1" />

                    {/* Cloud Sync Status */}
                    <button
                        onClick={() => user ? supabase.auth.signOut() : setIsAuthModalOpen(true)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest shadow-sm",
                            user 
                                ? "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20" 
                                : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
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
                        {user && <LogOut className="w-2.5 h-2.5 ml-0.5 opacity-40 hover:opacity-100" />}
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto no-scrollbar pb-20">
                <div className="max-w-4xl mx-auto w-full px-4 md:px-6 pt-4 md:pt-12">
                    {!isAddressPromptFinished ? (
                        <AddressPrompt onSetAddress={handleSetAddress} />
                    ) : (
                        <div className="space-y-6 md:space-y-12">
                            {/* Breadcrumbs for Dashboard View */}
                            {view === 'dashboard' && selectedPlan && (
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                                    <span onClick={() => setView('list')} className="cursor-pointer hover:text-white transition-colors">Portfolios</span>
                                    <ChevronRight className="w-3 h-3" />
                                    <span className="text-white/60">{selectedPlan.name}</span>
                                </div>
                            )}

                            {view === 'list' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <h1 className="text-3xl font-bold tracking-tight mb-2">Portfolios</h1>
                                            <p className="text-sm text-white/40 tracking-wide">Manage and track your active trading plans.</p>
                                        </div>
                                        <CyberButton onClick={() => setView('create')} className="h-10">New Plan</CyberButton>
                                    </div>
                                    <PlanList
                                        plans={plans}
                                        onView={(p) => { setSelectedPlan(p); setView('dashboard'); }}
                                        onDelete={async (id) => { await deletePlan(id); loadPlans(); }}
                                        onCreateNew={() => setView('create')}
                                    />
                                </div>
                            )}

                            {view === 'dashboard' && selectedPlan && metrics && (
                                <PlanDashboard 
                                    metrics={metrics} 
                                    accountId={selectedPlan.userId}
                                    onEdit={() => setView('edit')}
                                />
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
