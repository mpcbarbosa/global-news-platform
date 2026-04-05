import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { userRepository } from '../repositories/user.repository';
import { JwtPayload } from '../types';
import { UnauthorizedError, ConflictError, NotFoundError } from '../utils/errors';

export class AuthService {
  async register(data: { email: string; password: string; display_name: string; preferred_language?: string }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await userRepository.create({
      email: data.email,
      password_hash: passwordHash,
      display_name: data.display_name,
      preferred_language: data.preferred_language,
    });

    const roles = await userRepository.getRoles(user.id);
    const tokens = this.generateTokens({ userId: user.id, email: user.email, roles });

    return {
      user: { id: user.id, email: user.email, display_name: user.display_name, preferred_language: user.preferred_language },
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.is_active) throw new UnauthorizedError('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const roles = await userRepository.getRoles(user.id);
    const tokens = this.generateTokens({ userId: user.id, email: user.email, roles });

    return {
      user: { id: user.id, email: user.email, display_name: user.display_name, preferred_language: user.preferred_language },
      ...tokens,
    };
  }

  async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
      const user = await userRepository.findById(decoded.userId);
      if (!user || !user.is_active) throw new UnauthorizedError('User not found or inactive');

      const roles = await userRepository.getRoles(user.id);
      const tokens = this.generateTokens({ userId: user.id, email: user.email, roles });
      return tokens;
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User');

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    const hash = await bcrypt.hash(newPassword, 12);
    await userRepository.updatePassword(userId, hash);
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  private generateTokens(payload: JwtPayload) {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any });
    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
