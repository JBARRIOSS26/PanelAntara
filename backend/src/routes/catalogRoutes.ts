import { Router } from 'express';
import { getDB } from '../database/connection';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// ==========================================
// CATEGORIES ENDPOINTS
// ==========================================

// GET /api/catalogs/categories
router.get('/categories', authMiddleware, async (_req, res) => {
  try {
    const db = await getDB();
    const categories = await db.all('SELECT * FROM categories ORDER BY name ASC');
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener categorías.' });
  }
});

// POST /api/catalogs/categories
router.post('/categories', authMiddleware, async (req, res) => {
  const { name, status } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es requerido.' });
  try {
    const db = await getDB();
    const result = await db.run(
      'INSERT INTO categories (name, status) VALUES (?, ?)',
      [name, status ?? 1]
    );
    return res.status(201).json({ id: result.lastID, name, status: status ?? 1 });
  } catch (error: any) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'La categoría ya existe.' });
    }
    return res.status(500).json({ error: 'Error al crear categoría.' });
  }
});

// PUT /api/catalogs/categories/:id
router.put('/categories/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, status } = req.body;
  try {
    const db = await getDB();
    const existing = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Categoría no encontrada.' });

    await db.run(
      'UPDATE categories SET name = ?, status = ? WHERE id = ?',
      [name !== undefined ? name : existing.name, status !== undefined ? status : existing.status, id]
    );
    return res.json({ message: 'Categoría actualizada con éxito.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar categoría.' });
  }
});

// DELETE /api/catalogs/categories/:id
router.delete('/categories/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const db = await getDB();
    // Check if category is used in products
    const inUse = await db.get('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]);
    if (inUse && (inUse as any).count > 0) {
      return res.status(400).json({ error: 'No se puede eliminar la categoría porque está asociada a productos.' });
    }
    await db.run('DELETE FROM categories WHERE id = ?', [id]);
    return res.json({ message: 'Categoría eliminada con éxito.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar categoría.' });
  }
});

// ==========================================
// BRANDS ENDPOINTS
// ==========================================

// GET /api/catalogs/brands
router.get('/brands', authMiddleware, async (_req, res) => {
  try {
    const db = await getDB();
    const brands = await db.all('SELECT * FROM brands ORDER BY name ASC');
    return res.json(brands);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener marcas.' });
  }
});

// POST /api/catalogs/brands
router.post('/brands', authMiddleware, async (req, res) => {
  const { name, status } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es requerido.' });
  try {
    const db = await getDB();
    const result = await db.run(
      'INSERT INTO brands (name, status) VALUES (?, ?)',
      [name, status ?? 1]
    );
    return res.status(201).json({ id: result.lastID, name, status: status ?? 1 });
  } catch (error: any) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'La marca ya existe.' });
    }
    return res.status(500).json({ error: 'Error al crear marca.' });
  }
});

// PUT /api/catalogs/brands/:id
router.put('/brands/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, status } = req.body;
  try {
    const db = await getDB();
    const existing = await db.get('SELECT * FROM brands WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Marca no encontrada.' });

    await db.run(
      'UPDATE brands SET name = ?, status = ? WHERE id = ?',
      [name !== undefined ? name : existing.name, status !== undefined ? status : existing.status, id]
    );
    return res.json({ message: 'Marca actualizada con éxito.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar marca.' });
  }
});

// DELETE /api/catalogs/brands/:id
router.delete('/brands/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const db = await getDB();
    // Check if brand is used in products
    const inUse = await db.get('SELECT COUNT(*) as count FROM products WHERE brand_id = ?', [id]);
    if (inUse && (inUse as any).count > 0) {
      return res.status(400).json({ error: 'No se puede eliminar la marca porque está asociada a productos.' });
    }
    await db.run('DELETE FROM brands WHERE id = ?', [id]);
    return res.json({ message: 'Marca eliminada con éxito.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar marca.' });
  }
});

// ==========================================
// OWNERS (PROPIETARIAS) ENDPOINTS
// ==========================================

// GET /api/catalogs/owners
router.get('/owners', authMiddleware, async (_req, res) => {
  try {
    const db = await getDB();
    const owners = await db.all('SELECT * FROM proprietarias ORDER BY name ASC');
    return res.json(owners);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener propietarias.' });
  }
});

// POST /api/catalogs/owners
router.post('/owners', authMiddleware, async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'El nombre y código son requeridos.' });
  try {
    const db = await getDB();
    const result = await db.run(
      'INSERT INTO proprietarias (name, code) VALUES (?, ?)',
      [name, code.toUpperCase()]
    );
    return res.status(201).json({ id: result.lastID, name, code: code.toUpperCase() });
  } catch (error: any) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'El código de propietaria ya existe.' });
    }
    return res.status(500).json({ error: 'Error al crear propietaria.' });
  }
});

// PUT /api/catalogs/owners/:id
router.put('/owners/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, code } = req.body;
  try {
    const db = await getDB();
    const existing = await db.get('SELECT * FROM proprietarias WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Propietaria no encontrada.' });

    await db.run(
      'UPDATE proprietarias SET name = ?, code = ? WHERE id = ?',
      [
        name !== undefined ? name : existing.name,
        code !== undefined ? code.toUpperCase() : existing.code,
        id
      ]
    );
    return res.json({ message: 'Propietaria actualizada con éxito.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar propietaria.' });
  }
});

// DELETE /api/catalogs/owners/:id
router.delete('/owners/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const db = await getDB();
    // Check if owner is used in products
    const inUse = await db.get('SELECT COUNT(*) as count FROM products WHERE owner_id = ?', [id]);
    if (inUse && (inUse as any).count > 0) {
      return res.status(400).json({ error: 'No se puede eliminar la propietaria porque está asociada a productos.' });
    }
    await db.run('DELETE FROM proprietarias WHERE id = ?', [id]);
    return res.json({ message: 'Propietaria eliminada con éxito.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar propietaria.' });
  }
});

export default router;
