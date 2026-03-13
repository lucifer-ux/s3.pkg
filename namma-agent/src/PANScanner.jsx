import { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, X, Loader2, RefreshCw, FileText, ArrowRight } from 'lucide-react';
import './PANScanner.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function PANScanner({ onScanComplete, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualData, setManualData] = useState({
    panNumber: '',
    name: ''
  });

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied. Please allow camera permissions.');
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setOcrResult(null);
    setError(null);
    setShowManualEntry(false);
    startCamera();
  };

  const processImage = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/ocr/pan-extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: capturedImage }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to extract PAN details');
      }

      if (!result.data.panNumber || result.data.panNumber === 'Not detected') {
        throw new Error('Could not read PAN number from image');
      }

      setOcrResult(result.data);
    } catch (err) {
      console.error('OCR error:', err);
      setError(err.message || 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = () => {
    if (manualData.panNumber.length === 10 && manualData.name.trim()) {
      onScanComplete({
        panNumber: manualData.panNumber.toUpperCase(),
        name: manualData.name.toUpperCase(),
        fatherName: null,
        dateOfBirth: null,
        image: capturedImage,
        manualEntry: true
      });
    }
  };

  const handleConfirm = () => {
    if (ocrResult && onScanComplete) {
      onScanComplete({
        panNumber: ocrResult.panNumber,
        name: ocrResult.name,
        fatherName: ocrResult.fatherName,
        dateOfBirth: ocrResult.dateOfBirth,
        image: capturedImage,
        manualEntry: false
      });
    }
  };

  const isValidPAN = (pan) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  };

  if (showManualEntry) {
    return (
      <div className="pan-scanner-modal">
        <div className="pan-scanner-content">
          <div className="scanner-header">
            <h3>Enter PAN Details</h3>
            <button className="close-btn" onClick={onCancel}>
              <X size={24} />
            </button>
          </div>

          <div className="scanner-body">
            <div className="manual-entry-form">
              <div className="manual-entry-icon">
                <FileText size={48} />
              </div>
              
              <p className="manual-entry-info">
                We could not automatically read your PAN card. Please enter the details manually.
              </p>

              <div className="form-field">
                <label>PAN Number</label>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  value={manualData.panNumber}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                    setManualData(prev => ({ ...prev, panNumber: value }));
                  }}
                  maxLength={10}
                  className={manualData.panNumber && !isValidPAN(manualData.panNumber) ? 'error' : ''}
                />
                {manualData.panNumber && !isValidPAN(manualData.panNumber) && (
                  <span className="field-error">Invalid PAN format</span>
                )}
              </div>

              <div className="form-field">
                <label>Full Name (as on PAN)</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={manualData.name}
                  onChange={(e) => setManualData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="scanner-footer">
            <div className="action-buttons">
              <button className="secondary-btn" onClick={() => setShowManualEntry(false)}>
                <RefreshCw size={16} />
                Try Camera
              </button>
              
              <button 
                className="primary-btn"
                onClick={handleManualSubmit}
                disabled={!isValidPAN(manualData.panNumber) || !manualData.name.trim()}
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pan-scanner-modal">
      <div className="pan-scanner-content">
        <div className="scanner-header">
          <h3>Scan PAN Card</h3>
          <button className="close-btn" onClick={onCancel}>
            <X size={24} />
          </button>
        </div>

        <div className="scanner-body">
          {!capturedImage ? (
            <div className="camera-view">
              {!hasPermission ? (
                <div className="permission-error">
                  <Camera size={48} />
                  <p>{error || 'Camera access required'}</p>
                  <button onClick={startCamera} className="retry-btn">
                    <RefreshCw size={16} />
                    Retry
                  </button>
                  <button onClick={() => setShowManualEntry(true)} className="manual-entry-link">
                    Enter manually instead
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="camera-video"
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  
                  <div className="scan-frame-overlay">
                    <div className="scan-corners">
                      <div className="corner top-left" />
                      <div className="corner top-right" />
                      <div className="corner bottom-left" />
                      <div className="corner bottom-right" />
                    </div>
                    <p className="scan-instruction">
                      Position your PAN card within the frame
                    </p>
                  </div>

                  <button className="capture-btn" onClick={captureImage}>
                    <div className="capture-circle" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="preview-view">
              <img src={capturedImage} alt="Captured PAN" className="captured-image" />
              
              {isProcessing ? (
                <div className="processing-overlay">
                  <Loader2 size={40} className="spinner" />
                  <p>Extracting PAN details...</p>
                </div>
              ) : ocrResult ? (
                <div className="ocr-result">
                  <div className="result-header">
                    <CheckCircle size={20} className="success-icon" />
                    <span>Details Extracted</span>
                  </div>
                  
                  <div className="result-fields">
                    <div className="field">
                      <label>PAN Number</label>
                      <span>{ocrResult.panNumber || 'Not detected'}</span>
                    </div>
                    <div className="field">
                      <label>Name</label>
                      <span>{ocrResult.name || 'Not detected'}</span>
                    </div>
                    <div className="field">
                      <label>Date of Birth</label>
                      <span>{ocrResult.dateOfBirth || 'Not detected'}</span>
                    </div>
                  </div>

                  <div className="confidence-badge">
                    Confidence: {ocrResult.confidence || 'low'}
                  </div>
                </div>
              ) : null}

              {error && (
                <div className="error-overlay">
                  <div className="error-message">
                    <p>{error}</p>
                  </div>
                  <button 
                    className="manual-entry-btn"
                    onClick={() => setShowManualEntry(true)}
                  >
                    <FileText size={16} />
                    Enter Details Manually
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="scanner-footer">
          {!capturedImage ? (
            <div className="footer-actions">
              <p className="helper-text">Make sure the card is clearly visible and well-lit</p>
              <button onClick={() => setShowManualEntry(true)} className="manual-link">
                Enter manually
              </button>
            </div>
          ) : (
            <div className="action-buttons">
              <button className="secondary-btn" onClick={retakePhoto}>
                <RefreshCw size={16} />
                Retake
              </button>
              
              {!ocrResult && !isProcessing && !error && (
                <button className="primary-btn" onClick={processImage}>
                  Extract Details
                </button>
              )}
              
              {ocrResult && (
                <button className="primary-btn" onClick={handleConfirm}>
                  Confirm & Continue
                </button>
              )}
              
              {error && !isProcessing && (
                <button className="primary-btn" onClick={processImage}>
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PANScanner;
