import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { getStats } from '../api/api';

const AdminPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Table State
  const [searchTerm, setSearchTerm] = useState('');
  const [actualSearch, setActualSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    if (!token || role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      if (error.response && error.response.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    navigate('/login');
  };

  // Safe processing of members
  const processedMembers = useMemo(() => {
    const members = stats?.recent_checkins || [];
    
    // Filter
    let filtered = members;
    if (actualSearch) {
      const lower = actualSearch.toLowerCase();
      filtered = members.filter(m => 
        (m.name?.toLowerCase().includes(lower)) ||
        (m.email?.toLowerCase().includes(lower)) ||
        (m.role?.toLowerCase().includes(lower))
      );
    }
    return filtered;
  }, [stats, actualSearch]);

  const totalPages = Math.ceil(processedMembers.length / itemsPerPage);
  const currentMembers = processedMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setActualSearch(searchTerm);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setActualSearch('');
    setCurrentPage(1);
  };

  return (
    <>
      <div className="container admin">
        <div className="header" style={{ position: 'relative' }}>
          <button
            onClick={handleLogout}
            style={{
              position: 'absolute', top: 0, right: 0,
              background: 'rgba(255, 67, 54, 0.1)', border: '1px solid rgba(255, 67, 54, 0.3)',
              color: '#ff7070', padding: '0.4rem 0.8rem', borderRadius: '20px',
              cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600'
            }}
          >
            Logout
          </button>

          <div className="header-badge">Admin Control Panel</div>
          <h1>AIC-Soa Foundation</h1>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Real-time Statistics & Management</p>
        </div>

        {/* Visibility Improved Stats */}
        <div className="stats-container" style={{ marginBottom: '2.5rem' }}>
          <StatCard number={stats?.total_registrations || 0} label="Total Registered" id="statTotal" />
          <StatCard number={stats?.checked_in || 0} label="Checked In" id="statPresent" />
          <StatCard number={stats?.pending || 0} label="Pending" id="statAbsent" />
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <form className="search-container" onSubmit={handleSearchSubmit} style={{ marginBottom: 0 }}>
            <input 
              type="text" 
              placeholder="Search all checked-in participants..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="search-button">Search</button>
            {actualSearch && (
              <button 
                type="button" 
                onClick={handleClearSearch}
                style={{
                  background: 'none', border: 'none', color: 'var(--accent-gold)',
                  marginLeft: '1rem', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline'
                }}
              >
                Clear
              </button>
            )}
          </form>
          {actualSearch && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginLeft: '0.5rem' }}>
              Showing results for: <strong>"{actualSearch}"</strong>
            </p>
          )}
        </div>

        <div className="admin-card">
          <div className="admin-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>
              {actualSearch 
                ? `Search Results (${processedMembers.length})` 
                : `Member Records (${stats?.total_registrations || 0})`}
            </span>
          </div>

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
                {loading && processedMembers.length === 0 ? (
                  <tr><td colSpan="5" className="empty-row">Loading data...</td></tr>
                ) : processedMembers.length === 0 ? (
                  <tr><td colSpan="5" className="empty-row">No records match your search.</td></tr>
                ) : (
                  currentMembers.map((attendee, index) => {
                    const checkinTime = attendee.checkin_time
                      ? new Date(attendee.checkin_time).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })
                      : '—';

                    return (
                      <tr key={index}>
                        <td>{((currentPage - 1) * itemsPerPage) + index + 1}</td>
                        <td style={{ fontWeight: '700' }}>{attendee.name}</td>
                        <td style={{ fontSize: '0.85rem' }}>{attendee.email}</td>
                        <td><span className="badge" style={{ background: 'rgba(0,180,216,0.1)', color: 'var(--accent-blue)', fontSize: '0.7rem' }}>{attendee.role}</span></td>
                        <td style={{ fontSize: '0.8rem', color: attendee.checkin_time ? 'var(--accent-gold)' : 'rgba(255,255,255,0.4)' }}>
                          {attendee.checkin_time ? `Checked in: ${checkinTime}` : 'Pending'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <button 
                className="pagination-button" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                ←
              </button>
              <span className="pagination-info">Page {currentPage} of {totalPages}</span>
              <button 
                className="pagination-button" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminPage;
