import * as fcl from '@onflow/fcl';

/**
 * Utility functions to manage FCL transactions and fix wallet popup issues
 */


// Track if a transaction is currently in progress
let isTransactionInProgress = false;
let currentTransactionPromise: Promise<unknown> | null = null;
let lastTransactionTime = 0;

/**
 * Force cleanup of any lingering wallet UI elements
 * This helps prevent the "badge notification without popup" issue
 */
function cleanupWalletUI() {
  try {
    // Look for common wallet popup/iframe elements and close them
    const selectors = [
      'iframe[id*="fcl"]',
      'iframe[src*="walletconnect"]',
      'iframe[src*="lilico"]',
      'iframe[src*="blocto"]',
      'div[id*="fcl"]',
      'div[class*="fcl"]',
      'div[id*="wallet"]'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        // Only remove if it's not visible or seems stuck
        const rect = element.getBoundingClientRect();
        if (rect.height === 0 || rect.width === 0) {
          console.log('[FCL-Utils] Removing stuck wallet element:', selector);
          element.remove();
        }
      });
    });
  } catch (error) {
    console.warn('[FCL-Utils] Error during wallet UI cleanup:', error);
  }
}

/**
 * Reset FCL state and clear any stale transaction windows
 * Call this before starting a new transaction
 */
export async function resetFCLState() {
  try {
    console.log('[FCL-Utils] Resetting FCL state');

    // Clear any pending transaction state flags
    isTransactionInProgress = false;
    currentTransactionPromise = null;

    // Clean up any stuck wallet UI elements
    cleanupWalletUI();

    return true;
  } catch (error) {
    console.error('[FCL-Utils] Failed to reset FCL state:', error);
    return false;
  }
}

/**
 * Wait with minimum delay between transactions to prevent popup issues
 */
async function waitForMinimumDelay(minDelayMs: number = 1000) {
  const timeSinceLastTx = Date.now() - lastTransactionTime;
  if (timeSinceLastTx < minDelayMs) {
    const waitTime = minDelayMs - timeSinceLastTx;
    console.log(`[FCL-Utils] Waiting ${waitTime}ms before next transaction...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

/**
 * Wrapper for FCL mutate that handles wallet popup issues
 * Ensures only one transaction at a time and cleans up stale state
 */
export async function executeFCLTransaction(
  transactionConfig: Parameters<typeof fcl.mutate>[0]
): Promise<string> {
  // Wait for minimum delay between transactions
  await waitForMinimumDelay(1000);

  // If a transaction is already in progress, wait for it
  if (isTransactionInProgress && currentTransactionPromise) {
    console.log('[FCL-Utils] ⏳ Waiting for previous transaction to complete...');
    try {
      await currentTransactionPromise;
      // Extra delay after previous transaction completes
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.log('[FCL-Utils] Previous transaction failed, continuing...');
    }
  }

  // Clean up any stuck wallet UI before starting new transaction
  cleanupWalletUI();

  // Mark transaction as in progress
  isTransactionInProgress = true;

  try {
    console.log('[FCL-Utils] 🚀 Starting FCL transaction...');

    // Create the transaction promise
    currentTransactionPromise = fcl.mutate(transactionConfig);

    // Wait for transaction ID
    const txId = await currentTransactionPromise as string;

    console.log('[FCL-Utils] ✅ Transaction initiated:', txId);

    // Update last transaction time
    lastTransactionTime = Date.now();

    return txId;

  } catch (error) {
    console.error('[FCL-Utils] ❌ Transaction failed:', error);
    // Clean up on error
    await resetFCLState();
    throw error;
  } finally {
    // Always clean up transaction state after a delay
    setTimeout(() => {
      isTransactionInProgress = false;
      currentTransactionPromise = null;
      // Clean up any lingering wallet UI elements
      cleanupWalletUI();
      console.log('[FCL-Utils] Transaction state cleared');
    }, 1500); // Increased from 500ms to 1500ms
  }
}

/**
 * Check if FCL is ready for transactions
 */
export async function isFCLReady(): Promise<boolean> {
  try {
    const user = await fcl.currentUser.snapshot();
    return user.loggedIn === true;
  } catch (error) {
    console.error('[FCL-Utils] Failed to check FCL ready state:', error);
    return false;
  }
}

/**
 * Force refresh wallet connection
 * Useful when wallet state gets out of sync
 */
export async function refreshWalletConnection(): Promise<void> {
  try {
    const user = await fcl.currentUser.snapshot();
    if (user.loggedIn) {
      console.log('[FCL-Utils] Wallet connection is active:', user.addr);
    } else {
      console.log('[FCL-Utils] Wallet is not connected');
    }
    // Clean up any stuck UI elements
    cleanupWalletUI();
  } catch (error) {
    console.error('[FCL-Utils] Failed to refresh wallet connection:', error);
  }
}

/**
 * Force cleanup - call this if wallet popups get stuck
 * Can be called manually or exposed to UI for user recovery
 */
export function forceCleanupWalletUI(): void {
  console.log('[FCL-Utils] Force cleaning up wallet UI...');
  cleanupWalletUI();
  resetFCLState();
}
