'use client';

import { Trash2, Plus, Clock, Target, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { TradingPlan } from '@/lib/journal-types';
import { CyberCard, CyberButton } from './cyber-elements';
import { cn } from '@/lib/utils';

interface PlanListProps {
    plans: TradingPlan[];
    onView: (plan: TradingPlan) => void;
    onDelete: (id: string) => void;
    onCreateNew: () => void;
}

export function PlanList({ plans, onView, onDelete, onCreateNew }: PlanListProps) {
    if (plans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <Target className="w-6 h-6 text-white/20" />
                </div>
                <div className="text-center space-y-2">
                    <p className="text-sm font-bold text-white/60 uppercase tracking-widest">No Active Plans</p>
                    <p className="text-xs text-white/20">Start by creating your first trading plan.</p>
                </div>
                <CyberButton onClick={onCreateNew}>
                    Create Plan
                </CyberButton>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4">
            {plans.map((plan) => {
                const created = new Date(plan.createdAt).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric'
                });
                
                return (
                    <div 
                        key={plan.id}
                        onClick={() => onView(plan)}
                        className="group relative flex items-center justify-between p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-white/10 hover:bg-[#161616] transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                <Clock className="w-5 h-5 text-white/40" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white tracking-tight leading-none mb-1.5">{plan.name}</h4>
                                <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Modified {created}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-12">
                            <div className="text-right">
                                <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1.5 text-right">Balance</p>
                                <p className="text-sm font-mono font-bold text-white leading-none">
                                    ${plan.startingBalance.toLocaleString()}
                                </p>
                            </div>
                            
                            <div className="text-right">
                                <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1.5 text-right">Daily Limit</p>
                                <p className="text-sm font-mono font-bold text-white/60 leading-none">
                                    ${plan.dailyLossLimit.toLocaleString()}
                                </p>
                            </div>

                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(plan.id); }}
                                className="w-10 h-10 flex items-center justify-center rounded-xl text-white/10 hover:text-red-400 hover:bg-red-400/5 transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
