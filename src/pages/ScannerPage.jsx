import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ScannerReader from '../components/ScannerReader';
import StatusBadge from '../components/StatusBadge';
import { scanParticipant, checkinParticipant, updateParticipant } from '../api/api';

const ROLE_OPTIONS = ['Student', 'Academician', 'Industrialist', 'Others'];

const fieldStyle = {
  width: '100%',
  padding: '0.65rem 0.9rem',
  borderRadius: '8px',
  background: '#041c24',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
};

const ScannerPage = () => {
  const navigate = useNavigate();
  const [status, setStatus]       = useState({ state: 'idle', text: 'Ready to scan. Click to begin.' });
  const [scannedData, setScannedData] = useState({ uid: '-', name: '-', college: '-', role: '-' });
  const [showDataCard, setShowDataCard]     = useState(false);
  const [processing, setProcessing]         = useState(false);
  const [pendingCheckinUid, setPendingCheckinUid] = useState(null);
  const scannerComponentRef = useRef(null);

  // Edit mode state
  const [editMode, setEditMode]   = useState(false);
  const [editFields, setEditFields] = useState({ name: '', college: '', role: '' });
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState(null); // { type: 'ok'|'err', text }

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) navigate('/login');
  }, [navigate]);

  const resetCard = () => {
    setShowDataCard(false);
    setScannedData({ uid: '-', name: '-', college: '-', role: '-' });
    setPendingCheckinUid(null);
    setEditMode(false);
    setSaveMsg(null);
  };

  const handleStatusClick = () => {
    if (processing) return;
    if (['idle', 'error', 'warning', 'success'].includes(status.state)) {
      if (scannerComponentRef.current) {
        setStatus({ state: 'loading', text: 'Starting camera...' });
        resetCard();
        scannerComponentRef.current.startScanner();
        setStatus({ state: 'loading', text: 'Scanning...' });
      }
    }
  };

  const handleScanError = (err) => console.log(err);

  const handleScanSuccess = async (decodedText) => {
    if (processing) return;
    setProcessing(true);
    setPendingCheckinUid(null);
    setEditMode(false);
    setSaveMsg(null);

    const uid = decodedText.trim();
    setScannedData({ uid, name: 'Verifying...', college: '-', role: '-' });
    setShowDataCard(true);

    try {
      const scanRes = await scanParticipant(uid);
      if (!scanRes.valid) {
        setStatus({ state: 'error', text: 'Registration Unsuccessful' });
        setScannedData({ uid, name: 'Unknown User', college: '-', role: '-' });
        setProcessing(false);
        return;
      }

      const p = scanRes.participant;
      const loaded = {
        uid:     p.uid,
        name:    p.name,
        college: p.college  || 'N/A',
        role:    p.role     || 'Guest',
      };
      setScannedData(loaded);
      setEditFields({ name: loaded.name, college: loaded.college, role: loaded.role });

      if (scanRes.already_checked_in) {
        setStatus({ state: 'warning', text: 'Already checked in' });
        setProcessing(false);
        return;
      }

      setStatus({ state: 'success', text: 'Verified! Awaiting Check-in.' });
      setPendingCheckinUid(uid);
    } catch (error) {
      setStatus({ state: 'error', text: 'Verification failed (Server Error)' });
    }
    setProcessing(false);
  };

  const handleEditSubmit = async () => {
    if (!scannedData.uid || scannedData.uid === '-') return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateParticipant(scannedData.uid, {
        name:    editFields.name.trim(),
        college: editFields.college.trim(),
        role:    editFields.role,
      });
      // Apply edits locally so the display reflects changes
      setScannedData(prev => ({ ...prev, ...editFields }));
      setEditMode(false);
      setSaveMsg({ type: 'ok', text: 'Changes saved successfully.' });
    } catch {
      setSaveMsg({ type: 'err', text: 'Failed to save. Check your connection.' });
    }
    setSaving(false);
  };

  const handleManualCheckin = async () => {
    if (!pendingCheckinUid || processing) return;
    setProcessing(true);
    try {
      const res = await checkinParticipant(pendingCheckinUid);
      if (res.status === 'checked_in') {
        setStatus({ state: 'success', text: 'Check-in Successful' });
        setPendingCheckinUid(null);
      } else {
        setStatus({ state: 'error', text: 'Check-in Unsuccessful' });
      }
    } catch {
      setStatus({ state: 'error', text: 'Check-in failed (Server Error)' });
    }
    setProcessing(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    navigate('/login');
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header" style={{ position: 'relative' }}>
        <button onClick={handleLogout} style={{
          position: 'absolute', top: 0, right: 0,
          background: 'rgba(255,67,54,0.1)', border: '1px solid rgba(255,67,54,0.3)',
          color: '#ff7070', padding: '0.4rem 0.8rem', borderRadius: '20px',
          cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600',
        }}>Logout</button>
        <div className="header-badge" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
          Live Event
        </div>
        <h1>AIC-Soa Foundation</h1>
        <p style={{ opacity: 0.7 }}>Check-in &amp; Attendance</p>
      </div>

      <ScannerReader ref={scannerComponentRef} onScanSuccess={handleScanSuccess} onScanError={handleScanError} />

      <StatusBadge status={status.state} text={status.text} onClick={handleStatusClick} />

      {/* Participant data card */}
      <div className={`admin-card ${showDataCard ? 'visible' : ''}`}
        style={{ marginTop: '1.5rem', display: showDataCard ? 'block' : 'none' }}>

        {/* Save feedback banner */}
        {saveMsg && (
          <div style={{
            marginBottom: '1rem', padding: '0.7rem 1rem', borderRadius: '8px',
            background: saveMsg.type === 'ok' ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)',
            border: `1px solid ${saveMsg.type === 'ok' ? 'rgba(22,163,74,0.4)' : 'rgba(220,38,38,0.4)'}`,
            color: saveMsg.type === 'ok' ? '#4ade80' : '#f87171',
            fontSize: '0.85rem', fontWeight: '600',
          }}>
            {saveMsg.type === 'ok' ? '✓ ' : '✕ '}{saveMsg.text}
          </div>
        )}

        {/* UID row — always read-only */}
        <div className="data-field">
          <div className="data-label">UID / Registration No</div>
          <div className="data-value" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{scannedData.uid}</div>
        </div>

        {editMode ? (
          /* ── EDIT MODE ── */
          <>
            <div className="data-field">
              <div className="data-label" style={{ marginBottom: '0.4rem' }}>Full Name</div>
              <input
                style={fieldStyle}
                value={editFields.name}
                onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))}
                onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border-color)'}
                placeholder="Full name"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="data-field">
                <div className="data-label" style={{ marginBottom: '0.4rem' }}>Role</div>
                <select
                  style={{ ...fieldStyle, cursor: 'pointer' }}
                  value={editFields.role}
                  onChange={e => setEditFields(f => ({ ...f, role: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--border-color)'}
                >
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="data-field">
                <div className="data-label" style={{ marginBottom: '0.4rem' }}>College / Organisation</div>
                <input
                  style={fieldStyle}
                  value={editFields.college}
                  onChange={e => setEditFields(f => ({ ...f, college: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--border-color)'}
                  placeholder="College"
                />
              </div>
            </div>

            {/* Edit action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                onClick={handleEditSubmit}
                disabled={saving}
                style={{
                  flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none',
                  background: 'var(--accent-blue)', color: '#041c24',
                  fontWeight: '700', fontSize: '0.95rem', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1, transition: 'opacity 0.2s',
                }}
              >
                {saving ? 'Saving…' : 'Submit Changes'}
              </button>
              <button
                onClick={() => { setEditMode(false); setSaveMsg(null); }}
                disabled={saving}
                style={{
                  padding: '0.8rem 1.2rem', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          /* ── VIEW MODE ── */
          <>
            <div className="data-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="data-label">Name</div>
                <div className={`data-value ${scannedData.name === 'Verifying...' ? 'loading' : ''}`}>
                  {scannedData.name}
                </div>
              </div>
              {/* Edit button — only shown if we have a real participant */}
              {scannedData.name !== '-' && scannedData.name !== 'Verifying...' && scannedData.name !== 'Unknown User' && (
                <button
                  onClick={() => { setEditMode(true); setSaveMsg(null); }}
                  style={{
                    background: 'rgba(0,180,216,0.1)', border: '1px solid rgba(0,180,216,0.3)',
                    color: 'var(--accent-blue)', padding: '0.35rem 0.8rem', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', flexShrink: 0,
                  }}
                >
                  Edit
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="data-field">
                <div className="data-label">Role</div>
                <div className="data-value" style={{ fontSize: '1rem' }}>{scannedData.role}</div>
              </div>
              <div className="data-field">
                <div className="data-label">College</div>
                <div className="data-value" style={{ fontSize: '1rem' }}>{scannedData.college}</div>
              </div>
            </div>
          </>
        )}

        {/* Confirm Check-in — only in view mode when pending */}
        {!editMode && pendingCheckinUid && (
          <button
            onClick={handleManualCheckin}
            disabled={processing}
            style={{
              width: '100%', marginTop: '1.5rem', padding: '1.1rem',
              background: 'var(--accent-gold)', color: '#041c24',
              border: 'none', borderRadius: '8px', fontWeight: '800',
              fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px',
              cursor: processing ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s ease',
            }}
          >
            {processing ? 'Processing…' : 'Confirm Check-in'}
          </button>
        )}
      </div>

      <p className="info-text">Click the status badge to start scanning!</p>
    </div>
  );
};

export default ScannerPage;
