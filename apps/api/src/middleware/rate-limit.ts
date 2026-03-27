import { Context, Next } from 'hono';

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

const store: RateLimitStore = {};

interface RateLimitOptions {
    windowMs: number;
    max: number;
    message: string;
}

/**
 * Lightweight in-memory rate limiter for Hono
 * @param options RateLimitOptions
 */
export const rateLimit = (options: RateLimitOptions) => {
    return async (c: Context, next: Next) => {
        const ip = c.req.header('x-forwarded-for') || 'unknown';
        const now = Date.now();

        if (!store[ip] || now > store[ip].resetTime) {
            store[ip] = {
                count: 1,
                resetTime: now + options.windowMs,
            };
        } else {
            store[ip].count++;
        }

        if (store[ip].count > options.max) {
            console.warn(`[Rate Limit] Blocking IP ${ip} after ${store[ip].count} requests`);
            return c.json({ error: options.message }, 429);
        }

        // Set headers
        c.header('X-RateLimit-Limit', options.max.toString());
        c.header('X-RateLimit-Remaining', Math.max(0, options.max - store[ip].count).toString());
        c.header('X-RateLimit-Reset', Math.ceil(store[ip].resetTime / 1000).toString());

        await next();
    };
};
