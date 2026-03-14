// Client-side API directly hitting GitHub
const REGISTRY_URL = 'https://raw.githubusercontent.com/Eliasdegemu61/Registory/refs/heads/main/registry.csv'

let cachedRegistry: Array<{ userId: string; address: string }> | null = null;

export async function fetchRegistryFromServer(): Promise<Array<{ userId: string; address: string }>> {
  if (cachedRegistry) return cachedRegistry;

  try {
    console.log('[GITHUB] Fetching registry directly from GitHub');
    const response = await fetch(REGISTRY_URL, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Registry fetch failed: ${response.status}`);
    }

    const csvText = await response.text();
    const lines = csvText.split('\n');
    const data: Array<{ userId: string; address: string }> = [];

    // Parse CSV (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [address, userId] = line.split(',');
      if (address && userId) {
        data.push({
          address: address.trim(),
          userId: userId.trim()
        });
      }
    }

    console.log('[GITHUB] Registry fetched and parsed client-side, entries:', data.length);
    cachedRegistry = data;
    return data;
  } catch (error) {
    console.error('[GITHUB] Failed to fetch registry:', error);
    throw error;
  }
}

export async function lookupWalletAddress(address: string): Promise<string> {
  try {
    const registry = await fetchRegistryFromServer();
    const normalizedAddress = address.toLowerCase().trim();
    
    const user = registry.find(u => u.address.toLowerCase() === normalizedAddress);
    
    if (!user) {
      console.error('[GITHUB] Address not found in registry:', address);
      throw new Error('Address not found in registry');
    }

    console.log('[GITHUB] Wallet lookup successful (Client-Side):', { address, userId: user.userId });
    return String(user.userId);
  } catch (error) {
    console.error('[GITHUB] Failed to lookup wallet:', error);
    throw error;
  }
}
