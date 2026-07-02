import { Router } from 'express';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/customers
router.get('/', authMiddleware, async (req, res) => {
  const { search } = req.query;
  try {
    const customers = await CustomerRepository.listAll(search as string);
    return res.json(customers);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener clientes.' });
  }
});

// GET /api/customers/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const customer = await CustomerRepository.findById(id);
    if (!customer) return res.status(404).json({ error: 'Cliente no encontrado.' });
    return res.json(customer);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener cliente.' });
  }
});

// GET /api/customers/:id/history
router.get('/:id/history', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const history = await CustomerRepository.getPurchasesHistory(id);
    return res.json(history);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener historial de compras.' });
  }
});

// POST /api/customers
router.post('/', authMiddleware, async (req, res) => {
  const { name, phone, email, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio.' });
  try {
    const id = await CustomerRepository.create({ name, phone, email, notes });
    return res.status(201).json({ id, name, phone, email, notes });
  } catch (error) {
    return res.status(500).json({ error: 'Error al crear cliente.' });
  }
});

// PUT /api/customers/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, phone, email, notes } = req.body;
  try {
    await CustomerRepository.update(id, { name, phone, email, notes });
    return res.json({ message: 'Cliente actualizado con éxito.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar cliente.' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await CustomerRepository.delete(id);
    return res.json({ message: 'Cliente eliminado con éxito.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar cliente.' });
  }
});

export default router;
