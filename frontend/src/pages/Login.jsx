// src/pages/Login.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { toast } from '../components/shared/UI';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { token, user } = await api.login(email, password);
      login(user, token);
      navigate(user.role === 'admin' ? '/admin' : '/teacher');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🚗</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>DrivePro</h1>
          <p style={{ color: 'var(--text3)', fontSize: 14, marginTop: 4 }}>Driving School Management</p>
        </div>

        <div className="card card-pad">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" required value={email}
                onChange={e => setEmail(e.target.value)} placeholder="admin@drivepro.tn" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" required value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="divider" />
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.8 }}>
            <div><strong>Admin:</strong> admin@drivepro.tn / admin123</div>
            <div><strong>Teacher:</strong> sami@drivepro.tn / teacher123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
