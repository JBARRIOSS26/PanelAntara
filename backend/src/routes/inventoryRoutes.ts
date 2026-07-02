import { Router } from 'express';
import { InventoryRepository } from '../repositories/InventoryRepository';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/inventory/movements
router.get('/movements', authMiddleware, async (req, res) => {
  const { variant_id, type, startDate, endDate, search } = req.query;
  try {
    const movements = await InventoryRepository.listMovements({
      variant_id: variant_id ? parseInt(variant_id as string, 10) : undefined,
      type: type as string,
      startDate: startDate as string,
      endDate: endDate as string,
      search: search as string
    });
    return res.json(movements);
  } catch (error) {
    console.error('Error fetching movements:', error);
    return res.status(500).json({ error: 'Error al obtener movimientos de inventario.' });
  }
});

// POST /api/inventory/movements
router.post('/movements', authMiddleware, async (req: AuthRequest, res) => {
  const { variant_id, type, quantity, notes } = req.body;
  if (!variant_id || !type || quantity === undefined) {
    return res.status(400).json({ error: 'Variante, tipo y cantidad son obligatorios.' });
  }

  if (quantity <= 0 && type !== 'adjustment') {
    return res.status(400).json({ error: 'La cantidad debe ser mayor a 0.' });
  }

  try {
    const movementId = await InventoryRepository.addMovement({
      variant_id: parseInt(variant_id, 10),
      type,
      quantity: parseInt(quantity, 10),
      notes,
      user_id: req.user?.id || null
    });
    return res.status(201).json({ id: movementId, message: 'Movimiento registrado con éxito.' });
  } catch (error: any) {
    console.error('Error adding inventory movement:', error);
    return res.status(500).json({ error: error.message || 'Error al registrar movimiento.' });
  }
});

export default router;
