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
          width: { ideal: 1280 },
          height: { ideal: 720 }
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
    const ctx = canvas.getContext('2d');

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    const cropSize = Math.min(videoWidth, videoHeight) * 0.7;
    const sx = (videoWidth - cropSize) / 2;
    const sy = (videoHeight - cropSize) / 2;

    canvas.width = cropSize;
    canvas.height = cropSize;

    ctx.drawImage(
      video,
      sx, sy, cropSize, cropSize,
      0, 0, cropSize, cropSize
    );

    const imageData = canvas.toDataURL('image/jpeg', 0.95);
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

      if (!result.data.panNumber) {
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
            <button className="close-btn" onClick={() => setShowManualEntry(false)}>
              <X size={24} />
            </button>
          </div>

          <div className="manual-entry-body">
            <div className="form-group">
              <label>PAN Number</label>
              <input
                type="text"
                maxLength={10}
                placeholder="ABCDE1234F"
                value={manualData.panNumber}
                onChange={(e) => setManualData({ ...manualData, panNumber: e.target.value.toUpperCase() })}
                className={manualData.panNumber && !isValidPAN(manualData.panNumber) ? 'error' : ''}
              />
              {manualData.panNumber && !isValidPAN(manualData.panNumber) && (
                <span className="error-text">Invalid PAN format</span>
              )}
            </div>

            <div className="form-group">
              <label>Full Name (as on PAN)</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={manualData.name}
                onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
              />
            </div>

            <button
              className="submit-manual-btn"
              onClick={handleManualSubmit}
              disabled={!isValidPAN(manualData.panNumber) || !manualData.name.trim()}
            >
              Continue
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pan-scanner-modal">
      <div className="pan-scanner-content">
        <div className="scanner-header">
          <h3>{capturedImage ? 'Review Photo' : 'Scan PAN Card'}</h3>
          <button className="close-btn" onClick={onCancel}>
            <X size={24} />
          </button>
        </div>

        <div className="scanner-body">
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {!capturedImage ? (
            <>
              {!hasPermission ? (
                <div className="permission-error">
                  <Camera size={48} />
                  <p>{error || 'Camera access required'}</p>
                  <button className="retry-btn" onClick={startCamera}>
                    <RefreshCw size={16} />
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="camera-view">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-video"
                  />
                  
                  <div className="scan-overlay">
                    <div className="scan-frame">
                      <div className="corner top-left"></div>
                      <div className="corner top-right"></div>
                      <div className="corner bottom-left"></div>
                      <div className="corner bottom-right"></div>
                    </div>
                    <p className="scan-instruction">Place PAN card inside the frame</p>
                  </div>

                  <button className="capture-btn" onClick={captureImage}>
                    <div className="capture-circle"></div>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="preview-view">
              {!ocrResult ? (
                <>
                  <div className="captured-image-container">
                    <img src={capturedImage} alt="Captured PAN" className="captured-image" />
                  </div>

                  {error && (
                    <div className="error-message">
                      <p>{error}</p>
                      <button className="manual-entry-btn" onClick={() => setShowManualEntry(true)}>
                        <FileText size={16} />
                        Enter manually
                      </button>
                    </div>
                  )}

                  <div className="preview-actions">
                    <button className="action-btn secondary" onClick={retakePhoto}>
                      <RefreshCw size={18} />
                      Retake
                    </button>
                    <button
                      className="action-btn primary"
                      onClick={processImage}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 size={18} className="spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          Use Photo
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="result-view">
                  <div className="success-icon">
                    <CheckCircle size={48} />
                  </div>

                  <h4>PAN Details Extracted</h4>

                  <div className="result-details">
                    <div className="result-item">
                      <span className="label">PAN Number</span>
                      <span className="value">{ocrResult.panNumber}</span>
                    </div>
                    {ocrResult.name && (
                      <div className="result-item">
                        <span className="label">Name</span>
                        <span className="value">{ocrResult.name}</span>
                      </div>
                    )}
                    {ocrResult.dateOfBirth && (
                      <div className="result-item">
                        <span className="label">Date of Birth</span>
                        <span className="value">{ocrResult.dateOfBirth}</span>
                      </div>
                    )}
                  </div>

                  <div className="result-actions">
                    <button className="action-btn secondary" onClick={retakePhoto}>
                      <RefreshCw size={18} />
                      Scan Again
                    </button>
                    <button className="action-btn primary" onClick={handleConfirm}>
                      <CheckCircle size={18} />
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PANScanner;
