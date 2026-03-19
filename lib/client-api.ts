/**
 * Client-side API for wallet registry lookups.
 * 
 * Optimized to use the server-side lookup API instead of downloading 
 * and parsing the 6MB CSV file in the browser.
 */

interface LookupResponse {
  userId?: string | number;
  error?: string;
  source?: string;
  fromCache?: boolean;
}

/**
 * Looks up a wallet address to find the corresponding User ID.
 * Calls the /api/wallet/lookup server endpoint.
 */
export async function lookupWalletAddress(address: string): Promise<string> {
  if (!address) {
    throw new Error('Address is required for lookup');
  }

  const normalizedAddress = address.toLowerCase().trim();

  try {
    console.log('[REGISTRY] Looking up address via server API:', normalizedAddress);
    
    const response = await fetch('/api/wallet/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address: normalizedAddress }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Address ${address} not found in registry`);
      }
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data: LookupResponse = await response.json();
    
    if (!data.userId) {
      throw new Error('No User ID returned from registry');
    }

    console.log('[REGISTRY] Lookup successful:', { 
      address: normalizedAddress, 
      userId: data.userId,
      source: data.source,
      cached: data.fromCache 
    });

    return String(data.userId);
  } catch (error) {
    console.error('[REGISTRY] Failed to lookup wallet:', error);
    throw error;
  }
}

/**
 * DEPRECATED: Don't use this. It downloads a 6MB file.
 * Kept only for backward compatibility during refactoring if needed.
 */
export async function fetchRegistryFromServer(): Promise<Array<{ userId: string; address: string }>> {
  console.warn('[REGISTRY] fetchRegistryFromServer is DEPRECATED and very slow. Use lookupWalletAddress instead.');
  return []; // Return empty to prevent 6MB download
}
