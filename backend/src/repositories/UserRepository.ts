import { getDB } from '../database/connection';
import { User } from '../models/types';

export class UserRepository {
  static async findByUsername(username: string): Promise<User | null> {
    const db = await getDB();
    const row = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!row) return null;
    return {
      ...row,
      permissions: JSON.parse(row.permissions || '[]')
    };
  }

  static async findById(id: number): Promise<User | null> {
    const db = await getDB();
    const row = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!row) return null;
    return {
      ...row,
      permissions: JSON.parse(row.permissions || '[]')
    };
  }

  static async listAll(): Promise<Omit<User, 'password_hash'>[]> {
    const db = await getDB();
    const rows = await db.all('SELECT id, username, role, permissions, created_at FROM users');
    return rows.map(row => ({
      ...row,
      permissions: JSON.parse(row.permissions || '[]')
    }));
  }

  static async create(user: Omit<User, 'id'>): Promise<number> {
    const db = await getDB();
    const permissionsStr = JSON.stringify(user.permissions);
    const result = await db.run(
      'INSERT INTO users (username, password_hash, role, permissions) VALUES (?, ?, ?, ?)',
      [user.username, user.password_hash, user.role, permissionsStr]
    );
    return result.lastID!;
  }

  static async update(id: number, user: Partial<User>): Promise<void> {
    const db = await getDB();
    const sets: string[] = [];
    const params: any[] = [];

    if (user.username !== undefined) {
      sets.push('username = ?');
      params.push(user.username);
    }
    if (user.password_hash !== undefined) {
      sets.push('password_hash = ?');
      params.push(user.password_hash);
    }
    if (user.role !== undefined) {
      sets.push('role = ?');
      params.push(user.role);
    }
    if (user.permissions !== undefined) {
      sets.push('permissions = ?');
      params.push(JSON.stringify(user.permissions));
    }

    if (sets.length === 0) return;

    params.push(id);
    await db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  static async delete(id: number): Promise<void> {
    const db = await getDB();
    await db.run('DELETE FROM users WHERE id = ?', [id]);
  }
}
