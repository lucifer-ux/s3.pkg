import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, User, CheckCircle, RefreshCw, Loader, Shield, Sparkles, AlertCircle } from 'lucide-react';
import { useLoan } from '../context/LoanContext';

const PhotoCapture = () => {
  const navigate = useNavigate();
  const { updateLoanData } = useLoan();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [captureState, setCaptureState] = useState('preview');
  const [countdown, setCountdown] = useState(3);
  const [capturedImage, setCapturedImage] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [facePosition, setFacePosition] = useState({ x: 50, y: 50, size: 60 });
  const [livelinessStep, setLivelinessStep] = useState(0);
  const [livelinessChecks, setLivelinessChecks] = useState([
    { id: 'blink', label: 'Blink Detection', completed: false, icon: '👁️' },
    { id: 'turnLeft', label: 'Turn Left', completed: false, icon: '⬅️' },
    { id: 'turnRight', label: 'Turn Right', completed: false, icon: '➡️' },
    { id: 'smile', label: 'Smile Check', completed: false, icon: '😊' },
  ]);
  const [detectedAge, setDetectedAge] = useState(null);
  const [detectedGender, setDetectedGender] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCameraError(null);
    } catch (err) {
      setCameraActive(true);
      setCameraError('simulation');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (captureState === 'preview' && cameraActive) {
      const faceDetectionInterval = setInterval(() => {
        setFacePosition({
          x: 50 + (Math.random() - 0.5) * 10,
          y: 50 + (Math.random() - 0.5) * 8,
          size: 60 + (Math.random() - 0.5) * 5,
        });
        setFaceDetected(true);
      }, 800);

      return () => clearInterval(faceDetectionInterval);
    }
  }, [captureState, cameraActive]);

  useEffect(() => {
    if (captureState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (captureState === 'countdown' && countdown === 0) {
      capturePhoto();
    }
  }, [captureState, countdown]);

  useEffect(() => {
    if (captureState === 'processing') {
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 2;
        });
      }, 50);

      const livelinessTimeout = setTimeout(() => {
        setLivelinessChecks(prev =>
          prev.map((check, idx) =>
            idx === 0 ? { ...check, completed: true } : check
          )
        );
        setLivelinessStep(1);
      }, 800);

      const livelinessTimeout2 = setTimeout(() => {
        setLivelinessChecks(prev =>
          prev.map((check, idx) =>
            idx <= 1 ? { ...check, completed: true } : check
          )
        );
        setLivelinessStep(2);
      }, 1600);

      const livelinessTimeout3 = setTimeout(() => {
        setLivelinessChecks(prev =>
          prev.map((check, idx) =>
            idx <= 2 ? { ...check, completed: true } : check
          )
        );
        setLivelinessStep(3);
      }, 2400);

      const livelinessTimeout4 = setTimeout(() => {
        setLivelinessChecks(prev =>
          prev.map(check => ({ ...check, completed: true }))
        );
        setLivelinessStep(4);
      }, 3200);

      const resultsTimeout = setTimeout(() => {
        const mockAge = Math.floor(Math.random() * 20) + 25;
        const mockGender = Math.random() > 0.5 ? 'Male' : 'Female';
        setDetectedAge(mockAge);
        setDetectedGender(mockGender);
        setCaptureState('results');

        updateLoanData('customerPhoto', capturedImage);
        updateLoanData('age', mockAge);
        updateLoanData('gender', mockGender);
        updateLoanData('livelinessCheck', true);
      }, 4000);

      return () => {
        clearInterval(progressInterval);
        clearTimeout(livelinessTimeout);
        clearTimeout(livelinessTimeout2);
        clearTimeout(livelinessTimeout3);
        clearTimeout(livelinessTimeout4);
        clearTimeout(resultsTimeout);
      };
    }
  }, [captureState, capturedImage, updateLoanData]);

  const capturePhoto = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCameraError(null);
    } catch (err) {
      setCameraActive(true);
      setCameraError('simulation');
    }
  }, []);

  const startCapture = () => {
    setCaptureState('countdown');
    setCountdown(3);
  };

  const retakePhoto = () => {
    setCaptureState('preview');
    setCapturedImage(null);
    setProcessingProgress(0);
    setLivelinessChecks(prev =>
      prev.map(check => ({ ...check, completed: false }))
    );
    setLivelinessStep(0);
    setDetectedAge(null);
    setDetectedGender(null);
    startCamera();
  };

  const handleContinue = () => {
    navigate('/bureau-check');
  };

  const getLivelinessInstruction = () => {
    const instructions = [
      'Please blink your eyes',
      'Turn your head to the left',
      'Turn your head to the right',
      'Please smile',
      'Analysis complete!',
    ];
    return instructions[livelinessStep] || 'Processing...';
  };

  const getTitleText = () => {
    switch (captureState) {
      case 'preview': return 'Capture Your Photo';
      case 'countdown': return 'Get Ready...';
      case 'processing': return 'Analyzing...';
      case 'results': return 'Verification Complete';
      default: return 'Capture Your Photo';
    }
  };

  const getSubtitleText = () => {
    switch (captureState) {
      case 'preview': return 'Position your face within the frame for age and gender verification';
      case 'countdown': return 'Hold still while we capture your photo';
      case 'processing': return 'Performing liveliness checks and analyzing your photo';
      case 'results': return 'Your identity has been verified successfully';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-pink-200/30 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 px-6 pt-8 pb-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-purple-100">
            <Sparkles className="w-4 h-4 text-[#aa3bff]" />
            <span className="text-sm font-medium text-[#6b6375]">Quick Loan</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-6 relative z-10">
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((step, index) => (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === 2
                  ? 'w-8 bg-gradient-to-r from-indigo-500 to-purple-500'
                  : index < 2
                    ? 'w-4 bg-green-400'
                    : 'w-4 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/25">
            <Camera className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-semibold text-[#08060d] mb-2 leading-tight">
            {getTitleText()}
          </h1>

          <p className="text-[#6b6375] text-sm leading-relaxed max-w-xs mx-auto">
            {getSubtitleText()}
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center mb-6">
          <div className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl shadow-purple-900/20 bg-gray-900">
            {(captureState === 'preview' || captureState === 'countdown') && (
              <>
                {cameraError === 'simulation' ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <User className="w-24 h-24 text-white/40 mx-auto mb-4" />
                        <p className="text-white/60 text-sm">Camera Preview</p>
                      </div>
                    </div>
                    <div className="absolute inset-0 overflow-hidden">
                      <div
                        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                        style={{
                          animation: 'scan 2s linear infinite',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                )}

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className={`relative transition-all duration-500 ${
                      faceDetected ? 'opacity-100 scale-100' : 'opacity-50 scale-95'
                    }`}
                    style={{
                      width: `${facePosition.size}%`,
                      height: `${facePosition.size * 1.3}%`,
                      transform: `translate(${(facePosition.x - 50) * 0.5}px, ${(facePosition.y - 50) * 0.5}px)`,
                    }}
                  >
                    <div
                      className={`absolute inset-0 rounded-full border-2 transition-colors duration-300 ${
                        faceDetected ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]' : 'border-white/60'
                      }`}
                    >
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white/80 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white/80 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white/80 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white/80 rounded-br-lg" />
                    </div>

                    {faceDetected && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-green-500/90 backdrop-blur-sm px-3 py-1 rounded-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-white">Face Detected</span>
                      </div>
                    )}
                  </div>
                </div>

                {captureState === 'countdown' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="text-8xl font-bold text-white animate-in zoom-in duration-300">
                      {countdown}
                    </div>
                  </div>
                )}

                {cameraError && cameraError !== 'simulation' && (
                  <div className="absolute top-4 left-4 right-4 flex items-center gap-2 bg-red-500/90 backdrop-blur-sm px-4 py-2 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-white" />
                    <span className="text-xs font-medium text-white">Camera access denied. Using simulation.</span>
                  </div>
                )}
              </>
            )}

            {captureState === 'processing' && (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center p-6">
                {capturedImage && (
                  <div className="relative w-32 h-32 rounded-2xl overflow-hidden mb-6 border-2 border-white/20">
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                )}

                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-white/10" />
                  <div
                    className="absolute inset-0 w-20 h-20 rounded-full border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin"
                    style={{ animationDuration: '1s' }}
                  />
                  <Loader className="absolute inset-0 m-auto w-8 h-8 text-white animate-pulse" />
                </div>

                <div className="w-full max-w-xs mb-4">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-full transition-all duration-100"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-white/60 text-xs mt-2">{processingProgress}%</p>
                </div>

                <div className="text-center">
                  <p className="text-white font-medium text-lg mb-1">{getLivelinessInstruction()}</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-white/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {captureState === 'results' && (
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex flex-col items-center justify-center p-6">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in duration-500">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <div className="absolute inset-0 w-24 h-24 rounded-full bg-green-400/20 animate-ping" style={{ animationDuration: '2s' }} />
                </div>

                {capturedImage && (
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden mb-6 border-4 border-white shadow-xl">
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                  </div>
                )}

                <h3 className="text-xl font-semibold text-[#08060d] mb-4">Verified!</h3>

                <div className="w-full space-y-3">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-green-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-[#6b6375]">Estimated Age</p>
                          <p className="text-lg font-semibold text-[#08060d]">{detectedAge} years</p>
                        </div>
                      </div>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-green-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                          <span className="text-xl">{detectedGender === 'Female' ? '👩' : '👨'}</span>
                        </div>
                        <div>
                          <p className="text-xs text-[#6b6375]">Detected Gender</p>
                          <p className="text-lg font-semibold text-[#08060d]">{detectedGender}</p>
                        </div>
                      </div>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(captureState === 'processing' || captureState === 'results') && (
            <div className="w-full max-w-sm mt-4 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-purple-100">
              <p className="text-xs font-medium text-[#6b6375] mb-3 uppercase tracking-wide">Liveliness Checks</p>
              <div className="grid grid-cols-2 gap-2">
                {livelinessChecks.map((check, index) => (
                  <div
                    key={check.id}
                    className={`flex items-center gap-2 p-2 rounded-xl transition-all duration-300 ${
                      check.completed
                        ? 'bg-green-50 border border-green-200'
                        : captureState === 'processing' && index === livelinessStep
                          ? 'bg-indigo-50 border border-indigo-200 animate-pulse'
                          : 'bg-gray-50 border border-gray-100'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                        check.completed ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    >
                      {check.completed ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : (
                        <span className="text-xs">{check.icon}</span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium transition-colors duration-300 ${
                        check.completed ? 'text-green-700' : 'text-[#6b6375]'
                      }`}
                    >
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pb-8 pt-4">
          {captureState === 'preview' && (
            <button
              onClick={startCapture}
              disabled={!faceDetected}
              className={`w-full group relative flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                faceDetected
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Camera className="w-5 h-5" />
              <span>Capture Photo</span>
            </button>
          )}

          {captureState === 'results' && (
            <div className="flex gap-3">
              <button
                onClick={retakePhoto}
                className="flex-1 group flex items-center justify-center gap-2 py-4 px-4 rounded-2xl font-semibold text-base bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-300"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Retake</span>
              </button>
              <button
                onClick={handleContinue}
                className="flex-[2] group flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-semibold text-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                <span>Continue</span>
                <CheckCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full">
              <Shield className="w-4 h-4 text-[#aa3bff]" />
              <span className="text-xs font-medium text-[#6b6375]">AI-Powered Verification</span>
            </div>
          </div>
        </div>
      </main>

      <canvas ref={canvasRef} className="hidden" />

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default PhotoCapture;
