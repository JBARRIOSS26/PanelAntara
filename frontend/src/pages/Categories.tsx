import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Category } from '../types';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<number>(1);
  const [modalError, setModalError] = useState('');

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await api.catalogs.listCategories();
      setCategories(data);
    } catch {
      setError('Error al cargar categorías.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenModal = (cat?: Category) => {
    setModalError('');
    if (cat) {
      setSelectedCategory(cat);
      setName(cat.name);
      setStatus(cat.status);
    } else {
      setSelectedCategory(null);
      setName('');
      setStatus(1);
    }
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setSelectedCategory(null);
    setName('');
    setStatus(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError('El nombre es requerido.');
      return;
    }

    try {
      if (selectedCategory) {
        // Edit
        await api.catalogs.updateCategory(selectedCategory.id, { name, status });
      } else {
        // Create
        await api.catalogs.createCategory({ name, status });
      }
      handleCloseModal();
      loadCategories();
    } catch (err: any) {
      setModalError(err.message || 'Ocurrió un error al guardar la categoría.');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`¿Está seguro de que desea eliminar la categoría "${name}"?`)) {
      try {
        await api.catalogs.deleteCategory(id);
        loadCategories();
      } catch (err: any) {
        alert(err.message || 'Error al eliminar categoría.');
      }
    }
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '38px' }}
            placeholder="Buscar categorías..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          <span>Añadir Categoría</span>
        </button>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Cargando categorías...</p>
      ) : filteredCategories.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          <p>No se encontraron categorías.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.id}</td>
                  <td style={{ fontWeight: 600 }}>{cat.name}</td>
                  <td>
                    <span className={`badge ${cat.status === 1 ? 'badge-success' : 'badge-danger'}`}>
                      {cat.status === 1 ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.375rem 0.50rem' }}
                        onClick={() => handleOpenModal(cat)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '0.375rem 0.50rem' }}
                        onClick={() => handleDelete(cat.id, cat.name)}
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

      {/* Modal CRUD Category */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{selectedCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
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
                  <label className="form-label">Nombre de Categoría</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Vestidos, Calzado, Jeans..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select 
                    className="form-control"
                    value={status}
                    onChange={(e) => setStatus(parseInt(e.target.value, 10))}
                  >
                    <option value={1}>Activa</option>
                    <option value={0}>Inactiva</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Categories;
