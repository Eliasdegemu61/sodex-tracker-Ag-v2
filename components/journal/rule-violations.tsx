'use client';

import { AlertTriangle, XOctagon, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { RuleViolation } from '@/lib/journal-types';

interface RuleViolationsProps {
    violations: RuleViolation[];
}

const typeConfig = {
    DAILY_LOSS_LIMIT: {
        label: 'Daily Loss Limit Exceeded',
        icon: XOctagon,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
    },
    MAX_TRADES: {
        label: 'Max Trades Per Day Exceeded',
        icon: AlertTriangle,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
    },
    MAX_LOSS_PER_TRADE: {
        label: 'Max Loss Per Trade Exceeded',
        icon: AlertCircle,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
    },
};

export function RuleViolations({ violations }: RuleViolationsProps) {
    return (
        <Card className="p-5 bg-card/95 border border-border/20 rounded-3xl">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    Rule Violations
                </h3>
                {violations.length > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-red-500/15 text-red-400 text-[10px] font-bold">
                        {violations.length} detected
                    </span>
                )}
            </div>

            {violations.length === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/5 border border-green-500/15">
                    <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <span className="text-green-400 text-lg">✓</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-green-400">No Violations</p>
                        <p className="text-[10px] text-muted-foreground/40">All rules followed perfectly</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {violations.map((v, i) => {
                        const cfg = typeConfig[v.type];
                        const Icon = cfg.icon;
                        return (
                            <div
                                key={i}
                                className={`flex items-start gap-3 p-3 rounded-2xl ${cfg.bg} border ${cfg.border}`}
                            >
                                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[11px] font-bold ${cfg.color}`}>{cfg.label}</p>
                                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">{v.description}</p>
                                </div>
                                {v.severity === 'critical' && (
                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 uppercase tracking-wider shrink-0">
                                        critical
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}
