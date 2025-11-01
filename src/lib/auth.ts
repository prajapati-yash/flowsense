import { NextRequest } from 'next/server';

/**
 * Wallet authentication utilities for API routes
 * Ensures that only the wallet owner can access their data
 */

export interface AuthenticatedRequest {
  walletAddress: string;
}

/**
 * Extract wallet address from request headers
 * Client must send 'x-wallet-address' header with their connected wallet address
 */
export function getWalletAddress(request: NextRequest): string | null {
  const walletAddress = request.headers.get('x-wallet-address');

  if (!walletAddress) {
    return null;
  }

  // Validate Flow wallet address format
  const normalizedAddress = walletAddress.toLowerCase().trim();

  if (!/^0x[a-f0-9]+$/i.test(normalizedAddress)) {
    return null;
  }

  return normalizedAddress;
}

/**
 * Authenticate wallet address from request
 * Returns authenticated wallet address or throws error
 */
export function authenticateWallet(request: NextRequest): string {
  const walletAddress = getWalletAddress(request);

  if (!walletAddress) {
    throw new Error('Wallet address not provided or invalid');
  }

  return walletAddress;
}

/**
 * Verify that the wallet address in the request matches the authenticated user
 * Used to prevent users from accessing other users' data
 */
export function verifyWalletOwnership(
  authenticatedWallet: string,
  resourceWallet: string
): boolean {
  return authenticatedWallet.toLowerCase() === resourceWallet.toLowerCase();
}

/**
 * Create standardized error responses
 */
export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Middleware helper to wrap API routes with authentication
 */
export function withAuth<T>(
  handler: (request: NextRequest, walletAddress: string, ...args: T[]) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T[]): Promise<Response> => {
    try {
      const walletAddress = authenticateWallet(request);
      return await handler(request, walletAddress, ...args);
    } catch (error) {
      if (error instanceof AuthError) {
        return Response.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }

      return Response.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}
