// Client-side API wrapper for server-side endpoints

interface CachedResponse {
  data?: unknown;
  fromCache?: boolean;
  error?: string;
}

export async function fetchRegistryFromServer(): Promise<Array<{ userId: string; address: string }>> {
  try {
    console.log('[v0] Fetching registry from server');
    const response = await fetch('/api/wallet/registry');
    
    if (!response.ok) {
      console.error('[v0] Registry fetch failed with status:', response.status);
      throw new Error(`Registry fetch failed: ${response.status}`);
    }

    const result: CachedResponse = await response.json();

    if (result.error) {
      console.error('[v0] Registry error:', result.error);
      throw new Error(result.error);
    }

    console.log('[v0] Registry fetched from server', { 
      fromCache: result.fromCache, 
      entries: (result.data as any[])?.length 
    });
    return result.data as Array<{ userId: string; address: string }>;
  } catch (error) {
    console.error('[v0] Failed to fetch registry:', error);
    throw error;
  }
}

export async function lookupWalletAddress(address: string): Promise<string> {
  try {
    console.log('[v0] Looking up wallet address:', address);
    
    // Fetch registry directly from GitHub
    const response = await fetch('https://raw.githubusercontent.com/Eliasdegemu61/Sodex-Tracker-new-v1/refs/heads/main/registry.json');
    
    if (!response.ok) {
      console.error('[v0] Registry fetch failed with status:', response.status);
      throw new Error(`Registry fetch failed: ${response.status}`);
    }

    const registry = await response.json();
    
    // Registry is an array of objects, search through it
    const normalizedAddress = address.toLowerCase();
    const user = registry.find((entry: any) => 
      entry.address.toLowerCase() === normalizedAddress
    );

    if (!user) {
      console.error('[v0] Address not found in registry:', address);
      throw new Error('Address not found in registry');
    }

    const userId = user.userId || user.id;
    console.log('[v0] Wallet lookup successful', { address, userId });
    return userId;
  } catch (error) {
    console.error('[v0] Failed to lookup wallet:', error);
    throw error;
  }
}
