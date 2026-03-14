'use client';

import { AlertTriangle, XOctagon, AlertCircle, ShieldCheck } from 'lucide-react';
import type { RuleViolation } from '@/lib/journal-types';
import { CyberCard } from './cyber-elements';
import { cn } from '@/lib/utils';

interface RuleViolationsProps {
    violations: RuleViolation[];
}

const typeConfig: Record<string, any> = {
    DAILY_LOSS_LIMIT: {
        label: 'Loss_Limit_Incursion',
        icon: XOctagon,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
    },
    MAX_TRADES: {
        label: 'Signal_Abundance_Detected',
        icon: AlertTriangle,
        color: 'text-orange-500',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
    },
    MAX_LOSS_PER_TRADE: {
        label: 'Single_Vector_Leakage',
        icon: AlertCircle,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
    },
};

export function RuleViolations({ violations }: RuleViolationsProps) {
    return (
        <CyberCard className="p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
                    Internal Compliance Log
                </h3>
                {violations.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest animate-[pulse_2s_infinite]">
                        {violations.length} ANOMALIES
                    </span>
                )}
            </div>

            {violations.length === 0 ? (
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-lg shadow-orange-500/5">
                        <ShieldCheck className="text-orange-500 w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-orange-500 uppercase tracking-widest">Protocol Harmonized</p>
                        <p className="text-[10px] text-white/20 uppercase font-bold tracking-tight">No violations registered in current cycle</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {violations.map((v, i) => {
                        const cfg = typeConfig[v.type] || typeConfig.DAILY_LOSS_LIMIT;
                        const Icon = cfg.icon;
                        return (
                            <div
                                key={i}
                                className={cn(
                                    "flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 group transition-all",
                                    cfg.border
                                )}
                            >
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/5", cfg.color)}>
                                   <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn("text-[11px] font-black uppercase tracking-widest", cfg.color)}>{cfg.label}</p>
                                    <p className="text-[10px] text-white/40 mt-1 italic font-medium leading-tight">{v.description}</p>
                                </div>
                                {v.severity === 'critical' && (
                                    <span className="text-[8px] font-black px-2 py-0.5 rounded bg-red-500 text-white uppercase tracking-widest shrink-0">
                                        CRITICAL
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </CyberCard>
    );
}
