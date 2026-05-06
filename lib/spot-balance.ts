// Precise spot balance calculation service

import { cacheManager } from './cache';

export interface SpotTokenBalance {
  token: string;
  originalCoin: string;
  balance: number;
  usdValue: number;
}

export interface DetailedSpotBalance {
  tokens: SpotTokenBalance[];
  totalUsdValue: number;
  hasUnpricedAssets: boolean;
  unpricedTokens: string[];
}

interface SosopriceResponse {
  code: number;
  message: string;
  data: {
    name: string;
    price: number;
    timestamp: number;
  };
}

// Remove prefixes like 'v' or 'w' from token names
function cleanTokenName(coin: string): string {
  return coin.replace(/^[vw]/i, '');
}

// Check if token is SOSO-based
function isSosoToken(cleanToken: string): boolean {
  return cleanToken.toUpperCase() === 'SOSO';
}

// Check if token is USDC (1:1 USD)
function isUsdcToken(cleanToken: string): boolean {
  return cleanToken.toUpperCase() === 'USDC';
}

// Fetch SOSO price from SODEX API - DYNAMIC (no cache)
async function fetchSosoPrice(): Promise<number> {
  try {
    const response = await fetch('/api/perps/soso-price');
    
    if (!response.ok) {
      console.error('[v0] Failed to fetch SOSO price:', response.statusText);
      throw new Error(`SOSO price fetch failed: ${response.statusText}`);
    }

    const data: SosopriceResponse = await response.json();
    
    if (data.code !== 0) {
      console.error('[v0] SOSO API error:', data.message);
      throw new Error(`SOSO API error: ${data.message}`);
    }

    const price = data.data.price;
    console.log('[v0] Fetched SOSO price (dynamic, no cache):', price);
    
    return price;
  } catch (error) {
    console.error('[v0] Error fetching SOSO price:', error);
    throw error;
  }
}

// Get price for a token
async function getTokenPrice(cleanToken: string, markPrices: Map<string, number>): Promise<number | null> {
  // USDC is 1:1 with USD - no fetching needed
  if (isUsdcToken(cleanToken)) {
    return 1.0;
  }

  // Check if it's SOSO - always fetch fresh
  if (isSosoToken(cleanToken)) {
    try {
      return await fetchSosoPrice();
    } catch (error) {
      console.warn('[v0] Failed to get SOSO price:', error);
      return null;
    }
  }

  // Check if we have the price in mark prices map (supports all 3 API sources)
  if (markPrices.has(cleanToken)) {
    const price = markPrices.get(cleanToken);
    console.log('[v0] Found price for token:', cleanToken, 'price:', price);
    return price || null;
  }

  // If not found anywhere, return null (will display as "OTHER ASSETS" or --)
  console.warn('[v0] No price found for token:', cleanToken, '- will show without USD conversion');
  return null;
}

// Calculate precise USD value for each spot token
export async function calculateDetailedSpotBalance(
  spotBalances: Array<{ coin: string; balance: string }>,
  markPrices: Map<string, number>
): Promise<DetailedSpotBalance> {
  const tokens: SpotTokenBalance[] = [];
  const unpricedTokens: string[] = [];
  let totalUsdValue = 0;

  for (const balance of spotBalances) {
    const balanceAmount = parseFloat(balance.balance || '0');
    
    // Skip zero balances
    if (balanceAmount === 0) {
      continue;
    }

    // Clean token name (remove v/w prefixes)
    const cleanToken = cleanTokenName(balance.coin);

    // Get price for token - handles USDC (1.0), SOSO (dynamic), and others (markPrices)
    const price = await getTokenPrice(cleanToken, markPrices);

    // Calculate USD value with full precision to the last decimal place
    const usdValue = price ? balanceAmount * price : 0;

    console.log('[v0] Token calculation:', {
      token: cleanToken,
      originalCoin: balance.coin,
      balance: balanceAmount,
      price: price || 'N/A',
      usdValue: usdValue,
    });

    tokens.push({
      token: cleanToken,
      originalCoin: balance.coin,
      balance: balanceAmount,
      usdValue: usdValue,
    });

    // Track tokens without prices
    if (!price) {
      unpricedTokens.push(cleanToken);
    }

    totalUsdValue += usdValue;
  }

  const hasUnpricedAssets = unpricedTokens.length > 0;

  console.log('[v0] Detailed spot balance calculated:', {
    tokenCount: tokens.length,
    totalUsdValue: totalUsdValue,
    hasUnpricedAssets,
    unpricedTokens,
  });

  return {
    tokens,
    totalUsdValue,
    hasUnpricedAssets,
    unpricedTokens,
  };
}

// Fetch spot balance with detailed calculations
export async function fetchDetailedSpotBalance(userId: string | number): Promise<DetailedSpotBalance> {
  const cacheKey = `detailed_spot_balance_${userId}`;
  
  return cacheManager.deduplicate(cacheKey, async () => {
    try {
      // Fetch spot balance data via proxy
      const response = await fetch(`/api/perps/spot-balances?accountId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch spot balance: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(`API error: Failed to fetch spot balance`);
      }

      const spotBalances = data.data?.spotBalance || [];
      console.log('[v0] Fetched spot balances - count:', spotBalances.length);

      // Fetch prices from all 3 sources
      const markPrices = new Map<string, number>();

      // Source 1: Mark prices from perps markets via proxy
      try {
        const markPricesResponse = await fetch('/api/perps/mark-prices');
        if (markPricesResponse.ok) {
          const markData = await markPricesResponse.json();
          if (markData.code === 0 && markData.data) {
            markData.data.forEach((mp: any) => {
              const tokenName = mp.symbol.split('-')[0];
              markPrices.set(tokenName, parseFloat(mp.markPrice));
            });
            console.log('[v0] Loaded mark prices - count:', markPrices.size);
          }
        }
      } catch (error) {
        console.warn('[v0] Error fetching mark prices:', error);
      }

      // Source 2: Agg tickers from futures market via proxy
      try {
        const aggTickersResponse = await fetch('/api/perps/agg-tickers');
        if (aggTickersResponse.ok) {
          const aggData = await aggTickersResponse.json();
          if (aggData.code === 0 && aggData.data) {
            aggData.data.forEach((ticker: any) => {
              const symbol = ticker.s; // symbol like "TSLA-USD", "1000BONK-USD"
              const price = parseFloat(ticker.c); // current price
              if (symbol && price) {
                const tokenName = symbol.split('-')[0]; // extract token name before -USD
                if (!markPrices.has(tokenName)) {
                  markPrices.set(tokenName, price);
                }
              }
            });
            console.log('[v0] Loaded agg ticker prices - total count:', markPrices.size);
          }
        }
      } catch (error) {
        console.warn('[v0] Error fetching agg tickers:', error);
      }

      // Source 3: Index/SSI prices from mark-prices (already covered above but documented here)
      // The mark-prices API already includes index prices like HYPE-USD, etc.

      // Calculate detailed balance with all token precision
      const detailedBalance = await calculateDetailedSpotBalance(spotBalances, markPrices);
      
      return detailedBalance;
    } catch (error) {
      console.error('[v0] Error fetching detailed spot balance:', error);
      throw error;
    }
  });
}

// Format spot token for display with full decimal precision
export function formatSpotToken(token: SpotTokenBalance): {
  symbol: string;
  balance: string;
  usdValue: string;
  hasPrice: boolean;
} {
  const hasPrice = token.usdValue > 0;
  return {
    symbol: token.token,
    balance: token.balance.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    }),
    usdValue: hasPrice
      ? `$${token.usdValue.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`
      : 'OTHER ASSETS',
    hasPrice,
  };
}

