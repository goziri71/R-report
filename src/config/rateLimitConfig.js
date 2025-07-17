export const rateLimitConfig = {
  // Global rate limiter - very permissive, just basic protection
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === "production" ? 2000 : 10000,
    message: {
      error: "Too many requests from this IP, please try again later.",
      retryAfter: "15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Strict limiter ONLY for authentication routes (login)
  auth: {
    windowMs: 10 * 60 * 1000, // 15 minutes
    max: 3, // 5 login attempts per window
    message: {
      error: "Too many login attempts, please try again later.",
      retryAfter: "15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
};
