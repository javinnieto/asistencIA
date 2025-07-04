import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Error de autenticación');
      }
      const data = await res.json();
      // Guardar el access token en localStorage
      localStorage.setItem('accessToken', data.access);
      // Redirigir al dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-outer-wrapper" style={{ background: "url('/img/isae.jpg') center center/cover no-repeat", position: 'relative' }}>
      <div className="login-inner-wrapper">
        {/* Si querés un logo, descomenta la línea de abajo y poné el logo en public/img/logo.png */}
        {/* <img src="/img/logo.png" alt="ISAE" style={{ width: 80, marginBottom: 24 }} /> */}
        <h2 className="mb-4">Iniciar sesión</h2>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div className="mb-3">
            <label className="form-label">Usuario</label>
            <input type="text" className="form-control" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Contraseña</label>
            <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login; 