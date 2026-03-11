// Trading Journal — localStorage Store

import type { TradingPlan } from './journal-types';

const STORAGE_KEY = 'sodex_trading_plans';

function generateId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function getPlans(): TradingPlan[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as TradingPlan[];
    } catch {
        return [];
    }
}

export function getPlanById(id: string): TradingPlan | null {
    return getPlans().find((p) => p.id === id) ?? null;
}

export function savePlan(plan: Omit<TradingPlan, 'id' | 'createdAt'>): TradingPlan {
    const plans = getPlans();
    const newPlan: TradingPlan = {
        ...plan,
        id: generateId(),
        createdAt: new Date().toISOString(),
    };
    plans.unshift(newPlan); // newest first
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    return newPlan;
}

export function updatePlan(id: string, updates: Partial<TradingPlan>): TradingPlan | null {
    const plans = getPlans();
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    plans[idx] = { ...plans[idx], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    return plans[idx];
}

export function deletePlan(id: string): void {
    const plans = getPlans().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}
