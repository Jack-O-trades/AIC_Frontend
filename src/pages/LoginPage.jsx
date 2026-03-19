import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { loginUser } from '../api/api';

const LoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ state: 'idle', text: 'Enter credentials' });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setStatus({ state: 'error', text: 'Missing credentials' });
      return;
    }

    setStatus({ state: 'loading', text: 'Authenticating...' });

    try {
      const data = await loginUser(username, password);
      if (data && data.access_token) {
        setStatus({ state: 'success', text: 'Login successful!' });
        setTimeout(() => {
          if (data.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        }, 1000);
      } else {
        setStatus({ state: 'error', text: 'Invalid response' });
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.detail) {
        setStatus({ state: 'error', text: error.response.data.detail });
      } else {
        setStatus({ state: 'error', text: 'Connection error' });
      }
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '10vh' }}>
      <div className="header">
        <div className="header-badge" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
          Secure Authentication
        </div>
        <h1>AIC-Soa Foundation</h1>
        <p style={{ opacity: 0.7 }}>Attendance Management Portal</p>
      </div>

      <div className="admin-card" style={{ padding: '2rem' }}>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }} onSubmit={handleLogin}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>
              Username
            </label>
            <input
              type="text"
              placeholder="Username"
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                borderRadius: '8px',
                background: '#041c24',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: '1rem'
              }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Password"
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                borderRadius: '8px',
                background: '#041c24',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: '1rem'
              }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: '1rem',
              padding: '0.9rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              background: 'var(--accent-gold)',
              color: '#041c24',
              transition: 'transform 0.2s ease'
            }}
          >
            Sign In
          </button>
        </form>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <StatusBadge status={status.state} text={status.text} />
      </div>
    </div>
  );
};

export default LoginPage;
