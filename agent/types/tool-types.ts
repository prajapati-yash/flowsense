/**
 * Tool System Type Definitions
 * Defines interfaces for the agent's tool system
 */

/**
 * Context provided to tools during execution
 */
export interface ToolContext {
  /** User's Flow wallet address */
  userAddress: string;

  /** Optional conversation ID for multi-turn interactions */
  conversationId?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Parameter definition for a tool
 */
export interface ToolParameter {
  /** Parameter name */
  name: string;

  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';

  /** Parameter description */
  description: string;

  /** Whether this parameter is required */
  required: boolean;

  /** Default value if not provided */
  default?: unknown;

  /** Enum values (for restricted choices) */
  enum?: string[];
}

/**
 * Tool definition for LLM function calling
 */
export interface ToolDefinition {
  /** Unique tool name (e.g., "check_balance") */
  name: string;

  /** Human-readable description of what the tool does */
  description: string;

  /** Array of parameters this tool accepts */
  parameters: ToolParameter[];

  /** Examples of how to use this tool */
  examples?: ToolExample[];
}

/**
 * Example usage of a tool
 */
export interface ToolExample {
  /** Example user input */
  input: string;

  /** Example parameters passed to tool */
  parameters: Record<string, unknown>;

  /** Expected result */
  expectedResult: string;
}

/**
 * Result returned by a tool execution
 */
export interface ToolResult {
  /** Whether the tool execution was successful */
  success: boolean;

  /** Result data (if successful) */
  data?: unknown;

  /** Error message (if failed) */
  error?: string;

  /** Additional metadata about the execution */
  metadata?: {
    /** Time taken to execute (milliseconds) */
    executionTime?: number;

    /** Whether result was cached */
    cached?: boolean;

    /** Any warnings during execution */
    warnings?: string[];
  };
}

/**
 * Balance check result
 */
export interface BalanceResult {
  /** Token symbol (e.g., "FLOW", "USDC") */
  token: string;

  /** Balance amount */
  balance: number;

  /** Token display symbol */
  symbol: string;

  /** Token name */
  name?: string;

  /** Token type identifier */
  typeIdentifier?: string;
}

/**
 * Price query result
 */
export interface PriceResult {
  /** Source token */
  tokenFrom: string;

  /** Target token */
  tokenTo: string;

  /** Amount of source token */
  amountIn: number;

  /** Amount of target token received */
  amountOut: number;

  /** Price (amountOut / amountIn) */
  price: number;

  /** Timestamp of price */
  timestamp?: number;
}

/**
 * Portfolio result (multiple balances)
 */
export interface PortfolioResult {
  /** Total number of tokens */
  totalTokens: number;

  /** Array of token balances */
  balances: BalanceResult[];

  /** Total portfolio value in USD (if available) */
  totalValueUSD?: number;
}

/**
 * Base interface that all tools must implement
 */
export interface Tool {
  /** Tool definition for LLM */
  definition: ToolDefinition;

  /**
   * Execute the tool with given parameters
   * @param params - Parameters for the tool
   * @param context - Execution context (user address, etc.)
   * @returns Tool execution result
   */
  execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;

  /**
   * Validate parameters before execution
   * @param params - Parameters to validate
   * @returns True if valid, error message if invalid
   */
  validateParams(params: Record<string, unknown>): true | string;
}

/**
 * Tool registry for managing all available tools
 */
export interface ToolRegistry {
  /** Register a new tool */
  register(tool: Tool): void;

  /** Get a tool by name */
  get(toolName: string): Tool | undefined;

  /** Get all registered tools */
  getAll(): Tool[];

  /** Get tool definitions for LLM */
  getDefinitions(): ToolDefinition[];

  /** Check if a tool exists */
  has(toolName: string): boolean;
}
