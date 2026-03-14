import type { EnrichedPosition } from './sodex-api';

export interface TradingPlan {
    id: string;
    name: string;
    startDate: string; // ISO date string YYYY-MM-DD
    endDate: string;
    startingBalance: number;
    allocatedBalance: number;
    dailyProfitTarget: number;
    overallProfitTarget: number;
    dailyLossLimit: number;
    maxLossPerTrade: number;
    maxTradesPerDay: number;
    notes: string;
    walletAddress: string | null;
    userId: string | null;
    createdAt: string; // ISO timestamp
}

export interface DayPerformance {
    date: string; // YYYY-MM-DD
    trades: number;
    dailyPnl: number;
    wins: number;
    losses: number;
    winRate: number; // 0-100
    targetReached: boolean;
    lossLimitHit: boolean;
    violations: RuleViolation[];
    cumulativePnl: number; // running total up to this day
    equityBalance: number; // startingBalance + cumulativePnl
}

export interface RuleViolation {
    type: 'DAILY_LOSS_LIMIT' | 'MAX_TRADES' | 'MAX_LOSS_PER_TRADE';
    description: string;
    severity: 'warning' | 'critical';
    tradeId?: string;
    value?: number;
    limit?: number;
}

export interface SymbolAnalytics {
    symbol: string;
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalPnl: number;
    avgPnl: number;
    bestTrade: number;
    worstTrade: number;
    avgHoldingTimeMs: number;
    avgLeverage: number;
}

export interface DisciplineBreakdown {
    rule: string;
    totalDays: number;
    passDays: number;
    failDays: number;
    passRate: number;
}

export interface DisciplineScore {
    overall: number; // 0-100
    breakdown: DisciplineBreakdown[];
}

export interface PlanMetrics {
    plan: TradingPlan;
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalPnl: number;
    pnlPercent: number;
    currentBalance: number;
    avgWin: number;
    avgLoss: number;
    largestWin: number;
    largestLoss: number;
    avgHoldingTimeMs: number;
    daysCompleted: number;
    totalDays: number;
    daysRemaining: number;
    profitFactor: number;
    maxDrawdown: number;
    dailyPerformance: DayPerformance[];
    equityCurve: { date: string; balance: number; cumulativePnl: number; dailyPnl: number; winRate: number }[];
    symbolAnalytics: SymbolAnalytics[];
    disciplineScore: DisciplineScore;
    violations: RuleViolation[];
    allPositions: EnrichedPosition[];
}
