import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Headphones } from 'lucide-react';
import VoicePopup from './VoicePopup';
import './EarphoneTest.css';

function EarphoneTest() {
  const [logs, setLogs] = useState([]);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  const logsEndRef = useRef(null);
  const audioRef = useRef(null);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const enableEarphoneControls = async () => {
    try {
      const audio = new Audio('/silent.mp3');
      audio.loop = true;

      // 🔥 IMPORTANT: macOS ignores near-zero volume
      audio.volume = 0.2;

      // Debug listeners
      audio.onplay = () => addLog('🎵 Audio is PLAYING');
      audio.onpause = () => addLog('⏸ Audio PAUSED');
      audio.onerror = () => addLog('❌ Audio ERROR');

      await audio.play();

      audioRef.current = audio;
      setIsEnabled(true);

      addLog('✅ Audio playback started');
      addLog('🎧 Earphone controls should now work');

      setupMediaSession();

    } catch (err) {
      addLog('❌ Failed to start audio. Click again.');
    }
  };

  const setupMediaSession = () => {
    if (!('mediaSession' in navigator)) {
      addLog('⚠ Media Session API NOT supported');
      return;
    }

    addLog('✅ Media Session API supported');

    navigator.mediaSession.metadata = new MediaMetadata({
      title: "Earphone Test",
      artist: "Test App",
    });

    navigator.mediaSession.playbackState = "playing";

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('🎧 Single tap detected!');
        setIsVoiceOpen(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('🎧 Pause detected');
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => console.log('Double tap'));
      navigator.mediaSession.setActionHandler('previoustrack', () => console.log('Triple tap'));
    } catch (e) {
      addLog('⚠ Media action not supported');
    }
  };

  // 🔥 Auto-recover audio if browser pauses it
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && audioRef.current) {
        try {
          await audioRef.current.play();
          addLog('🔁 Audio resumed on visibility');
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

  // 🔥 Keep forcing audio alive (macOS workaround)
  useEffect(() => {
    const interval = setInterval(() => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
        addLog('🔁 Auto-resumed audio');
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    addLog('Earphone Test Page Loaded');
    addLog('⚠ Use Chrome browser');
    addLog('⚠ Close Spotify / Apple Music');
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="earphone-test-page">
      <div className="test-header">
        <a href="/" className="back-button">
          <ChevronLeft size={20} />
          Back to Chat
        </a>
        <h1><Headphones size={24} /> Earphone Test</h1>
      </div>

      <div className="test-instructions">
        <h3>Steps:</h3>
        <ol>
          <li>Connect Bluetooth earphones</li>
          <li>Close Spotify / Apple Music</li>
          <li>Click enable button</li>
          <li>Tap play/pause on earphones</li>
        </ol>

        <button 
          className="simulate-btn" 
          onClick={enableEarphoneControls}
          disabled={isEnabled}
        >
          {isEnabled ? '✅ Enabled' : 'Enable Earphone Controls'}
        </button>
      </div>

      <div className="test-status">
        <div className={`status-indicator ${isVoiceOpen ? 'active' : ''}`}>
          {isVoiceOpen 
            ? '🎤 Voice Input OPENED' 
            : isEnabled 
              ? '⏳ Waiting for earphone tap...' 
              : '⚠ Enable controls first'}
        </div>
      </div>

      <div className="logs-container">
        <h4>Event Logs:</h4>
        <div className="logs-scroll">
          {logs.map((log, i) => (
            <div key={i} className="log-line">{log}</div>
          ))}
          <div ref={logsEndRef} />
        </div>

        <button 
          className="clear-logs-btn" 
          onClick={() => setLogs([])}
        >
          Clear Logs
        </button>
      </div>

      <VoicePopup
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        userMessage=""
        aiResponse=""
        onAiFinishedSpeaking={() => {}}
        onTapToSpeak={() => {}}
      />
    </div>
  );
}

export default EarphoneTest;