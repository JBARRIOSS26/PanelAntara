import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { User } from '../types';
import { Plus, Edit2, Trash2, Shield, X, Key, UserPlus } from 'lucide-react';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal CRUD states
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [modalError, setModalError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.auth.getUsers();
      setUsers(data);
    } catch (err) {
      setError('Error al cargar la lista de personal de la tienda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const availablePermissions = [
    { key: 'pos', label: 'Punto de Venta (Ventas)' },
    { key: 'products', label: 'Catálogo de Productos' },
    { key: 'inventory', label: 'Control de Inventario' },
    { key: 'customers', label: 'Directorio de Clientes' },
    { key: 'reports', label: 'Reportes y Utilidades' },
    { key: 'labels', label: 'Impresión de Etiquetas' }
  ];

  const handleOpenModal = (usr?: User) => {
    setModalError('');
    if (usr) {
      setSelectedUser(usr);
      setUsername(usr.username);
      setPassword(''); // Password blank on edit unless they want to override
      setRole(usr.role);
      setPermissions(usr.permissions);
    } else {
      setSelectedUser(null);
      setUsername('');
      setPassword('');
      setRole('employee');
      setPermissions(['pos']); // default to pos access
    }
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setSelectedUser(null);
  };

  const handlePermissionToggle = (permKey: string) => {
    if (permissions.includes(permKey)) {
      setPermissions(permissions.filter(p => p !== permKey));
    } else {
      setPermissions([...permissions, permKey]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setModalError('El nombre de usuario es obligatorio.');
      return;
    }

    if (!selectedUser && !password) {
      setModalError('La contraseña es obligatoria para nuevos usuarios.');
      return;
    }

    const payload = {
      username,
      role,
      permissions: role === 'admin' ? ['all'] : permissions,
      ...(password ? { password } : {}) // Only send password if filled
    };

    try {
      if (selectedUser) {
        await api.auth.updateUser(selectedUser.id, payload);
      } else {
        await api.auth.createUser(payload);
      }
      handleCloseModal();
      loadUsers();
    } catch (err: any) {
      setModalError(err.message || 'Error al guardar el usuario.');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`¿Está seguro de que desea eliminar el usuario de "${name}"?`)) {
      try {
        await api.auth.deleteUser(id);
        loadUsers();
      } catch (err: any) {
        alert(err.message || 'Error al eliminar usuario.');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <UserPlus size={18} />
          <span>Añadir Colaborador</span>
        </button>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Cargando personal...</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Permisos Autorizados</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((usr) => (
                <tr key={usr.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{usr.username}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: #{usr.id}</div>
                  </td>
                  <td>
                    <span className={`badge ${usr.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>
                      {usr.role === 'admin' ? 'Administrador' : 'Empleado'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {usr.role === 'admin' ? (
                        <span className="badge badge-success">Acceso Completo (All)</span>
                      ) : usr.permissions.length === 0 ? (
                        <span className="badge badge-danger">Sin permisos asignados</span>
                      ) : (
                        usr.permissions.map((perm) => (
                          <span key={perm} className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                            {availablePermissions.find(p => p.key === perm)?.label || perm}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.375rem 0.50rem' }}
                        title="Editar"
                        onClick={() => handleOpenModal(usr)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '0.375rem 0.50rem' }}
                        title="Eliminar"
                        onClick={() => handleDelete(usr.id, usr.username)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal CRUD User */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{selectedUser ? 'Editar Colaborador' : 'Registrar Colaborador'}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.25rem', border: 'none', background: 'none' }} onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {modalError && (
                  <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    {modalError}
                  </div>
                )}
                
                <div className="form-group">
                  <label className="form-label">Nombre de Usuario *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. maria.pos"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {selectedUser ? 'Cambiar Contraseña (dejar vacío para mantener actual)' : 'Contraseña *'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Key size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="password"
                      className="form-control"
                      style={{ paddingLeft: '38px' }}
                      placeholder={selectedUser ? 'Nueva contraseña (opcional)' : 'Mínimo 6 caracteres'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={!selectedUser}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Rol Principal *</label>
                  <select 
                    className="form-control"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                  >
                    <option value="employee">Empleado (Acceso limitado)</option>
                    <option value="admin">Administrador (Control total)</option>
                  </select>
                </div>

                {role === 'employee' && (
                  <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Shield size={16} style={{ color: 'var(--primary)' }} />
                      <span>Módulos Autorizados</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                      {availablePermissions.map((perm) => {
                        const isChecked = permissions.includes(perm.key);
                        return (
                          <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handlePermissionToggle(perm.key)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span>{perm.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedUser ? 'Guardar Cambios' : 'Registrar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Users;
