const https = require('https');

function normalizeTokenName(name) {
    if (!name) return '';
    let normalized = name.toLowerCase().trim();
    const separators = ['-', '/', '_'];
    for (const sep of separators) {
        if (normalized.includes(sep)) {
            normalized = normalized.split(sep)[0];
        }
    }
    const suffixToStrip = ['.x', '.ssi', 'ssi'];
    for (const sfx of suffixToStrip) {
        if (normalized.endsWith(sfx)) {
            normalized = normalized.substring(0, normalized.length - sfx.length);
        }
    }
    if (normalized.endsWith('x') && normalized.length >= 4) {
        normalized = normalized.substring(0, normalized.length - 1);
    }
    if (normalized === 'smag7' || normalized === 'vmag7' || normalized === 'vmag7ssi') return 'mag7';
    if (normalized === 'ssoso' || normalized === 'wsoso' || normalized === 'vsoso') return 'soso';
    const prefixes = ['v', 'w', 's'];
    for (const pfx of prefixes) {
        if (normalized.startsWith(pfx)) {
            const rest = normalized.substring(pfx.length);
            if (rest.length >= 3) {
                if (pfx === 's' && (rest === 'hib' || rest === 'ui' || rest === 'ol' || rest === 'oso')) continue;
                if (pfx === 'w' && rest === 'if') continue;
                normalized = rest;
            }
        }
    }
    return normalized;
}

const fetchJson = (url) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                resolve({ code: -1 });
            }
        });
    }).on('error', reject);
});

async function test() {
    const prices = {};
    const urls = [
        'https://mainnet-gw.sodex.dev/api/v1/perps/markets/mark-prices',
        'https://mainnet-gw.sodex.dev/pro/p/quotation/tickers',
        'https://mainnet-gw.sodex.dev/api/v1/perps/markets/tickers'
    ];

    const results = await Promise.allSettled(urls.map(fetchJson));
    results.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value?.code === 0) {
            const data = res.value.data || [];
            data.forEach(item => {
                const rawSymbol = item.symbol || item.s || '';
                const price = parseFloat(item.markPrice || item.c || item.lastPx || '0');
                if (price > 0 && rawSymbol) {
                    const normalized = normalizeTokenName(rawSymbol);
                    if (normalized) prices[normalized] = price;
                }
            });
        } else {
            console.log("Failed API", i);
        }
    });

    prices['usdc'] = 1.0;
    prices['usdt'] = 1.0;

    const csvUrl = 'https://raw.githubusercontent.com/Eliasdegemu61/Fund-flow-sodex/main/overall_sodex_totals.csv';
    https.get(csvUrl, (res) => {
        let csvData = '';
        res.on('data', chunk => csvData += chunk);
        res.on('end', () => {
            const lines = csvData.trim().split('\n');
            console.log(`Total CSV tokens: ${lines.length - 1}`);
            let mapped = 0;
            let unmapped = [];
            for (let i = 1; i < lines.length; i++) {
                const token = lines[i].split(',')[0].trim();
                const norm = normalizeTokenName(token);
                if (prices[norm]) {
                    mapped++;
                } else {
                    unmapped.push({ token, norm });
                }
            }
            console.log(`Mapped: ${mapped}, Unmapped: ${unmapped.length}`);
            console.log('Unmapped tokens:', unmapped.map(u => `${u.token} -> ${u.norm}`));
        });
    });
}
test();
