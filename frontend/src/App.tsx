import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';

// Page Imports
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Brands from './pages/Brands';
import Inventory from './pages/Inventory';
import Labels from './pages/Labels';
import Customers from './pages/Customers';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Users from './pages/Users';
import SettingsPage from './pages/Settings';

const MainLayout: React.FC = () => {
  const { activePage } = useApp();

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'pos': return <POS />;
      case 'products': return <Products />;
      case 'categories': return <Categories />;
      case 'brands': return <Brands />;
      case 'inventory': return <Inventory />;
      case 'labels': return <Labels />;
      case 'customers': return <Customers />;
      case 'sales': return <Sales />;
      case 'reports': return <Reports />;
      case 'users': return <Users />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

const AuthCheck: React.FC = () => {
  const { user, token, loadingAuth } = useApp();

  if (loadingAuth) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        fontFamily: 'sans-serif'
      }}>
        <h2>Cargando Sistema ANTARA...</h2>
      </div>
    );
  }

  // If token and user exist, show layout, else login screen
  return token && user ? <MainLayout /> : <Login />;
};

function App() {
  return (
    <AppProvider>
      <AuthCheck />
    </AppProvider>
  );
}

export default App;
