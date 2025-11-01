/**
 * Base Tool Class
 * Abstract base class that all tools must extend
 */

import {
  Tool,
  ToolDefinition,
  ToolResult,
  ToolContext,
  ToolParameter,
  ToolError,
  ValidationError,
} from '../types';

/**
 * Abstract base class for all tools
 * Provides common functionality like parameter validation
 */
export abstract class BaseTool implements Tool {
  /** Tool definition for LLM */
  abstract definition: ToolDefinition;

  /**
   * Execute the tool with given parameters
   * Must be implemented by concrete tools
   */
  abstract execute(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult>;

  /**
   * Validate parameters before execution
   * @param params - Parameters to validate
   * @returns True if valid, error message if invalid
   */
  validateParams(params: Record<string, unknown>): true | string {
    try {
      // Check all required parameters are present
      for (const paramDef of this.definition.parameters) {
        if (paramDef.required && !(paramDef.name in params)) {
          return `Missing required parameter: ${paramDef.name}`;
        }

        // If parameter is present, validate its type
        if (paramDef.name in params) {
          const value = params[paramDef.name];
          const typeError = this.validateParamType(value, paramDef);
          if (typeError) {
            return typeError;
          }

          // Validate enum values
          if (paramDef.enum && paramDef.enum.length > 0) {
            const enumError = this.validateEnum(value, paramDef);
            if (enumError) {
              return enumError;
            }
          }
        }
      }

      return true;
    } catch (error) {
      return `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Validate parameter type
   * @param value - Value to validate
   * @param paramDef - Parameter definition
   * @returns Error message or null if valid
   */
  private validateParamType(value: unknown, paramDef: ToolParameter): string | null {
    const { name, type } = paramDef;

    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return `Parameter '${name}' must be a string`;
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `Parameter '${name}' must be a number`;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return `Parameter '${name}' must be a boolean`;
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return `Parameter '${name}' must be an array`;
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return `Parameter '${name}' must be an object`;
        }
        break;
    }

    return null;
  }

  /**
   * Validate enum value
   * @param value - Value to validate
   * @param paramDef - Parameter definition
   * @returns Error message or null if valid
   */
  private validateEnum(value: unknown, paramDef: ToolParameter): string | null {
    if (!paramDef.enum || paramDef.enum.length === 0) {
      return null;
    }

    const valueStr = String(value);
    if (!paramDef.enum.includes(valueStr)) {
      return `Parameter '${paramDef.name}' must be one of: ${paramDef.enum.join(', ')}`;
    }

    return null;
  }

  /**
   * Execute tool with automatic validation and error handling
   * @param params - Parameters for the tool
   * @param context - Execution context
   * @returns Tool execution result
   */
  async executeWithValidation(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate parameters
      const validationResult = this.validateParams(params);
      if (validationResult !== true) {
        throw new ValidationError(validationResult);
      }

      // Execute the tool
      const result = await this.execute(params, context);

      // Add execution time to metadata
      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      // Handle errors
      if (error instanceof ValidationError || error instanceof ToolError) {
        return {
          success: false,
          error: error.message,
          metadata: {
            executionTime: Date.now() - startTime,
          },
        };
      }

      // Unknown error
      return {
        success: false,
        error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Create a successful result
   * @param data - Result data
   * @param metadata - Optional metadata
   * @returns Success result
   */
  protected createSuccessResult(
    data: unknown,
    metadata?: ToolResult['metadata']
  ): ToolResult {
    return {
      success: true,
      data,
      metadata,
    };
  }

  /**
   * Create an error result
   * @param error - Error message
   * @param metadata - Optional metadata
   * @returns Error result
   */
  protected createErrorResult(
    error: string,
    metadata?: ToolResult['metadata']
  ): ToolResult {
    return {
      success: false,
      error,
      metadata,
    };
  }

  /**
   * Get parameter value with default
   * @param params - Parameters object
   * @param name - Parameter name
   * @param defaultValue - Default value if not present
   * @returns Parameter value or default
   */
  protected getParam<T>(
    params: Record<string, unknown>,
    name: string,
    defaultValue?: T
  ): T {
    if (name in params) {
      return params[name] as T;
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    // This should never happen if validation passed
    throw new ValidationError(`Required parameter '${name}' not found`);
  }

  /**
   * Get optional parameter value
   * @param params - Parameters object
   * @param name - Parameter name
   * @returns Parameter value or undefined
   */
  protected getOptionalParam<T>(
    params: Record<string, unknown>,
    name: string
  ): T | undefined {
    return params[name] as T | undefined;
  }
}
