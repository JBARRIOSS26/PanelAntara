import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { authMiddleware, adminOnly, AuthRequest, JWT_SECRET } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });
  }

  try {
    const user = await UserRepository.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error: any) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET /api/auth/me (Get current session)
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autorizado' });
  try {
    const user = await UserRepository.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

// Admin endpoints for User management
// GET /api/auth/users
router.get('/users', authMiddleware, adminOnly, async (_req, res) => {
  try {
    const users = await UserRepository.listAll();
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: 'Error al listar usuarios.' });
  }
});

// POST /api/auth/users
router.post('/users', authMiddleware, adminOnly, async (req, res) => {
  const { username, password, role, permissions } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Usuario, contraseña y rol son requeridos.' });
  }

  try {
    const existing = await UserRepository.findByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'El nombre de usuario ya está registrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const userId = await UserRepository.create({
      username,
      password_hash,
      role,
      permissions: permissions || []
    });

    return res.status(201).json({ id: userId, username, role, permissions: permissions || [] });
  } catch (error) {
    return res.status(500).json({ error: 'Error al crear usuario.' });
  }
});

// PUT /api/auth/users/:id
router.put('/users/:id', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id, 10);
  const { username, password, role, permissions } = req.body;

  try {
    const user = await UserRepository.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const updates: any = {};
    if (username !== undefined) updates.username = username;
    if (role !== undefined) updates.role = role;
    if (permissions !== undefined) updates.permissions = permissions;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(password, salt);
    }

    await UserRepository.update(id, updates);
    return res.json({ message: 'Usuario actualizado exitosamente.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar usuario.' });
  }
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const user = await UserRepository.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Prevent deleting own user
    if (req.user && req.user.id === id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario.' });
    }

    await UserRepository.delete(id);
    return res.json({ message: 'Usuario eliminado exitosamente.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar usuario.' });
  }
});

export default router;
