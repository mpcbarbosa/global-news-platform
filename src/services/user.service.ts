import { userRepository } from '../repositories/user.repository';
import { parsePagination, paginate } from '../utils/pagination';
import { NotFoundError } from '../utils/errors';

export class UserService {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User');
    const roles = await userRepository.getRoles(userId);
    return {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      preferred_language: user.preferred_language,
      created_at: user.created_at,
      roles,
    };
  }

  async updateProfile(userId: string, data: { display_name?: string; avatar_url?: string; preferred_language?: string }) {
    const user = await userRepository.update(userId, data);
    if (!user) throw new NotFoundError('User');
    return {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      preferred_language: user.preferred_language,
    };
  }

  async listUsers(page?: string | number, limit?: string | number) {
    const pagination = parsePagination(page, limit);
    const { users, total } = await userRepository.findAll(pagination.limit, pagination.offset);
    const sanitized = users.map((u) => ({
      id: u.id,
      email: u.email,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      preferred_language: u.preferred_language,
      created_at: u.created_at,
    }));
    return paginate(sanitized, total, pagination);
  }

  async deactivateUser(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User');
    await userRepository.deactivate(userId);
  }
}

export const userService = new UserService();
