// Trading Journal — Pure localStorage Store
// Removed all Supabase/Cloud-sync dependencies for maximum privacy & local speed.

import type { TradingPlan } from './journal-types';

const STORAGE_KEY = 'sodex_journal_v2';

function generateId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Get all trading plans from local storage
 */
export async function getPlans(): Promise<TradingPlan[]> {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as TradingPlan[];
    } catch (err) {
        console.error('[JOURNAL-STORE] Error reading plans:', err);
        return [];
    }
}

/**
 * Create and save a new trading plan
 */
export async function savePlan(plan: Omit<TradingPlan, 'id' | 'createdAt'>): Promise<TradingPlan> {
    const newPlan: TradingPlan = {
        ...plan,
        id: generateId(),
        createdAt: new Date().toISOString(),
    };

    const plans = await getPlans();
    plans.unshift(newPlan);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    
    console.log('[JOURNAL-STORE] Plan saved locally:', newPlan.name);
    return newPlan;
}

/**
 * Update an existing trading plan
 */
export async function updatePlan(id: string, updates: Partial<TradingPlan>): Promise<TradingPlan | null> {
    const plans = await getPlans();
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const updatedPlan = { ...plans[idx], ...updates };
    plans[idx] = updatedPlan;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    
    console.log('[JOURNAL-STORE] Plan updated locally:', updatedPlan.name);
    return updatedPlan;
}

/**
 * Delete a trading plan
 */
export async function deletePlan(id: string): Promise<void> {
    const plans = (await getPlans()).filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    console.log('[JOURNAL-STORE] Plan deleted:', id);
}

// Migration / Auth helpers removed as they are no longer needed for local-only mindset.
