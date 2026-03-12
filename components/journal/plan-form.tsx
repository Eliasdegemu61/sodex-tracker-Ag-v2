'use client';

import { useState, useEffect, useRef } from 'react';
import { X, CalendarDays, ChevronDown, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { savePlan, updatePlan } from '@/lib/journal-store';
import { cn } from '@/lib/utils';
import type { TradingPlan } from '@/lib/journal-types';
import { ModernCalendar } from './modern-calendar';

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

    // Auto-lookup ID when walletAddress changes
    useEffect(() => {
        const addr = form.walletAddress;

        // Strict Isolation: If it's NOT the connected wallet, clear the ID immediately
        // and force a new registry lookup. Never allow fallback to session IDs.
        if (addr !== propAddress) {
            setForm(f => {
                if (f.userId !== null) {
                    console.log('[PlanForm] Address mismatch, clearing User ID leak risk');
                    return { ...f, userId: null };
                }
                return f;
            });
        }

        if (!addr || addr.length < 40) {
            setIdLookupError(null);
            return;
        }

        // If it's the connected address, we likely already have the ID
        if (addr === propAddress && propUserId) {
            setForm(f => ({ ...f, userId: propUserId }));
            setIdLookupError(null);
            setIsIdLoading(false); // Make sure loading is false
            return;
        }

        // debounce lookup
        if (lookupTimeout.current) clearTimeout(lookupTimeout.current);
        lookupTimeout.current = setTimeout(async () => {
            setIsIdLoading(true);
            setIdLookupError(null);
            try {
                const { lookupWalletAddress } = await import('@/lib/client-api');
                const foundId = await lookupWalletAddress(addr);
                if (foundId) {
                    setForm(f => ({ ...f, userId: foundId }));
                    console.log('[STRICT-ID] PlanForm Verified User ID:', foundId, 'for address:', addr);
                } else {
                    setIdLookupError('Address not found in registry');
                    setForm(f => ({ ...f, userId: null }));
                }
            } catch (err) {
                console.error('[PlanForm] ID lookup failed:', err);
                setIdLookupError('Address not found in registry');
                setForm(f => ({ ...f, userId: null }));
            } finally {
                setIsIdLoading(false);
            }
        }, 800);

        return () => {
            if (lookupTimeout.current) clearTimeout(lookupTimeout.current);
        };
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
        if (form.endDate < form.startDate) errs.endDate = 'Must be after start date';
        if (!form.startingBalance || Number(form.startingBalance) <= 0)
            errs.startingBalance = 'Required';
        if (!form.walletAddress) errs.walletAddress = 'Required';
        if (!form.userId && !isIdLoading) errs.walletAddress = 'Invalid address (No User ID found)';

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
                dailyLossLimit: parseFloat(form.dailyLossLimit) || 0,
                maxLossPerTrade: parseFloat(form.maxLossPerTrade) || 0,
                maxTradesPerDay: parseInt(form.maxTradesPerDay) || 0,
                notes: form.notes.trim(),
                walletAddress: form.walletAddress,
                userId: form.userId,
            };

            let result: TradingPlan | null;
            if (isEditing && initialPlan) {
                result = await updatePlan(initialPlan.id, planData);
            } else {
                result = await savePlan(planData);
            }

            if (result) onSave(result);
        } catch (error) {
            console.error('[PlanForm] Submit error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="p-8 bg-card dark:bg-card/95 border border-border/20 shadow-2xl rounded-[3rem] max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-500 relative">
            <style jsx global>{`
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type=number] {
                    -moz-appearance: textfield;
                }
            `}</style>

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight">
                        {isEditing ? 'Edit Trading Plan' : 'Create Trading Plan'}
                    </h2>
                    <p className="text-[11px] text-muted-foreground/40 mt-1 uppercase tracking-widest font-bold">
                        {isEditing ? 'Modify your rules and targets' : 'Set your rules and targets for this plan'}
                    </p>
                </div>
                <button
                    onClick={onCancel}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-secondary/20 hover:bg-secondary/40 text-muted-foreground/50 hover:text-foreground transition-all"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-6">
                {/* Plan Name */}
                <Field
                    label="Plan Name"
                    id="plan-name"
                    value={form.name}
                    onChange={(val) => set('name', val)}
                    error={errors.name}
                    placeholder="e.g. March High Growth Challenge"
                />

                {/* Dates */}
                <div className="grid grid-cols-2 gap-6">
                    <DateField
                        label="Start Date"
                        value={form.startDate}
                        onChange={(val) => set('startDate', val)}
                        error={errors.startDate}
                    />
                    <DateField
                        label="End Date"
                        value={form.endDate}
                        onChange={(val) => set('endDate', val)}
                        error={errors.endDate}
                    />
                </div>

                {/* Balances */}
                <div className="grid grid-cols-2 gap-6">
                    <Field
                        label="Starting Balance ($)"
                        id="starting-balance"
                        value={form.startingBalance}
                        onChange={(val) => set('startingBalance', val)}
                        error={errors.startingBalance}
                        type="number"
                        placeholder="0.00"
                        hint={!isEditing && startingBalanceSuggestion > 0 ? `Current balance: $${startingBalanceSuggestion.toFixed(2)}` : undefined}
                    />
                    <Field
                        label="Allocated Balance ($)"
                        id="allocated-balance"
                        value={form.allocatedBalance}
                        onChange={(val) => set('allocatedBalance', val)}
                        error={errors.allocatedBalance}
                        type="number"
                        placeholder="Defaults to full balance"
                    />
                </div>

                {/* Wallet Address (ReadOnly in Edit if connected, but editable for manual) */}
                <Field
                    label="Linked Wallet Address"
                    id="wallet-address"
                    value={form.walletAddress || ''}
                    onChange={(val) => set('walletAddress', val)}
                    error={errors.walletAddress || idLookupError || undefined}
                    placeholder="0x..."
                    hint={isIdLoading ? "Searching registry..." : form.userId ? `Verified User ID: ${form.userId}` : "Enter address to link trade history"}
                    rightIcon={isIdLoading ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : form.userId ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : idLookupError ? <AlertCircle className="w-4 h-4 text-red-500" /> : null}
                />

                {/* Section divider */}
                <div className="pt-6 border-t border-border/10">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-6">Risk Rules & Discipline</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Field
                            label="Daily Profit Target ($)"
                            id="daily-profit"
                            value={form.dailyProfitTarget}
                            onChange={(val) => set('dailyProfitTarget', val)}
                            error={errors.dailyProfitTarget}
                            type="number"
                            placeholder="0 = no target"
                        />
                        <Field
                            label="Daily Loss Limit ($)"
                            id="daily-loss"
                            value={form.dailyLossLimit}
                            onChange={(val) => set('dailyLossLimit', val)}
                            error={errors.dailyLossLimit}
                            type="number"
                            placeholder="0 = no limit"
                        />
                        <Field
                            label="Max Loss Per Trade ($)"
                            id="max-trade-loss"
                            value={form.maxLossPerTrade}
                            onChange={(val) => set('maxLossPerTrade', val)}
                            error={errors.maxLossPerTrade}
                            type="number"
                            placeholder="0 = no limit"
                        />
                        <Field
                            label="Max Trades Per Day"
                            id="max-trades"
                            value={form.maxTradesPerDay}
                            onChange={(val) => set('maxTradesPerDay', val)}
                            error={errors.maxTradesPerDay}
                            type="number"
                            placeholder="0 = no limit"
                        />
                    </div>
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="notes" className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">
                        Notes / Strategy
                    </label>
                    <textarea
                        id="notes"
                        value={form.notes}
                        onChange={(e) => set('notes', e.target.value)}
                        placeholder="Describe your strategy, goals, or any additional notes..."
                        rows={4}
                        className="px-4 py-3 rounded-2xl bg-secondary/10 border border-border/20 text-sm text-foreground placeholder:text-muted-foreground/20 outline-none focus:border-orange-500/40 transition-all resize-none"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 mt-10">
                <button
                    onClick={onCancel}
                    className="flex-1 h-12 rounded-2xl border border-border/20 text-sm font-bold text-muted-foreground/60 hover:bg-secondary/20 hover:text-foreground transition-all uppercase tracking-widest"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    className="flex-1 h-12 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-black transition-all shadow-xl shadow-orange-500/30 uppercase tracking-widest"
                >
                    {isEditing ? 'Update Plan' : 'Create Plan'}
                </button>
            </div>
        </Card>
    );
}

function Field({
    label,
    id,
    value,
    onChange,
    error,
    type = 'text',
    placeholder = '',
    hint,
    rightIcon,
}: {
    label: string;
    id: string;
    value: string;
    onChange: (val: string) => void;
    error?: string;
    type?: string;
    placeholder?: string;
    hint?: string;
    rightIcon?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-2 group">
            <label htmlFor={id} className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest group-focus-within:text-orange-500 transition-colors">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={cn(
                        "w-full h-12 px-4 rounded-2xl bg-secondary/10 border text-sm text-foreground placeholder:text-muted-foreground/20 outline-none transition-all",
                        error ? "border-red-500/40 bg-red-500/5" : "border-border/20 focus:border-orange-500/40 focus:bg-secondary/20"
                    )}
                />
                {rightIcon && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {rightIcon}
                    </div>
                )}
            </div>
            {error && <span className="text-[10px] font-bold text-red-500 ml-1">{error}</span>}
            {hint && !error && <span className="text-[10px] text-muted-foreground/30 ml-1 font-medium italic">{hint}</span>}
        </div>
    );
}

function DateField({
    label,
    value,
    onChange,
    error
}: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    error?: string
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Format date for display: "Mar 10, 2026"
    const displayDate = value ? new Date(value).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
    }) : 'Select Date';

    return (
        <div className="flex flex-col gap-2 relative" ref={containerRef}>
            <label className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">
                {label}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-12 px-4 rounded-2xl bg-secondary/10 border text-sm transition-all flex items-center justify-between",
                    isOpen ? "border-orange-500/40 bg-secondary/20" : "border-border/20",
                    error ? "border-red-500/40 bg-red-500/5" : "",
                    value ? "text-foreground" : "text-muted-foreground/20"
                )}
            >
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-orange-500" />
                    <span className="font-bold">{displayDate}</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground/20 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-[100] drop-shadow-2xl">
                    <ModernCalendar
                        selectedDate={value}
                        onSelect={onChange}
                        onClose={() => setIsOpen(false)}
                    />
                </div>
            )}

            {error && <span className="text-[10px] font-bold text-red-500 ml-1">{error}</span>}
        </div>
    );
}
