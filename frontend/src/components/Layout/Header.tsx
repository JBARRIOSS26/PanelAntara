import React from 'react';
import { useApp } from '../../context/AppContext';
import { Store, Calendar } from 'lucide-react';

export const Header: React.FC = () => {
  const { activePage, settings } = useApp();

  const getPageTitle = (page: string) => {
    switch (page) {
      case 'dashboard': return 'Panel de Control (Dashboard)';
      case 'pos': return 'Punto de Venta (POS)';
      case 'products': return 'Administrador de Productos';
      case 'categories': return 'Administrador de Categorías';
      case 'brands': return 'Administrador de Marcas';
      case 'inventory': return 'Control de Inventarios';
      case 'labels': return 'Impresión de Etiquetas de Ropa';
      case 'customers': return 'Directorio de Clientes';
      case 'sales': return 'Historial de Ventas';
      case 'reports': return 'Reportes y Analíticas';
      case 'users': return 'Control de Acceso y Personal';
      case 'settings': return 'Configuración General';
      default: return 'Sistema POS';
    }
  };

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="header">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{getPageTitle(activePage)}</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          <Calendar size={16} />
          <span style={{ textTransform: 'capitalize' }}>{today}</span>
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.375rem 0.75rem', 
          backgroundColor: 'var(--primary-light)', 
          color: 'var(--primary)', 
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          <Store size={16} />
          <span>{settings.store_name || 'ANTARA'}</span>
        </div>
      </div>
    </header>
  );
};
export default Header;
