import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Detects whether the current device is a mobile browser (Android, iOS, iPadOS).
 * Mobile OSes enforce strict single-client microphone hardware access.
 */
export function isMobileBrowser() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (Boolean(navigator.maxTouchPoints) && navigator.maxTouchPoints > 1 && !/Windows|Macintosh/i.test(navigator.userAgent));
}

export function useSpeechRecognition(options = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0); // 0 - 100 real-time mic volume level
  const [isPauseDetected, setIsPauseDetected] = useState(false);
  const [isSpeakingDetected, setIsSpeakingDetected] = useState(false);
  const [lang, setLang] = useState(options.defaultLang || 'en-US');
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);

  const autoStopOnPause = options.autoStopOnPause !== false;
  const pauseTimeoutMs = options.pauseTimeoutMs || 1800; // 1.8 seconds conversational pause
  const onSpeechEnd = options.onSpeechEnd;

  // Timing metadata for evaluation engine
  const [timing, setTiming] = useState({
    micStartTime: null,
    firstResultTime: null,
    resultTimestamps: []
  });

  const recognitionRef = useRef(null);
  const shouldBeListeningRef = useRef(false);
  const hasSpokenRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const accumulatedFinalRef = useRef('');
  const currentSessionFinalRef = useRef('');
  const fullTranscriptRef = useRef('');
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const isSpeechRecSupported = typeof window !== 'undefined' && 
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearRecordedAudio = useCallback(() => {
    if (recordedAudioUrl) {
      try {
        URL.revokeObjectURL(recordedAudioUrl);
      } catch (e) {}
    }
    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);
    audioChunksRef.current = [];
  }, [recordedAudioUrl]);

  // Setup lightweight volume analyser via Web Audio without exclusive hardware DSP locks
  const startAudioMonitoring = useCallback(async () => {
    // CRITICAL MOBILE FIX:
    // On Android and iOS, the mobile OS only allows ONE active microphone capture client per app.
    // If getUserMedia opens the microphone on mobile, webkitSpeechRecognition is starved and fails to convert voice to text!
    // Therefore on mobile, we completely bypass getUserMedia so SpeechRecognition has exclusive, uninterrupted hardware mic access.
    if (isMobileBrowser()) {
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      streamRef.current = stream;

      // On desktop, also record audio if supported
      try {
        const mimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/mp4',
          ''
        ];
        const supportedMime = mimeTypes.find(type => !type || (window.MediaRecorder && MediaRecorder.isTypeSupported(type)));
        
        audioChunksRef.current = [];
        const recorder = supportedMime 
          ? new MediaRecorder(stream, { mimeType: supportedMime })
          : new MediaRecorder(stream);
          
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          if (audioChunksRef.current.length > 0) {
            const blobType = audioChunksRef.current[0].type || 'audio/webm';
            const blob = new Blob(audioChunksRef.current, { type: blobType });
            const url = URL.createObjectURL(blob);
            setRecordedAudioBlob(blob);
            setRecordedAudioUrl(url);
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(250);
      } catch (recErr) {
        console.warn('MediaRecorder setup skipped:', recErr);
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.3;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevel = () => {
          if (!shouldBeListeningRef.current) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const scaled = Math.min(100, Math.round((avg / 28) * 100));
          setAudioLevel(scaled);

          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }
    } catch (e) {
      console.warn('Microphone audio monitoring skipped:', e);
    }
  }, []);

  const stopAudioMonitoring = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {}
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
    setIsSpeakingDetected(false);
  }, []);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    shouldBeListeningRef.current = false;

    // Flush any pending interim speech into the full transcript
    setInterimTranscript(currentInterim => {
      if (currentInterim && currentInterim.trim()) {
        setTranscript(prev => {
          const combined = [prev, currentInterim.trim()].filter(Boolean).join(' ').trim();
          accumulatedFinalRef.current = combined;
          fullTranscriptRef.current = combined;
          return combined;
        });
      }
      return '';
    });

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    stopAudioMonitoring();
    setIsListening(false);

    return fullTranscriptRef.current;
  }, [clearSilenceTimer, stopAudioMonitoring]);

  const abortListening = useCallback(() => {
    clearSilenceTimer();
    shouldBeListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    stopAudioMonitoring();
    setIsListening(false);
    setInterimTranscript('');
    setIsPauseDetected(false);
    setIsSpeakingDetected(false);
  }, [clearSilenceTimer, stopAudioMonitoring]);

  const resetTranscript = useCallback(() => {
    clearSilenceTimer();
    clearRecordedAudio();
    hasSpokenRef.current = false;
    setIsPauseDetected(false);
    setIsSpeakingDetected(false);
    accumulatedFinalRef.current = '';
    currentSessionFinalRef.current = '';
    fullTranscriptRef.current = '';
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
  }, [clearSilenceTimer, clearRecordedAudio]);

  const getTranscript = useCallback(() => {
    return fullTranscriptRef.current || transcript || '';
  }, [transcript]);

  const startListening = useCallback((customLang = null) => {
    if (!isSpeechRecSupported) {
      setError('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      setErrorCode('browser-unsupported');
      return;
    }

    resetTranscript();
    shouldBeListeningRef.current = true;
    hasSpokenRef.current = false;
    setIsPauseDetected(false);
    setIsSpeakingDetected(false);

    // Start audio monitoring (only on desktop where supported)
    startAudioMonitoring();

    const selectedLang = customLang || lang || 'en-US';
    const isMobile = isMobileBrowser();

    try {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRec();
      recognitionRef.current = recognition;

      // On Android Chrome, continuous = true often fails or drops connection; single-shot intent with chained onend works reliably!
      recognition.continuous = !isMobile;
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
        if (isMobile) {
          setAudioLevel(35);
        }
      };

      recognition.onspeechstart = () => {
        setIsSpeakingDetected(true);
        if (isMobile) {
          setAudioLevel(75);
        }
      };

      recognition.onspeechend = () => {
        setIsSpeakingDetected(false);
        if (isMobile) {
          setAudioLevel(20);
        }
      };

      recognition.onresult = (event) => {
        const now = Date.now();
        let currentSessionFinal = '';
        let interimTrans = '';
        let latestConf = 0.92;
        let hasNewSpeech = false;

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (text.trim()) {
            hasNewSpeech = true;
          }
          if (res.isFinal) {
            currentSessionFinal += (currentSessionFinal ? ' ' : '') + text.trim();
            if (res[0]?.confidence !== undefined && res[0].confidence > 0) {
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

        const fullFinal = [accumulatedFinalRef.current, currentSessionFinal].filter(Boolean).join(' ').trim();
        const combined = [fullFinal, interimTrans].filter(Boolean).join(' ').trim();

        fullTranscriptRef.current = combined;
        
        if (fullFinal) {
          setTranscript(fullFinal);
          setConfidence(latestConf);
        }
        setInterimTranscript(interimTrans);

        if (isMobile) {
          setAudioLevel(85);
        }

        // Smart silence / pause detection:
        // Once the user has spoken, start a countdown timer.
        // If no new speech is heard for `pauseTimeoutMs` (e.g. 1.8s), auto-stop listening.
        if (hasNewSpeech || fullFinal || interimTrans) {
          hasSpokenRef.current = true;
          clearSilenceTimer();

          if (autoStopOnPause) {
            silenceTimerRef.current = setTimeout(() => {
              if (shouldBeListeningRef.current && hasSpokenRef.current) {
                setIsPauseDetected(true);
                const finalResult = fullTranscriptRef.current || fullFinal || interimTrans;
                stopListening();
                if (typeof onSpeechEnd === 'function') {
                  onSpeechEnd(finalResult);
                }
              }
            }, pauseTimeoutMs);
          }
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
          // If user already spoke and no-speech fires, conclude listening
          if (hasSpokenRef.current && autoStopOnPause) {
            setIsPauseDetected(true);
            const finalResult = fullTranscriptRef.current;
            stopListening();
            if (typeof onSpeechEnd === 'function') {
              onSpeechEnd(finalResult);
            }
          }
          return;
        }

        if (event.error === 'aborted') {
          return;
        }

        console.warn('Speech recognition error event:', event.error);
        setErrorCode(event.error);

        if (event.error === 'not-allowed') {
          setError('Microphone access was denied. Please allow microphone permissions in your mobile browser address bar.');
          shouldBeListeningRef.current = false;
          setIsListening(false);
          stopAudioMonitoring();
        } else if (event.error === 'audio-capture') {
          setError('Microphone hardware error. Please check your device microphone.');
          shouldBeListeningRef.current = false;
          setIsListening(false);
          stopAudioMonitoring();
        } else if (event.error === 'network') {
          setError('Speech service network issue. You can speak again, or tap the microphone icon on your mobile keyboard to dictate.');
          if (shouldBeListeningRef.current) {
            setTimeout(() => {
              if (shouldBeListeningRef.current && recognitionRef.current) {
                try { recognitionRef.current.start(); } catch (e) {}
              }
            }, 600);
          }
        } else {
          setError(`Speech recognition notice: ${event.error}. You can also dictate with your mobile keyboard.`);
        }
      };

      recognition.onend = () => {
        // If user already spoke and paused, conclude listening gracefully
        if (hasSpokenRef.current && autoStopOnPause) {
          setIsPauseDetected(true);
          shouldBeListeningRef.current = false;
          setIsListening(false);
          stopAudioMonitoring();
          return;
        }

        // If on mobile or still listening and user hasn't paused/cancelled, keep microphone open
        if (shouldBeListeningRef.current) {
          if (currentSessionFinalRef.current) {
            accumulatedFinalRef.current = [accumulatedFinalRef.current, currentSessionFinalRef.current].filter(Boolean).join(' ').trim();
            currentSessionFinalRef.current = '';
          }

          try {
            recognition.start();
          } catch (e) {
            // Ignore if already active
          }
        } else {
          setIsListening(false);
          stopAudioMonitoring();
        }
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setError('Unable to start microphone speech engine. Please tap Start Microphone or use keyboard dictation.');
      setErrorCode('start-failure');
      setIsListening(false);
      stopAudioMonitoring();
    }
  }, [isSpeechRecSupported, lang, resetTranscript, startAudioMonitoring, stopAudioMonitoring, autoStopOnPause, pauseTimeoutMs, onSpeechEnd, clearSilenceTimer, stopListening]);

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      clearRecordedAudio();
      shouldBeListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      stopAudioMonitoring();
    };
  }, [clearSilenceTimer, clearRecordedAudio, stopAudioMonitoring]);

  // Combined full transcript (finalized + interim in progress)
  const combinedTranscript = [transcript, interimTranscript].filter(Boolean).join(' ').trim();

  return {
    isSupported: isSpeechRecSupported,
    isListening,
    isMobile: isMobileBrowser(),
    transcript,
    setTranscript,
    interimTranscript,
    combinedTranscript,
    fullTranscript: fullTranscriptRef.current || combinedTranscript,
    audioLevel,
    isPauseDetected,
    isSpeakingDetected,
    lang,
    setLang,
    error,
    errorCode,
    confidence,
    timing,
    recordedAudioUrl,
    recordedAudioBlob,
    clearRecordedAudio,
    getTranscript,
    startListening,
    stopListening,
    abortListening,
    resetTranscript
  };
}
