import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ScannerReader from '../components/ScannerReader';
import StatusBadge from '../components/StatusBadge';
import { scanParticipant, checkinParticipant } from '../api/api';

const ScannerPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState({ state: 'idle', text: 'Ready to scan. Click to begin.' });
  const [scannedData, setScannedData] = useState({ uid: '-', name: '-', college: '-', role: '-' });
  const [showDataCard, setShowDataCard] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [pendingCheckinUid, setPendingCheckinUid] = useState(null);
  const scannerComponentRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const handleStatusClick = () => {
    if (processing) return;
    if (status.state === 'idle' || status.state === 'error' || status.state === 'warning' || status.state === 'success') {
      if (scannerComponentRef.current) {
         setStatus({ state: 'loading', text: 'Starting camera...' });
         setShowDataCard(false);
         setScannedData({ uid: '-', name: '-', college: '-', role: '-' });
         setPendingCheckinUid(null);
         scannerComponentRef.current.startScanner();
         setStatus({ state: 'loading', text: 'Scanning...' });
      }
    }
  };

  const handleScanError = (err) => {
    console.log(err);
  };

  const handleScanSuccess = async (decodedText) => {
    if (processing) return;
    setProcessing(true);
    setPendingCheckinUid(null);

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

      setScannedData({
        uid: scanRes.participant.uid,
        name: scanRes.participant.name,
        college: scanRes.participant.college || 'N/A',
        role: scanRes.participant.role || 'Guest'
      });

      if (scanRes.already_checked_in) {
        setStatus({ state: 'warning', text: `Already checked in` });
        setProcessing(false);
        return;
      }

      setStatus({ state: 'success', text: `Verified! Awaiting Check-in.` });
      setPendingCheckinUid(uid);

    } catch (error) {
       setStatus({ state: 'error', text: 'Verification failed (Server Error)' });
    }
    setProcessing(false);
  };

  const handleManualCheckin = async () => {
    if (!pendingCheckinUid || processing) return;
    setProcessing(true);
    try {
      const checkinRes = await checkinParticipant(pendingCheckinUid);
      if (checkinRes.status === 'checked_in') {
        setStatus({ state: 'success', text: `Check-in Successful` });
        setPendingCheckinUid(null);
      } else {
        setStatus({ state: 'error', text: `Check-in Unsuccessful` });
      }
    } catch (error) {
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
        <div className="header-badge" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)' }}>
          Live Event
        </div>
        <h1>AIC-Soa Foundation</h1>
        <p style={{ opacity: 0.7 }}>Check-in & Attendance</p>
      </div>

      <ScannerReader 
        ref={scannerComponentRef} 
        onScanSuccess={handleScanSuccess} 
        onScanError={handleScanError} 
      />

      <StatusBadge 
        status={status.state} 
        text={status.text} 
        onClick={handleStatusClick} 
      />

      <div className={`admin-card ${showDataCard ? 'visible' : ''}`} style={{ marginTop: '1.5rem', display: showDataCard ? 'block' : 'none' }}>
        <div className="data-field">
          <div className="data-label">UID / Registration No</div>
          <div className="data-value" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{scannedData.uid}</div>
        </div>
        <div className="data-field">
          <div className="data-label">Name</div>
          <div className={`data-value ${scannedData.name === 'Verifying...' ? 'loading' : ''}`}>
            {scannedData.name}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="data-field">
            <div className="data-label">Role</div>
            <div className="data-value" style={{ fontSize: '1rem'}}>{scannedData.role}</div>
          </div>
          <div className="data-field">
            <div className="data-label">College</div>
            <div className="data-value" style={{ fontSize: '1rem'}}>{scannedData.college}</div>
          </div>
        </div>

        {pendingCheckinUid && (
          <button
            onClick={handleManualCheckin}
            disabled={processing}
            style={{
              width: '100%', marginTop: '1.5rem', padding: '1.1rem',
              background: 'var(--accent-gold)', color: '#041c24',
              border: 'none', borderRadius: '8px', fontWeight: '800',
              fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px',
              cursor: processing ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s ease'
            }}
          >
            {processing ? 'Processing...' : 'Confirm Check-in'}
          </button>
        )}
      </div>

      <p className="info-text">Click the status badge to start scanning!</p>
    </div>
  );
};

export default ScannerPage;
