import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Shirt, 
  Tag, 
  Award, 
  Archive, 
  Printer, 
  Users, 
  Receipt, 
  BarChart3, 
  ShieldCheck, 
  Settings,
  LogOut,
  User as UserIcon
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage, user, logout } = useApp();

  const primaryItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, role: 'all' },
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart, role: 'all' },
    { id: 'products', label: 'Productos', icon: Shirt, role: 'all' },
    { id: 'sales', label: 'Historial Ventas', icon: Receipt, role: 'all' },
    { id: 'customers', label: 'Clientes', icon: Users, role: 'all' },
  ];

  const utilityItems = [
    { id: 'inventory', label: 'Inventario', icon: Archive, role: 'all' },
    { id: 'labels', label: 'Imprimir Etiquetas', icon: Printer, role: 'all' },
    { id: 'reports', label: 'Reportes', icon: BarChart3, role: 'all' },
  ];

  const adminItems = [
    { id: 'categories', label: 'Categorías', icon: Tag, role: 'all' },
    { id: 'brands', label: 'Marcas', icon: Award, role: 'all' },
    { id: 'users', label: 'Usuarios / Personal', icon: ShieldCheck, role: 'admin' },
    { id: 'settings', label: 'Configuración', icon: Settings, role: 'admin' },
  ];

  const filterByRole = (items: typeof primaryItems) => {
    return items.filter(item => {
      if (item.role === 'all') return true;
      return user?.role === 'admin';
    });
  };

  const renderGroup = (title: string, items: typeof primaryItems) => {
    const filtered = filterByRole(items);
    if (filtered.length === 0) return null;
    return (
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ 
          fontSize: '0.65rem', 
          fontWeight: 700, 
          textTransform: 'uppercase', 
          letterSpacing: '0.08em', 
          color: '#8c7f7c', 
          padding: '0 1rem 0.5rem 1rem',
          opacity: 0.8
        }}>
          {title}
        </div>
        {filtered.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <div
              key={item.id}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 1rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.9rem',
                marginBottom: '2px'
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ padding: '1.5rem 1rem', display: 'flex', justifyContent: 'center' }}>
        <img 
          src="/LogoAntara.jpeg" 
          alt="Antara Logo" 
          style={{ 
            maxHeight: '45px', 
            objectFit: 'contain',
            filter: 'invert(1)', 
            mixBlendMode: 'screen' /* Truco para quitar el fondo blanco de un JPEG en fondos oscuros */
          }} 
        />
      </div>

      <nav className="sidebar-menu" style={{ padding: '1rem 0.5rem' }}>
        {renderGroup('Operaciones', primaryItems)}
        {renderGroup('Herramientas', utilityItems)}
        {renderGroup('Administración', adminItems)}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
          <UserIcon size={18} style={{ color: '#94a3b8' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.username}</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'capitalize' }}>
              {user?.role === 'admin' ? 'Administrador' : 'Empleado'}
            </span>
          </div>
        </div>
        
        <button
          className="btn"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            width: '100%',
            justifyContent: 'flex-start',
            padding: '0.5rem 0.75rem',
            marginTop: '0.5rem'
          }}
          onClick={logout}
        >
          <LogOut size={16} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;
