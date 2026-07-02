import { getDB } from '../database/connection';
import { Customer, Sale } from '../models/types';

export class CustomerRepository {
  static async listAll(search?: string): Promise<Customer[]> {
    const db = await getDB();
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY name ASC';
    return db.all<Customer[]>(query, params);
  }

  static async findById(id: number): Promise<Customer | null> {
    const db = await getDB();
    const customer = await db.get<Customer>('SELECT * FROM customers WHERE id = ?', [id]);
    return customer || null;
  }

  static async create(customer: Omit<Customer, 'id' | 'created_at'>): Promise<number> {
    const db = await getDB();
    const result = await db.run(
      'INSERT INTO customers (name, phone, email, notes) VALUES (?, ?, ?, ?)',
      [customer.name, customer.phone || null, customer.email || null, customer.notes || null]
    );
    return result.lastID!;
  }

  static async update(id: number, customer: Partial<Omit<Customer, 'id' | 'created_at'>>): Promise<void> {
    const db = await getDB();
    const sets: string[] = [];
    const params: any[] = [];

    if (customer.name !== undefined) { sets.push('name = ?'); params.push(customer.name); }
    if (customer.phone !== undefined) { sets.push('phone = ?'); params.push(customer.phone); }
    if (customer.email !== undefined) { sets.push('email = ?'); params.push(customer.email); }
    if (customer.notes !== undefined) { sets.push('notes = ?'); params.push(customer.notes); }

    if (sets.length === 0) return;

    params.push(id);
    await db.run(`UPDATE customers SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  static async delete(id: number): Promise<void> {
    const db = await getDB();
    await db.run('DELETE FROM customers WHERE id = ?', [id]);
  }

  static async getPurchasesHistory(customerId: number): Promise<Sale[]> {
    const db = await getDB();
    const query = `
      SELECT s.*, u.username as user_username
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.client_id = ?
      ORDER BY s.created_at DESC
    `;
    return db.all<Sale[]>(query, [customerId]);
  }
}
