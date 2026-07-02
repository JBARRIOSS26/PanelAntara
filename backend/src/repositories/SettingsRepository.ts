import { getDB } from '../database/connection';

export class SettingsRepository {
  static async getAll(): Promise<Record<string, string>> {
    const db = await getDB();
    const rows = await db.all<{ key: string; value: string }[]>('SELECT * FROM settings');
    const settingsObj: Record<string, string> = {};
    for (const row of rows) {
      settingsObj[row.key] = row.value;
    }
    return settingsObj;
  }

  static async set(key: string, value: string): Promise<void> {
    const db = await getDB();
    await db.run(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }

  static async setMany(settings: Record<string, string>): Promise<void> {
    const db = await getDB();
    await db.run('BEGIN TRANSACTION');
    try {
      for (const [key, value] of Object.entries(settings)) {
        await db.run(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          [key, value]
        );
      }
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }
}
