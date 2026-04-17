'use client';

import { AlertTriangle, XOctagon, AlertCircle, ShieldCheck } from 'lucide-react';
import type { RuleViolation } from '@/lib/journal-types';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface RuleViolationsProps {
    violations: RuleViolation[];
}

const typeConfig: Record<string, any> = {
    DAILY_LOSS_LIMIT: {
        label: 'Daily Loss Limit',
        icon: XOctagon,
        color: 'text-red-500',
        bg: 'bg-red-500/5',
        border: 'border-red-500/10',
    },
    MAX_TRADES: {
        label: 'Excessive Trading',
        icon: AlertTriangle,
        color: 'text-orange-500',
        bg: 'bg-orange-500/5',
        border: 'border-orange-500/10',
    },
    MAX_LOSS_PER_TRADE: {
        label: 'Stop Loss Limit',
        icon: AlertCircle,
        color: 'text-red-500',
        bg: 'bg-red-500/5',
        border: 'border-red-500/10',
    },
};

export function RuleViolations({ violations }: RuleViolationsProps) {
    return (
        <Card className="p-6 bg-card/30 backdrop-blur-md border border-border/10 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/5">
                <h3 className="text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-[0.2em]">
                    Compliance
                </h3>
                {violations.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-red-500 text-[9px] font-bold uppercase tracking-wider">
                            Needs Attention
                        </span>
                    </div>
                )}
            </div>

            {violations.length === 0 ? (
                <div className="flex items-center gap-4 p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <ShieldCheck className="text-emerald-500 w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest">Compliant</p>
                        <p className="text-[10px] text-muted-foreground/40 font-medium tracking-tight">All discipline rules followed</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {violations.map((v, i) => {
                        const cfg = typeConfig[v.type] || typeConfig.DAILY_LOSS_LIMIT;
                        const Icon = cfg.icon;
                        return (
                            <div
                                key={i}
                                className={cn(
                                    "flex items-start gap-4 p-4 rounded-xl transition-all border",
                                    cfg.bg,
                                    cfg.border
                                )}
                            >
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-background/50", cfg.color)}>
                                   <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn("text-[11px] font-medium uppercase tracking-wider", cfg.color)}>{cfg.label}</p>
                                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-medium leading-relaxed">{v.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}
