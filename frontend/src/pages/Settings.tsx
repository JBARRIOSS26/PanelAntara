import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Propietaria } from '../types';
import { Save, Plus, Edit2, Trash2, Settings, Store, Users, Percent } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'store' | 'owners'>('store');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Store settings fields
  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeTaxRate, setStoreTaxRate] = useState('0.16');
  const [storeTaxIncluded, setStoreTaxIncluded] = useState(true);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [ticketFooter, setTicketFooter] = useState('');

  // Owners list
  const [owners, setOwners] = useState<Propietaria[]>([]);
  const [ownerName, setOwnerName] = useState('');
  const [ownerCode, setOwnerCode] = useState('');
  const [editingOwner, setEditingOwner] = useState<Propietaria | null>(null);
  const [ownerError, setOwnerError] = useState('');

  const loadSettingsData = async () => {
    setLoading(true);
    setError('');
    try {
      const [sets, oList] = await Promise.all([
        api.settings.get(),
        api.catalogs.listOwners()
      ]);

      // Load store fields
      setStoreName(sets.store_name || 'ANTARA');
      setStorePhone(sets.store_phone || '');
      setStoreAddress(sets.store_address || '');
      setStoreTaxRate(sets.store_tax_rate || '0.16');
      setStoreTaxIncluded(sets.store_tax_included !== 'false');
      setAllowNegativeStock(sets.allow_negative_stock === 'true');
      setTicketFooter(sets.ticket_footer || '');

      // Load owners
      setOwners(oList);
    } catch (err) {
      setError('Error al cargar configuraciones.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setError('');
    try {
      await api.settings.save({
        store_name: storeName,
        store_phone: storePhone,
        store_address: storeAddress,
        store_tax_rate: storeTaxRate,
        store_tax_included: storeTaxIncluded ? 'true' : 'false',
        allow_negative_stock: allowNegativeStock ? 'true' : 'false',
        ticket_footer: ticketFooter
      });
      setSuccessMsg('Configuración guardada exitosamente.');
      // Triggers loadSettings in global AppContext (we'll make sure it's updated)
      window.location.reload(); // Simple reload ensures all states get refreshed context-wise
    } catch (err) {
      setError('Error al guardar configuraciones.');
    }
  };

  // Owners operations
  const handleSaveOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerError('');
    if (!ownerName.trim() || !ownerCode.trim()) {
      setOwnerError('Todos los campos son obligatorios.');
      return;
    }

    try {
      if (editingOwner) {
        await api.catalogs.updateOwner(editingOwner.id, { name: ownerName, code: ownerCode });
      } else {
        await api.catalogs.createOwner({ name: ownerName, code: ownerCode });
      }
      setOwnerName('');
      setOwnerCode('');
      setEditingOwner(null);
      
      // Reload owner list
      const oList = await api.catalogs.listOwners();
      setOwners(oList);
    } catch (err: any) {
      setOwnerError(err.message || 'Error al guardar propietaria.');
    }
  };

  const handleEditOwner = (o: Propietaria) => {
    setEditingOwner(o);
    setOwnerName(o.name);
    setOwnerCode(o.code);
  };

  const handleDeleteOwner = async (id: number, name: string) => {
    if (window.confirm(`¿Está seguro de que desea eliminar a la propietaria "${name}"?\nSe bloqueará si tiene productos asociados.`)) {
      try {
        await api.catalogs.deleteOwner(id);
        const oList = await api.catalogs.listOwners();
        setOwners(oList);
      } catch (err: any) {
        alert(err.message || 'Error al eliminar propietaria.');
      }
    }
  };

  if (loading) return <p>Cargando configuraciones...</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '2rem', alignItems: 'start' }}>
      
      {/* Side Tabs Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <button
          className={`btn ${activeTab === 'store' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', width: '100%' }}
          onClick={() => setActiveTab('store')}
        >
          <Store size={18} />
          <span>Datos del Negocio</span>
        </button>
        <button
          className={`btn ${activeTab === 'owners' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', width: '100%' }}
          onClick={() => setActiveTab('owners')}
        >
          <Users size={18} />
          <span>Socias / Propietarias</span>
        </button>
      </div>

      {/* Main Settings Panel */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {error && (
          <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
            {successMsg}
          </div>
        )}

        {/* Tab A: Store settings */}
        {activeTab === 'store' && (
          <form onSubmit={handleSaveStoreSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Configuración de la Tienda
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nombre Comercial *</label>
                <input
                  type="text"
                  className="form-control"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Teléfono de Contacto</label>
                <input
                  type="text"
                  className="form-control"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Dirección Fiscal / Física</label>
              <input
                type="text"
                className="form-control"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Impuesto (IVA) - Tasa Decimal *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: '120px' }}
                    step="0.01"
                    min="0"
                    max="1"
                    value={storeTaxRate}
                    onChange={(e) => setStoreTaxRate(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Ej: 0.16 para 16% de IVA, 0.00 para exento.
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={storeTaxIncluded}
                    onChange={(e) => setStoreTaxIncluded(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Los precios en el catálogo ya incluyen IVA</span>
                </label>
              </div>
            </div>

            <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={allowNegativeStock}
                  onChange={(e) => setAllowNegativeStock(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Permitir ventas sin existencias (Inventario negativo)</span>
              </label>
              <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '26px', marginTop: '0.25rem' }}>
                Si se desmarca, el Punto de Venta bloqueará el cobro si algún producto del carrito supera el stock disponible.
              </small>
            </div>

            <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <label className="form-label">Pie de Página del Ticket de Venta</label>
              <textarea
                className="form-control"
                rows={2}
                value={ticketFooter}
                onChange={(e) => setTicketFooter(e.target.value)}
                placeholder="Ej. ¡Gracias por su compra en ANTARA! No se aceptan devoluciones después de 7 días."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                <Save size={18} />
                <span>Guardar Configuración</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab B: Owners / Socias */}
        {activeTab === 'owners' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Administrador de Socias / Propietarias
            </h3>

            {/* Owner form */}
            <form onSubmit={handleSaveOwner} style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr auto',
              gap: '1rem',
              alignItems: 'end',
              backgroundColor: 'var(--bg-hover)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nombre de la Propietaria *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Socia A - Sofia"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Código / Identificador *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. SOCIA_A"
                  value={ownerCode}
                  onChange={(e) => setOwnerCode(e.target.value)}
                  required
                />
              </div>

              <div>
                <button type="submit" className="btn btn-primary" style={{ height: '38px' }}>
                  {editingOwner ? 'Actualizar' : 'Agregar'}
                </button>
                {editingOwner && (
                  <button type="button" className="btn btn-secondary" style={{ height: '38px', marginLeft: '0.5rem' }} onClick={() => {
                    setEditingOwner(null);
                    setOwnerName('');
                    setOwnerCode('');
                  }}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            {ownerError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
                {ownerError}
              </div>
            )}

            {/* Owners table */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map(o => (
                    <tr key={o.id}>
                      <td>{o.id}</td>
                      <td style={{ fontWeight: 600 }}>{o.name}</td>
                      <td style={{ fontFamily: 'monospace' }}>{o.code}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '0.375rem 0.5rem' }}
                            onClick={() => handleEditOwner(o)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '0.375rem 0.5rem' }}
                            onClick={() => handleDeleteOwner(o.id, o.name)}
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
          </div>
        )}

      </div>
    </div>
  );
};
export default SettingsPage;
