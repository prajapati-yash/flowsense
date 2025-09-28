// FlowSense Transaction Router
// Routes parsed intents to the appropriate Flow blockchain transactions

import { ParsedIntent } from './nlp-parser';

export interface TransactionPlan {
  type: 'submit_intent_final' | 'immediate_transfer';
  cadenceCode: string;
  parameters: any[];
  gasEstimate: string;
  description: string;
  executionMode: 'immediate' | 'scheduled';
  estimatedTime: string;
}

export interface RoutingResult {
  success: boolean;
  plan?: TransactionPlan;
  errors: string[];
  warnings: string[];
}

export class FlowSenseTransactionRouter {

  // Contract addresses on testnet
  private readonly CONTRACT_ADDRESS = '0x9c23faae746705fe';
  private readonly FLOW_TOKEN_ADDRESS = '0x7e60df042a9c0868';
  private readonly FUNGIBLE_TOKEN_ADDRESS = '0x9a0766d93b6608b7';

  public routeIntent(intent: ParsedIntent): RoutingResult {
    const result: RoutingResult = {
      success: false,
      errors: [],
      warnings: []
    };

    try {
      // Validate intent first
      const validation = this.validateIntent(intent);
      if (!validation.isValid) {
        result.errors = validation.errors;
        return result;
      }

      // Route based on action and timing
      if (intent.action === 'greeting' || intent.action === 'help') {
        // Handle greetings and help - no transaction needed
        result.success = true;
        return result;
      } else if (intent.action === 'transfer' && intent.timing === 'immediate') {
        result.plan = this.createImmediateTransferPlan(intent);
      } else if (intent.action === 'schedule' || intent.timing === 'scheduled') {
        result.plan = this.createScheduledTransferPlan(intent);
      } else {
        // Default to FlowSense action for comprehensive handling
        result.plan = this.createFlowSenseActionPlan(intent);
      }

      // Add warnings if needed
      this.addRelevantWarnings(intent, result);

      result.success = true;
      return result;

    } catch (error) {
      result.errors.push(`Routing failed: ${error}`);
      return result;
    }
  }

  private validateIntent(intent: ParsedIntent): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check confidence threshold
    if (intent.confidence < 50) {
      errors.push("I'm not confident about understanding your request. Please be more specific.");
    }

    // Validate amount
    if (!intent.amount || intent.amount <= 0) {
      errors.push("Please specify a valid amount greater than 0.");
    }

    // Temporarily disabled for testing
    // if (intent.amount && intent.amount > 10000000) {
    //   errors.push("Amount seems too large (max 10M FLOW). Please verify the amount.");
    // }

    // Check for dust amounts (too small)
    if (intent.amount && intent.amount < 0.00000001) {
      errors.push("Amount is too small. Minimum amount is 0.00000001 FLOW.");
    }

    // Validate recipient
    if (!intent.recipient) {
      errors.push("Please provide a valid Flow address.");
    }

    if (intent.recipient && !this.isValidFlowAddress(intent.recipient)) {
      errors.push("The address format looks incorrect. Flow addresses start with 0x followed by 16 hex characters.");
    }

    // Validate timing for scheduled transfers
    if (intent.timing === 'scheduled' && intent.scheduleTime) {
      const now = new Date();
      const maxFutureTime = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year

      if (intent.scheduleTime <= now) {
        errors.push("Scheduled time must be in the future.");
      }

      if (intent.scheduleTime > maxFutureTime) {
        errors.push("Scheduled time cannot be more than 1 year in the future.");
      }
    }

    // Validate action type
    if (intent.action === 'unknown') {
      errors.push("I couldn't understand what action you want to perform. Try: 'Transfer 10 FLOW to 0x123...'");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private createImmediateTransferPlan(intent: ParsedIntent): TransactionPlan {
    // Format amount for UFix64 (must have at least one decimal place)
    const formattedAmount = this.formatUFix64(intent.amount!);

    return {
      type: 'immediate_transfer',
      cadenceCode: this.getImmediateTransferCadence(),
      parameters: [
        { type: 'UFix64', value: formattedAmount },
        { type: 'Address', value: intent.recipient! }
      ],
      gasEstimate: '~0.001 FLOW',
      description: `Transfer ${intent.amount} FLOW to ${intent.recipient} immediately`,
      executionMode: 'immediate',
      estimatedTime: '2-5 seconds'
    };
  }

  private createScheduledTransferPlan(intent: ParsedIntent): TransactionPlan {
    const executeAt = intent.scheduleTime
      ? Math.floor(intent.scheduleTime.getTime() / 1000)
      : Math.floor(Date.now() / 1000) + 60; // Default to 1 minute from now

    // Format amount for UFix64 (must have at least one decimal place)
    const formattedAmount = this.formatUFix64(intent.amount!);

    return {
      type: 'submit_intent_final',
      cadenceCode: this.getFlowSenseActionCadence(),
      parameters: [
        { type: 'String', value: intent.originalInput },
        { type: 'Address', value: intent.recipient! },
        { type: 'UFix64', value: formattedAmount },
        { type: 'UFix64', value: executeAt.toString() + '.0' }
      ],
      gasEstimate: '~0.003 FLOW',
      description: `Schedule ${intent.amount} FLOW transfer to ${intent.recipient} (autonomous execution via Flow scheduler)`,
      executionMode: 'scheduled',
      estimatedTime: intent.scheduleTime
        ? `Scheduled for ${intent.scheduleTime.toLocaleString()}`
        : 'Scheduled for 1 minute from now'
    };
  }

  private createFlowSenseActionPlan(intent: ParsedIntent): TransactionPlan {
    // Use current time + 3 seconds for immediate execution via FlowSense
    const executeAt = Math.floor(Date.now() / 1000) + 3;

    // Format amount for UFix64 (must have at least one decimal place)
    const formattedAmount = this.formatUFix64(intent.amount!);

    return {
      type: 'submit_intent_final',
      cadenceCode: this.getFlowSenseActionCadence(),
      parameters: [
        { type: 'String', value: intent.originalInput },
        { type: 'Address', value: intent.recipient! },
        { type: 'UFix64', value: formattedAmount },
        { type: 'UFix64', value: executeAt.toString() + '.0' }
      ],
      gasEstimate: '~0.002 FLOW',
      description: `AI-powered ${intent.amount} FLOW transfer to ${intent.recipient}`,
      executionMode: 'immediate',
      estimatedTime: '3-8 seconds'
    };
  }

  private addRelevantWarnings(intent: ParsedIntent, result: RoutingResult): void {
    // Warn about large amounts
    if (intent.amount && intent.amount > 1000) {
      result.warnings.push(`⚠️ Large transfer amount: ${intent.amount} FLOW. Please double-check.`);
    }

    // Warn about address format
    if (intent.recipient && intent.recipient.length < 18) {
      result.warnings.push(`⚠️ Address might be incomplete. Full Flow addresses are 18 characters long.`);
    }

    // Warn about scheduling
    if (intent.timing === 'scheduled' && !intent.scheduleTime) {
      result.warnings.push(`⚠️ No specific time provided. Will schedule for 1 minute from now.`);
    }
  }

  private isValidFlowAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{16}$/.test(address) ||
           /^0x[a-fA-F0-9]{8,}$/.test(address);
  }

  private getImmediateTransferCadence(): string {
    return `
import FlowToken from ${this.FLOW_TOKEN_ADDRESS}
import FungibleToken from ${this.FUNGIBLE_TOKEN_ADDRESS}

transaction(amount: UFix64, to: Address) {
    let sentVault: @{FungibleToken.Vault}

    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow reference to the owner's Vault!")

        self.sentVault <- vaultRef.withdraw(amount: amount)
    }

    execute {
        let recipient = getAccount(to)
        let receiverRef = recipient.capabilities.get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver).borrow()
            ?? panic("Could not borrow receiver reference to the recipient's Vault")

        receiverRef.deposit(from: <-self.sentVault)

        log("Transfer completed successfully!")
        log("Amount: ".concat(amount.toString()).concat(" FLOW"))
        log("To: ".concat(to.toString()))
    }
}`;
  }

  private getFlowSenseActionCadence(): string {
    return `
import FlowSenseActionsV2 from ${this.CONTRACT_ADDRESS}
import FlowToken from ${this.FLOW_TOKEN_ADDRESS}
import FungibleToken from ${this.FUNGIBLE_TOKEN_ADDRESS}

transaction(rawIntent: String, receiverAddress: Address, amount: UFix64, executeAt: UFix64) {
    let userAddress: Address
    let userVault: auth(FungibleToken.Withdraw) &FlowToken.Vault

    prepare(signer: auth(Storage, BorrowValue) &Account) {
        self.userAddress = signer.address

        self.userVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow FlowToken vault with withdraw authorization")

        if amount <= 0.0 {
            panic("Amount must be greater than 0")
        }

        if executeAt < getCurrentBlock().timestamp {
            panic("Execute time must be in the future")
        }

        if self.userAddress == receiverAddress {
            panic("Cannot transfer to yourself")
        }

        let receiverAccount = getAccount(receiverAddress)
        let receiverVault = receiverAccount.capabilities.get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver).borrow()
        if receiverVault == nil {
            panic("Receiver does not have a valid FlowToken receiver capability")
        }

        let currentTime = getCurrentBlock().timestamp
        let isImmediate = (executeAt - currentTime) <= 5.0

        if isImmediate && self.userVault.balance < amount {
            panic("Insufficient balance for immediate transfer. Required: ".concat(amount.toString()).concat(", Available: ").concat(self.userVault.balance.toString()))
        }
    }

    execute {
        let result = FlowSenseActionsV2.submitAndExecuteIntent(
            user: self.userAddress,
            rawIntent: rawIntent,
            toReceiver: receiverAddress,
            amount: amount,
            executeAt: executeAt,
            userVault: self.userVault
        )

        if !result.success {
            panic("Intent execution failed: ".concat(result.message))
        }

        log("✨ FlowSense AI Agent successfully processed your intent!")
        log("📊 Result: ".concat(result.message))
    }
}`;
  }

  // Helper method to estimate transaction time
  public estimateExecutionTime(plan: TransactionPlan): string {
    switch (plan.type) {
      case 'immediate_transfer':
        return '2-5 seconds';
      case 'submit_intent_final':
        return plan.executionMode === 'immediate' ? '3-8 seconds' : 'Scheduled';
      default:
        return 'Unknown';
    }
  }

  // Helper method to format transaction preview
  public formatTransactionPreview(plan: TransactionPlan): string {
    const lines = [
      `📝 Transaction Type: ${plan.type === 'immediate_transfer' ? 'Direct Transfer' : 'FlowSense Action'}`,
      `⚡ Execution: ${plan.executionMode}`,
      `⏱️ Estimated Time: ${plan.estimatedTime}`,
      `⛽ Gas Estimate: ${plan.gasEstimate}`,
      `📋 Description: ${plan.description}`
    ];

    return lines.join('\n');
  }

  // Helper method to format numbers as UFix64 (must have at least one decimal place)
  private formatUFix64(amount: number): string {
    // Convert to string and ensure at least one decimal place
    const amountStr = amount.toString();

    // If the number doesn't have a decimal point, add ".0"
    if (!amountStr.includes('.')) {
      return amountStr + '.0';
    }

    // If it already has decimal places, return as is
    return amountStr;
  }

}

// Export singleton instance
export const flowSenseRouter = new FlowSenseTransactionRouter();