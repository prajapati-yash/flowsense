/**
 * Tool Registry
 * Manages all available tools for the agent
 */

import { Tool, ToolRegistry as IToolRegistry, ToolDefinition } from '../types';

// Re-export the interface for convenience
export type { IToolRegistry };

/**
 * Implementation of ToolRegistry
 * Manages registration and retrieval of tools
 */
export class ToolRegistry implements IToolRegistry {
  private tools: Map<string, Tool>;

  constructor() {
    this.tools = new Map();
  }

  /**
   * Register a new tool
   * @param tool - Tool to register
   * @throws Error if tool with same name already exists
   */
  register(tool: Tool): void {
    const name = tool.definition.name;

    if (this.tools.has(name)) {
      throw new Error(`Tool '${name}' is already registered`);
    }

    // Validate tool definition
    this.validateToolDefinition(tool.definition);

    this.tools.set(name, tool);
  }

  /**
   * Register multiple tools at once
   * @param tools - Array of tools to register
   */
  registerAll(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Get a tool by name
   * @param toolName - Name of the tool
   * @returns Tool instance or undefined if not found
   */
  get(toolName: string): Tool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Get all registered tools
   * @returns Array of all tools
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool definitions for LLM
   * @returns Array of tool definitions
   */
  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => tool.definition);
  }

  /**
   * Check if a tool exists
   * @param toolName - Name of the tool
   * @returns True if tool exists
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Unregister a tool
   * @param toolName - Name of the tool to remove
   * @returns True if tool was removed, false if not found
   */
  unregister(toolName: string): boolean {
    return this.tools.delete(toolName);
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get number of registered tools
   * @returns Count of tools
   */
  count(): number {
    return this.tools.size;
  }

  /**
   * Get tool names
   * @returns Array of tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Validate tool definition
   * @param definition - Tool definition to validate
   * @throws Error if definition is invalid
   */
  private validateToolDefinition(definition: ToolDefinition): void {
    if (!definition.name || definition.name.trim() === '') {
      throw new Error('Tool name is required');
    }

    if (!definition.description || definition.description.trim() === '') {
      throw new Error(`Tool '${definition.name}' must have a description`);
    }

    if (!Array.isArray(definition.parameters)) {
      throw new Error(`Tool '${definition.name}' must have parameters array`);
    }

    // Validate each parameter
    for (const param of definition.parameters) {
      if (!param.name || param.name.trim() === '') {
        throw new Error(`Tool '${definition.name}' has parameter without name`);
      }

      if (!param.type) {
        throw new Error(
          `Tool '${definition.name}' parameter '${param.name}' must have a type`
        );
      }

      if (!param.description || param.description.trim() === '') {
        throw new Error(
          `Tool '${definition.name}' parameter '${param.name}' must have a description`
        );
      }

      // Validate type is one of the allowed types
      const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
      if (!validTypes.includes(param.type)) {
        throw new Error(
          `Tool '${definition.name}' parameter '${param.name}' has invalid type '${param.type}'`
        );
      }
    }
  }

  /**
   * Get statistics about registered tools
   */
  getStats() {
    const tools = this.getAll();
    const totalParams = tools.reduce(
      (sum, tool) => sum + tool.definition.parameters.length,
      0
    );

    return {
      totalTools: this.count(),
      toolNames: this.getToolNames(),
      totalParameters: totalParams,
      averageParametersPerTool:
        this.count() > 0 ? totalParams / this.count() : 0,
    };
  }
}

/**
 * Create a singleton instance of ToolRegistry
 */
export const toolRegistry = new ToolRegistry();
