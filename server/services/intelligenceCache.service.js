/**
 * High-Speed In-Memory Cache with Single-Flight Deduplication & Invalidation
 * Dramatically accelerates AI Intelligence endpoints (< 100ms response time)
 */
class IntelligenceCache {
  constructor() {
    this.cache = new Map();
    this.inFlight = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlSeconds = 120) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000),
      timestamp: Date.now()
    });
  }

  invalidate(prefix = '') {
    if (!prefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Fetches cached result or executes computeFn with in-flight deduplication.
   * If 5 concurrent requests hit the same endpoint during a cold start,
   * computeFn runs exactly once and all 5 receive the same result.
   */
  async fetchOrCompute(key, computeFn, ttlSeconds = 120, forceRefresh = false) {
    if (!forceRefresh) {
      const cached = this.get(key);
      if (cached !== null) {
        return { 
          data: cached, 
          fromCache: true, 
          cachedAt: this.cache.get(key)?.timestamp || Date.now() 
        };
      }
    }

    if (this.inFlight.has(key)) {
      const result = await this.inFlight.get(key);
      return { 
        data: result, 
        fromCache: true, 
        cachedAt: this.cache.get(key)?.timestamp || Date.now() 
      };
    }

    const promise = (async () => {
      try {
        const result = await computeFn();
        this.set(key, result, ttlSeconds);
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    const data = await promise;
    return { data, fromCache: false, cachedAt: Date.now() };
  }
}

const intelligenceCache = new IntelligenceCache();
module.exports = intelligenceCache;
