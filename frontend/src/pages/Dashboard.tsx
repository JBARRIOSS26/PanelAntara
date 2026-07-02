import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useApp } from '../context/AppContext';
import { 
  DollarSign, 
  ShoppingBag, 
  AlertTriangle, 
  TrendingUp, 
  RefreshCw,
  ArrowRight
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { setActivePage } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.reports.dashboard();
      setData(res);
    } catch (err: any) {
      setError('Error al cargar la información del panel.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
          <span>Cargando estadísticas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', margin: '2rem 0', textAlign: 'center' }}>
        <h3>Error</h3>
        <p>{error}</p>
        <button className="btn btn-secondary" onClick={loadDashboard} style={{ marginTop: '1rem' }}>Reintentar</button>
      </div>
    );
  }

  // Formatting helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Quick KPI Stats */}
      <div className="grid-dashboard">
        
        {/* Sales Today */}
        <div className="card kpi-card">
          <div className="kpi-details">
            <h3>Ventas del Día</h3>
            <span className="value">{formatCurrency(data.salesToday)}</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {data.itemsSoldToday} prendas vendidas
            </p>
          </div>
          <div className="kpi-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            <DollarSign size={24} />
          </div>
        </div>

        {/* Sales Month */}
        <div className="card kpi-card">
          <div className="kpi-details">
            <h3>Ventas del Mes</h3>
            <span className="value">{formatCurrency(data.salesMonth)}</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Mes en curso
            </p>
          </div>
          <div className="kpi-icon" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Low Stock count */}
        <div className="card kpi-card" style={{ cursor: 'pointer' }} onClick={() => setActivePage('inventory')}>
          <div className="kpi-details">
            <h3>Bajo Inventario</h3>
            <span className="value" style={{ color: data.lowStockCount > 0 ? 'var(--warning)' : 'inherit' }}>
              {data.lowStockCount}
            </span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Stock menor o igual a 5
            </p>
          </div>
          <div className="kpi-icon" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Out of stock count */}
        <div className="card kpi-card" style={{ cursor: 'pointer' }} onClick={() => setActivePage('inventory')}>
          <div className="kpi-details">
            <h3>Agotados</h3>
            <span className="value" style={{ color: data.outOfStockCount > 0 ? 'var(--danger)' : 'inherit' }}>
              {data.outOfStockCount}
            </span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Sin existencias
            </p>
          </div>
          <div className="kpi-icon" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
            <ShoppingBag size={24} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Latest Sales */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Últimas Ventas</h3>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => setActivePage('sales')}
            >
              Ver todas <ArrowRight size={14} />
            </button>
          </div>

          {data.latestSales.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No se han registrado ventas hoy.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.latestSales.map((sale: any) => (
                <div key={sale.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Venta #{sale.id}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Cliente: {sale.client_name || 'General'} | {new Date(sale.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={`badge ${sale.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>
                      {sale.status === 'completed' ? 'Completado' : 'Cancelado'}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{formatCurrency(sale.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem' }}>Productos más Vendidos</h3>

          {data.topSelling.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aún no hay datos de ventas disponibles.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.topSelling.map((item: any, idx: number) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.875rem'
                    }}>{idx + 1}</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        SKU: {item.sku || 'N/A'} | Talla: {item.size || 'Unica'} | Color: {item.color || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="badge badge-primary">{item.sold_qty} u.</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alerts Table */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.15rem' }}>Alertas de Bajo Inventario</h3>
        {data.lowStockVariants.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>¡Excelente! No tienes productos con bajo stock.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Talla</th>
                  <th>Color</th>
                  <th>Stock Actual</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockVariants.map((item: any) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ fontFamily: 'monospace' }}>{item.sku || 'N/A'}</td>
                    <td>{item.size || 'Única'}</td>
                    <td>{item.color || 'N/A'}</td>
                    <td style={{ fontWeight: 700, color: item.stock === 0 ? 'var(--danger)' : 'var(--warning)' }}>
                      {item.stock} unidades
                    </td>
                    <td>
                      <span className={`badge ${item.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                        {item.stock === 0 ? 'Agotado' : 'Bajo Stock'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => setActivePage('inventory')}
                      >
                        Surtir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Embedded Spin Keyframes style to make sure refresh loader spins */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
};
export default Dashboard;
