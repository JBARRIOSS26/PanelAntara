import { Router } from 'express';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();

// GET /api/settings
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const settings = await SettingsRepository.getAll();
    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener configuraciones.' });
  }
});

// POST /api/settings
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const newSettings = req.body; // Expects key-value record
    await SettingsRepository.setMany(newSettings);
    return res.json({ message: 'Configuraciones guardadas exitosamente.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al guardar configuraciones.' });
  }
});

export default router;
