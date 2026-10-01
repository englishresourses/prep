import { useState, useEffect, useRef, useCallback } from 'react';
import { getAppSettings, saveAppSettings } from '../services/storage';

export function useSpeechSynthesis() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoiceState] = useState(null);
  const [rate, setRateState] = useState(() => getAppSettings().speechRate || 1.0);
  const [replayCount, setReplayCount] = useState(0);
  const maxReplays = 2;

  const utteranceRef = useRef(null);
  const fullTextRef = useRef('');
  const charIndexRef = useRef(0);
  const activeOptionsRef = useRef({});

  const setSelectedVoice = useCallback((voice) => {
    setSelectedVoiceState(voice);
    if (voice && voice.name) {
      saveAppSettings({ preferredVoiceName: voice.name });
    }
  }, []);

  const setRate = useCallback((newRate) => {
    setRateState(newRate);
    saveAppSettings({ speechRate: newRate });
  }, []);

  // Load browser voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices && availableVoices.length > 0) {
        // Sort voices: English voices first, then alphabetical by name
        const sorted = [...availableVoices].sort((a, b) => {
          const aIsEn = a.lang.toLowerCase().startsWith('en');
          const bIsEn = b.lang.toLowerCase().startsWith('en');
          if (aIsEn && !bIsEn) return -1;
          if (!aIsEn && bIsEn) return 1;
          return a.name.localeCompare(b.name);
        });

        setVoices(sorted);

        // Check if user previously saved a preferred voice
        const savedVoiceName = getAppSettings().preferredVoiceName;
        let preferred = savedVoiceName ? sorted.find(v => v.name === savedVoiceName) : null;

        // Preference 1: Microsoft Mark - English (United States) (en-US)
        if (!preferred) {
          preferred = sorted.find(v => {
            const name = v.name.toLowerCase();
            const lang = v.lang.toLowerCase().replace('_', '-');
            return name.includes('mark') && (lang.startsWith('en-us') || name.includes('united states') || lang.startsWith('en'));
          });
        }

        // Preference 2: Any voice containing 'mark'
        if (!preferred) {
          preferred = sorted.find(v => v.name.toLowerCase().includes('mark'));
        }

        // Preference 3: Any Microsoft US English voice
        if (!preferred) {
          preferred = sorted.find(v => {
            const name = v.name.toLowerCase();
            const lang = v.lang.toLowerCase().replace('_', '-');
            return name.includes('microsoft') && (lang === 'en-us' || lang.startsWith('en-us'));
          });
        }

        // Preference 4: Any US English voice (en-US)
        if (!preferred) {
          preferred = sorted.find(v => {
            const lang = v.lang.toLowerCase().replace('_', '-');
            return lang === 'en-us' || lang.startsWith('en-us');
          });
        }

        // Preference 5: Any English voice
        if (!preferred) {
          preferred = sorted.find(v => v.lang.toLowerCase().startsWith('en'));
        }

        setSelectedVoiceState(preferred || sorted[0]);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    charIndexRef.current = 0;
  }, []);

  // Internal helper to speak text or remaining text
  const speakInternal = useCallback((text, fromOffset = 0) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    // Always clear ongoing speech queue
    window.speechSynthesis.cancel();

    const textToSpeak = fromOffset > 0 ? text.slice(fromOffset) : text;
    if (!textToSpeak.trim()) {
      setIsPlaying(false);
      setIsPaused(false);
      if (activeOptionsRef.current.onEnd) activeOptionsRef.current.onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance;

    const voiceToUse = activeOptionsRef.current.voice || selectedVoice;
    if (voiceToUse) {
      utterance.voice = voiceToUse;
    }

    const currentRate = activeOptionsRef.current.rate !== undefined ? activeOptionsRef.current.rate : rate;
    utterance.rate = currentRate;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      if (activeOptionsRef.current.onStart) activeOptionsRef.current.onStart();
    };

    // Track position on word boundary to support 100% reliable pause & resume
    utterance.onboundary = (e) => {
      if (typeof e.charIndex === 'number') {
        charIndexRef.current = fromOffset + e.charIndex;
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      charIndexRef.current = 0;
      if (activeOptionsRef.current.onEnd) activeOptionsRef.current.onEnd();
    };

    utterance.onerror = (e) => {
      // Don't treat user-initiated cancel as an error
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('SpeechSynthesis error:', e);
      }
      setIsPlaying(false);
      setIsPaused(false);
      if (activeOptionsRef.current.onError) activeOptionsRef.current.onError(e);
      if (activeOptionsRef.current.onEnd) activeOptionsRef.current.onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }, [selectedVoice, rate]);

  const speak = useCallback((text, options = {}) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      if (options.onEnd) options.onEnd();
      return;
    }

    if (!text) {
      if (options.onEnd) options.onEnd();
      return;
    }

    // Check replay limit if requested
    if (options.trackReplay) {
      if (replayCount >= maxReplays) {
        console.warn('Max replay limit reached.');
        return false;
      }
      setReplayCount(prev => prev + 1);
    }

    fullTextRef.current = text;
    charIndexRef.current = 0;
    activeOptionsRef.current = options;

    speakInternal(text, 0);
    return true;
  }, [replayCount, maxReplays, speakInternal]);

  /**
   * Resilient Pause: Chromium's native pause() often freezes audio indefinitely.
   * We record the current charIndex and cancel the audio output safely.
   */
  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Cancel active speech so audio thread releases
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(true);
    }
  }, []);

  /**
   * Resilient Resume: Restarts utterance from the exact saved charIndex boundary.
   */
  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (!fullTextRef.current) return;
      setIsPaused(false);
      speakInternal(fullTextRef.current, charIndexRef.current);
    }
  }, [speakInternal]);

  const resetReplayCount = useCallback(() => {
    setReplayCount(0);
    charIndexRef.current = 0;
  }, []);

  return {
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
    isPlaying,
    isPaused,
    voices,
    selectedVoice,
    setSelectedVoice,
    rate,
    setRate,
    replayCount,
    maxReplays,
    canReplay: replayCount < maxReplays,
    speak,
    stop,
    pause,
    resume,
    resetReplayCount
  };
}
