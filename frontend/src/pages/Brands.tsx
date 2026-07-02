import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Brand } from '../types';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';

export const Brands: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<number>(1);
  const [modalError, setModalError] = useState('');

  const loadBrands = async () => {
    setLoading(true);
    try {
      const data = await api.catalogs.listBrands();
      setBrands(data);
    } catch (err) {
      setError('Error al cargar marcas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleOpenModal = (br?: Brand) => {
    setModalError('');
    if (br) {
      setSelectedBrand(br);
      setName(br.name);
      setStatus(br.status);
    } else {
      setSelectedBrand(null);
      setName('');
      setStatus(1);
    }
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setSelectedBrand(null);
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
      if (selectedBrand) {
        // Edit
        await api.catalogs.updateBrand(selectedBrand.id, { name, status });
      } else {
        // Create
        await api.catalogs.createBrand({ name, status });
      }
      handleCloseModal();
      loadBrands();
    } catch (err: any) {
      setModalError(err.message || 'Ocurrió un error al guardar la marca.');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`¿Está seguro de que desea eliminar la marca "${name}"?`)) {
      try {
        await api.catalogs.deleteBrand(id);
        loadBrands();
      } catch (err: any) {
        alert(err.message || 'Error al eliminar la marca.');
      }
    }
  };

  const filteredBrands = brands.filter(br => 
    br.name.toLowerCase().includes(search.toLowerCase())
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
            placeholder="Buscar marcas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          <span>Añadir Marca</span>
        </button>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Cargando marcas...</p>
      ) : filteredBrands.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          <p>No se encontraron marcas.</p>
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
              {filteredBrands.map((br) => (
                <tr key={br.id}>
                  <td>{br.id}</td>
                  <td style={{ fontWeight: 600 }}>{br.name}</td>
                  <td>
                    <span className={`badge ${br.status === 1 ? 'badge-success' : 'badge-danger'}`}>
                      {br.status === 1 ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.375rem 0.50rem' }}
                        onClick={() => handleOpenModal(br)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '0.375rem 0.50rem' }}
                        onClick={() => handleDelete(br.id, br.name)}
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

      {/* Modal CRUD Brand */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{selectedBrand ? 'Editar Marca' : 'Nueva Marca'}</h3>
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
                  <label className="form-label">Nombre de Marca</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Zara, Levi's, Nike..."
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
                  {selectedBrand ? 'Guardar Cambios' : 'Crear Marca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Brands;
