'use client';

import { Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { DisciplineScore as DisciplineScoreType } from '@/lib/journal-types';

interface DisciplineScoreProps {
    score: DisciplineScoreType;
}

function ScoreRing({ value }: { value: number }) {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const dash = (value / 100) * circumference;
    const color = value >= 80 ? 'var(--emerald-500)' : value >= 50 ? 'var(--orange-500)' : 'var(--red-500)';

    return (
        <div className="relative w-24 h-24 flex items-center justify-center">
            <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.05" strokeWidth="8" />
                <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black" style={{ color: value >= 80 ? 'rgb(16 185 129)' : value >= 50 ? 'rgb(249 115 22)' : 'rgb(239 68 68)' }}>{value}</span>
                <span className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-wider">/ 100</span>
            </div>
        </div>
    );
}

export function DisciplineScore({ score }: DisciplineScoreProps) {
    const label =
        score.overall >= 90 ? 'Excellent' :
            score.overall >= 75 ? 'Good' :
                score.overall >= 50 ? 'Moderate' : 'Needs Work';

    const labelColor =
        score.overall >= 90 ? 'text-emerald-500' :
            score.overall >= 75 ? 'text-emerald-500' :
                score.overall >= 50 ? 'text-orange-500' : 'text-red-500';

    return (
        <Card className="p-6 bg-card/30 backdrop-blur-md border border-border/10 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-[0.2em]">
                    Discipline
                </h3>
                <Trophy className="w-4 h-4 text-orange-500/50" />
            </div>

            <div className="flex items-center gap-6 mb-8">
                <ScoreRing value={score.overall} />
                <div className="flex flex-col gap-0.5">
                    <span className={`text-2xl font-bold tracking-tight ${labelColor}`}>{label}</span>
                    <span className="text-[10px] text-muted-foreground/40 font-medium">Rule Compliance Score</span>
                </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-4">
                {score.breakdown.map((rule) => (
                    <div key={rule.rule} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-muted-foreground/60">{rule.rule}</span>
                            <span className={`text-[10px] font-bold ${rule.passRate >= 80 ? 'text-emerald-500' : rule.passRate >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                                {rule.passRate.toFixed(0)}%
                            </span>
                        </div>
                        <div className="h-1 w-full bg-secondary/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${rule.passRate >= 80 ? 'bg-emerald-500' : rule.passRate >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                                style={{ width: `${rule.passRate}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground/20 font-medium">
                            <span>{rule.passDays > 0 ? `${rule.passDays}d pass` : ''}</span>
                            <span className="text-red-500/40">{rule.failDays > 0 ? `${rule.failDays}d fail` : ''}</span>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
