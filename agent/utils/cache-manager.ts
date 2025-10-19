/**
 * Cache Manager Utility
 * Provides in-memory caching with TTL and LRU eviction
 */

/**
 * Cache entry with value and expiration time
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  key: string;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /**
   * Maximum number of entries in the cache
   * @default 1000
   */
  maxSize?: number;

  /**
   * Default TTL in milliseconds
   * @default 60000 (1 minute)
   */
  defaultTTL?: number;

  /**
   * Enable automatic cleanup of expired entries
   * @default true
   */
  autoCleanup?: boolean;

  /**
   * Cleanup interval in milliseconds
   * @default 60000 (1 minute)
   */
  cleanupInterval?: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

/**
 * In-memory cache with TTL and LRU eviction
 */
export class CacheManager<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private accessOrder: string[]; // For LRU tracking
  private maxSize: number;
  private defaultTTL: number;
  private cleanupTimer?: NodeJS.Timeout;

  // Statistics
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.accessOrder = [];
    this.maxSize = options.maxSize ?? 1000;
    this.defaultTTL = options.defaultTTL ?? 60000; // 1 minute default

    // Setup automatic cleanup
    if (options.autoCleanup !== false) {
      const interval = options.cleanupInterval ?? 60000; // 1 minute
      this.cleanupTimer = setInterval(() => this.cleanupExpired(), interval);
    }
  }

  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    // Not found
    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.misses++;
      return undefined;
    }

    // Update access order (move to end = most recently used)
    this.updateAccessOrder(key);
    this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds (optional, uses default if not provided)
   */
  set(key: string, value: T, ttl?: number): void {
    const ttlMs = ttl ?? this.defaultTTL;
    const expiresAt = Date.now() + ttlMs;

    // Check if we need to evict (LRU)
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      key,
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  /**
   * Check if key exists and is not expired
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete specific key from cache
   * @param key - Cache key
   * @returns True if key was deleted
   */
  delete(key: string): boolean {
    this.removeFromAccessOrder(key);
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get current cache size
   * @returns Number of entries in cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimals
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get all cache keys
   * @returns Array of cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all cache values (non-expired only)
   * @returns Array of cache values
   */
  values(): T[] {
    const now = Date.now();
    return Array.from(this.cache.values())
      .filter(entry => now <= entry.expiresAt)
      .map(entry => entry.value);
  }

  /**
   * Cleanup expired entries
   * @returns Number of entries cleaned up
   */
  cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Destroy cache and stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    // First item in accessOrder is least recently used
    const lruKey = this.accessOrder[0];
    this.cache.delete(lruKey);
    this.accessOrder.shift();
    this.evictions++;
  }

  /**
   * Update access order for LRU tracking
   * @param key - Cache key
   */
  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.removeFromAccessOrder(key);

    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   * @param key - Cache key
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}

/**
 * Predefined cache instances for common use cases
 */

/**
 * Cache for balance queries
 * Short TTL (30 seconds) as balances change frequently
 */
export const balanceCache = new CacheManager({
  maxSize: 500,
  defaultTTL: 30000, // 30 seconds
  autoCleanup: true,
});

/**
 * Cache for price queries
 * Medium TTL (60 seconds) as prices update regularly
 */
export const priceCache = new CacheManager({
  maxSize: 500,
  defaultTTL: 60000, // 60 seconds
  autoCleanup: true,
});

/**
 * Cache for LLM responses
 * Longer TTL (5 minutes) for conversation context
 */
export const llmCache = new CacheManager({
  maxSize: 100,
  defaultTTL: 300000, // 5 minutes
  autoCleanup: true,
});

/**
 * Cache for portfolio data
 * Medium TTL (60 seconds)
 */
export const portfolioCache = new CacheManager({
  maxSize: 200,
  defaultTTL: 60000, // 60 seconds
  autoCleanup: true,
});

/**
 * Create a cache key from multiple parts
 * @param parts - Parts to combine into cache key
 * @returns Cache key string
 */
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.map(p => String(p).toLowerCase()).join(':');
}

/**
 * Cleanup all predefined caches
 */
export function cleanupAllCaches(): void {
  balanceCache.cleanupExpired();
  priceCache.cleanupExpired();
  llmCache.cleanupExpired();
  portfolioCache.cleanupExpired();
}

/**
 * Destroy all predefined caches
 */
export function destroyAllCaches(): void {
  balanceCache.destroy();
  priceCache.destroy();
  llmCache.destroy();
  portfolioCache.destroy();
}
