import { getDB } from '../database/connection';
import { Product, ProductVariant } from '../models/types';

export class ProductRepository {
  static async listAll(filters: {
    search?: string;
    category_id?: number;
    brand_id?: number;
    owner_id?: number;
    status?: number;
  } = {}): Promise<Product[]> {
    const db = await getDB();
    let query = `
      SELECT p.*, 
             c.name as category_name, 
             b.name as brand_name, 
             pr.name as owner_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN proprietarias pr ON p.owner_id = pr.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.category_id) {
      query += ' AND p.category_id = ?';
      params.push(filters.category_id);
    }
    if (filters.brand_id) {
      query += ' AND p.brand_id = ?';
      params.push(filters.brand_id);
    }
    if (filters.owner_id) {
      query += ' AND p.owner_id = ?';
      params.push(filters.owner_id);
    }
    if (filters.status !== undefined) {
      query += ' AND p.status = ?';
      params.push(filters.status);
    }
    if (filters.search) {
      // Search in product name, SKU, or barcode
      query += ` AND (p.name LIKE ? OR p.id IN (
        SELECT DISTINCT product_id FROM product_variants 
        WHERE sku LIKE ? OR barcode LIKE ? OR size LIKE ? OR color LIKE ?
      ))`;
      const term = `%${filters.search}%`;
      params.push(term, term, term, term, term);
    }

    query += ' ORDER BY p.id DESC';

    const products = await db.all<Product[]>(query, params);
    if (products.length === 0) return [];

    // Load variants in batch
    const productIds = products.map(p => p.id!);
    const placeholders = productIds.map(() => '?').join(',');
    const variantsQuery = `
      SELECT pv.*, p.name as product_name, pr.name as owner_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN proprietarias pr ON p.owner_id = pr.id
      WHERE pv.product_id IN (${placeholders})
    `;
    const variants = await db.all<ProductVariant[]>(variantsQuery, productIds);

    // Group variants by product_id
    const variantsMap = new Map<number, ProductVariant[]>();
    for (const v of variants) {
      if (!variantsMap.has(v.product_id!)) {
        variantsMap.set(v.product_id!, []);
      }
      variantsMap.get(v.product_id!)!.push(v);
    }

    // Attach variants to products
    for (const p of products) {
      p.variants = variantsMap.get(p.id!) || [];
    }

    return products;
  }

  static async findById(id: number): Promise<Product | null> {
    const db = await getDB();
    const query = `
      SELECT p.*, 
             c.name as category_name, 
             b.name as brand_name, 
             pr.name as owner_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN proprietarias pr ON p.owner_id = pr.id
      WHERE p.id = ?
    `;
    const product = await db.get<Product>(query, [id]);
    if (!product) return null;

    // Load variants
    const variantsQuery = `
      SELECT pv.*, p.name as product_name, pr.name as owner_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN proprietarias pr ON p.owner_id = pr.id
      WHERE pv.product_id = ?
    `;
    product.variants = await db.all<ProductVariant[]>(variantsQuery, [id]);
    return product;
  }

  static async findVariantById(variantId: number): Promise<ProductVariant | null> {
    const db = await getDB();
    const query = `
      SELECT pv.*, p.name as product_name, pr.name as owner_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN proprietarias pr ON p.owner_id = pr.id
      WHERE pv.id = ?
    `;
    const variant = await db.get<ProductVariant>(query, [variantId]);
    return variant || null;
  }

  static async create(
    product: Omit<Product, 'id' | 'variants' | 'created_at'>,
    variants: Omit<ProductVariant, 'id' | 'product_id' | 'created_at'>[],
    userId?: number
  ): Promise<number> {
    const db = await getDB();

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Insert product
      const productResult = await db.run(
        `INSERT INTO products (name, description, category_id, brand_id, owner_id, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          product.name,
          product.description || null,
          product.category_id || null,
          product.brand_id || null,
          product.owner_id || null,
          product.status ?? 1
        ]
      );
      const productId = productResult.lastID!;

      // Insert variants
      for (const variant of variants) {
        const variantResult = await db.run(
          `INSERT INTO product_variants (product_id, sku, barcode, size, color, buy_price, sell_price, stock, status, image_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            productId,
            variant.sku || null,
            variant.barcode || null,
            variant.size || null,
            variant.color || null,
            variant.buy_price,
            variant.sell_price,
            variant.stock,
            variant.status ?? 1,
            variant.image_url || null
          ]
        );
        const variantId = variantResult.lastID!;

        // Record initial inventory movement if stock > 0
        if (variant.stock > 0) {
          await db.run(
            `INSERT INTO inventory_movements (variant_id, type, quantity, notes, user_id)
             VALUES (?, 'input', ?, 'Inventario inicial', ?)`,
            [variantId, variant.stock, userId || null]
          );
        }
      }

      await db.run('COMMIT');
      return productId;
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  static async update(
    productId: number,
    product: Partial<Omit<Product, 'id' | 'variants' | 'created_at'>>,
    variants: (Partial<ProductVariant> & { size?: string | null; color?: string | null; buy_price?: number; sell_price?: number; stock?: number; sku?: string | null; barcode?: string | null; status?: number; image_url?: string | null })[],
    userId?: number
  ): Promise<void> {
    const db = await getDB();

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // 1. Update product main table
      const sets: string[] = [];
      const params: any[] = [];
      if (product.name !== undefined) { sets.push('name = ?'); params.push(product.name); }
      if (product.description !== undefined) { sets.push('description = ?'); params.push(product.description); }
      if (product.category_id !== undefined) { sets.push('category_id = ?'); params.push(product.category_id); }
      if (product.brand_id !== undefined) { sets.push('brand_id = ?'); params.push(product.brand_id); }
      if (product.owner_id !== undefined) { sets.push('owner_id = ?'); params.push(product.owner_id); }
      if (product.status !== undefined) { sets.push('status = ?'); params.push(product.status); }

      if (sets.length > 0) {
        params.push(productId);
        await db.run(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, params);
      }

      // 2. Fetch existing variants to know what to update, add, or delete
      const existingVariants = await db.all<ProductVariant[]>(
        'SELECT * FROM product_variants WHERE product_id = ?',
        [productId]
      );
      const existingIds = existingVariants.map(v => v.id!);
      const incomingIds = variants.map(v => v.id).filter(id => id !== undefined) as number[];

      // 3. Delete (or deactivate) variants not present in incoming list
      const deletedIds = existingIds.filter(id => !incomingIds.includes(id));
      for (const delId of deletedIds) {
        // Option A: Delete variant from DB (this cascades to movements/sale_items unless constrained, but our schema is ON DELETE CASCADE/SET NULL)
        // For audit safety, we can just set status = 0 (inactive), or delete them if they haven't been sold.
        // Let's delete it. If they have sales, it will be blocked or variant_id will be set to NULL (based on FK constraint).
        // To be safe, we delete them:
        await db.run('DELETE FROM product_variants WHERE id = ?', [delId]);
      }

      // 4. Update or Add variants
      for (const variant of variants) {
        if (variant.id) {
          // Existing variant: Check for stock changes to create adjustment movements!
          const existing = existingVariants.find(ev => ev.id === variant.id);
          if (existing) {
            const currentStock = existing.stock;
            const newStock = variant.stock !== undefined ? variant.stock : currentStock;

            // Update variant attributes
            await db.run(
              `UPDATE product_variants 
               SET sku = ?, barcode = ?, size = ?, color = ?, buy_price = ?, sell_price = ?, stock = ?, status = ?, image_url = ?
               WHERE id = ?`,
              [
                variant.sku !== undefined ? variant.sku : existing.sku,
                variant.barcode !== undefined ? variant.barcode : existing.barcode,
                variant.size !== undefined ? variant.size : existing.size,
                variant.color !== undefined ? variant.color : existing.color,
                variant.buy_price !== undefined ? variant.buy_price : existing.buy_price,
                variant.sell_price !== undefined ? variant.sell_price : existing.sell_price,
                newStock,
                variant.status !== undefined ? variant.status : existing.status,
                variant.image_url !== undefined ? variant.image_url : existing.image_url,
                variant.id
              ]
            );

            // If stock changed, create audit movement
            if (newStock !== currentStock) {
              const diff = newStock - currentStock;
              const type = diff > 0 ? 'input' : 'output';
              await db.run(
                `INSERT INTO inventory_movements (variant_id, type, quantity, notes, user_id)
                 VALUES (?, ?, ?, 'Ajuste manual al editar producto', ?)`,
                [variant.id, type, diff, userId || null]
              );
            }
          }
        } else {
          // New variant: Insert
          const variantResult = await db.run(
            `INSERT INTO product_variants (product_id, sku, barcode, size, color, buy_price, sell_price, stock, status, image_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              productId,
              variant.sku || null,
              variant.barcode || null,
              variant.size || null,
              variant.color || null,
              variant.buy_price || 0,
              variant.sell_price || 0,
              variant.stock || 0,
              variant.status ?? 1,
              variant.image_url || null
            ]
          );
          const newVariantId = variantResult.lastID!;

          if (variant.stock && variant.stock > 0) {
            await db.run(
              `INSERT INTO inventory_movements (variant_id, type, quantity, notes, user_id)
               VALUES (?, 'input', ?, 'Inventario inicial de variante nueva', ?)`,
              [newVariantId, variant.stock, userId || null]
            );
          }
        }
      }

      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  static async delete(id: number): Promise<void> {
    const db = await getDB();
    await db.run('DELETE FROM products WHERE id = ?', [id]);
  }
}
