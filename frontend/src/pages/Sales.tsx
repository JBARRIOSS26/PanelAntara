import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Sale, Customer, User } from '../types';
import { Search, Calendar, Filter, Eye, X, Receipt, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Sales: React.FC = () => {
  const { settings } = useApp();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  
  // Filters state
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState('');
  const [userId, setUserId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected Sale details modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [cancellingSale, setCancellingSale] = useState(false);

  const loadFilterData = async () => {
    try {
      const [custList, empList] = await Promise.all([
        api.customers.list(),
        api.auth.getUsers()
      ]);
      setCustomers(custList);
      setEmployees(empList);
    } catch (err) {
      console.error('Filter loaders failed:', err);
    }
  };

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await api.sales.list({
        client_id: clientId ? parseInt(clientId, 10) : undefined,
        user_id: userId ? parseInt(userId, 10) : undefined,
        payment_method: paymentMethod || undefined,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined
      });
      setSales(data);
    } catch {
      setError('Error al cargar historial de ventas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, userId, paymentMethod, status, startDate, endDate]);

  useEffect(() => {
    loadFilterData();
  }, []);

  const handleViewDetails = async (id: number) => {
    try {
      const sale = await api.sales.get(id);
      setSelectedSale(sale);
    } catch {
      alert('Error al cargar los detalles de la venta.');
    }
  };

  const handleCancelSale = async (id: number) => {
    if (window.confirm(`¿Está seguro de que desea cancelar la Venta #${id}?\nEsta acción revertirá automáticamente el stock de cada prenda vendida al inventario y no se puede deshacer.`)) {
      setCancellingSale(true);
      try {
        await api.sales.cancel(id);
        alert(`Venta #${id} cancelada con éxito. Stock devuelto.`);
        // Reload sale details in modal and update table
        const updatedSale = await api.sales.get(id);
        setSelectedSale(updatedSale);
        loadSales();
      } catch (err: any) {
        alert(err.message || 'Error al cancelar la venta.');
      } finally {
        setCancellingSale(false);
      }
    }
  };

  const handlePrint = () => {
    document.documentElement.classList.add('print-ticket');
    window.print();
    document.documentElement.classList.remove('print-ticket');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="screen-only" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
        {/* Filters Card */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '38px' }}
            placeholder="Buscar por ID venta o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Client filter */}
        <select
          className="form-control"
          style={{ width: '160px' }}
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">Cualquier cliente</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Employee Filter */}
        <select
          className="form-control"
          style={{ width: '160px' }}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        >
          <option value="">Atendido por...</option>
          {employees.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
        </select>

        {/* Payment Method */}
        <select
          className="form-control"
          style={{ width: '140px' }}
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="">Metodo pago</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="transfer">Transferencia</option>
          <option value="mixed">Mixto</option>
        </select>

        {/* Status */}
        <select
          className="form-control"
          style={{ width: '130px' }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Cualquier estado</option>
          <option value="completed">Completado</option>
          <option value="cancelled">Cancelado</option>
        </select>

        {/* Dates */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="date"
            className="form-control"
            style={{ width: '130px', padding: '0.375rem 0.5rem' }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span>a</span>
          <input
            type="date"
            className="form-control"
            style={{ width: '130px', padding: '0.375rem 0.5rem' }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button className="btn btn-secondary" onClick={loadSales}>
          <Filter size={16} />
          <span>Filtrar</span>
        </button>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* Sales List Table */}
      {loading ? (
        <p>Cargando listado de ventas...</p>
      ) : sales.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          <p>No se encontraron registros de ventas.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID Venta</th>
                <th>Fecha y Hora</th>
                <th>Cliente</th>
                <th>Atendido por</th>
                <th>Método de Pago</th>
                <th>Total</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td style={{ fontWeight: 700 }}>#{sale.id}</td>
                  <td>
                    {new Date(sale.created_at).toLocaleString('es-MX', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td style={{ fontWeight: 600 }}>{sale.client_name || 'Público General'}</td>
                  <td>{sale.user_username}</td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {sale.payment_method === 'cash' ? 'Efectivo' : sale.payment_method === 'card' ? 'Tarjeta' : sale.payment_method === 'transfer' ? 'Transferencia' : 'Mixto'}
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(sale.total)}</td>
                  <td>
                    <span className={`badge ${sale.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>
                      {sale.status === 'completed' ? 'Completado' : 'Cancelado'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.375rem 0.50rem' }}
                      title="Ver Detalles / Reimprimir"
                      onClick={() => handleViewDetails(sale.id!)}
                    >
                      <Eye size={14} />
                      <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>Detalle</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SALE DETAILS & TICKET MODAL */}
      {selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Desglose de Venta #{selectedSale.id}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.25rem', border: 'none', background: 'none' }} onClick={() => setSelectedSale(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Header Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', backgroundColor: 'var(--bg-hover)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div><strong>Fecha:</strong> {new Date(selectedSale.created_at).toLocaleString('es-MX')}</div>
                <div><strong>Usuario:</strong> {selectedSale.user_username}</div>
                <div><strong>Cliente:</strong> {selectedSale.client_name || 'Público General'}</div>
                <div><strong>Método Pago:</strong> <span style={{ textTransform: 'uppercase' }}>{selectedSale.payment_method}</span></div>
                {selectedSale.client_phone && <div><strong>Teléfono:</strong> {selectedSale.client_phone}</div>}
                {selectedSale.client_email && <div><strong>Correo:</strong> {selectedSale.client_email}</div>}
              </div>

              {/* Items Table */}
              <h4 style={{ fontSize: '0.95rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>Artículos Vendidos</h4>
              <div className="table-container">
                <table style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Prenda</th>
                      <th>SKU</th>
                      <th>Talla/Color</th>
                      <th>Cant</th>
                      <th>Precio Unit.</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSale.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                        <td style={{ fontFamily: 'monospace' }}>{item.sku || 'N/A'}</td>
                        <td>{item.size || 'Única'} / {item.color || 'N/A'}</td>
                        <td>{item.quantity} u.</td>
                        <td>{formatCurrency(item.unit_price)}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignSelf: 'flex-end', width: '220px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                    <span>Descuento:</span>
                    <span>-{formatCurrency(selectedSale.discount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>IVA:</span>
                  <span>{formatCurrency(selectedSale.tax)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem', color: 'var(--primary)' }}>
                  <span>Total:</span>
                  <span>{formatCurrency(selectedSale.total)}</span>
                </div>
              </div>

              {/* Audit / Cancellation Alert */}
              {selectedSale.status === 'cancelled' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  <strong>VENTA CANCELADA:</strong> El stock de estas prendas se devolvió al inventario.
                </div>
              ) : (
                selectedSale.notes && (
                  <div style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Nota: {selectedSale.notes}
                  </div>
                )
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div>
                {selectedSale.status !== 'cancelled' && (
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                    onClick={() => handleCancelSale(selectedSale.id!)}
                    disabled={cancellingSale}
                  >
                    <Trash2 size={14} />
                    <span>Cancelar Venta</span>
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedSale(null)}>
                  Cerrar
                </button>
                <button type="button" className="btn btn-primary" onClick={handlePrint}>
                  <Receipt size={16} />
                  <span>Reimprimir Ticket</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div> {/* Close screen-only */}

      {/* HIDDEN PRINT COMPONENT FOR RE-PRINTING TICKETS */}
      {selectedSale && (
        <div className="print-only">
          <div className="print-area ticket-print" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{settings.store_name || 'ANTARA'}</h3>
              {settings.store_address && <p style={{ margin: 0 }}>{settings.store_address}</p>}
              {settings.store_phone && <p style={{ margin: 0 }}>Tel: {settings.store_phone}</p>}
              <p style={{ margin: 0 }}>Venta #{selectedSale.id} (REIMPRESIÓN)</p>
              <p style={{ margin: 0 }}>
                Fecha: {new Date(selectedSale.created_at).toLocaleString('es-MX')}
              </p>
              <p style={{ margin: 0 }}>Atendido por: {selectedSale.user_username}</p>
              <p style={{ margin: 0 }}>Cliente: {selectedSale.client_name || 'Público General'}</p>
            </div>
            
            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
            
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px dashed #000' }}>
                  <th style={{ textAlign: 'left', padding: '2px 0' }}>Desc</th>
                  <th style={{ textAlign: 'center', padding: '2px 0' }}>Cant</th>
                  <th style={{ textAlign: 'right', padding: '2px 0' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedSale.items || []).map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                      {item.product_name}
                      <div style={{ fontSize: '10px', color: '#555' }}>
                        Talla: {item.size || 'Única'} | Color: {item.color || 'N/A'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '4px 0' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '40%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              {selectedSale.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Desc:</span>
                  <span>-{formatCurrency(selectedSale.discount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>IVA:</span>
                <span>{formatCurrency(selectedSale.tax)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '13px' }}>
                <span>Total:</span>
                <span>{formatCurrency(selectedSale.total)}</span>
              </div>
            </div>
            
            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
            
            <div style={{ textAlign: 'center', fontSize: '10px' }}>
              <p style={{ margin: 0 }}>Método de Pago: {selectedSale.payment_method.toUpperCase()}</p>
              <p style={{ margin: 0 }}>Estado: {selectedSale.status.toUpperCase()}</p>
              <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
              <p style={{ fontStyle: 'italic', fontWeight: 600 }}>{settings.ticket_footer || '¡Gracias por su compra en ANTARA!'}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default Sales;
