export const rateLimitConfig = {
  // Global rate limiter - very permissive, just basic protection
  global: {
    windowMs: 1 * 60 * 1000,
    max: 999999999,
    message: {
      error: "Too many requests from this IP, please try again later.",
      retryAfter: "15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Strict limiter ONLY for authentication routes (login)
  auth: {
    windowMs: 1 * 60 * 1000,
    max: 20,
    message: {
      error: "Too many login attempts, please try again later.",
      retryAfter: "15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
};
