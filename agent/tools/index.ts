/**
 * Tools Index
 * Exports all tools and creates a configured tool registry
 */

import { BaseTool } from './base-tool';
import { ToolRegistry, toolRegistry } from './registry';
import { BalanceCheckerTool } from './balance-checker';
import { PriceFetcherTool } from './price-fetcher';
import { PortfolioViewerTool } from './portfolio-viewer';
import { SwapTransactionBuilderTool } from './swap-builder';
import { TransferTransactionBuilderTool } from './transfer-builder';
import { VaultInitializerTool } from './vault-initializer';

// Export base classes and registry
export { BaseTool } from './base-tool';
export { ToolRegistry, toolRegistry } from './registry';

// Export all tool classes
export { BalanceCheckerTool } from './balance-checker';
export { PriceFetcherTool } from './price-fetcher';
export { PortfolioViewerTool } from './portfolio-viewer';
export { SwapTransactionBuilderTool } from './swap-builder';
export { TransferTransactionBuilderTool } from './transfer-builder';
export { VaultInitializerTool } from './vault-initializer';

/**
 * Create and configure the default tool registry
 * Registers all core tools
 */
export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  // Register all tools
  registry.register(new BalanceCheckerTool());
  registry.register(new PriceFetcherTool());
  registry.register(new PortfolioViewerTool());
  registry.register(new SwapTransactionBuilderTool());
  registry.register(new TransferTransactionBuilderTool());
  registry.register(new VaultInitializerTool());

  return registry;
}

/**
 * Get configured tool registry instance
 * Singleton pattern for easy access
 */
let defaultRegistry: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createDefaultToolRegistry();
  }
  return defaultRegistry;
}

/**
 * Get all tool instances
 * Useful for testing and debugging
 */
export function getAllTools() {
  return {
    balanceChecker: new BalanceCheckerTool(),
    priceFetcher: new PriceFetcherTool(),
    portfolioViewer: new PortfolioViewerTool(),
    swapBuilder: new SwapTransactionBuilderTool(),
    transferBuilder: new TransferTransactionBuilderTool(),
    vaultInitializer: new VaultInitializerTool(),
  };
}

/**
 * Tool names enum for type safety
 */
export enum ToolName {
  CHECK_BALANCE = 'check_balance',
  GET_PRICE = 'get_price',
  VIEW_PORTFOLIO = 'view_portfolio',
  BUILD_SWAP_TRANSACTION = 'build_swap_transaction',
  BUILD_TRANSFER_TRANSACTION = 'build_transfer_transaction',
  INITIALIZE_VAULT = 'initialize_vault',
}

/**
 * Get tool by name with type safety
 * @param name - Tool name
 * @returns Tool instance or undefined
 */
export function getTool(name: ToolName): BaseTool | undefined {
  const registry = getToolRegistry();
  return registry.get(name) as BaseTool | undefined;
}
