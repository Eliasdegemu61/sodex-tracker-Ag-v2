// Trading Journal Engine — pure computation on EnrichedPosition[]

import type { EnrichedPosition } from './sodex-api';
import type {
    TradingPlan,
    DayPerformance,
    RuleViolation,
    SymbolAnalytics,
    DisciplineScore,
    DisciplineBreakdown,
    PlanMetrics,
} from './journal-types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(ts: number | string | Date): string {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '0000-00-00';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
    const msA = new Date(a).getTime();
    const msB = new Date(b).getTime();
    return Math.round(Math.abs(msB - msA) / 86_400_000) + 1;
}

// ─── Filter ───────────────────────────────────────────────────────────────────

export function filterPositionsByPlan(
    positions: EnrichedPosition[],
    plan: TradingPlan
): EnrichedPosition[] {
    const start = new Date(plan.startDate).getTime();
    const end = new Date(plan.endDate).getTime() + 86_400_000; // inclusive
    return positions.filter((p) => {
        const t = p.created_at;
        return t >= start && t < end;
    });
}

// ─── Daily Performance ────────────────────────────────────────────────────────

export function computeDailyPerformance(
    positions: EnrichedPosition[],
    plan: TradingPlan
): DayPerformance[] {
    // Group positions by day
    const byDay = new Map<string, EnrichedPosition[]>();
    let lastTradeDay = toDateStr(new Date(plan.startDate).getTime());

    for (const pos of positions) {
        const day = toDateStr(pos.created_at);
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day)!.push(pos);
        if (day > lastTradeDay) lastTradeDay = day;
    }

    // Build sorted day list over plan range
    const days: DayPerformance[] = [];
    let cumPnl = 0;
    const startTs = new Date(plan.startDate).getTime();
    const endTs = new Date(plan.endDate).getTime();
    const todayStr = toDateStr(Date.now());

    // Stop at the LATEST of (today, last trade date) but constrained by plan end
    const lastVisibleDay = todayStr < toDateStr(endTs) ? todayStr : toDateStr(endTs);
    // Actually, user said: "dont show future dats yet untill it is the right time"
    // And "stop at the most recent date" for equity curve.
    // I will stop the loop at todayStr or endTs, whichever is earlier.

    let cursor = startTs;
    while (cursor <= endTs) {
        const dateStr = new Date(cursor).toISOString().slice(0, 10);

        // Don't show future dates
        if (dateStr > todayStr) break;

        const dayPositions = byDay.get(dateStr) ?? [];
        const violations: RuleViolation[] = [];

        const dailyPnl = dayPositions.reduce((s, p) => s + p.realizedPnlValue, 0);
        const wins = dayPositions.filter((p) => p.realizedPnlValue > 0).length;
        const losses = dayPositions.filter((p) => p.realizedPnlValue < 0).length;
        const winRate = dayPositions.length > 0 ? (wins / dayPositions.length) * 100 : 0;

        // Check max trades per day
        if (dayPositions.length > plan.maxTradesPerDay && plan.maxTradesPerDay > 0) {
            violations.push({
                type: 'MAX_TRADES',
                description: `Took ${dayPositions.length} trades (limit: ${plan.maxTradesPerDay})`,
                severity: 'warning',
                value: dayPositions.length,
                limit: plan.maxTradesPerDay,
            });
        }

        // Check daily loss limit
        if (dailyPnl < -Math.abs(plan.dailyLossLimit) && plan.dailyLossLimit > 0) {
            violations.push({
                type: 'DAILY_LOSS_LIMIT',
                description: `Daily loss of $${Math.abs(dailyPnl).toFixed(2)} exceeded limit of $${plan.dailyLossLimit}`,
                severity: 'critical',
                value: Math.abs(dailyPnl),
                limit: plan.dailyLossLimit,
            });
        }

        // Check max loss per trade
        for (const pos of dayPositions) {
            if (pos.realizedPnlValue < -Math.abs(plan.maxLossPerTrade) && plan.maxLossPerTrade > 0) {
                violations.push({
                    type: 'MAX_LOSS_PER_TRADE',
                    description: `${pos.pairName} trade loss $${Math.abs(pos.realizedPnlValue).toFixed(2)} > limit $${plan.maxLossPerTrade}`,
                    severity: 'critical',
                    tradeId: String(pos.position_id),
                    value: Math.abs(pos.realizedPnlValue),
                    limit: plan.maxLossPerTrade,
                });
            }
        }

        cumPnl += dailyPnl;

        days.push({
            date: dateStr,
            trades: dayPositions.length,
            dailyPnl,
            wins,
            losses,
            winRate,
            targetReached: plan.dailyProfitTarget > 0 && dailyPnl >= plan.dailyProfitTarget,
            lossLimitHit: violations.some((v) => v.type === 'DAILY_LOSS_LIMIT'),
            violations,
            cumulativePnl: cumPnl,
            equityBalance: plan.startingBalance + cumPnl,
        });

        cursor += 86_400_000;

        // Stop if we have passed the last trade date AND reached today
        // Actually, stopping at today is safer and more intuitive for "journal"
    }

    return days;
}

// ─── Equity Curve ─────────────────────────────────────────────────────────────

export function computeEquityCurve(
    daily: DayPerformance[],
    plan: TradingPlan
): { date: string; balance: number; cumulativePnl: number; dailyPnl: number; winRate: number }[] {
    // Find the last day with trades to truncate the curve properly
    let lastTradeIndex = -1;
    for (let i = 0; i < daily.length; i++) {
        if (daily[i].trades > 0) lastTradeIndex = i;
    }

    // If no trades, just show the starting point
    if (lastTradeIndex === -1) {
        return [{
            date: plan.startDate,
            balance: plan.startingBalance,
            cumulativePnl: 0,
            dailyPnl: 0,
            winRate: 0
        }];
    }

    const truncated = daily.slice(0, lastTradeIndex + 1);

    // Prepend the starting balance as the first point in the curve
    const startingPoint = {
        date: plan.startDate,
        balance: plan.startingBalance,
        cumulativePnl: 0,
        dailyPnl: 0,
        winRate: 0
    };

    const curve = [startingPoint, ...truncated.map((d) => ({
        date: d.date,
        balance: d.equityBalance,
        cumulativePnl: d.cumulativePnl,
        dailyPnl: d.dailyPnl,
        winRate: d.winRate
    }))];

    // De-duplicate if the first trade was on the start date
    if (curve.length > 2 && curve[0].date === curve[1].date) {
        return curve.slice(1);
    }

    return curve;
}

// ─── Symbol Analytics ─────────────────────────────────────────────────────────

export function computeSymbolAnalytics(positions: EnrichedPosition[]): SymbolAnalytics[] {
    const map = new Map<string, EnrichedPosition[]>();
    for (const pos of positions) {
        if (!map.has(pos.pairName)) map.set(pos.pairName, []);
        map.get(pos.pairName)!.push(pos);
    }

    const analytics: SymbolAnalytics[] = [];

    for (const [symbol, trades] of map.entries()) {
        const wins = trades.filter((t) => t.realizedPnlValue > 0);
        const losses = trades.filter((t) => t.realizedPnlValue <= 0);
        const totalPnl = trades.reduce((s, t) => s + t.realizedPnlValue, 0);
        const holdingTimes = trades.map((t) => t.updated_at - t.created_at);
        const avgHoldingTimeMs =
            holdingTimes.length > 0
                ? holdingTimes.reduce((s, v) => s + v, 0) / holdingTimes.length
                : 0;
        const leverages = trades.map((t) => t.leverage ?? 1);
        const avgLeverage =
            leverages.length > 0
                ? leverages.reduce((s, v) => s + v, 0) / leverages.length
                : 1;

        analytics.push({
            symbol,
            trades: trades.length,
            wins: wins.length,
            losses: losses.length,
            winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
            totalPnl,
            avgPnl: trades.length > 0 ? totalPnl / trades.length : 0,
            bestTrade: wins.length > 0 ? Math.max(...wins.map((t) => t.realizedPnlValue)) : 0,
            worstTrade: losses.length > 0 ? Math.min(...losses.map((t) => t.realizedPnlValue)) : 0,
            avgHoldingTimeMs,
            avgLeverage,
        });
    }

    return analytics.sort((a, b) => b.trades - a.trades);
}

// ─── Discipline Score ─────────────────────────────────────────────────────────

export function computeDisciplineScore(
    daily: DayPerformance[],
    plan: TradingPlan
): DisciplineScore {
    const tradingDays = daily.filter((d) => d.trades > 0);
    const total = tradingDays.length || 1;

    const stayedWithinLossLimit = tradingDays.filter(
        (d) => !d.lossLimitHit
    ).length;
    const stayedWithinMaxTrades = tradingDays.filter(
        (d) => plan.maxTradesPerDay === 0 || d.trades <= plan.maxTradesPerDay
    ).length;
    const noMaxLossPerTrade = tradingDays.filter(
        (d) => !d.violations.some((v) => v.type === 'MAX_LOSS_PER_TRADE')
    ).length;
    const stoppedAtTarget = tradingDays.filter((d) => d.targetReached).length;

    const breakdown: DisciplineBreakdown[] = [
        {
            rule: 'Daily Loss Limit',
            totalDays: total,
            passDays: stayedWithinLossLimit,
            failDays: total - stayedWithinLossLimit,
            passRate: (stayedWithinLossLimit / total) * 100,
        },
        {
            rule: 'Max Trades Per Day',
            totalDays: total,
            passDays: stayedWithinMaxTrades,
            failDays: total - stayedWithinMaxTrades,
            passRate: (stayedWithinMaxTrades / total) * 100,
        },
        {
            rule: 'Max Loss Per Trade',
            totalDays: total,
            passDays: noMaxLossPerTrade,
            failDays: total - noMaxLossPerTrade,
            passRate: (noMaxLossPerTrade / total) * 100,
        },
        {
            rule: 'Reached Daily Target',
            totalDays: total,
            passDays: stoppedAtTarget,
            failDays: total - stoppedAtTarget,
            passRate: (stoppedAtTarget / total) * 100,
        },
    ];

    const overall = Math.round(
        breakdown.reduce((s, b) => s + b.passRate, 0) / breakdown.length
    );

    return { overall, breakdown };
}

// ─── Full Plan Metrics ─────────────────────────────────────────────────────────

export function computePlanMetrics(
    plan: TradingPlan,
    allPositions: EnrichedPosition[],
    currentFuturesBalance?: number
): PlanMetrics {
    const positions = filterPositionsByPlan(allPositions, plan);
    const daily = computeDailyPerformance(positions, plan);
    const equityCurve = computeEquityCurve(daily, plan);
    const symbolAnalytics = computeSymbolAnalytics(positions);
    const disciplineScore = computeDisciplineScore(daily, plan);

    const wins = positions.filter((p) => p.realizedPnlValue > 0);
    const losses = positions.filter((p) => p.realizedPnlValue < 0);
    const totalPnl = positions.reduce((s, p) => s + p.realizedPnlValue, 0);
    const holdingTimes = positions.map((p) => p.updated_at - p.created_at);
    const avgHoldingTimeMs =
        holdingTimes.length > 0
            ? holdingTimes.reduce((s, v) => s + v, 0) / holdingTimes.length
            : 0;

    const totalDays = daysBetween(plan.startDate, plan.endDate);
    const today = new Date().toISOString().slice(0, 10);
    const daysCompleted = Math.min(
        today >= plan.startDate ? daysBetween(plan.startDate, today < plan.endDate ? today : plan.endDate) : 0,
        totalDays
    );

    const currentBalance = currentFuturesBalance ?? plan.startingBalance + totalPnl;

    const allViolations = daily.flatMap((d) => d.violations);

    const totalGains = wins.reduce((s, p) => s + p.realizedPnlValue, 0);
    const totalLosses = Math.abs(losses.reduce((s, p) => s + p.realizedPnlValue, 0));
    const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? 100 : 0;

    let maxDrawdown = 0;
    let peak = plan.startingBalance;
    for (const point of equityCurve) {
        if (point.balance > peak) peak = point.balance;
        const dd = peak > 0 ? (peak - point.balance) / peak * 100 : 0;
        if (dd > maxDrawdown) maxDrawdown = dd;
    }

    return {
        plan,
        totalTrades: positions.length,
        wins: wins.length,
        losses: losses.length,
        winRate: positions.length > 0 ? (wins.length / positions.length) * 100 : 0,
        totalPnl,
        pnlPercent: plan.startingBalance > 0 ? (totalPnl / plan.startingBalance) * 100 : 0,
        currentBalance,
        avgWin: wins.length > 0 ? wins.reduce((s, p) => s + p.realizedPnlValue, 0) / wins.length : 0,
        avgLoss: losses.length > 0 ? losses.reduce((s, p) => s + p.realizedPnlValue, 0) / losses.length : 0,
        largestWin: wins.length > 0 ? Math.max(...wins.map((p) => p.realizedPnlValue)) : 0,
        largestLoss: losses.length > 0 ? Math.min(...losses.map((p) => p.realizedPnlValue)) : 0,
        profitFactor,
        maxDrawdown,
        avgHoldingTimeMs,
        daysCompleted,
        totalDays,
        daysRemaining: Math.max(0, totalDays - daysCompleted),
        dailyPerformance: daily,
        equityCurve,
        symbolAnalytics,
        disciplineScore,
        violations: allViolations,
        allPositions: positions, // Pass filtered positions for history grid
    };
}

// ─── Format holding time ──────────────────────────────────────────────────────

export function formatHoldingTime(ms: number): string {
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
    if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
    return `${(ms / 86_400_000).toFixed(1)}d`;
}
