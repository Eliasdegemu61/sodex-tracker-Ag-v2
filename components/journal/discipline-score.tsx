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
        <Card className="p-5 bg-card/40 backdrop-blur-3xl border border-border/10 rounded-3xl">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    Discipline Score
                </h3>
                <Trophy className="w-4 h-4 text-orange-500" />
            </div>

            <div className="flex items-center gap-6">
                <ScoreRing value={score.overall} />
                <div className="flex flex-col gap-1">
                    <span className={`text-lg font-black ${labelColor}`}>{label}</span>
                    <span className="text-[11px] text-muted-foreground/40">Based on {score.breakdown.length} rules</span>
                </div>
            </div>

            {/* Breakdown */}
            <div className="mt-4 space-y-3">
                {score.breakdown.map((rule) => (
                    <div key={rule.rule}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-medium text-muted-foreground/60">{rule.rule}</span>
                            <span className={`text-[10px] font-bold ${rule.passRate >= 80 ? 'text-emerald-500' : rule.passRate >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                                {rule.passRate.toFixed(0)}%
                            </span>
                        </div>
                        <div className="h-1 w-full bg-secondary/20 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${rule.passRate >= 80 ? 'bg-green-500' : rule.passRate >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                                style={{ width: `${rule.passRate}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground/25 mt-0.5">
                            <span>{rule.passDays} pass</span>
                            <span>{rule.failDays} fail</span>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
