import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Customer, Sale } from '../types';
import { Plus, Edit2, Trash2, Search, X, Calendar, Eye } from 'lucide-react';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // History panel
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historySales, setHistorySales] = useState<Sale[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal CRUD states
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [modalError, setModalError] = useState('');

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.customers.list(search || undefined);
      setCustomers(data);
    } catch {
      setError('Error al cargar clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleOpenModal = (cust?: Customer) => {
    setModalError('');
    if (cust) {
      setSelectedCustomer(cust);
      setName(cust.name);
      setPhone(cust.phone || '');
      setEmail(cust.email || '');
      setNotes(cust.notes || '');
    } else {
      setSelectedCustomer(null);
      setName('');
      setPhone('');
      setEmail('');
      setNotes('');
    }
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setSelectedCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError('El nombre es obligatorio.');
      return;
    }

    try {
      if (selectedCustomer) {
        await api.customers.update(selectedCustomer.id, { name, phone, email, notes });
      } else {
        await api.customers.create({ name, phone, email, notes });
      }
      handleCloseModal();
      loadCustomers();
    } catch (err: any) {
      setModalError(err.message || 'Error al guardar cliente.');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`¿Está seguro de que desea eliminar al cliente "${name}"?`)) {
      try {
        await api.customers.delete(id);
        if (historyCustomer?.id === id) {
          setHistoryCustomer(null);
        }
        loadCustomers();
      } catch (err: any) {
        alert(err.message || 'Error al eliminar cliente.');
      }
    }
  };

  const handleViewHistory = async (cust: Customer) => {
    setHistoryCustomer(cust);
    setLoadingHistory(true);
    try {
      const history = await api.customers.getHistory(cust.id);
      setHistorySales(history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: historyCustomer ? '1.2fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
      
      {/* List Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder="Buscar clientes por nombre, teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} />
            <span>Registrar Cliente</span>
          </button>
        </div>

        {error && (
          <div className="card" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        {loading ? (
          <p>Cargando directorio de clientes...</p>
        ) : customers.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
            <p>No se encontraron clientes.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Contacto</th>
                  <th>Notas</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => (
                  <tr key={cust.id} style={{ backgroundColor: historyCustomer?.id === cust.id ? 'var(--primary-light)' : 'transparent' }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{cust.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: #{cust.id}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{cust.phone || 'Sin teléfono'}</div>
                      <div style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>{cust.email || 'Sin correo'}</div>
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {cust.notes || '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.375rem 0.50rem' }}
                          title="Ver Historial"
                          onClick={() => handleViewHistory(cust)}
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.375rem 0.50rem' }}
                          title="Editar"
                          onClick={() => handleOpenModal(cust)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.375rem 0.50rem' }}
                          title="Eliminar"
                          onClick={() => handleDelete(cust.id, cust.name)}
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
      </div>

      {/* History Side Panel */}
      {historyCustomer && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'scaleUp 0.15s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Historial de Compras</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{historyCustomer.name}</p>
            </div>
            <button className="btn btn-secondary" style={{ padding: '0.25rem', border: 'none', background: 'none' }} onClick={() => setHistoryCustomer(null)}>
              <X size={20} />
            </button>
          </div>

          {loadingHistory ? (
            <p>Cargando historial...</p>
          ) : historySales.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
              Este cliente aún no ha realizado compras.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
              {historySales.map((sale) => (
                <div key={sale.id} style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Venta #{sale.id}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={12} />
                      {new Date(sale.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Pago: {sale.payment_method === 'cash' ? 'Efectivo' : sale.payment_method === 'card' ? 'Tarjeta' : sale.payment_method === 'transfer' ? 'Transferencia' : 'Mixto'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                    <span className={`badge ${sale.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>
                      {sale.status === 'completed' ? 'Completado' : 'Cancelado'}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatCurrency(sale.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal CRUD Customer */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{selectedCustomer ? 'Editar Cliente' : 'Registrar Cliente'}</h3>
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
                  <label className="form-label">Nombre Completo *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Juan Pérez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. 5512345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Ej. juan.perez@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notas o Comentarios</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Ej. Talla de pantalón habitual 32, prefiere colores oscuros..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedCustomer ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Customers;
