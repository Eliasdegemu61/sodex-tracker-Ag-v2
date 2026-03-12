// Trading Journal — localStorage & Supabase Store

import type { TradingPlan } from './journal-types';
import { supabase } from './supabase-client';

const STORAGE_KEY = 'sodex_trading_plans';

function generateId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Helper to get current session
async function getSessionUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
}

export async function getPlans(): Promise<TradingPlan[]> {
    const user = await getSessionUser();
    
    // 1. Get from Supabase if logged in
    if (user) {
        const { data, error } = await supabase
            .from('journal_plans')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!error && data) {
            return data.map(item => ({
                ...item.plan_data,
                id: item.id,
                createdAt: item.created_at,
            }));
        }
    }

    // 2. Fallback to localStorage
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as TradingPlan[];
    } catch {
        return [];
    }
}

export async function savePlan(plan: Omit<TradingPlan, 'id' | 'createdAt'>): Promise<TradingPlan> {
    const user = await getSessionUser();
    
    const newPlanData = {
        ...plan,
        id: generateId(),
        createdAt: new Date().toISOString(),
    };

    // 1. Save to Supabase if logged in
    if (user) {
        const { data, error } = await supabase
            .from('journal_plans')
            .insert({
                owner_id: user.id,
                name: plan.name,
                plan_data: newPlanData
            })
            .select()
            .single();
        
        if (!error && data) {
            return {
                ...newPlanData,
                id: data.id,
                createdAt: data.created_at
            };
        }
        console.error('[STORE] Supabase save error:', error);
    }

    // 2. Fallback / Save to localStorage
    const plans = await getLocalPlans();
    plans.unshift(newPlanData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    return newPlanData;
}

export async function updatePlan(id: string, updates: Partial<TradingPlan>): Promise<TradingPlan | null> {
    const user = await getSessionUser();
    
    // 1. Update in Supabase if logged in
    if (user && !id.startsWith('plan_')) { // Real Supabase UUIDs don't start with plan_
        const { data: existing } = await supabase.from('journal_plans').select('plan_data').eq('id', id).single();
        if (existing) {
            const updatedData = { ...existing.plan_data, ...updates };
            const { data, error } = await supabase
                .from('journal_plans')
                .update({ 
                    name: updates.name || existing.plan_data.name,
                    plan_data: updatedData 
                })
                .eq('id', id)
                .select()
                .single();
            
            if (!error && data) {
                return { ...updatedData, id: data.id, createdAt: data.created_at };
            }
        }
    }

    // 2. Update in localStorage
    const plans = await getLocalPlans();
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    plans[idx] = { ...plans[idx], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    return plans[idx];
}

export async function deletePlan(id: string): Promise<void> {
    const user = await getSessionUser();
    
    if (user && !id.startsWith('plan_')) {
        await supabase.from('journal_plans').delete().eq('id', id);
    }

    const plans = (await getLocalPlans()).filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

// Private helper for localStorage logic
async function getLocalPlans(): Promise<TradingPlan[]> {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Migration helper: Move local plans to cloud
 */
export async function syncLocalPlansToCloud(): Promise<void> {
    const user = await getSessionUser();
    if (!user) return;

    const localPlans = await getLocalPlans();
    if (localPlans.length === 0) return;

    console.log(`[STORE] Syncing ${localPlans.length} local plans to cloud for user ${user.id}...`);

    let successCount = 0;
    for (const plan of localPlans) {
        const { error } = await supabase.from('journal_plans').insert({
            owner_id: user.id,
            name: plan.name,
            plan_data: plan
        });
        
        if (error) {
            console.error('[STORE] Failed to sync plan to cloud:', plan.name, error);
        } else {
            successCount++;
        }
    }

    // ONLY Clear local storage after ALL plans have been successfully synced
    if (successCount === localPlans.length) {
        console.log('[STORE] Cloud sync complete. Clearing local storage.');
        localStorage.removeItem(STORAGE_KEY);
    } else {
        console.warn(`[STORE] Cloud sync partial: ${successCount}/${localPlans.length} succeeded. Keeping local storage for safety.`);
    }
}
