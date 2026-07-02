import { getDB } from '../database/connection';
import { Sale, SaleItem } from '../models/types';

export class SaleRepository {
  static async create(
    sale: Omit<Sale, 'id' | 'status' | 'created_at' | 'items'>,
    items: Omit<SaleItem, 'id' | 'sale_id'>[],
    userId: number
  ): Promise<number> {
    const db = await getDB();
    await db.run('BEGIN TRANSACTION');

    try {
      // 1. Check if negative stock is allowed
      const allowNegativeSetting = await db.get(
        "SELECT value FROM settings WHERE key = 'allow_negative_stock'"
      );
      const allowNegative = allowNegativeSetting?.value === 'true';

      // 2. Validate stock for each item if negative stock is not allowed
      if (!allowNegative) {
        for (const item of items) {
          const variant = await db.get(
            `SELECT pv.stock, pv.sku, p.name 
             FROM product_variants pv 
             JOIN products p ON pv.product_id = p.id 
             WHERE pv.id = ?`,
            [item.variant_id]
          );
          if (!variant) {
            throw new Error(`Variante de producto no encontrada.`);
          }
          if (variant.stock < item.quantity) {
            throw new Error(
              `Stock insuficiente para ${variant.name} (${variant.sku || 'Sin SKU'}). Disponible: ${variant.stock}, Solicitado: ${item.quantity}`
            );
          }
        }
      }

      // 3. Insert sale record
      const result = await db.run(
        `INSERT INTO sales (
          client_id, user_id, total, subtotal, discount, tax, 
          payment_method, cash_received, card_received, transfer_received, status, notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
        [
          sale.client_id || null,
          userId,
          sale.total,
          sale.subtotal,
          sale.discount || 0,
          sale.tax || 0,
          sale.payment_method,
          sale.cash_received || 0,
          sale.card_received || 0,
          sale.transfer_received || 0,
          sale.notes || null
        ]
      );
      const saleId = result.lastID!;

      // 4. Insert items & update inventory
      for (const item of items) {
        await db.run(
          `INSERT INTO sale_items (sale_id, variant_id, quantity, unit_price, discount, total)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            saleId,
            item.variant_id,
            item.quantity,
            item.unit_price,
            item.discount || 0,
            item.total
          ]
        );

        // Decrease stock
        await db.run(
          'UPDATE product_variants SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.variant_id]
        );

        // Record inventory movement
        await db.run(
          `INSERT INTO inventory_movements (variant_id, type, quantity, reference_id, notes, user_id)
           VALUES (?, 'sale', ?, ?, ?, ?)`,
          [
            item.variant_id,
            item.quantity,
            saleId,
            `Venta #${saleId}`,
            userId
          ]
        );
      }

      // 5. Add audit log
      await db.run(
        `INSERT INTO audit_logs (user_id, action, details)
         VALUES (?, 'CREATE_SALE', ?)`,
        [userId, `Venta #${saleId} creada por un monto total de $${sale.total}`]
      );

      await db.run('COMMIT');
      return saleId;
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  static async cancel(saleId: number, userId: number): Promise<void> {
    const db = await getDB();
    await db.run('BEGIN TRANSACTION');

    try {
      // 1. Fetch sale
      const sale = await db.get<Sale>('SELECT * FROM sales WHERE id = ?', [saleId]);
      if (!sale) {
        throw new Error(`Venta #${saleId} no encontrada.`);
      }
      if (sale.status === 'cancelled') {
        throw new Error(`La venta #${saleId} ya se encuentra cancelada.`);
      }

      // 2. Fetch sale items
      const items = await db.all<SaleItem[]>(
        'SELECT * FROM sale_items WHERE sale_id = ?',
        [saleId]
      );

      // 3. Return stock to variants and record movement
      for (const item of items) {
        if (item.variant_id) {
          // Increase stock
          await db.run(
            'UPDATE product_variants SET stock = stock + ? WHERE id = ?',
            [item.quantity, item.variant_id]
          );

          // Record movement
          await db.run(
            `INSERT INTO inventory_movements (variant_id, type, quantity, reference_id, notes, user_id)
             VALUES (?, 'return', ?, ?, ?, ?)`,
            [
              item.variant_id,
              item.quantity,
              saleId,
              `Devolución por cancelación de Venta #${saleId}`,
              userId
            ]
          );
        }
      }

      // 4. Update sale status to cancelled
      await db.run("UPDATE sales SET status = 'cancelled' WHERE id = ?", [saleId]);

      // 5. Add audit log
      await db.run(
        `INSERT INTO audit_logs (user_id, action, details)
         VALUES (?, 'CANCEL_SALE', ?)`,
        [userId, `Venta #${saleId} cancelada. Reversión de stock procesada.`]
      );

      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  static async listAll(filters: {
    client_id?: number;
    user_id?: number;
    payment_method?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  } = {}): Promise<Sale[]> {
    const db = await getDB();
    let query = `
      SELECT s.*, 
             c.name as client_name, 
             u.username as user_username
      FROM sales s
      LEFT JOIN customers c ON s.client_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.client_id) {
      query += ' AND s.client_id = ?';
      params.push(filters.client_id);
    }
    if (filters.user_id) {
      query += ' AND s.user_id = ?';
      params.push(filters.user_id);
    }
    if (filters.payment_method) {
      query += ' AND s.payment_method = ?';
      params.push(filters.payment_method);
    }
    if (filters.status) {
      query += ' AND s.status = ?';
      params.push(filters.status);
    }
    if (filters.startDate) {
      query += ' AND date(s.created_at) >= date(?)';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND date(s.created_at) <= date(?)';
      params.push(filters.endDate);
    }
    if (filters.search) {
      query += ' AND (s.id = ? OR c.name LIKE ?)';
      const cleanSearchId = parseInt(filters.search, 10);
      params.push(isNaN(cleanSearchId) ? -1 : cleanSearchId, `%${filters.search}%`);
    }

    query += ' ORDER BY s.id DESC';
    return db.all<Sale[]>(query, params);
  }

  static async findById(id: number): Promise<Sale | null> {
    const db = await getDB();
    const query = `
      SELECT s.*, 
             c.name as client_name, 
             c.phone as client_phone,
             c.email as client_email,
             u.username as user_username
      FROM sales s
      LEFT JOIN customers c ON s.client_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `;
    const sale = await db.get<Sale>(query, [id]);
    if (!sale) return null;

    // Fetch items
    const itemsQuery = `
      SELECT si.*, 
             p.name as product_name, 
             pv.size, 
             pv.color, 
             pv.sku, 
             pv.barcode
      FROM sale_items si
      LEFT JOIN product_variants pv ON si.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      WHERE si.sale_id = ?
    `;
    sale.items = await db.all<SaleItem[]>(itemsQuery, [id]);
    return sale;
  }
}
