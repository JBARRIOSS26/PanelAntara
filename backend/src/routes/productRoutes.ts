import { Router } from 'express';
import { ProductRepository } from '../repositories/ProductRepository';
import { getDB } from '../database/connection';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/products
router.get('/', authMiddleware, async (req, res) => {
  const { search, category_id, brand_id, owner_id, status } = req.query;
  try {
    const products = await ProductRepository.listAll({
      search: search as string,
      category_id: category_id ? parseInt(category_id as string, 10) : undefined,
      brand_id: brand_id ? parseInt(brand_id as string, 10) : undefined,
      owner_id: owner_id ? parseInt(owner_id as string, 10) : undefined,
      status: status !== undefined ? parseInt(status as string, 10) : undefined
    });
    return res.json(products);
  } catch (error) {
    console.error('Error listing products:', error);
    return res.status(500).json({ error: 'Error al listar productos.' });
  }
});

// GET /api/products/variants/:id (Find specific variant - e.g. for barcode scanning or POS checkout)
router.get('/variants/:id', authMiddleware, async (req, res) => {
  const variantId = parseInt(req.params.id, 10);
  try {
    const variant = await ProductRepository.findVariantById(variantId);
    if (!variant) {
      return res.status(404).json({ error: 'Variante de producto no encontrada.' });
    }
    return res.json(variant);
  } catch (error) {
    return res.status(500).json({ error: 'Error al buscar la variante.' });
  }
});

// GET /api/products/barcode/:barcode (Find variant by barcode scanning)
router.get('/barcode/:barcode', authMiddleware, async (req, res) => {
  const barcode = req.params.barcode;
  try {
    const db = await getDB();
    
    // Check for ID lookup (e.g., 00000081 -> 81)
    let variantId = null;
    if (/^\d{8}$/.test(barcode)) {
      variantId = parseInt(barcode, 10);
    }

    const query = `
      SELECT pv.*, p.name as product_name, pr.name as owner_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN proprietarias pr ON p.owner_id = pr.id
      WHERE pv.barcode = ? OR pv.sku = ? ${variantId ? 'OR pv.id = ?' : ''}
      LIMIT 1
    `;
    const params = variantId ? [barcode, barcode, variantId] : [barcode, barcode];
    const variant = await db.get(query, params);
    
    if (!variant) {
      return res.status(404).json({ error: 'Código de barras o SKU no encontrado.' });
    }
    return res.json(variant);
  } catch (error) {
    console.error('Error finding barcode:', error);
    return res.status(500).json({ error: 'Error al buscar el código de barras.' });
  }
});

// GET /api/products/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const product = await ProductRepository.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }
    return res.json(product);
  } catch (error) {
    return res.status(500).json({ error: 'Error al buscar producto.' });
  }
});

// POST /api/products
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { name, description, category_id, brand_id, owner_id, status, variants } = req.body;
  if (!name || !variants || !Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({ error: 'El nombre del producto y al menos una variante son obligatorios.' });
  }

  try {
    const productId = await ProductRepository.create(
      {
        name,
        description,
        category_id: category_id || null,
        brand_id: brand_id || null,
        owner_id: owner_id || null,
        status: status ?? 1
      },
      variants,
      req.user?.id
    );
    return res.status(201).json({ id: productId, message: 'Producto creado con éxito.' });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return res.status(500).json({ error: error.message || 'Error al crear producto.' });
  }
});

// PUT /api/products/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, description, category_id, brand_id, owner_id, status, variants } = req.body;

  if (!name || !variants || !Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({ error: 'El nombre del producto y al menos una variante son obligatorios.' });
  }

  try {
    await ProductRepository.update(
      id,
      { name, description, category_id, brand_id, owner_id, status },
      variants,
      req.user?.id
    );
    return res.json({ message: 'Producto actualizado con éxito.' });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return res.status(500).json({ error: error.message || 'Error al actualizar producto.' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await ProductRepository.delete(id);
    return res.json({ message: 'Producto eliminado con éxito.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar producto.' });
  }
});

export default router;
