export interface TokenPriceMap {
    [token: string]: number
}

/**
 * Normalizes a token name for cross-referencing between CSV and APIs.
 */
export function normalizeTokenName(name: string): string {
    if (!name) return ''

    let normalized = name.toLowerCase().trim()

    // 1. Remove pair suffixes (e.g., eth-usdc -> eth)
    const separators = ['-', '/', '_']
    for (const sep of separators) {
        if (normalized.includes(sep)) {
            normalized = normalized.split(sep)[0]
        }
    }

    // 1b. Remove paired "usdc" or "usd" that might be stuck without a separator (e.g., "ethusd")
    if (normalized.endsWith('usdc') && normalized !== 'usdc' && normalized !== 'vusdc') {
        normalized = normalized.substring(0, normalized.length - 4)
    } else if (normalized.endsWith('usd') && normalized !== 'usd' && normalized !== 'vusd') {
        normalized = normalized.substring(0, normalized.length - 3)
    }

    // 2. Remove metadata suffixes
    const suffixToStrip = ['.x', '.ssi', 'ssi']
    for (const sfx of suffixToStrip) {
        if (normalized.endsWith(sfx)) {
            normalized = normalized.substring(0, normalized.length - sfx.length)
        }
    }

    // Strip 'x' suffix (AAPLX -> AAPL)
    if (normalized.endsWith('x') && normalized.length >= 4) {
        normalized = normalized.substring(0, normalized.length - 1)
    }

    // 3. Explicit synonyms
    if (normalized === 'smag7' || normalized === 'vmag7' || normalized === 'vmag7ssi' || normalized === 'mag7') return 'mag7'
    if (normalized === 'ssoso' || normalized === 'wsoso' || normalized === 'vsoso' || normalized === 'soso') return 'soso'

    // 4. Remove 'v', 'w', 's' prefixes safely
    const prefixes = ['v', 'w', 's']
    for (const pfx of prefixes) {
        if (normalized.startsWith(pfx)) {
            const rest = normalized.substring(pfx.length)
            if (rest.length >= 3) {
                // Known tokens where prefix-stripping is wrong
                if (pfx === 's' && (rest === 'hib' || rest === 'ui' || rest === 'ol' || rest === 'oso')) continue
                if (pfx === 'w' && rest === 'if') continue

                normalized = rest
            }
        }
    }

    return normalized
}

export async function fetchTokenPrices(): Promise<TokenPriceMap> {
    const prices: TokenPriceMap = {}

    // Hardcode stables (fallback)
    prices['usdc'] = 1.0
    prices['usdt'] = 1.0
    prices['crcl'] = 1.0 // Circle?

    try {
        const urls = [
            'https://mainnet-gw.sodex.dev/api/v1/perps/markets/mark-prices',
            'https://mainnet-gw.sodex.dev/pro/p/quotation/tickers',
            'https://mainnet-gw.sodex.dev/api/v1/perps/markets/tickers'
        ]

        const results = await Promise.allSettled(urls.map(url => fetch(url).then(r => r.json())))

        results.forEach((res) => {
            if (res.status === 'fulfilled' && res.value?.code === 0) {
                const data = res.value.data || []
                data.forEach((item: any) => {
                    const rawSymbol = item.symbol || item.s || ''
                    const price = parseFloat(item.markPrice || item.c || item.lastPx || '0')

                    if (price > 0 && rawSymbol) {
                        const normalized = normalizeTokenName(rawSymbol)
                        if (normalized) {
                            prices[normalized] = price
                        }
                    }
                })
            }
        })

        // Symmetrical mapping for soso/ssoso
        if (prices['soso']) {
            prices['ssoso'] = prices['soso']
        }
        if (prices['mag7']) {
            prices['smag7'] = prices['mag7']
        }

    } catch (err) {
        console.error('Failed to fetch token prices', err)
    }

    return prices
}
