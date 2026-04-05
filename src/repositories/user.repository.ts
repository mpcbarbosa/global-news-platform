import { query, transaction } from '../config/database';
import { UserRow } from '../types';
import { generateId } from '../utils/hash';

export class UserRepository {
  async findById(id: string): Promise<UserRow | null> {
    const result = await query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async create(data: {
    email: string;
    password_hash: string;
    display_name: string;
    preferred_language?: string;
  }): Promise<UserRow> {
    const id = generateId();
    const result = await transaction(async (q) => {
      const userResult = await q(
        `INSERT INTO users (id, email, password_hash, display_name, preferred_language)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, data.email, data.password_hash, data.display_name, data.preferred_language || 'en']
      );

      // Assign default 'reader' role
      await q(
        `INSERT INTO user_roles (id, user_id, role_id)
         SELECT $1, $2, r.id FROM roles r WHERE r.name = 'reader'`,
        [generateId(), id]
      );

      return userResult;
    });
    return result.rows[0] as UserRow;
  }

  async update(id: string, data: Partial<Pick<UserRow, 'display_name' | 'avatar_url' | 'preferred_language'>>): Promise<UserRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.display_name !== undefined) { fields.push(`display_name = $${idx++}`); values.push(data.display_name); }
    if (data.avatar_url !== undefined) { fields.push(`avatar_url = $${idx++}`); values.push(data.avatar_url); }
    if (data.preferred_language !== undefined) { fields.push(`preferred_language = $${idx++}`); values.push(data.preferred_language); }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query<UserRow>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, id]);
  }

  async getRoles(userId: string): Promise<string[]> {
    const result = await query<{ name: string }>(
      `SELECT r.name FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId]
    );
    return result.rows.map((r) => r.name);
  }

  async deactivate(id: string): Promise<void> {
    await query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
  }

  async findAll(limit: number, offset: number): Promise<{ users: UserRow[]; total: number }> {
    const countResult = await query<{ count: string }>('SELECT COUNT(*) FROM users WHERE is_active = true');
    const total = parseInt(countResult.rows[0].count, 10);
    const result = await query<UserRow>(
      'SELECT * FROM users WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return { users: result.rows, total };
  }
}

export const userRepository = new UserRepository();
