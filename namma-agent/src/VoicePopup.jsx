import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, Volume2, X } from 'lucide-react';
import './VoicePopup.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function VoicePopup({
  isOpen,
  onClose,
  userMessage,
  aiResponse,
  onAiFinishedSpeaking,
  onTapToSpeak
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevels, setAudioLevels] = useState(new Array(5).fill(0));
  const [displayedResponse, setDisplayedResponse] = useState('');

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const recognitionRef = useRef(null);
  const lastPlayedResponseRef = useRef('');

  // Stop audio playback
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Summarize text for voice
  const summarizeForVoice = async (text) => {
    try {
      const response = await fetch(`${API_URL}/api/summarize-for-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.warn('Summarization failed, using original text');
        return text;
      }

      const data = await response.json();
      console.log('Summarized for voice:', data.summary);
      return data.summary;
    } catch (error) {
      console.error('Summarize error:', error);
      return text;
    }
  };

  // Play AI response using Amazon Polly
  const playAiResponse = useCallback(async (text) => {
    if (!text || text.trim() === '') return;

    console.log('DEBUG - Raw text received for TTS:', text.substring(0, 200));
    console.log('DEBUG - Text length:', text.length);

    setIsSpeaking(true);

    try {
      // Summarize the text first for voice
      const summarizedText = await summarizeForVoice(text);
      console.log('DEBUG - Text to speak:', summarizedText.substring(0, 200));

      const response = await fetch(`${API_URL}/api/polly/speak-chat-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: summarizedText, isAssistant: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to synthesize speech');
      }

      const data = await response.json();

      // Play the audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(data.audio);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        onAiFinishedSpeaking?.();
      };

      audio.onerror = (err) => {
        console.error('Audio playback error:', err);
        setIsSpeaking(false);
        onAiFinishedSpeaking?.();
      };

      await audio.play();
    } catch (error) {
      console.error('Error playing AI response:', error);
      setIsSpeaking(false);
      onAiFinishedSpeaking?.();
    }
  }, [onAiFinishedSpeaking]);

  // Handle AI response audio playback
  useEffect(() => {
    if (!aiResponse || !isOpen || isListening || isSpeaking) return;

    // Only play if this is a new response (different from last played)
    if (aiResponse !== lastPlayedResponseRef.current) {
      console.log('Playing new AI response:', aiResponse.substring(0, 50) + '...');
      lastPlayedResponseRef.current = aiResponse;
      playAiResponse(aiResponse);
    }
  }, [aiResponse, isOpen, isListening, isSpeaking, playAiResponse]);

  // Reset when popup closes
  useEffect(() => {
    if (!isOpen) {
      lastPlayedResponseRef.current = '';
    }
  }, [isOpen]);

  // Cleanup when popup closes
  useEffect(() => {
    if (!isOpen) {
      stopAudio();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    }
  }, [isOpen, stopAudio]);

  // Start listening for user voice input
  const startListening = useCallback(() => {
    // Stop any playing audio before listening
    stopAudio();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onTapToSpeak(finalTranscript);
        setIsListening(false);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTapToSpeak, stopAudio]);

  // Audio visualization while listening
  useEffect(() => {
    if (!isListening || !isOpen) return;

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        microphone.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const animate = () => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);

          // Get 5 frequency bands for the waveform bars
          const levels = [];
          const step = Math.floor(dataArray.length / 5);

          for (let i = 0; i < 5; i++) {
            const value = dataArray[i * step];
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
  }, [isListening, isOpen]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Handle tap to speak
  const handleTapToSpeak = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Typewriter effect for AI response
  useEffect(() => {
    if (!aiResponse) {
      setDisplayedResponse('');
      return;
    }

    let index = 0;
    setDisplayedResponse('');

    const interval = setInterval(() => {
      if (index < aiResponse.length) {
        setDisplayedResponse(prev => prev + aiResponse.charAt(index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [aiResponse]);

  if (!isOpen) return null;

  return (
    <div className="voice-popup-overlay">
      <div className="voice-popup">
        <button className="voice-popup-close" onClick={onClose}>
          <X size={16} />
        </button>

        <div className="voice-popup-content">
          {isListening ? (
            <>
              <div className="voice-popup-status listening">
                <Mic size={24} />
                <span>Listening...</span>
              </div>
              <div className="voice-popup-waveform">
                {audioLevels.map((level, index) => (
                  <div
                    key={index}
                    className="voice-popup-waveform-bar active"
                    style={{
                      height: `${20 + level * 40}px`,
                      opacity: 0.4 + level * 0.6,
                    }}
                  />
                ))}
              </div>
              <p className="voice-popup-hint">Tap to stop</p>
            </>
          ) : isSpeaking ? (
            <>
              <div className="voice-popup-status speaking">
                <Volume2 size={24} />
                <span>Speaking...</span>
              </div>
              <div className="voice-popup-message">
                {displayedResponse}
              </div>
              <div className="voice-popup-waveform">
                {[...Array(5)].map((_, index) => (
                  <div
                    key={index}
                    className="voice-popup-waveform-bar speaking"
                    style={{
                      animationDelay: `${index * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="voice-popup-status ready">
                <Mic size={24} />
                <span>Tap to speak</span>
              </div>
              {aiResponse && (
                <div className="voice-popup-message">
                  {displayedResponse || aiResponse}
                </div>
              )}
              <p className="voice-popup-hint">
                {aiResponse ? 'Tap the mic to respond' : 'Waiting for your message...'}
              </p>
            </>
          )}
        </div>

        <button
          className={`voice-popup-mic-button ${isListening ? 'listening' : ''}`}
          onClick={handleTapToSpeak}
        >
          <Mic size={32} />
        </button>
      </div>
    </div>
  );
}

export default VoicePopup;
