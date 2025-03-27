export class ErrorClass extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// export class ErrorClass extends Error {
//   constructor(messageOrObject, statusCode) {
//     if (typeof messageOrObject === "object" && messageOrObject !== null) {
//       super(messageOrObject.message || "An error occurred");
//       this.statusCode =
//         messageOrObject.code || messageOrObject.statusCode || 500;
//     } else {
//       super(messageOrObject);
//       this.statusCode = statusCode || 500;
//     }
//     Error.captureStackTrace(this, this.constructor);
//   }
// }
