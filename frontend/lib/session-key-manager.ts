import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { keccak256, toHex } from 'viem';

/**
 * Session Key Management for ERC-4337 Smart Accounts
 * 
 * This system allows automated transfers without MetaMask signatures by:
 * 1. Generating a session key (one-time)
 * 2. Authorizing it on the smart account (requires one MetaMask signature)
 * 3. Using it to sign UserOperations for all future transfers (zero signatures)
 */

export interface SessionKey {
  privateKey: `0x${string}`;
  publicKey: `0x${string}`;
  address: `0x${string}`;
  nodeId: string;
  smartAccountAddress: string;
  createdAt: number;
  expiresAt: number;
  authorized: boolean;
  permissions?: {
    allowedTargets?: string[]; // Which contracts can be called
    allowedFunctions?: string[]; // Which functions can be called
    spendingLimit?: string; // Maximum amount per transaction
  };
}

const SESSION_KEY_STORAGE_KEY = 'erc4337_session_keys';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a new session key for a smart account node
 * The session key is deterministic based on the nodeId for consistency
 */
export function generateSessionKey(
  nodeId: string,
  smartAccountAddress: string,
  permissions?: SessionKey['permissions']
): SessionKey {
  // Generate a random private key (not deterministic for security)
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  
  const sessionKey: SessionKey = {
    privateKey,
    publicKey: account.publicKey,
    address: account.address,
    nodeId,
    smartAccountAddress,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION,
    authorized: false, // Will be set to true after on-chain authorization
    permissions,
  };
  
  console.log(`✅ Session key generated for node ${nodeId}:`, {
    address: sessionKey.address,
    expiresAt: new Date(sessionKey.expiresAt).toISOString(),
  });
  
  return sessionKey;
}

/**
 * Store session key in local storage
 * In production, this should be stored in a secure backend
 */
export function storeSessionKey(sessionKey: SessionKey): void {
  try {
    const stored = localStorage.getItem(SESSION_KEY_STORAGE_KEY);
    const keys: Record<string, SessionKey> = stored ? JSON.parse(stored) : {};
    
    // Store by both nodeId and smart account address for flexible lookup
    const compositeKey = `${sessionKey.nodeId}-${sessionKey.smartAccountAddress}`;
    keys[compositeKey] = sessionKey;
    
    localStorage.setItem(SESSION_KEY_STORAGE_KEY, JSON.stringify(keys));
    console.log(`💾 Session key stored for ${compositeKey}`);
  } catch (error) {
    console.error('Failed to store session key:', error);
    throw new Error('Failed to store session key in localStorage');
  }
}

/**
 * Retrieve session key for a node and smart account
 */
export function getSessionKey(nodeId: string, smartAccountAddress: string): SessionKey | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY_STORAGE_KEY);
    if (!stored) return null;
    
    const keys: Record<string, SessionKey> = JSON.parse(stored);
    const compositeKey = `${nodeId}-${smartAccountAddress}`;
    const sessionKey = keys[compositeKey];
    
    if (!sessionKey) {
      console.log(`⚠️ No session key found for ${compositeKey}`);
      return null;
    }
    
    // Check if expired
    if (Date.now() > sessionKey.expiresAt) {
      console.log(`⏰ Session key expired for ${compositeKey}`);
      deleteSessionKey(nodeId, smartAccountAddress);
      return null;
    }
    
    // Check if authorized
    if (!sessionKey.authorized) {
      console.log(`🔒 Session key not yet authorized for ${compositeKey}`);
      return null;
    }
    
    console.log(`✅ Valid session key found for ${compositeKey}`);
    return sessionKey;
  } catch (error) {
    console.error('Failed to retrieve session key:', error);
    return null;
  }
}

/**
 * Mark session key as authorized after on-chain authorization
 */
export function markSessionKeyAuthorized(nodeId: string, smartAccountAddress: string): boolean {
  try {
    const stored = localStorage.getItem(SESSION_KEY_STORAGE_KEY);
    if (!stored) return false;
    
    const keys: Record<string, SessionKey> = JSON.parse(stored);
    const compositeKey = `${nodeId}-${smartAccountAddress}`;
    
    if (!keys[compositeKey]) return false;
    
    keys[compositeKey].authorized = true;
    localStorage.setItem(SESSION_KEY_STORAGE_KEY, JSON.stringify(keys));
    
    console.log(`✅ Session key marked as authorized for ${compositeKey}`);
    return true;
  } catch (error) {
    console.error('Failed to mark session key as authorized:', error);
    return false;
  }
}

/**
 * Delete session key for a node
 */
export function deleteSessionKey(nodeId: string, smartAccountAddress: string): void {
  try {
    const stored = localStorage.getItem(SESSION_KEY_STORAGE_KEY);
    if (!stored) return;
    
    const keys: Record<string, SessionKey> = JSON.parse(stored);
    const compositeKey = `${nodeId}-${smartAccountAddress}`;
    delete keys[compositeKey];
    
    localStorage.setItem(SESSION_KEY_STORAGE_KEY, JSON.stringify(keys));
    console.log(`🗑️ Session key deleted for ${compositeKey}`);
  } catch (error) {
    console.error('Failed to delete session key:', error);
  }
}

/**
 * Check if a valid and authorized session key exists
 */
export function hasValidSessionKey(nodeId: string, smartAccountAddress: string): boolean {
  const sessionKey = getSessionKey(nodeId, smartAccountAddress);
  return sessionKey !== null && sessionKey.authorized;
}

/**
 * Get all session keys (for management UI)
 */
export function getAllSessionKeys(): SessionKey[] {
  try {
    const stored = localStorage.getItem(SESSION_KEY_STORAGE_KEY);
    if (!stored) return [];
    
    const keys: Record<string, SessionKey> = JSON.parse(stored);
    return Object.values(keys);
  } catch (error) {
    console.error('Failed to get all session keys:', error);
    return [];
  }
}

/**
 * Clear all session keys
 */
export function clearAllSessionKeys(): void {
  try {
    localStorage.removeItem(SESSION_KEY_STORAGE_KEY);
    console.log('🗑️ All session keys cleared');
  } catch (error) {
    console.error('Failed to clear session keys:', error);
  }
}

/**
 * Revoke expired session keys
 */
export function revokeExpiredSessionKeys(): number {
  try {
    const stored = localStorage.getItem(SESSION_KEY_STORAGE_KEY);
    if (!stored) return 0;
    
    const keys: Record<string, SessionKey> = JSON.parse(stored);
    const now = Date.now();
    let revokedCount = 0;
    
    Object.entries(keys).forEach(([compositeKey, sessionKey]) => {
      if (now > sessionKey.expiresAt) {
        delete keys[compositeKey];
        revokedCount++;
      }
    });
    
    if (revokedCount > 0) {
      localStorage.setItem(SESSION_KEY_STORAGE_KEY, JSON.stringify(keys));
      console.log(`🗑️ Revoked ${revokedCount} expired session keys`);
    }
    
    return revokedCount;
  } catch (error) {
    console.error('Failed to revoke expired session keys:', error);
    return 0;
  }
}

/**
 * Export session key for backup (use with caution!)
 */
export function exportSessionKey(nodeId: string, smartAccountAddress: string): string | null {
  const sessionKey = getSessionKey(nodeId, smartAccountAddress);
  if (!sessionKey) return null;
  
  console.warn('⚠️ Exporting session key - handle with care!');
  return JSON.stringify(sessionKey, null, 2);
}

/**
 * Import session key from backup
 */
export function importSessionKey(sessionKeyJson: string): boolean {
  try {
    const sessionKey: SessionKey = JSON.parse(sessionKeyJson);
    
    // Validate required fields
    if (!sessionKey.privateKey || !sessionKey.address || !sessionKey.nodeId || !sessionKey.smartAccountAddress) {
      throw new Error('Invalid session key format');
    }
    
    storeSessionKey(sessionKey);
    console.log('✅ Session key imported successfully');
    return true;
  } catch (error) {
    console.error('Failed to import session key:', error);
    return false;
  }
}
