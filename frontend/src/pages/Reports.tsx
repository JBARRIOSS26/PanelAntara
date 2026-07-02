import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, Download, DollarSign, TrendingUp, Users, ArrowUpRight, BarChart } from 'lucide-react';

export const Reports: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.reports.analytics(
        startDate || undefined,
        endDate || undefined
      );
      setAnalytics(data);
    } catch (err) {
      setError('Error al generar reportes financieros.');
    } finally {
      setLoading(false);
    }
  };

  // Set default dates on load (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  // Reload when date filters are set and loaded
  useEffect(() => {
    if (startDate && endDate) {
      loadAnalytics();
    }
  }, [startDate, endDate]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  // Export tables to CSV
  const handleExportCSV = (type: 'timeline' | 'owner' | 'user') => {
    if (!analytics) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = "";

    if (type === 'timeline') {
      filename = `ventas_diarias_${startDate}_a_${endDate}.csv`;
      csvContent += "Fecha,Monto Vendido,Subtotal,Cantidad Ventas\n";
      analytics.salesTimeline.forEach((row: any) => {
        csvContent += `${row.date},${row.total},${row.subtotal},${row.sales_count}\n`;
      });
    } else if (type === 'owner') {
      filename = `ventas_por_socia_${startDate}_a_${endDate}.csv`;
      csvContent += "Socia,Cantidad Ventas,Total Vendido\n";
      analytics.salesByOwner.forEach((row: any) => {
        csvContent += `"${row.owner_name}",${row.sales_count},${row.total_sales}\n`;
      });
    } else if (type === 'user') {
      filename = `ventas_por_vendedor_${startDate}_a_${endDate}.csv`;
      csvContent += "Colaborador,Cantidad Ventas,Total Vendido\n";
      analytics.salesByUser.forEach((row: any) => {
        csvContent += `"${row.username}",${row.sales_count},${row.total_sales}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTimelineMaxTotal = () => {
    if (!analytics || analytics.salesTimeline.length === 0) return 1000;
    const max = Math.max(...analytics.salesTimeline.map((r: any) => r.total));
    return max === 0 ? 1000 : max;
  };

  if (loading && !analytics) return <p>Cargando reportes...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Date Filters Header */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontWeight: 600 }}>Rango del Reporte:</span>
          <input
            type="date"
            className="form-control"
            style={{ width: '150px' }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span>a</span>
          <input
            type="date"
            className="form-control"
            style={{ width: '150px' }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button className="btn btn-secondary" onClick={loadAnalytics}>
          <span>Actualizar Reportes</span>
        </button>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {analytics && (
        <>
          {/* Summary KPIs (Revenue, Cost, Profit) */}
          <div className="grid-dashboard">
            {/* Revenue */}
            <div className="card kpi-card">
              <div className="kpi-details">
                <h3>Ventas Totales (Ingresos)</h3>
                <span className="value" style={{ color: 'var(--primary)' }}>
                  {formatCurrency(analytics.summary.revenue)}
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Bruto cobrado
                </p>
              </div>
              <div className="kpi-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                <DollarSign size={24} />
              </div>
            </div>

            {/* COGS (Costo) */}
            <div className="card kpi-card">
              <div className="kpi-details">
                <h3>Costo de Ventas (Costo Prenda)</h3>
                <span className="value" style={{ color: 'var(--text-muted)' }}>
                  {formatCurrency(analytics.summary.cogs)}
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Inversión en mercancía vendida
                </p>
              </div>
              <div className="kpi-icon" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                <TrendingUp size={24} />
              </div>
            </div>

            {/* Net Profit (Utilidad) */}
            <div className="card kpi-card" style={{ borderLeft: '4px solid var(--success)' }}>
              <div className="kpi-details">
                <h3>Utilidad Neta (Ganancia)</h3>
                <span className="value" style={{ color: 'var(--success)' }}>
                  {formatCurrency(analytics.summary.profit)}
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Utilidad bruta libre ({analytics.summary.revenue > 0 ? ((analytics.summary.profit / analytics.summary.revenue) * 100).toFixed(1) : 0}%)
                </p>
              </div>
              <div className="kpi-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                <ArrowUpRight size={24} />
              </div>
            </div>
          </div>

          {/* Timeline chart */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem' }}><BarChart size={16} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} /> Histórico de Ventas</h3>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleExportCSV('timeline')}>
                <Download size={12} /> Exportar CSV
              </button>
            </div>

            {analytics.salesTimeline.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '2rem', textAlign: 'center' }}>
                No hay ventas registradas en el rango seleccionado.
              </p>
            ) : (
              <div>
                {/* SVG Visual Chart */}
                <div style={{ height: '220px', width: '100%', display: 'flex', alignItems: 'flex-end', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  {analytics.salesTimeline.map((item: any, idx: number) => {
                    const maxVal = getTimelineMaxTotal();
                    const heightPercent = Math.max(5, (item.total / maxVal) * 100);
                    return (
                      <div 
                        key={idx} 
                        style={{
                          flex: 1,
                          height: `${heightPercent}%`,
                          backgroundColor: 'var(--primary)',
                          borderRadius: '3px 3px 0 0',
                          position: 'relative',
                          display: 'flex',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title={`${item.date}: ${formatCurrency(item.total)}`}
                      >
                        {/* Hover Tooltip */}
                        <div className="chart-tooltip" style={{
                          position: 'absolute',
                          bottom: '100%',
                          marginBottom: '4px',
                          backgroundColor: 'var(--bg-sidebar)',
                          color: '#fff',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          whiteSpace: 'nowrap',
                          zIndex: 5,
                          fontWeight: 700
                        }}>
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Chart labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>{analytics.salesTimeline[0]?.date}</span>
                  <span>{analytics.salesTimeline[Math.floor(analytics.salesTimeline.length / 2)]?.date}</span>
                  <span>{analytics.salesTimeline[analytics.salesTimeline.length - 1]?.date}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
            
            {/* Sales by Socias / Owner Table */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem' }}><Users size={16} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} /> Distribución por Socia</h3>
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleExportCSV('owner')}>
                  <Download size={12} /> Exportar CSV
                </button>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Socia</th>
                      <th style={{ textAlign: 'center' }}>Ventas</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Porcentaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.salesByOwner.map((row: any, idx: number) => {
                      const share = analytics.summary.revenue > 0 ? (row.total_sales / analytics.summary.revenue) * 100 : 0;
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{row.owner_name}</td>
                          <td style={{ textAlign: 'center' }}>{row.sales_count} ventas</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(row.total_sales)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="badge badge-primary">{share.toFixed(1)}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sales by User / Employee Performance */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Ventas por Colaborador</h3>
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleExportCSV('user')}>
                  <Download size={12} /> Exportar CSV
                </button>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Vendedor</th>
                      <th style={{ textAlign: 'center' }}>Ventas</th>
                      <th style={{ textAlign: 'right' }}>Total Cobrado</th>
                      <th style={{ textAlign: 'right' }}>Porcentaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.salesByUser.map((row: any, idx: number) => {
                      const share = analytics.summary.revenue > 0 ? (row.total_sales / analytics.summary.revenue) * 100 : 0;
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{row.username}</td>
                          <td style={{ textAlign: 'center' }}>{row.sales_count} ventas</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(row.total_sales)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="badge badge-success">{share.toFixed(1)}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* CSS Styles to hide tooltips by default and show them on hover */}
      <style>{`
        .chart-tooltip {
          opacity: 0;
          transition: opacity 0.1s ease-in-out;
        }
        div:hover > .chart-tooltip {
          opacity: 1;
        }
      `}</style>

    </div>
  );
};
export default Reports;
