import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeechRecognition(options = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0); // 0 - 100 real-time mic volume level
  const [lang, setLang] = useState(options.defaultLang || 'en-US');

  // Timing metadata for evaluation engine
  const [timing, setTiming] = useState({
    micStartTime: null,
    firstResultTime: null,
    resultTimestamps: []
  });

  const recognitionRef = useRef(null);
  const shouldBeListeningRef = useRef(false);
  const accumulatedFinalRef = useRef('');
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);
  const currentSessionFinalRef = useRef('');

  const isSpeechRecSupported = typeof window !== 'undefined' && 
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Setup hardware Automatic Gain Control (AGC) & volume analyser via Web Audio
  const startAudioMonitoring = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

      // Request hardware microphone stream with Auto Gain Control, Noise Suppression, & Echo Cancellation
      // This commands the OS/browser HAL to dynamically boost low-volume voices
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          noiseSuppression: true,
          echoCancellation: true,
          channelCount: 1
        }
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevel = () => {
          if (!shouldBeListeningRef.current) return;
          analyser.getByteFrequencyData(dataArray);

          // Compute average frequency magnitude
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Scale non-linearly with high sensitivity for quiet/normal speaking voices
          const scaled = Math.min(100, Math.round((avg / 35) * 100));
          setAudioLevel(scaled);

          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }
    } catch (e) {
      console.warn('Microphone hardware AGC setup skipped:', e);
    }
  }, []);

  const stopAudioMonitoring = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (e) {}
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const stopListening = useCallback(() => {
    shouldBeListeningRef.current = false;

    // Flush any pending interim speech into the final transcript
    setInterimTranscript(currentInterim => {
      if (currentInterim && currentInterim.trim()) {
        setTranscript(prev => {
          const combined = [prev, currentInterim.trim()].filter(Boolean).join(' ');
          accumulatedFinalRef.current = combined;
          return combined;
        });
      }
      return '';
    });

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Recognition might already be stopped
      }
    }

    stopAudioMonitoring();
    setIsListening(false);
  }, [stopAudioMonitoring]);

  const abortListening = useCallback(() => {
    shouldBeListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore
      }
    }
    stopAudioMonitoring();
    setIsListening(false);
    setInterimTranscript('');
  }, [stopAudioMonitoring]);

  const resetTranscript = useCallback(() => {
    accumulatedFinalRef.current = '';
    currentSessionFinalRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setErrorCode(null);
    setConfidence(null);
    setAudioLevel(0);
    setTiming({
      micStartTime: null,
      firstResultTime: null,
      resultTimestamps: []
    });
  }, []);

  const startListening = useCallback((customLang = null) => {
    if (!isSpeechRecSupported) {
      setError('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      setErrorCode('browser-unsupported');
      return;
    }

    resetTranscript();
    shouldBeListeningRef.current = true;
    startAudioMonitoring();

    const selectedLang = customLang || lang || 'en-US';

    try {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRec();
      recognitionRef.current = recognition;

      // continuous = true keeps the microphone open across pauses so users do not get cut off
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang;
      recognition.maxAlternatives = 1;

      const startTime = Date.now();
      let firstResultLogged = false;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        setErrorCode(null);
        setTiming(prev => ({ ...prev, micStartTime: startTime }));
      };

      recognition.onresult = (event) => {
        const now = Date.now();
        let currentSessionFinal = '';
        let interimTrans = '';
        let latestConf = 0.92;

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0].transcript;
          if (res.isFinal) {
            currentSessionFinal += (currentSessionFinal ? ' ' : '') + text.trim();
            if (res[0].confidence !== undefined && res[0].confidence > 0) {
              latestConf = res[0].confidence;
            }
          } else {
            interimTrans += (interimTrans ? ' ' : '') + text.trim();
          }
        }

        currentSessionFinalRef.current = currentSessionFinal;

        setTiming(prev => {
          const first = prev.firstResultTime || (firstResultLogged ? prev.firstResultTime : now);
          firstResultLogged = true;
          return {
            ...prev,
            firstResultTime: first,
            resultTimestamps: [...prev.resultTimestamps, now]
          };
        });

        // Combine any previously accumulated finalized text with the current session final text
        const fullFinal = [accumulatedFinalRef.current, currentSessionFinal].filter(Boolean).join(' ').trim();
        
        if (fullFinal) {
          setTranscript(fullFinal);
          setConfidence(latestConf);
        }
        setInterimTranscript(interimTrans);
      };

      recognition.onerror = (event) => {
        // 'no-speech' is a non-fatal silence event in continuous mode; do NOT kill listening
        if (event.error === 'no-speech') {
          return;
        }

        // 'aborted' happens during normal teardown; ignore
        if (event.error === 'aborted') {
          return;
        }

        console.warn('Speech recognition error event:', event.error);
        setErrorCode(event.error);

        if (event.error === 'not-allowed') {
          setError('Microphone access was denied. Please allow microphone permissions in your browser address bar.');
          shouldBeListeningRef.current = false;
          setIsListening(false);
          stopAudioMonitoring();
        } else if (event.error === 'audio-capture') {
          setError('Microphone hardware error. Please check if your microphone is connected and working.');
          shouldBeListeningRef.current = false;
          setIsListening(false);
          stopAudioMonitoring();
        } else if (event.error === 'network') {
          // If network hiccups, don't crash; let onend attempt restart if still active
          console.warn('Speech recognition network glitch; attempting auto-recovery');
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // If the user hasn't explicitly stopped listening, automatically restart recognition
        // This prevents Chrome from cutting the user off after quiet pauses
        if (shouldBeListeningRef.current) {
          // Save what we have accumulated so far before the session recycled
          if (currentSessionFinalRef.current) {
            accumulatedFinalRef.current = [accumulatedFinalRef.current, currentSessionFinalRef.current].filter(Boolean).join(' ').trim();
            currentSessionFinalRef.current = '';
          }

          try {
            recognition.start();
          } catch (e) {
            // If already starting, ignore
          }
        } else {
          setIsListening(false);
          stopAudioMonitoring();
        }
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setError('Unable to start microphone. Please check permissions.');
      setErrorCode('start-failure');
      setIsListening(false);
      stopAudioMonitoring();
    }
  }, [isSpeechRecSupported, lang, resetTranscript, startAudioMonitoring, stopAudioMonitoring]);

  useEffect(() => {
    return () => {
      shouldBeListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      stopAudioMonitoring();
    };
  }, [stopAudioMonitoring]);

  // Combined full transcript (finalized + interim in progress)
  const combinedTranscript = [transcript, interimTranscript].filter(Boolean).join(' ').trim();

  return {
    isSupported: isSpeechRecSupported,
    isListening,
    transcript,
    setTranscript,
    interimTranscript,
    combinedTranscript,
    audioLevel,
    lang,
    setLang,
    error,
    errorCode,
    confidence,
    timing,
    startListening,
    stopListening,
    abortListening,
    resetTranscript
  };
}
