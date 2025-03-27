import jwt from "jsonwebtoken";

export class AuthService {
  constructor() {
    this.jwt = jwt;
    this.period = 60 * 60 * 24;
  }

  async signToken(payload, signature, period) {
    const token = await this.jwt.sign({ id: payload }, signature, {
      expiresIn: period,
    });
    return token;
  }

  async verifyToken(payload, signature) {
    const verified = await this.jwt.verify(payload, signature);
    return verified;
  }
}
