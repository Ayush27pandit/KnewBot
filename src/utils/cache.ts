import { createHash } from 'crypto';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  hits: number;
}

class QueryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTL;
  }

  private generateKey(query: string, context?: string): string {
    const input = context ? `${query}|${context}` : query;
    return createHash('md5').update(input).digest('hex');
  }

  set<T>(query: string, data: T, context?: string, ttl?: number): void {
    const key = this.generateKey(query, context);
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + (ttl || this.defaultTTL),
      hits: 0,
    };
    this.cache.set(key, entry);
  }

  get<T>(query: string, context?: string): T | null {
    const key = this.generateKey(query, context);
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  has(query: string, context?: string): boolean {
    return this.get(query, context) !== null;
  }

  delete(query: string, context?: string): void {
    const key = this.generateKey(query, context);
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { total: number; hits: number; avgTTL: number } {
    let total = 0;
    let hits = 0;
    let ttlSum = 0;

    for (const entry of this.cache.values()) {
      total++;
      hits += entry.hits;
      ttlSum += entry.expiresAt - Date.now();
    }

    return {
      total,
      hits,
      avgTTL: total > 0 ? ttlSum / total : 0,
    };
  }

  // Periodic cleanup of expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const queryCache = new QueryCache(15 * 60 * 1000); // 15 minutes default

// Auto-cleanup every 5 minutes
setInterval(() => {
  queryCache.cleanup();
}, 5 * 60 * 1000);
