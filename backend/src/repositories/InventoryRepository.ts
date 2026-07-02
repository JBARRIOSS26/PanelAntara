import { getDB } from '../database/connection';
import { InventoryMovement } from '../models/types';

export class InventoryRepository {
  static async addMovement(
    movement: Omit<InventoryMovement, 'id' | 'created_at'>
  ): Promise<number> {
    const db = await getDB();
    await db.run('BEGIN TRANSACTION');

    try {
      // 1. Insert inventory movement record
      const result = await db.run(
        `INSERT INTO inventory_movements (variant_id, type, quantity, reference_id, notes, user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          movement.variant_id,
          movement.type,
          movement.quantity,
          movement.reference_id || null,
          movement.notes || null,
          movement.user_id || null
        ]
      );
      const movementId = result.lastID!;

      // 2. Adjust stock in product_variants table based on movement type
      let stockDelta = 0;
      if (movement.type === 'input' || movement.type === 'return') {
        stockDelta = movement.quantity; // Positive change
      } else if (movement.type === 'output' || movement.type === 'sale') {
        stockDelta = -movement.quantity; // Negative change
      } else if (movement.type === 'adjustment') {
        stockDelta = movement.quantity; // Adjustment is signed (can be + or -)
      }

      await db.run(
        'UPDATE product_variants SET stock = stock + ? WHERE id = ?',
        [stockDelta, movement.variant_id]
      );

      await db.run('COMMIT');
      return movementId;
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  static async listMovements(filters: {
    variant_id?: number;
    type?: string;
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    search?: string;
  } = {}): Promise<InventoryMovement[]> {
    const db = await getDB();
    let query = `
      SELECT im.*, 
             p.name as product_name, 
             pv.size, 
             pv.color, 
             pv.sku,
             u.username as user_username
      FROM inventory_movements im
      JOIN product_variants pv ON im.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN users u ON im.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.variant_id) {
      query += ' AND im.variant_id = ?';
      params.push(filters.variant_id);
    }
    if (filters.type) {
      query += ' AND im.type = ?';
      params.push(filters.type);
    }
    if (filters.startDate) {
      query += ' AND date(im.created_at) >= date(?)';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND date(im.created_at) <= date(?)';
      params.push(filters.endDate);
    }
    if (filters.search) {
      query += ' AND (p.name LIKE ? OR pv.sku LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term);
    }

    query += ' ORDER BY im.id DESC';
    return db.all<InventoryMovement[]>(query, params);
  }
}
