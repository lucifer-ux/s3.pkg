import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoan } from '../context/LoanContext';
import { 
  Camera, 
  Upload, 
  Scan, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  X,
  ChevronLeft,
  Keyboard,
  Loader2
} from 'lucide-react';

// PAN Validation: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const PANScanner = () => {
  const navigate = useNavigate();
  const { updateLoanData } = useLoan();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  // State
  const [panNumber, setPanNumber] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');

  // Validate PAN format
  const validatePAN = useCallback((pan) => {
    return PAN_REGEX.test(pan.toUpperCase());
  }, []);

  // Handle PAN input change
  const handlePANChange = (e) => {
    const value = e.target.value.toUpperCase();
    // Only allow alphanumeric, max 10 chars
    if (/^[A-Z0-9]*$/.test(value) && value.length <= 10) {
      setPanNumber(value);
      setError('');
    }
  };

  // Simulate OCR processing
  const simulateOCR = useCallback(() => {
    setIsScanning(true);
    setError('');

    // Simulate OCR processing time (2-3 seconds)
    setTimeout(() => {
      setIsScanning(false);
      
      // For demo: auto-fill a valid PAN after scan
      const demoPAN = 'ABCDE1234F';
      setPanNumber(demoPAN);
      setScanSuccess(true);
      
      // Store in context and navigate after brief success display
      setTimeout(() => {
        updateLoanData('panNumber', demoPAN);
        navigate('/photo-capture');
      }, 1500);
    }, 2500);
  }, [navigate, updateLoanData]);

  // Start camera access
  const startCamera = useCallback(async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please use file upload instead.');
      setIsCameraActive(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target.result);
        simulateOCR();
      };
      reader.readAsDataURL(file);
    }
  }, [simulateOCR]);

  // Capture from camera
  const captureFromCamera = useCallback(() => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageData);
      stopCamera();
      simulateOCR();
    }
  }, [simulateOCR, stopCamera]);

  // Handle manual PAN submit
  const handleManualSubmit = useCallback(() => {
    if (!panNumber) {
      setError('Please enter your PAN number');
      return;
    }

    if (!validatePAN(panNumber)) {
      setError('Invalid PAN format. Expected: ABCDE1234F');
      return;
    }

    updateLoanData('panNumber', panNumber);
    navigate('/photo-capture');
  }, [panNumber, validatePAN, updateLoanData, navigate]);

  // Toggle between camera and manual entry
  const toggleManualEntry = useCallback(() => {
    setShowManualEntry(!showManualEntry);
    setError('');
    if (isCameraActive) {
      stopCamera();
    }
  }, [showManualEntry, isCameraActive, stopCamera]);

  // Go back
  const handleBack = useCallback(() => {
    stopCamera();
    navigate(-1);
  }, [navigate, stopCamera]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-indigo-100 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-indigo-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-base font-semibold text-slate-800">PAN Verification</h1>
          <div className="w-9" /> {/* Spacer for alignment */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-indigo-200" />
          <div className="w-8 h-0.5 bg-indigo-600" />
          <div className="w-2 h-2 rounded-full bg-indigo-600" />
          <div className="w-8 h-0.5 bg-indigo-200" />
          <div className="w-2 h-2 rounded-full bg-indigo-200" />
        </div>

        {/* Title Section */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Scan your PAN Card
          </h2>
          <p className="text-sm text-slate-500">
            Position your PAN card within the frame to scan automatically
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Camera Error */}
        {cameraError && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700">{cameraError}</p>
          </div>
        )}

        {!showManualEntry ? (
          <>
            {/* Camera / Upload Area */}
            <div className="relative mb-6">
              <div className="relative aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
                {isCameraActive ? (
                  <>
                    {/* Live Camera Feed */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Scanning Frame Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Corner Markers */}
                      <div className="absolute top-6 left-6 w-12 h-12 border-l-4 border-t-4 border-indigo-400 rounded-tl-lg" />
                      <div className="absolute top-6 right-6 w-12 h-12 border-r-4 border-t-4 border-indigo-400 rounded-tr-lg" />
                      <div className="absolute bottom-6 left-6 w-12 h-12 border-l-4 border-b-4 border-indigo-400 rounded-bl-lg" />
                      <div className="absolute bottom-6 right-6 w-12 h-12 border-r-4 border-b-4 border-indigo-400 rounded-br-lg" />
                      
                      {/* Center Guide Text */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-64 h-40 border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center">
                          <span className="text-white/50 text-xs">Align PAN card here</span>
                        </div>
                      </div>
                    </div>

                    {/* Capture Button */}
                    <button
                      onClick={captureFromCamera}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
                    >
                      <div className="w-12 h-12 bg-indigo-600 rounded-full" />
                    </button>

                    {/* Close Camera Button */}
                    <button
                      onClick={stopCamera}
                      className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </>
                ) : capturedImage ? (
                  <>
                    {/* Captured Image Preview */}
                    <img
                      src={capturedImage}
                      alt="Captured PAN"
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Scanning Overlay */}
                    {isScanning && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                        <div className="relative mb-4">
                          <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                          <Scan className="w-6 h-6 text-white absolute inset-0 m-auto" />
                        </div>
                        <p className="text-white font-medium animate-pulse">Scanning...</p>
                        <p className="text-white/60 text-sm mt-1">Extracting PAN details</p>
                      </div>
                    )}

                    {/* Success Overlay */}
                    {scanSuccess && (
                      <div className="absolute inset-0 bg-indigo-600/90 flex flex-col items-center justify-center animate-in fade-in">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 animate-in zoom-in">
                          <CheckCircle2 className="w-8 h-8 text-indigo-600" />
                        </div>
                        <p className="text-white font-medium">PAN Detected!</p>
                        <p className="text-white/80 text-sm mt-1">{panNumber}</p>
                      </div>
                    )}

                    {/* Retake Button */}
                    {!isScanning && !scanSuccess && (
                      <button
                        onClick={() => {
                          setCapturedImage(null);
                          setPanNumber('');
                        }}
                        className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 text-white text-sm rounded-full hover:bg-black/70 transition-colors"
                      >
                        Retake
                      </button>
                    )}
                  </>
                ) : (
                  /* Placeholder / Upload Area */
                  <div className="w-full h-full flex flex-col items-center justify-center p-6">
                    <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                      <Camera className="w-10 h-10 text-indigo-600" />
                    </div>
                    <p className="text-white/80 text-sm text-center mb-4">
                      Take a photo of your PAN card or upload from gallery
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={startCamera}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Open Camera
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Scanning Laser Animation (when camera is active) */}
              {isCameraActive && !capturedImage && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                  <div 
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                    style={{
                      animation: 'scanMove 2s ease-in-out infinite'
                    }}
                  />
                </div>
              )}
            </div>

            {/* OR Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Manual Entry Toggle */}
            <button
              onClick={toggleManualEntry}
              className="w-full py-3 px-4 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
            >
              <Keyboard className="w-4 h-4" />
              Enter PAN Manually
            </button>
          </>
        ) : (
          /* Manual Entry Form */
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Enter PAN Number</h3>
              <button
                onClick={toggleManualEntry}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                PAN Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={panNumber}
                  onChange={handlePANChange}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-mono uppercase tracking-wider placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                {panNumber.length === 10 && validatePAN(panNumber) && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              
              {/* Character Counter */}
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-slate-500">
                  Format: 5 letters + 4 digits + 1 letter
                </p>
                <span className={`text-xs ${panNumber.length === 10 ? 'text-slate-400' : 'text-slate-400'}`}>
                  {panNumber.length}/10
                </span>
              </div>
            </div>

            {/* PAN Format Help */}
            <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <p className="text-xs text-indigo-700">
                <span className="font-semibold">Example:</span> ABCDE1234F
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                Your PAN is a 10-character alphanumeric code found on your PAN card
              </p>
            </div>

            <button
              onClick={handleManualSubmit}
              disabled={!validatePAN(panNumber)}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            Your PAN is required for KYC verification as per RBI guidelines
          </p>
        </div>
      </main>

      {/* CSS for scanning animation */}
      <style>{`
        @keyframes scanMove {
          0%, 100% {
            top: 10%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          50% {
            top: 90%;
          }
        }
      `}</style>
    </div>
  );
};

export default PANScanner;
