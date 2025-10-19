/**
 * FCL Configuration for Agent (Server-Side)
 * Configures FCL to work in server-side API routes
 */

import * as fcl from '@onflow/fcl';

let isConfigured = false;

/**
 * Configure FCL for server-side use
 * This is called by tools that need to query the blockchain
 */
export function configureFCL() {
  if (isConfigured) {
    return; // Already configured
  }

  // Get network from environment or default to mainnet
  const network = process.env.NEXT_PUBLIC_FLOW_NETWORK || 'mainnet';
  const accessNode = process.env.NEXT_PUBLIC_FLOW_ACCESS_NODE ||
    (network === 'mainnet'
      ? 'https://rest-mainnet.onflow.org'
      : 'https://rest-testnet.onflow.org');

  fcl.config({
    'accessNode.api': accessNode,
    'flow.network': network,
  });

  isConfigured = true;
  console.log(`[FCL Config] Configured for ${network} at ${accessNode}`);
}
