'use client';

import { useState, useEffect, useRef } from 'react';
import { X, CalendarDays, ChevronDown, Loader2, CheckCircle2, AlertCircle, Shield, Zap, Target, Plus, ChevronRight } from 'lucide-react';
import { savePlan, updatePlan } from '@/lib/journal-store';
import { cn } from '@/lib/utils';
import type { TradingPlan } from '@/lib/journal-types';
import { ModernCalendar } from './modern-calendar';
import { CyberCard, CyberButton } from './cyber-elements';

interface PlanFormProps {
    walletAddress?: string | null;
    userId?: string | null;
    startingBalanceSuggestion?: number;
    initialPlan?: TradingPlan | null;
    onSave: (plan: TradingPlan) => void;
    onCancel: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const oneMonthLater = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
};

export function PlanForm({
    walletAddress: propAddress,
    userId: propUserId,
    startingBalanceSuggestion = 0,
    initialPlan,
    onSave,
    onCancel,
}: PlanFormProps) {
    const isEditing = !!initialPlan;

    const [form, setForm] = useState<{
        name: string;
        startDate: string;
        endDate: string;
        startingBalance: string;
        allocatedBalance: string;
        dailyProfitTarget: string;
        overallProfitTarget: string;
        dailyLossLimit: string;
        maxLossPerTrade: string;
        maxTradesPerDay: string;
        notes: string;
        walletAddress: string | null;
        userId: string | null;
    }>({
        name: initialPlan?.name ?? '',
        startDate: initialPlan?.startDate ?? today(),
        endDate: initialPlan?.endDate ?? oneMonthLater(),
        startingBalance: initialPlan?.startingBalance?.toString() ?? (startingBalanceSuggestion > 0 ? startingBalanceSuggestion.toFixed(2) : ''),
        allocatedBalance: initialPlan?.allocatedBalance?.toString() ?? '',
        dailyProfitTarget: initialPlan?.dailyProfitTarget?.toString() ?? '',
        overallProfitTarget: initialPlan?.overallProfitTarget?.toString() ?? '',
        dailyLossLimit: initialPlan?.dailyLossLimit?.toString() ?? '',
        maxLossPerTrade: initialPlan?.maxLossPerTrade?.toString() ?? '',
        maxTradesPerDay: initialPlan?.maxTradesPerDay?.toString() ?? '',
        notes: initialPlan?.notes ?? '',
        walletAddress: initialPlan?.walletAddress ?? propAddress ?? null,
        userId: initialPlan?.userId ?? null,
    });

    const [isIdLoading, setIsIdLoading] = useState(false);
    const [idLookupError, setIdLookupError] = useState<string | null>(null);
    const lookupTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const addr = form.walletAddress;
        if (addr !== propAddress) {
            setForm(f => f.userId !== null ? { ...f, userId: null } : f);
        }
        if (!addr || addr.length < 40) {
            setIdLookupError(null);
            return;
        }
        if (addr === propAddress && propUserId) {
            setForm(f => ({ ...f, userId: propUserId }));
            setIdLookupError(null);
            setIsIdLoading(false);
            return;
        }

        if (lookupTimeout.current) clearTimeout(lookupTimeout.current);
        lookupTimeout.current = setTimeout(async () => {
            setIsIdLoading(true);
            setIdLookupError(null);
            try {
                const { lookupWalletAddress } = await import('@/lib/client-api');
                const foundId = await lookupWalletAddress(addr);
                if (foundId) setForm(f => ({ ...f, userId: foundId }));
                else {
                    setIdLookupError('Address not authorized');
                    setForm(f => ({ ...f, userId: null }));
                }
            } catch (err) {
                setIdLookupError('Registry offline');
                setForm(f => ({ ...f, userId: null }));
            } finally { setIsIdLoading(false); }
        }, 800);
        return () => { if (lookupTimeout.current) clearTimeout(lookupTimeout.current); };
    }, [form.walletAddress, propAddress, propUserId]);

    const [errors, setErrors] = useState<Partial<typeof form>>({});

    const set = (key: keyof typeof form, val: string) => {
        setForm((f) => ({ ...f, [key]: val }));
        setErrors((e) => ({ ...e, [key]: undefined }));
    };

    const validate = (): boolean => {
        const errs: Partial<typeof form> = {};
        if (!form.name.trim()) errs.name = 'Required';
        if (!form.startDate) errs.startDate = 'Required';
        if (!form.endDate) errs.endDate = 'Required';
        if (form.endDate < form.startDate) errs.endDate = 'Invalid range';
        if (!form.startingBalance || Number(form.startingBalance) <= 0) errs.startingBalance = 'Invalid value';
        if (!form.walletAddress) errs.walletAddress = 'Address required';
        if (!form.userId && !isIdLoading) errs.walletAddress = 'Authorization missing';
        setErrors(errs);
        return Object.keys(errs).length === 0 && !isIdLoading && !idLookupError;
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const planData = {
                name: form.name.trim(),
                startDate: form.startDate,
                endDate: form.endDate,
                startingBalance: parseFloat(form.startingBalance) || 0,
                allocatedBalance: parseFloat(form.allocatedBalance) || parseFloat(form.startingBalance) || 0,
                dailyProfitTarget: parseFloat(form.dailyProfitTarget) || 0,
                overallProfitTarget: parseFloat(form.overallProfitTarget) || 0,
                dailyLossLimit: parseFloat(form.dailyLossLimit) || 0,
                maxLossPerTrade: parseFloat(form.maxLossPerTrade) || 0,
                maxTradesPerDay: parseInt(form.maxTradesPerDay) || 0,
                notes: form.notes.trim(),
                walletAddress: form.walletAddress,
                userId: form.userId,
            };
            const result = isEditing && initialPlan ? await updatePlan(initialPlan.id, planData) : await savePlan(planData);
            if (result) onSave(result);
        } catch (error) { console.error(error); } finally { setIsSubmitting(false); }
    };

    return (
        <div className="space-y-12 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 md:pb-8 border-b border-border/10">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                        {isEditing ? 'Edit Portfolio' : 'New Portfolio'}
                    </h2>
                    <p className="text-[11px] md:text-sm text-muted-foreground/40 mt-0.5 md:mt-1">
                        {isEditing ? 'Modify your trading constraints.' : 'Initialize a new trading plan.'}
                    </p>
                </div>
                <button onClick={onCancel} className="p-1.5 md:p-2 rounded-xl hover:bg-secondary/10 text-muted-foreground/20 hover:text-foreground transition-all">
                    <X className="w-4.5 h-4.5 md:w-5 md:h-5" />
                </button>
            </div>

            <div className="space-y-6 md:space-y-10">
                <Field
                    label="Portfolio Name"
                    id="plan-name"
                    value={form.name}
                    onChange={(val) => set('name', val)}
                    error={errors.name}
                    placeholder="E.g. Daily Scalping"
                />

                <div className="grid grid-cols-2 gap-4 md:gap-8">
                    <DateField label="Start Date" value={form.startDate} onChange={(val) => set('startDate', val)} error={errors.startDate} />
                    <DateField label="End Date" value={form.endDate} onChange={(val) => set('endDate', val)} error={errors.endDate} />
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-8">
                    <Field label="Starting Balance ($)" id="starting-balance" value={form.startingBalance} onChange={(val) => set('startingBalance', val)} error={errors.startingBalance} type="number" placeholder="0.00" />
                    <Field label="Overall Profit Target ($)" id="overall-profit" value={form.overallProfitTarget} onChange={(val) => set('overallProfitTarget', val)} error={errors.overallProfitTarget} type="number" placeholder="Enter total goal" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                    <Field label="Daily Profit Target ($)" id="daily-profit" value={form.dailyProfitTarget} onChange={(val) => set('dailyProfitTarget', val)} error={errors.dailyProfitTarget} type="number" placeholder="Enter daily target" />
                    <Field label="Daily Loss Limit ($)" id="daily-loss" value={form.dailyLossLimit} onChange={(val) => set('dailyLossLimit', val)} error={errors.dailyLossLimit} type="number" placeholder="Enter limit" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                    <Field label="Max Loss Per Trade ($)" id="max-loss-trade" value={form.maxLossPerTrade} onChange={(val) => set('maxLossPerTrade', val)} error={errors.maxLossPerTrade} type="number" placeholder="Enter limit" />
                    <Field label="Max Trades Per Day" id="max-trades" value={form.maxTradesPerDay} onChange={(val) => set('maxTradesPerDay', val)} error={errors.maxTradesPerDay} type="number" placeholder="0 = unlimited" />
                </div>

                <div className="space-y-3">
                    <label className="text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest">Connect Wallet</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={form.walletAddress || ''}
                            onChange={(e) => set('walletAddress', e.target.value)}
                            placeholder="0x..."
                            className={cn(
                                "w-full h-11 md:h-12 bg-secondary/20 dark:bg-white/5 border border-border/20 dark:border-white/10 rounded-xl px-4 font-mono text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:bg-secondary/30 dark:focus:bg-white/10 transition-all",
                                (errors.walletAddress || idLookupError) && "border-red-500/40"
                            )}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {isIdLoading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/40" /> : form.userId ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : idLookupError ? <AlertCircle className="w-4 h-4 text-red-500" /> : null}
                        </div>
                    </div>
                    {(errors.walletAddress || idLookupError) && (
                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{errors.walletAddress || idLookupError}</p>
                    )}
                </div>

                <div className="space-y-3">
                    <label className="text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest">Notes</label>
                    <textarea
                        value={form.notes}
                        onChange={(e) => set('notes', e.target.value)}
                        placeholder="Strategy details..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-2xl bg-secondary/20 dark:bg-white/5 border border-border/20 dark:border-white/10 text-[13px] text-foreground/80 placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:bg-secondary/30 dark:focus:bg-white/10 transition-all resize-none"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4 pt-8">
                <CyberButton variant="secondary" onClick={onCancel} className="flex-1">Cancel</CyberButton>
                <CyberButton onClick={handleSubmit} className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : isEditing ? 'Update Portfolio' : 'Create Portfolio'}
                </CyberButton>
            </div>
        </div>
    );
}

function Field({ label, id, value, onChange, error, type = 'text', placeholder = '' }: {
    label: string,
    id: string,
    value: string,
    onChange: (val: string) => void,
    error?: string,
    type?: string,
    placeholder?: string
}) {
    return (
        <div className="space-y-2.5">
            <label htmlFor={id} className="text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest">{label}</label>
            <input
                id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                className={cn(
                    "w-full h-11 md:h-12 px-4 rounded-xl bg-secondary/20 dark:bg-white/5 border border-border/20 dark:border-white/10 text-[13px] font-bold text-foreground placeholder:text-muted-foreground/40 outline-none transition-all focus:border-primary/50 focus:bg-secondary/30 dark:focus:bg-white/10",
                    "appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                    error && "border-red-500/40"
                )}
            />
            {error && <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">{error}</span>}
        </div>
    );
}

function DateField({ label, value, onChange, error }: {
    label: string,
    value: string,
    onChange: (val: string) => void,
    error?: string
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayDate = value ? new Date(value).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
    }) : 'Select Date';

    return (
        <div className="space-y-2.5 relative" ref={containerRef}>
            <label className="text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest">{label}</label>
            <button
                type="button" onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-11 md:h-12 px-4 rounded-xl bg-secondary/20 dark:bg-white/5 border border-border/20 dark:border-white/10 text-[13px] font-bold transition-all flex items-center justify-between",
                    isOpen ? "border-primary/50 bg-secondary/30 dark:bg-white/10" : "hover:border-border/30 dark:hover:border-white/20",
                    error ? "border-red-500/40" : "",
                    value ? "text-foreground" : "text-muted-foreground/40"
                )}
            >
                <span className="tracking-tight">{displayDate}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-[100] bg-card border border-border/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-3xl">
                    <ModernCalendar selectedDate={value} onSelect={onChange} onClose={() => setIsOpen(false)} />
                </div>
            )}
            {error && <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{error}</span>}
        </div>
    );
}
