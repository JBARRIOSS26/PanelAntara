import { Router } from 'express';
import { SaleRepository } from '../repositories/SaleRepository';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/sales
router.get('/', authMiddleware, async (req, res) => {
  const { client_id, user_id, payment_method, status, startDate, endDate, search } = req.query;
  try {
    const sales = await SaleRepository.listAll({
      client_id: client_id ? parseInt(client_id as string, 10) : undefined,
      user_id: user_id ? parseInt(user_id as string, 10) : undefined,
      payment_method: payment_method as string,
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
      search: search as string
    });
    return res.json(sales);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener listado de ventas.' });
  }
});

// GET /api/sales/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const sale = await SaleRepository.findById(id);
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada.' });
    return res.json(sale);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener detalle de venta.' });
  }
});

// POST /api/sales
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { client_id, total, subtotal, discount, tax, payment_method, cash_received, card_received, transfer_received, notes, items } = req.body;

  if (!payment_method || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Método de pago e ítems en el carrito son requeridos.' });
  }

  try {
    const saleId = await SaleRepository.create(
      {
        client_id: client_id ? parseInt(client_id, 10) : null,
        total: parseFloat(total),
        subtotal: parseFloat(subtotal),
        discount: parseFloat(discount || 0),
        tax: parseFloat(tax || 0),
        payment_method,
        cash_received: parseFloat(cash_received || 0),
        card_received: parseFloat(card_received || 0),
        transfer_received: parseFloat(transfer_received || 0),
        notes
      },
      items.map((item: any) => ({
        variant_id: parseInt(item.variant_id, 10),
        quantity: parseInt(item.quantity, 10),
        unit_price: parseFloat(item.unit_price),
        discount: parseFloat(item.discount || 0),
        total: parseFloat(item.total)
      })),
      req.user!.id
    );

    return res.status(201).json({ id: saleId, message: 'Venta procesada con éxito.' });
  } catch (error: any) {
    console.error('Error recording sale:', error);
    return res.status(400).json({ error: error.message || 'Error al procesar la venta.' });
  }
});

// POST /api/sales/:id/cancel
router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await SaleRepository.cancel(id, req.user!.id);
    return res.json({ message: 'Venta cancelada exitosamente y stock devuelto al inventario.' });
  } catch (error: any) {
    console.error('Error cancelling sale:', error);
    return res.status(400).json({ error: error.message || 'Error al cancelar la venta.' });
  }
});

export default router;
