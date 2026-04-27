import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const ScannerReader = forwardRef(({ onScanSuccess, onScanError }, ref) => {
  const [html5Qrcode, setHtml5Qrcode] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-initialize instance memory
  useEffect(() => {
    if (!html5Qrcode) {
      setHtml5Qrcode(new Html5Qrcode('reader'));
    }
  }, [html5Qrcode]);

  const stopScanner = useCallback(async () => {
    if (html5Qrcode && html5Qrcode.isScanning) {
      try {
        await html5Qrcode.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  }, [html5Qrcode]);

  const startScanner = useCallback(async () => {
    if (isScanning) return;
    setErrorMsg('');
    try {
      let qrcode = html5Qrcode;
      if (!qrcode) {
        qrcode = new Html5Qrcode('reader');
        setHtml5Qrcode(qrcode);
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await qrcode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Temporarily stop the scanner on success so it doesn't double-fire
          stopScanner();
          onScanSuccess(decodedText, qrcode);
        },
        (error) => {
          // ignore frame errors
        }
      );
      setIsScanning(true);
      if (onScanError) onScanError(null);
    } catch (error) {
      console.error('Camera not accessible:', error);
      setIsScanning(false);
      setErrorMsg('Camera access denied or unavailable. Click to retry.');
      if (onScanError) onScanError('Camera unavailable');
    }
  }, [html5Qrcode, isScanning, onScanSuccess, onScanError, stopScanner]);

  useImperativeHandle(ref, () => ({
    startScanner,
    stopScanner
  }));

  // Clean up entirely on unmount
  useEffect(() => {
    return () => {
      if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop().catch((err) => console.error('Error stopping scanner on unmount:', err));
        setIsScanning(false);
      }
    };
  }, [html5Qrcode]);

  return (
    <div className="scanner-section" style={{ position: 'relative', overflow: 'hidden' }}>
      <div id="reader" style={{ width: '100%', minHeight: '250px', borderRadius: '24px', overflow: 'hidden' }}></div>
      <div className="scanning-overlay">
        {isScanning && <div className="scanning-line"></div>}
      </div>

      {!isScanning && (
        <div
          onClick={startScanner}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-primary)', borderRadius: '24px', zIndex: 10,
            cursor: 'pointer',
            border: '1px solid var(--border-color)'
          }}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            {/* Removed camera icon for a cleaner look */}
          </div>
          <p style={{ color: 'var(--text-primary)', marginBottom: '2rem', textAlign: 'center', padding: '0 2rem', fontSize: '1.2rem', fontWeight: '800' }}>
            {errorMsg || 'Ready to begin scanning'}
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); startScanner(); }}
            style={{
              padding: '1rem 2.5rem',
              background: 'var(--accent-gold)',
              color: '#041c24',
              border: 'none',
              borderRadius: '16px',
              fontWeight: '900',
              fontSize: '1.1rem',
              cursor: 'pointer',
              boxShadow: '0 8px 20px var(--accent-gold-glow)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              transition: 'all 0.3s ease'
            }}
          >
            Start Camera
          </button>
        </div>
      )}
    </div>
  );
});

export default ScannerReader;
