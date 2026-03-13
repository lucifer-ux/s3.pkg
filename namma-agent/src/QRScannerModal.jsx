import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import './QRScannerModal.css';

function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let html5QrCode = null;

    const startScanner = async () => {
      try {
        setError(null);
        html5QrCode = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            // QR Code scanned successfully
            console.log('QR Code detected:', decodedText);
            onScanSuccess(decodedText);
            stopScanner();
            onClose();
          },
          (errorMessage) => {
            // QR Code scan error (this runs frequently while scanning)
            // We don't show this as it's normal behavior
          }
        );

        setIsScanning(true);
      } catch (err) {
        console.error('Camera error:', err);
        setError('Camera permission denied or camera not available. Please allow camera access to scan QR codes.');
        setIsScanning(false);
      }
    };

    const stopScanner = async () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        try {
          await html5QrCodeRef.current.stop();
          await html5QrCodeRef.current.clear();
        } catch (err) {
          console.error('Error stopping scanner:', err);
        }
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, [isOpen, onScanSuccess, onClose]);

  const handleClose = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-modal">
        {/* Close Button */}
        <button className="close-button" onClick={handleClose}>
          <X size={24} />
        </button>

        {/* Header Message */}
        <div className="scanner-header">
          <h3>Scan Product QR Code</h3>
          <p>Place product QR in line to get information about the product</p>
        </div>

        {/* Scanner Container */}
        <div className="scanner-container">
          {error ? (
            <div className="error-message">
              <p>{error}</p>
              <button className="retry-button" onClick={handleClose}>
                Close
              </button>
            </div>
          ) : (
            <>
              <div id="qr-reader" ref={scannerRef} className="qr-reader"></div>
              {!isScanning && (
                <div className="loading-scanner">
                  <div className="spinner"></div>
                  <p>Initializing camera...</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="scanner-footer">
          <p>Point your camera at a QR code</p>
        </div>
      </div>
    </div>
  );
}

export default QRScannerModal;