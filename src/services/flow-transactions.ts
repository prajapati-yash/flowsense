import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";

// Transaction codes
// Updated for Cadence 1.0+
const TRANSFER_FLOW_TRANSACTION = `
import FungibleToken from 0xf233dcee88fe0abe
import FlowToken from 0x1654653399040a61

transaction(recipient: Address, amount: UFix64) {
    let sentVault: @{FungibleToken.Vault}

    prepare(signer: auth(Storage, Capabilities) &Account) {
        let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow reference to the owner's Vault!")

        self.sentVault <- vaultRef.withdraw(amount: amount)
    }

    execute {
        let recipient = getAccount(recipient)

        let receiverRef = recipient.capabilities.get<&{FungibleToken.Receiver}>(
            /public/flowTokenReceiver
        ).borrow() ?? panic("Could not borrow receiver reference to the recipient's Vault")

        receiverRef.deposit(from: <-self.sentVault)
    }
}
`;

// Get balance script
// Updated for Cadence 1.0+
const GET_BALANCE_SCRIPT = `
import FungibleToken from 0xf233dcee88fe0abe
import FlowToken from 0x1654653399040a61

access(all) fun main(address: Address): UFix64 {
    let account = getAccount(address)

    let vaultRef = account.capabilities.get<&{FungibleToken.Balance}>(
        /public/flowTokenBalance
    ).borrow() ?? panic("Could not borrow Balance reference to the Vault")

    return vaultRef.balance
}
`;

export interface TransferFlowParams {
  recipient: string;
  amount: string;
}

/**
 * Format a number as UFix64 string (must have decimal point)
 */
function formatUFix64(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    throw new Error(`Invalid number: ${value}`);
  }

  // Ensure at least one decimal place
  return num.toFixed(Math.max(1, (num.toString().split('.')[1] || '').length));
}

export const FlowTransactions = {
  /**
   * Transfer FLOW tokens
   */
  transferFlow: (params: TransferFlowParams) => ({
    cadence: TRANSFER_FLOW_TRANSACTION,
    args: [
      fcl.arg(params.recipient, t.Address),
      fcl.arg(formatUFix64(params.amount), t.UFix64),
    ],
  }),

  /**
   * Get FLOW balance for an address
   */
  getBalance: (address: string) => ({
    cadence: GET_BALANCE_SCRIPT,
    args: [fcl.arg(address, t.Address)],
  }),
};
