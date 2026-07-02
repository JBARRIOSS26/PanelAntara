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

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, role: 'all' },
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart, role: 'all' },
    { id: 'products', label: 'Productos', icon: Shirt, role: 'all' },
    { id: 'categories', label: 'Categorías', icon: Tag, role: 'all' },
    { id: 'brands', label: 'Marcas', icon: Award, role: 'all' },
    { id: 'inventory', label: 'Inventario', icon: Archive, role: 'all' },
    { id: 'labels', label: 'Imprimir Etiquetas', icon: Printer, role: 'all' },
    { id: 'customers', label: 'Clientes', icon: Users, role: 'all' },
    { id: 'sales', label: 'Historial Ventas', icon: Receipt, role: 'all' },
    { id: 'reports', label: 'Reportes', icon: BarChart3, role: 'all' },
    { id: 'users', label: 'Usuarios / Personal', icon: ShieldCheck, role: 'admin' },
    { id: 'settings', label: 'Configuración', icon: Settings, role: 'admin' },
  ];

  const filteredItems = menuItems.filter(item => {
    if (item.role === 'all') return true;
    return user?.role === 'admin';
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <ShoppingCart size={24} className="text-indigo-400" style={{ color: '#818cf8' }} />
        <span className="sidebar-logo">ANTARA</span>
      </div>

      <nav className="sidebar-menu">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <div
              key={item.id}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </div>
          );
        })}
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
