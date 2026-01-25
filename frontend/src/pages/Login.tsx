import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequest } from '../config/api';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await loginRequest(username, password);

      if (!res.ok) {
        // Intentar parsear el error, si no es JSON, texto plano
        try {
          const data = await res.json();
          throw new Error(data.detail || 'Error de autenticación');
        } catch (jsonErr) {
          throw new Error('Error de conexión con el servidor');
        }
      }

      const data = await res.json();
      // Usar el contexto para el login (maneja localStorage y estado)
      login(data.access);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-outer-wrapper">
      {/* Background Overlay is handled by CSS radial gradient now */}
      <div className="login-glass-card">
        <h2 className="mb-4">Bienvenido</h2>
        <p className="text-secondary mb-4">Inicia sesión para continuar</p>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div className="mb-4">
            <label className="form-label">Usuario</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              placeholder="usuario"
            />
          </div>
          <div className="mb-4">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="alert alert-danger" role="alert" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid #ef4444', borderRadius: '10px' }}>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary w-100 py-3 mt-2" disabled={loading}>
            {loading ? (
              <span><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Ingresando...</span>
            ) : 'Ingresar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;