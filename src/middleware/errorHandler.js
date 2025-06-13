import { ErrorClass } from "../utils/errorClass/index.js";

export const ErrorHandlerMiddleware = (error, req, res, next) => {
  if (error instanceof ErrorClass) {
    return res.status(error.statusCode).json({
      status: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    status: false,
    message: error.message,
  });
};

// export const ErrorHandlerMiddleware = (error, req, res, next) => {
//   const statusCode = error.statusCode || 500;
//   const message = error.message || "Internal Server Error";
//   if (process.env.NODE_ENV === "development") {
//     console.error("❌ ERROR:", error);
//   }
//   return res.status(statusCode).json({
//     status: "error",
//     message,
//     ...(process.env.NODE_ENV === "development" && { stack: error.message }), // Show stack trace in dev mode
//   });
// };
