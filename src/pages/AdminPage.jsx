import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { getStats } from '../api/api';

const ROLES = [
  { key: 'student',      label: 'Students',       match: r => r?.toLowerCase().includes('student') },
  { key: 'academician',  label: 'Academicians',    match: r => r?.toLowerCase().includes('academic') },
  { key: 'industrialist',label: 'Industrialists',  match: r => r?.toLowerCase().includes('industri') },
  { key: 'others',       label: 'Others',          match: null },
];

const formatTime = t =>
  t ? new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const AdminPage = () => {
  const navigate = useNavigate();
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm]   = useState('');
  const [actualSearch, setActualSearch] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const role  = localStorage.getItem('user_role');
    if (!token || role !== 'admin') { navigate('/login'); return; }
    fetchStats();
    const iv = setInterval(fetchStats, 5000);
    return () => clearInterval(iv);
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    navigate('/login');
  };

  /* ── bucket members by role ── */
  const buckets = useMemo(() => {
    const members = stats?.recent_checkins || [];
    const q = actualSearch.toLowerCase();
    const filtered = q
      ? members.filter(m =>
          m.name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.role?.toLowerCase().includes(q))
      : members;

    const categorised = new Set();
    const result = {};
    ROLES.forEach(sec => {
      if (sec.match) {
        result[sec.key] = filtered.filter(m => { if (sec.match(m.role)) { categorised.add(m); return true; } return false; });
      }
    });
    result['others'] = filtered.filter(m => !categorised.has(m));
    return result;
  }, [stats, actualSearch]);

  const handleSearch = e => { e.preventDefault(); setActualSearch(searchTerm); };
  const handleClear  = () => { setSearchTerm(''); setActualSearch(''); };

  const currentRole    = ROLES[activeTab];
  const currentMembers = buckets[currentRole.key] || [];

  return (
    <>
      <div className="container admin">

        {/* ── Header ── */}
        <div className="header" style={{ position: 'relative' }}>
          <button onClick={handleLogout} style={{
            position: 'absolute', top: 0, right: 0,
            background: 'rgba(255,67,54,0.1)', border: '1px solid rgba(255,67,54,0.3)',
            color: '#ff7070', padding: '0.4rem 0.8rem', borderRadius: '20px',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600',
          }}>Logout</button>
          <div className="header-badge">Admin Control Panel</div>
          <h1>AIC-Soa Foundation</h1>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Real-time Statistics &amp; Management</p>
        </div>

        {/* ── Stat cards ── */}
        <div className="stats-container" style={{ marginBottom: '2rem' }}>
          <StatCard number={stats?.total_registrations || 0} label="Total Registered" id="statTotal" />
          <StatCard number={stats?.checked_in          || 0} label="Checked In"       id="statPresent" />
          <StatCard number={stats?.pending             || 0} label="Pending"          id="statAbsent" />
        </div>

        {/* ── Search ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <form className="search-container" onSubmit={handleSearch} style={{ marginBottom: 0 }}>
            <input
              type="text"
              placeholder="Search across all categories…"
              className="search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="search-button">Search</button>
            {actualSearch && (
              <button type="button" onClick={handleClear} style={{
                background: 'none', border: 'none', color: 'var(--accent-gold)',
                marginLeft: '1rem', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline',
              }}>Clear</button>
            )}
          </form>
          {actualSearch && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Results for <strong>"{actualSearch}"</strong>
            </p>
          )}
        </div>

        {/* ── Tab bar ── */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid rgba(255,255,255,0.07)',
          marginBottom: '0',
          gap: '0',
          overflowX: 'auto',
        }}>
          {ROLES.map((role, i) => {
            const count      = (buckets[role.key] || []).length;
            const checkedIn  = (buckets[role.key] || []).filter(m => m.checkin_time).length;
            const isActive   = activeTab === i;
            return (
              <button
                key={role.key}
                onClick={() => setActiveTab(i)}
                style={{
                  padding: '0.75rem 1.4rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  marginBottom: '-2px',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: 'inherit',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? '700' : '500',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  letterSpacing: '0.2px',
                }}
              >
                {role.label}
                <span style={{
                  background: isActive ? 'rgba(0,180,216,0.15)' : 'rgba(255,255,255,0.06)',
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  border: isActive ? '1px solid rgba(0,180,216,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '999px',
                  padding: '0.1rem 0.5rem',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  transition: 'all 0.15s ease',
                }}>
                  {checkedIn}/{count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Tab panel ── */}
        <div className="admin-card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none' }}>
          <div className="admin-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && currentMembers.length === 0 ? (
                  <tr><td colSpan="5" className="empty-row">Loading data…</td></tr>
                ) : currentMembers.length === 0 ? (
                  <tr><td colSpan="5" className="empty-row">
                    {actualSearch
                      ? `No ${currentRole.label.toLowerCase()} match "${actualSearch}".`
                      : `No ${currentRole.label.toLowerCase()} registered yet.`}
                  </td></tr>
                ) : (
                  currentMembers.map((m, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: '700' }}>{m.name}</td>
                      <td style={{ fontSize: '0.85rem' }}>{m.email}</td>
                      <td>
                        <span className="badge" style={{
                          background: 'rgba(0,180,216,0.1)',
                          color: 'var(--accent-blue)',
                          fontSize: '0.7rem',
                        }}>{m.role}</span>
                      </td>
                      <td style={{
                        fontSize: '0.8rem',
                        color: m.checkin_time ? 'var(--accent-gold)' : 'rgba(255,255,255,0.35)',
                      }}>
                        {m.checkin_time ? `Checked in: ${formatTime(m.checkin_time)}` : 'Pending'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'right' }}>
            {currentMembers.filter(m => m.checkin_time).length} of {currentMembers.length} checked in
          </p>
        </div>

      </div>
    </>
  );
};

export default AdminPage;
