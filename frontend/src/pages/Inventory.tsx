import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { InventoryMovement, Product } from '../types';
import { Plus, Search, Filter, ArrowUpRight, ArrowDownRight, RefreshCw, X, Calendar } from 'lucide-react';

export const Inventory: React.FC = () => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [movementType, setMovementType] = useState<'input' | 'output' | 'adjustment'>('input');
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const data = await api.inventory.listMovements({
        type: typeFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined
      });
      setMovements(data);
    } catch (err) {
      setError('Error al cargar historial de movimientos.');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await api.products.list();
      setProducts(data.filter(p => p.status === 1));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMovements();
    loadProducts();
  }, [typeFilter, startDate, endDate]);

  const handleOpenModal = () => {
    setModalError('');
    setSelectedProductId('');
    setSelectedVariantId('');
    setMovementType('input');
    setQuantity(0);
    setNotes('');
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
  };

  const handleProductChange = (prodIdStr: string) => {
    setSelectedProductId(prodIdStr);
    setSelectedVariantId('');
  };

  const getSelectedProductVariants = () => {
    if (!selectedProductId) return [];
    const prod = products.find(p => p.id === parseInt(selectedProductId, 10));
    return prod ? prod.variants || [] : [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!selectedVariantId) {
      setModalError('Debe seleccionar una variante de producto.');
      return;
    }

    if (quantity === 0) {
      setModalError('La cantidad no puede ser cero.');
      return;
    }

    if (movementType !== 'adjustment' && quantity < 0) {
      setModalError('Para entradas o salidas, la cantidad debe ser positiva.');
      return;
    }

    setSaving(true);
    try {
      await api.inventory.addMovement({
        variant_id: parseInt(selectedVariantId, 10),
        type: movementType,
        quantity: movementType === 'output' ? Math.abs(quantity) : quantity, // output will be subtracted in repository
        notes
      });
      handleCloseModal();
      loadMovements();
      loadProducts(); // Reload stock in local product list
    } catch (err: any) {
      setModalError(err.message || 'Error al registrar el movimiento.');
    } finally {
      setSaving(false);
    }
  };

  const formatMovementType = (type: string) => {
    switch (type) {
      case 'input': return { text: 'Entrada', style: 'badge-success', icon: ArrowUpRight };
      case 'output': return { text: 'Salida', style: 'badge-danger', icon: ArrowDownRight };
      case 'adjustment': return { text: 'Ajuste', style: 'badge-warning', icon: RefreshCw };
      case 'sale': return { text: 'Venta', style: 'badge-primary', icon: ArrowDownRight };
      case 'return': return { text: 'Devolución', style: 'badge-success', icon: ArrowUpRight };
      default: return { text: type, style: 'badge-secondary', icon: RefreshCw };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Filters Card */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '38px' }}
            placeholder="Buscar por producto o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Movement Type */}
        <select
          className="form-control"
          style={{ width: '160px' }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="input">Entrada</option>
          <option value="output">Salida</option>
          <option value="adjustment">Ajuste</option>
          <option value="sale">Venta</option>
          <option value="return">Devolución</option>
        </select>

        {/* Date Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="date"
            className="form-control"
            style={{ width: '135px', padding: '0.375rem 0.5rem' }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span>a</span>
          <input
            type="date"
            className="form-control"
            style={{ width: '135px', padding: '0.375rem 0.5rem' }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Trigger Filters */}
        <button className="btn btn-secondary" onClick={loadMovements}>
          <Filter size={16} />
          <span>Filtrar</span>
        </button>

        {/* New Movement Button */}
        <button className="btn btn-primary" onClick={handleOpenModal}>
          <Plus size={18} />
          <span>Movimiento Manual</span>
        </button>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* Movements Table */}
      {loading ? (
        <p>Cargando historial de movimientos...</p>
      ) : movements.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          <p>No se encontraron registros de inventario.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Producto</th>
                <th>SKU</th>
                <th>Variación (Talla/Color)</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Notas</th>
                <th>Registrado Por</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mov) => {
                const typeInfo = formatMovementType(mov.type);
                const TypeIcon = typeInfo.icon;
                return (
                  <tr key={mov.id}>
                    <td>
                      {new Date(mov.created_at).toLocaleString('es-MX', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td style={{ fontWeight: 600 }}>{mov.product_name}</td>
                    <td style={{ fontFamily: 'monospace' }}>{mov.sku || 'N/A'}</td>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                        Talla: {mov.size || 'Única'} | Color: {mov.color || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${typeInfo.style}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <TypeIcon size={12} />
                        {typeInfo.text}
                      </span>
                    </td>
                    <td style={{ 
                      fontWeight: 700, 
                      color: (mov.type === 'input' || mov.type === 'return' || (mov.type === 'adjustment' && mov.quantity > 0)) 
                        ? 'var(--success)' 
                        : 'var(--danger)' 
                    }}>
                      {mov.quantity > 0 && mov.type !== 'adjustment' ? `+${mov.quantity}` : mov.quantity}
                    </td>
                    <td style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {mov.notes || '-'}
                    </td>
                    <td>{mov.user_username || 'Sistema'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Movement Modal */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Movimiento de Inventario Manual</h3>
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
                
                {/* Product Select */}
                <div className="form-group">
                  <label className="form-label">Producto *</label>
                  <select 
                    className="form-control"
                    value={selectedProductId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    required
                  >
                    <option value="">Seleccione un producto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {/* Variant Select */}
                <div className="form-group">
                  <label className="form-label">Variante (Talla - Color - Existencia Actual) *</label>
                  <select 
                    className="form-control"
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    disabled={!selectedProductId}
                    required
                  >
                    <option value="">Seleccione variante...</option>
                    {getSelectedProductVariants().map(v => (
                      <option key={v.id} value={v.id}>
                        {v.size || 'Única'} - {v.color || 'N/A'} (Stock: {v.stock} u. | SKU: {v.sku || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Movement Type Select */}
                <div className="form-group">
                  <label className="form-label">Tipo de Movimiento *</label>
                  <select 
                    className="form-control"
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value as any)}
                  >
                    <option value="input">Entrada (Aumentar Stock)</option>
                    <option value="output">Salida (Disminuir Stock)</option>
                    <option value="adjustment">Ajuste Manual (Establecer diferencia positiva o negativa)</option>
                  </select>
                </div>

                {/* Quantity */}
                <div className="form-group">
                  <label className="form-label">Cantidad *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder={movementType === 'adjustment' ? "Ej. -3 para reducir, 5 para agregar" : "Cantidad (entero positivo)"}
                    value={quantity || ''}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                    required
                  />
                  {movementType === 'adjustment' && (
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      En ajustes manuales, use números negativos para restar stock y positivos para sumarlo.
                    </small>
                  )}
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">Notas / Motivo del Movimiento</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Ej. Ingreso de compra a proveedor, merma por defecto de fábrica, ajuste por inventario físico..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Registrar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Inventory;
