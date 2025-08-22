import rateLimit from "express-rate-limit";
import { rateLimitConfig } from "../config/rateLimitConfig.js";

console.log("🔍 Rate limiter config:", rateLimitConfig);

// Factory function to create express rate limiters
const createRateLimit = (config) => {
  return rateLimit({
    ...config,
    // Custom handler for when rate limit is exceeded
    handler: (req, res) => {
      console.log(
        "🚨 RATE LIMIT HIT for IP:",
        req.ip,
        "at",
        new Date().toISOString()
      );
      res.status(429).json(config.message);
    },
    // Add skip function to log every request
    skip: (req, res) => {
      console.log(
        "📊 Rate limit check for IP:",
        req.ip,
        "Current time:",
        new Date().toISOString()
      );
      return false; // Don't skip anyone
    },
  });
};

// Express rate limiters - ONLY for auth
export const rateLimiters = {
  global: createRateLimit(rateLimitConfig.global),
  auth: createRateLimit(rateLimitConfig.auth),
};
