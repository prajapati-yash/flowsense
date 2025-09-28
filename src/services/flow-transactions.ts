// FlowSense Flow Transaction Service
// Executes transactions on Flow blockchain using FCL

import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { TransactionPlan, TransactionParameter } from './transaction-router';

export interface FlowEvent {
  type: string;
  transactionId: string;
  transactionIndex: number;
  eventIndex: number;
  data: Record<string, unknown>;
}

export interface FCLTransactionStatus {
  status: number;
  statusCode: number;
  errorMessage?: string;
  events?: FlowEvent[];
  blockId?: string;
}

export interface TransactionStatus {
  status: 'pending' | 'executing' | 'sealing' | 'success' | 'failed';
  txId?: string;
  errorMessage?: string;
  explorerUrl?: string;
  blockHeight?: number;
  events?: FlowEvent[];
}

export interface TransactionResult {
  success: boolean;
  txId?: string;
  status: TransactionStatus;
  message: string;
  explorerUrl?: string;
  gasUsed?: string;
  executionTime?: number;
}

export class FlowTransactionService {

  private readonly TESTNET_EXPLORER = 'https://testnet.flowscan.io/tx/';

  public async executeTransaction(plan: TransactionPlan): Promise<TransactionResult> {
    const startTime = Date.now();

    try {
      // Check if user is authenticated
      const user = await fcl.currentUser.snapshot();
      if (!user.loggedIn) {
        return {
          success: false,
          status: { status: 'failed', errorMessage: 'Wallet not connected' },
          message: 'Please connect your wallet first'
        };
      }

      // Validate transaction plan
      const validation = this.validateTransactionPlan(plan);
      if (!validation.isValid) {
        return {
          success: false,
          status: { status: 'failed', errorMessage: validation.errors.join(', ') },
          message: validation.errors.join('\n')
        };
      }

      // Convert parameters to FCL format
      const fclArgs = this.convertParametersToFCL(plan.parameters);

      // Execute the transaction
      const txId = await fcl.mutate({
        cadence: plan.cadenceCode,
        args: () => fclArgs,
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 1000
      });

      // Monitor transaction status
      const finalStatus = await this.monitorTransaction(txId);
      const executionTime = Date.now() - startTime;

      if (finalStatus.status === 'success') {
        return {
          success: true,
          txId,
          status: finalStatus,
          message: this.formatSuccessMessage(plan, finalStatus),
          explorerUrl: `${this.TESTNET_EXPLORER}${txId}`,
          executionTime: Math.round(executionTime / 1000)
        };
      } else {
        return {
          success: false,
          txId,
          status: finalStatus,
          message: finalStatus.errorMessage || 'Transaction failed',
          explorerUrl: `${this.TESTNET_EXPLORER}${txId}`,
          executionTime: Math.round(executionTime / 1000)
        };
      }

    } catch (error: unknown) {
      return {
        success: false,
        status: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
        },
        message: this.formatErrorMessage(error)
      };
    }
  }

  private convertParametersToFCL(parameters: TransactionParameter[]): unknown[] {
    return parameters.map(param => {
      switch (param.type) {
        case 'String':
          return fcl.arg(String(param.value), t.String);
        case 'Address':
          return fcl.arg(String(param.value), t.Address);
        case 'UFix64':
          return fcl.arg(String(param.value), t.UFix64);
        case 'Bool':
          return fcl.arg(Boolean(param.value), t.Bool);
        default:
          throw new Error(`Unsupported parameter type: ${param.type}`);
      }
    });
  }

  private async monitorTransaction(txId: string): Promise<TransactionStatus> {
    try {
      // Subscribe to transaction status
      return new Promise((resolve) => {
        const unsub = fcl.tx(txId).subscribe((txStatus: FCLTransactionStatus) => {
          const status: TransactionStatus = {
            status: this.mapFCLStatus(txStatus.status),
            txId,
            blockHeight: txStatus.blockId ? parseInt(txStatus.blockId) : undefined,
            events: txStatus.events || []
          };

          // Check if transaction is complete (success or failure)
          if (txStatus.status >= 4) { // FCL status codes: 4 = sealed, 5 = expired
            if (txStatus.statusCode === 0) {
              status.status = 'success';
              status.explorerUrl = `${this.TESTNET_EXPLORER}${txId}`;
            } else {
              status.status = 'failed';
              status.errorMessage = txStatus.errorMessage || 'Transaction failed';
            }

            unsub(); // Unsubscribe
            resolve(status);
          }
        });

        // Timeout after 60 seconds
        setTimeout(() => {
          unsub();
          resolve({
            status: 'failed',
            txId,
            errorMessage: 'Transaction timeout after 60 seconds'
          });
        }, 60000);
      });

    } catch (error: unknown) {
      return {
        status: 'failed',
        txId,
        errorMessage: error instanceof Error ? error.message : 'Failed to monitor transaction'
      };
    }
  }

  private mapFCLStatus(fclStatus: number): TransactionStatus['status'] {
    switch (fclStatus) {
      case 0: return 'pending';    // Unknown
      case 1: return 'pending';    // Pending
      case 2: return 'executing';  // Finalized
      case 3: return 'executing';  // Executed
      case 4: return 'sealing';    // Sealed
      case 5: return 'failed';     // Expired
      default: return 'pending';
    }
  }

  private formatSuccessMessage(plan: TransactionPlan, status: TransactionStatus): string {
    // Different messages based on execution mode
    let headerMessage: string;
    let statusMessage: string;

    if (plan.executionMode === 'immediate') {
      headerMessage = '🎉 Transfer completed successfully!';
      statusMessage = '✅ FLOW tokens transferred immediately';
    } else if (plan.executionMode === 'nativeScheduled') {
      headerMessage = '📅 Transfer scheduled successfully!';
      statusMessage = '🚀 Transfer scheduled with native Flow scheduler for autonomous execution';
    } else if (plan.executionMode === 'scheduled') {
      headerMessage = '📅 Transfer scheduled successfully!';
      statusMessage = '📅 Transfer has been scheduled and will execute automatically';
    } else {
      headerMessage = '🎉 Transaction completed successfully!';
      statusMessage = '';
    }

    const messages = [
      headerMessage,
      '',
      statusMessage,
      '',
      `📝 ${plan.description}`,
      `⛓️ Transaction ID: ${status.txId}`,
      `🔗 View on Explorer: ${status.explorerUrl}`
    ];

    // Add scheduling fee info for native scheduled transactions
    if (plan.executionMode === 'nativeScheduled' && plan.schedulingFees) {
      messages.splice(-3, 0, `💰 Scheduling fee paid: ${plan.schedulingFees} FLOW`);
    }

    // Add timing information for scheduled transactions
    if (plan.executionMode === 'nativeScheduled' || plan.executionMode === 'scheduled') {
      messages.push('');
      messages.push('⏰ Status: Waiting for scheduled execution time');
      messages.push('🔔 You will be notified when the transfer completes');

      // Don't show "tokens transferred" for scheduled transactions
      return messages.join('\n');
    }

    // For immediate transfers, check for transfer events
    if (status.events && status.events.length > 0) {
      const transferEvents = status.events.filter(e =>
        e.type.includes('TokensDeposited') || e.type.includes('TokensWithdrawn')
      );

      if (transferEvents.length > 0) {
        messages.push('', '✅ Blockchain events confirm successful transfer');
      }
    }

    return messages.join('\n');
  }

  private validateTransactionPlan(plan: TransactionPlan): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate transaction type
    if (!plan.type || !['submit_intent_final', 'immediate_transfer'].includes(plan.type)) {
      errors.push('Invalid transaction type');
    }

    // Validate Cadence code
    if (!plan.cadenceCode || typeof plan.cadenceCode !== 'string') {
      errors.push('Missing or invalid Cadence code');
    }

    // Validate parameters
    if (!Array.isArray(plan.parameters)) {
      errors.push('Invalid parameters format');
    } else {
      for (const param of plan.parameters) {
        if (!param.type || !param.value) {
          errors.push('Invalid parameter: missing type or value');
        }

        // Validate specific parameter types
        if (param.type === 'UFix64') {
          const amount = parseFloat(String(param.value));
          if (isNaN(amount) || amount <= 0) {
            errors.push('Invalid amount parameter');
          }
          // Temporarily disabled for testing
          // if (amount > 10000000) {
          //   errors.push('Amount exceeds maximum limit (10M FLOW)');
          // }
        }

        if (param.type === 'Address') {
          if (!this.isValidFlowAddress(String(param.value))) {
            errors.push('Invalid address parameter');
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidFlowAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Must start with 0x
    if (!address.startsWith('0x')) {
      return false;
    }

    // Remove 0x prefix for validation
    const hexPart = address.slice(2);

    // Must be valid hexadecimal
    if (!/^[a-fA-F0-9]+$/.test(hexPart)) {
      return false;
    }

    // Flow addresses should be 8 bytes (16 hex characters) for mainnet/testnet
    if (hexPart.length < 8 || hexPart.length > 16) {
      return false;
    }

    return true;
  }

  private formatErrorMessage(error: unknown): string {
    let errorMsg = 'Transaction failed';

    if (error instanceof Error && error.message) {
      // Common error patterns and user-friendly messages
      if (error.message.includes('insufficient balance')) {
        errorMsg = '❌ Insufficient FLOW balance for this transaction';
      } else if (error.message.includes('invalid address')) {
        errorMsg = '❌ Invalid recipient address format';
      } else if (error.message.includes('vault not found')) {
        errorMsg = '❌ Recipient cannot receive FLOW tokens';
      } else if (error.message.includes('future')) {
        errorMsg = '❌ Execution time must be in the future';
      } else if (error.message.includes('authorization')) {
        errorMsg = '❌ Transaction authorization failed';
      } else if (error.message.includes('timeout')) {
        errorMsg = '❌ Transaction timed out - please try again';
      } else if (error.message.includes('network')) {
        errorMsg = '❌ Network error - please check your connection';
      } else if (error.message.includes('gas')) {
        errorMsg = '❌ Transaction fee estimation failed';
      } else {
        errorMsg = `❌ ${error.message}`;
      }
    }

    return errorMsg;
  }

  // Helper method to get current user balance
  public async getUserBalance(): Promise<string | null> {
    try {
      const user = await fcl.currentUser.snapshot();
      if (!user.loggedIn || !user.addr) return null;

      const response = await fcl.query({
        cadence: `
          import FlowToken from 0x7e60df042a9c0868
          import FungibleToken from 0x9a0766d93b6608b7

          access(all) fun main(address: Address): UFix64 {
            let account = getAccount(address)
            let vaultRef = account.capabilities.get<&FlowToken.Vault>(/public/flowTokenBalance).borrow()
              ?? panic("Could not borrow FlowToken vault")
            return vaultRef.balance
          }
        `,
        args: () => [fcl.arg(user.addr!, t.Address)]
      });

      return response || '0.0';
    } catch (error) {
      console.error('Failed to get user balance:', error);
      return null;
    }
  }

  // Helper method to validate recipient address
  public async validateRecipient(address: string): Promise<{ valid: boolean; message: string }> {
    try {
      const response = await fcl.query({
        cadence: `
          import FungibleToken from 0x9a0766d93b6608b7

          access(all) fun main(address: Address): Bool {
            let account = getAccount(address)
            let receiverRef = account.capabilities.get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver).borrow()
            return receiverRef != nil
          }
        `,
        args: () => [fcl.arg(address, t.Address)]
      });

      if (response) {
        return { valid: true, message: 'Address can receive FLOW tokens' };
      } else {
        return { valid: false, message: 'Address cannot receive FLOW tokens' };
      }
    } catch {
      return { valid: false, message: 'Invalid address format' };
    }
  }

  // Helper method to get transaction by ID
  public async getTransactionResult(txId: string): Promise<FCLTransactionStatus | null> {
    try {
      return await fcl.tx(txId).onceSealed();
    } catch (error) {
      console.error('Failed to get transaction result:', error);
      return null;
    }
  }

  // Test connectivity to Flow network
  public async testConnection(): Promise<boolean> {
    try {
      const response = await fcl.query({
        cadence: `access(all) fun main(): UInt64 { return getCurrentBlock().height }`
      });
      return response > 0;
    } catch (error) {
      console.error('Flow network connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const flowTransactionService = new FlowTransactionService();