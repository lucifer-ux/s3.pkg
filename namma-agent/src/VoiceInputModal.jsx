import { useEffect, useRef, useState, useCallback } from 'react';
import { Check } from 'lucide-react';
import './VoiceInputModal.css';

function VoiceInputModal({ isOpen, onClose, onTranscriptComplete }) {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [audioLevels, setAudioLevels] = useState(new Array(9).fill(0));
  
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if (!isOpen) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript((prev) => {
        const newTranscript = finalTranscript || interimTranscript;
        return prev + (finalTranscript || '');
      });
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      // Restart if still supposed to be listening
      if (isListening) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [isOpen, isListening]);

  // Initialize audio visualization
  useEffect(() => {
    if (!isOpen || !isListening) return;

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        microphone.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        microphoneRef.current = microphone;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const animate = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Get 9 frequency bands for the waveform bars
          const levels = [];
          const step = Math.floor(dataArray.length / 9);
          
          for (let i = 0; i < 9; i++) {
            const value = dataArray[i * step];
            // Normalize to 0-1 range and apply scaling
            const normalized = Math.min(1, (value / 255) * 1.5);
            levels.push(normalized);
          }

          setAudioLevels(levels);
          animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();
      } catch (err) {
        console.error('Audio initialization error:', err);
      }
    };

    initAudio();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isOpen, isListening]);

  const handleDone = useCallback(() => {
    if (transcript.trim()) {
      onTranscriptComplete(transcript.trim());
    }
    handleClose();
  }, [transcript, onTranscriptComplete]);

  const handleClose = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setTranscript('');
    setIsListening(false);
    setAudioLevels(new Array(9).fill(0));
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="voice-input-overlay">
      <div className="voice-input-modal">
        {/* Transcript Display */}
        <div className="transcript-container">
          <p className="transcript-text">
            {transcript || <span className="placeholder">Speak now...</span>}
          </p>
        </div>

        {/* Waveform Animation */}
        <div className="waveform-container">
          {audioLevels.map((level, index) => {
            // Calculate bar properties based on position
            const isCenter = index === 4;
            const distanceFromCenter = Math.abs(index - 4);
            const baseHeight = 20 + (isCenter ? 40 : (3 - distanceFromCenter) * 15);
            const animatedHeight = baseHeight + (level * 60);
            
            return (
              <div
                key={index}
                className="waveform-bar"
                style={{
                  height: `${animatedHeight}px`,
                  opacity: 0.3 + (level * 0.7),
                  backgroundColor: `rgba(91, 79, 207, ${0.5 + level * 0.5})`,
                }}
              />
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="voice-error">
            <p>{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="voice-buttons">
          <button className="cancel-button" onClick={handleClose}>
            Cancel
          </button>
          <button className="done-button" onClick={handleDone}>
            <Check size={20} />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default VoiceInputModal;