import { NextRequest, NextResponse } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

// In-memory sliding-window store backed by globalThis to survive serverless execution contexts
const globalScope = globalThis as unknown as {
  __rateLimitStore?: Map<string, RateLimitRecord>;
  __rateLimitInterval?: NodeJS.Timeout;
};

if (!globalScope.__rateLimitStore) {
  globalScope.__rateLimitStore = new Map<string, RateLimitRecord>();
}
const rateLimitStore = globalScope.__rateLimitStore;

// Periodic cleanup every 5 minutes to prevent memory leaks
if (!globalScope.__rateLimitInterval && typeof setInterval !== "undefined") {
  globalScope.__rateLimitInterval = setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((record, key) => {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 300000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    });
  }, 300000);
}

export function getClientIp(req: NextRequest): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp.trim();
  }
  const trueClientIp = req.headers.get("true-client-ip");
  if (trueClientIp) {
    return trueClientIp.trim();
  }
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  headers: Record<string, string>;
}

export function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): RateLimitResult {
  const { limit, windowMs, keyPrefix = "rl" } = options;
  const ip = getClientIp(req);
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within current window
  const windowStart = now - windowMs;
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  const resetSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const remaining = Math.max(0, limit - record.timestamps.length);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": Math.max(0, remaining - 1).toString(),
    "X-RateLimit-Reset": resetSeconds.toString(),
  };

  if (record.timestamps.length >= limit) {
    headers["Retry-After"] = resetSeconds.toString();
    return {
      success: false,
      limit,
      remaining: 0,
      resetSeconds,
      headers,
    };
  }

  record.timestamps.push(now);
  return {
    success: true,
    limit,
    remaining: limit - record.timestamps.length,
    resetSeconds,
    headers,
  };
}

export function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests. Please slow down and try again shortly.",
      retryAfterSeconds: result.resetSeconds,
    },
    {
      status: 429,
      headers: result.headers,
    }
  );
}
