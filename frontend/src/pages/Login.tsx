import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, User, ShoppingCart } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Por favor, complete todos los campos.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      padding: '1rem'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '420px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(12px)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: '#ffffff',
        padding: '2.5rem'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, #a5b4fc 100%)',
            marginBottom: '1rem',
            boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)'
          }}>
            <ShoppingCart size={30} color="#ffffff" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 800, letterSpacing: '0.05em', color: '#ffffff' }}>
            ANTARA
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Sistema de Punto de Venta y Administración
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            marginBottom: '1.25rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ color: '#cbd5e1' }}>Usuario</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b'
              }} />
              <input
                type="text"
                className="form-control"
                style={{
                  paddingLeft: '40px',
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#ffffff'
                }}
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label" style={{ color: '#cbd5e1' }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b'
              }} />
              <input
                type="password"
                className="form-control"
                style={{
                  paddingLeft: '40px',
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#ffffff'
                }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.4)',
              background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)'
            }}
            disabled={loading}
          >
            {loading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', color: '#64748b', fontSize: '0.75rem' }}>
          <span>Credenciales semilla: <strong>admin</strong> / <strong>admin123</strong></span>
        </div>
      </div>
    </div>
  );
};
export default Login;
