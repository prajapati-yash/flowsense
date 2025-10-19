/**
 * Context Manager
 * Manages conversation context for multi-turn interactions
 */

import { v4 as uuidv4 } from 'uuid';
import { ConversationContext, Message } from '../types';

/**
 * Configuration for context manager
 */
export interface ContextManagerConfig {
  /** Maximum number of messages to keep in context */
  maxMessages: number;

  /** Context expiration time in milliseconds */
  expirationMs: number;

  /** Maximum number of contexts to store */
  maxContexts: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ContextManagerConfig = {
  maxMessages: 10, // Keep last 10 messages
  expirationMs: 30 * 60 * 1000, // 30 minutes
  maxContexts: 100, // Maximum 100 concurrent conversations
};

/**
 * Context Manager for maintaining conversation state
 */
export class ContextManager {
  private contexts: Map<string, ConversationContext>;
  private config: ContextManagerConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<ContextManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.contexts = new Map();

    // Start cleanup interval (every 5 minutes)
    this.startCleanup();
  }

  /**
   * Create a new conversation context
   * @param userAddress - User's wallet address
   * @returns New conversation context
   */
  createContext(userAddress: string): ConversationContext {
    const context: ConversationContext = {
      id: uuidv4(),
      messages: [],
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
      userAddress,
    };

    this.contexts.set(context.id, context);
    this.enforceMaxContexts();

    return context;
  }

  /**
   * Get conversation context by ID
   * @param conversationId - Conversation ID
   * @returns Conversation context or undefined if not found or expired
   */
  getContext(conversationId: string): ConversationContext | undefined {
    const context = this.contexts.get(conversationId);

    if (!context) {
      return undefined;
    }

    // Check if context has expired
    if (this.isExpired(context)) {
      this.contexts.delete(conversationId);
      return undefined;
    }

    return context;
  }

  /**
   * Update conversation context with new message
   * @param conversationId - Conversation ID
   * @param message - Message to add
   * @returns Updated context or undefined if not found
   */
  updateContext(conversationId: string, message: Message): ConversationContext | undefined {
    const context = this.getContext(conversationId);

    if (!context) {
      return undefined;
    }

    // Add timestamp to message if not present
    const messageWithTimestamp: Message = {
      ...message,
      timestamp: message.timestamp || Date.now(),
    };

    context.messages.push(messageWithTimestamp);
    context.lastUpdatedAt = Date.now();

    // Enforce message limit (keep only last N messages)
    if (context.messages.length > this.config.maxMessages) {
      context.messages = context.messages.slice(-this.config.maxMessages);
    }

    this.contexts.set(conversationId, context);

    return context;
  }

  /**
   * Add multiple messages to context
   * @param conversationId - Conversation ID
   * @param messages - Messages to add
   * @returns Updated context or undefined if not found
   */
  updateContextBatch(
    conversationId: string,
    messages: Message[]
  ): ConversationContext | undefined {
    let context = this.getContext(conversationId);

    if (!context) {
      return undefined;
    }

    for (const message of messages) {
      context = this.updateContext(conversationId, message)!;
    }

    return context;
  }

  /**
   * Get messages from context
   * @param conversationId - Conversation ID
   * @param limit - Maximum number of messages to return (most recent)
   * @returns Array of messages or empty array if context not found
   */
  getMessages(conversationId: string, limit?: number): Message[] {
    const context = this.getContext(conversationId);

    if (!context) {
      return [];
    }

    const messages = context.messages;

    if (limit && limit < messages.length) {
      return messages.slice(-limit);
    }

    return messages;
  }

  /**
   * Clear a conversation context
   * @param conversationId - Conversation ID
   * @returns True if context was deleted, false if not found
   */
  clearContext(conversationId: string): boolean {
    return this.contexts.delete(conversationId);
  }

  /**
   * Clear all contexts for a user
   * @param userAddress - User's wallet address
   * @returns Number of contexts deleted
   */
  clearUserContexts(userAddress: string): number {
    let count = 0;

    for (const [id, context] of this.contexts.entries()) {
      if (context.userAddress === userAddress) {
        this.contexts.delete(id);
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all expired contexts
   * @returns Number of contexts deleted
   */
  clearExpired(): number {
    let count = 0;

    for (const [id, context] of this.contexts.entries()) {
      if (this.isExpired(context)) {
        this.contexts.delete(id);
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all contexts
   */
  clearAll(): void {
    this.contexts.clear();
  }

  /**
   * Get number of active contexts
   */
  getContextCount(): number {
    return this.contexts.size;
  }

  /**
   * Get context statistics
   */
  getStats() {
    const now = Date.now();
    let totalMessages = 0;
    let expiredCount = 0;

    for (const context of this.contexts.values()) {
      totalMessages += context.messages.length;
      if (this.isExpired(context)) {
        expiredCount++;
      }
    }

    return {
      activeContexts: this.contexts.size,
      expiredContexts: expiredCount,
      totalMessages,
      averageMessagesPerContext:
        this.contexts.size > 0 ? totalMessages / this.contexts.size : 0,
    };
  }

  /**
   * Check if context has expired
   * @param context - Conversation context
   * @returns True if expired
   */
  private isExpired(context: ConversationContext): boolean {
    const now = Date.now();
    return now - context.lastUpdatedAt > this.config.expirationMs;
  }

  /**
   * Enforce maximum number of contexts
   * Removes oldest contexts if limit exceeded
   */
  private enforceMaxContexts(): void {
    if (this.contexts.size <= this.config.maxContexts) {
      return;
    }

    // Sort contexts by last updated time (oldest first)
    const sortedContexts = Array.from(this.contexts.entries()).sort(
      (a, b) => a[1].lastUpdatedAt - b[1].lastUpdatedAt
    );

    // Remove oldest contexts until we're under the limit
    const toRemove = this.contexts.size - this.config.maxContexts;
    for (let i = 0; i < toRemove; i++) {
      this.contexts.delete(sortedContexts[i][0]);
    }
  }

  /**
   * Start periodic cleanup of expired contexts
   */
  private startCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const removed = this.clearExpired();
      if (removed > 0) {
        console.log(`[ContextManager] Cleaned up ${removed} expired contexts`);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup interval
   * Call this when shutting down the application
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Destroy the context manager and clean up resources
   */
  destroy(): void {
    this.stopCleanup();
    this.clearAll();
  }
}
