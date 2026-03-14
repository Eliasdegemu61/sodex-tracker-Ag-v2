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
    User,
    Plus,
    X,
    ChevronRight
} from 'lucide-react';
import { getPlans, deletePlan } from '@/lib/journal-store';
import { computePlanMetrics } from '@/lib/journal-engine';
import type { TradingPlan, PlanMetrics } from '@/lib/journal-types';
import { PlanForm } from './plan-form';
import { PlanList } from './plan-list';
import { PlanDashboard } from './plan-dashboard';
import { fetchTotalBalance, fetchAllPositions, enrichPositions, type EnrichedPosition } from '@/lib/sodex-api';
import { cn } from '@/lib/utils';
import { CyberCard, GlowLine, CyberButton } from './cyber-elements';

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
        const addr = input.trim();
        if (!addr) return;
        setIsLoading(true);
        setError(null);
        try {
            const { lookupWalletAddress } = await import('@/lib/client-api');
            const foundId = await lookupWalletAddress(addr);
            if (foundId) onSetAddress(addr);
            else setError('Authorization failed');
        } catch (err) {
            setError('Registry error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-500">
            <CyberCard className="max-w-md w-full text-center space-y-6 py-12 border-white/10 bg-black/60">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                    <Shield className="w-8 h-8 text-white/40" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight mb-1">Access Terminal</h2>
                    <p className="text-xs text-white/40 font-medium uppercase tracking-widest">Identify yourself to continue</p>
                </div>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Wallet Address"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 font-mono text-sm outline-none focus:border-white/20 transition-all placeholder:text-white/20"
                    />
                    {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
                    <CyberButton 
                        onClick={handleManualLink} 
                        className="w-full"
                        disabled={!input.trim() || isLoading}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
                    </CyberButton>
                </div>
            </CyberCard>
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

    // Initial hydration
    useEffect(() => {
        try {
            const cacheStr = localStorage.getItem(IDENTITY_STORAGE_KEY);
            if (cacheStr) {
                const identity = JSON.parse(cacheStr);
                if (identity?.address) {
                    setTempAddress(identity.address);
                    setManualUserId(identity.userId || null);
                    setIsAddressPromptFinished(true);
                }
            }
        } catch (e) {} finally { setIsMounted(true); }
    }, []);

    const loadPlans = useCallback(async () => {
        const p = await getPlans();
        setPlans(p);
    }, []);

    useEffect(() => { loadPlans(); }, [loadPlans]);

    const handleSetAddress = async (addr: string) => {
        if (!addr) return;
        setTempAddress(addr);
        setIsAddressPromptFinished(true);
        try {
            const { lookupWalletAddress } = await import('@/lib/client-api');
            const foundId = await lookupWalletAddress(addr);
            if (foundId) {
                setManualUserId(foundId);
                saveIdentityLocal(addr, foundId);
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

    if (!isMounted) return null;

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-white selection:text-black">
            {/* Header */}
            <header className="h-12 md:h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 bg-[#050505]/80 backdrop-blur-xl z-50">
                <div className="flex items-center gap-4">
                    <div 
                        className="text-sm font-bold tracking-tight cursor-pointer hover:text-white/80 transition-colors"
                        onClick={() => setView('list')}
                    >
                        JOURNAL
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isAddressPromptFinished && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/40">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            {tempAddress?.slice(0, 6)}...{tempAddress?.slice(-4)}
                        </div>
                    )}
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

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
