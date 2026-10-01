import React, { useState } from 'react';
import { 
  Mic2, 
  Mic, 
  MicOff, 
  Volume2, 
  Play, 
  Square, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Gauge
} from 'lucide-react';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

export default function SpeechTestPage() {
  const { 
    isSupported: isTTSSupported, 
    isPlaying, 
    speak, 
    stop: stopTTS, 
    rate, 
    setRate, 
    voices, 
    selectedVoice, 
    setSelectedVoice 
  } = useSpeechSynthesis();

  const {
    isSupported: isSTTSupported,
    isListening,
    transcript,
    interimTranscript,
    audioLevel,
    lang: sttLang,
    setLang: setSttLang,
    error,
    startListening,
    stopListening,
    resetTranscript,
    confidence
  } = useSpeechRecognition({ defaultLang: 'en-US' });

  const [testText, setTestText] = useState(
    'Hello! This is an interactive voice diagnostic test for English placement practice.'
  );

  const handleTestTTS = () => {
    if (isPlaying) {
      stopTTS();
    } else {
      speak(testText, { rate });
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem 4rem 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          <Mic2 size={18} />
          <span>DIAGNOSTICS & HARDWARE LAB</span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: '0.5rem' }}>
          Microphone & Audio Diagnostic Test
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Test your microphone input and audio playback before starting placement mock tests.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* STT Microphone Diagnostic Card */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mic size={22} color="var(--primary)" />
                <h2 style={{ fontSize: '1.25rem' }}>Microphone Test (STT)</h2>
              </div>
              <span className={`badge ${isSTTSupported ? 'badge-success' : 'badge-warning'}`}>
                {isSTTSupported ? 'STT Supported' : 'Not Supported'}
              </span>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Click Start Microphone, speak a sentence clearly, and verify that the browser captures your speech in real time.
            </p>

            {/* Live Transcript Screen */}
            <div style={{
              minHeight: '110px',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: `1.5px solid ${isListening ? 'var(--primary)' : 'var(--border-subtle)'}`,
              marginBottom: '1rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isListening ? 'Listening (Speak now)...' : 'Live Transcript Output:'}
                </div>
                <div style={{ fontSize: '1.05rem', color: 'var(--text-primary)', wordBreak: 'break-word', fontWeight: 500 }}>
                  {transcript || (
                    <span style={{ color: isListening ? 'var(--primary)' : 'var(--text-muted)', fontStyle: 'italic' }}>
                      {interimTranscript ? interimTranscript : (isListening ? 'Listening for speech...' : 'Press Start Microphone and say something...')}
                    </span>
                  )}
                  {interimTranscript && transcript && (
                    <span style={{ color: 'var(--primary)', opacity: 0.8 }}> {interimTranscript}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Real-Time Microphone Input Level Meter */}
            {isListening && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Microphone Input Sensitivity (Auto-Gain Boost):</span>
                  <span style={{ fontWeight: 700, color: audioLevel > 8 ? 'var(--success)' : 'var(--text-muted)' }}>
                    {audioLevel > 8 ? `Voice Detected (${audioLevel}%)` : 'Listening... (Speak naturally)'}
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-card)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${audioLevel}%`,
                      background: audioLevel > 60 ? 'var(--warning)' : (audioLevel > 10 ? 'var(--accent-cyan)' : 'var(--primary)'),
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.08s ease'
                    }}
                  />
                </div>
              </div>
            )}

            {/* STT Language & Sensitivity controls */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Recognition Language:</label>
                <select
                  value={sttLang}
                  onChange={(e) => setSttLang(e.target.value)}
                  disabled={isListening}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="en-US">English (United States) [en-US]</option>
                  <option value="en-IN">English (India) [en-IN]</option>
                  <option value="en-GB">English (United Kingdom) [en-GB]</option>
                </select>
              </div>

              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', fontSize: '0.7rem', fontWeight: 600 }}>
                Hardware AGC Active
              </span>
            </div>

            {/* Error Message if any */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger-text)',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={isListening ? stopListening : startListening}
              className={`btn ${isListening ? 'btn-danger mic-active' : 'btn-primary'}`}
              style={{ flex: 1, minHeight: '48px' }}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              <span>{isListening ? 'Stop Recording' : 'Start Microphone'}</span>
            </button>

            {transcript && (
              <button
                onClick={resetTranscript}
                className="btn btn-secondary"
                style={{ minHeight: '48px' }}
                title="Reset Transcript"
              >
                <RefreshCw size={18} />
              </button>
            )}
          </div>
        </div>

        {/* TTS Audio Playback Diagnostic Card */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Volume2 size={22} color="var(--primary)" />
                <h2 style={{ fontSize: '1.25rem' }}>Audio Synthesis (TTS)</h2>
              </div>
              <span className={`badge ${isTTSSupported ? 'badge-success' : 'badge-warning'}`}>
                {isTTSSupported ? 'TTS Supported' : 'Not Supported'}
              </span>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Test passage narration audio and adjust playback speeds (0.8x, 1.0x, 1.2x).
            </p>

            {/* Test Text input */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Sample Sentence to Speak:
              </label>
              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            {/* Speed toggles */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Playback Speed:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[0.8, 1.0, 1.2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRate(s)}
                    className={`btn ${rate === s ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, minHeight: '40px', fontSize: '0.9rem', padding: '0.4rem 0.5rem' }}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Voice select if available */}
            {voices.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Available Voices ({voices.length}):
                </label>
                <select
                  value={selectedVoice ? selectedVoice.name : ''}
                  onChange={(e) => {
                    const voice = voices.find(v => v.name === e.target.value);
                    if (voice) setSelectedVoice(voice);
                  }}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                >
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={handleTestTTS}
            className={`btn ${isPlaying ? 'btn-danger' : 'btn-primary'}`}
            style={{ width: '100%', minHeight: '48px' }}
          >
            {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            <span>{isPlaying ? 'Stop Audio' : 'Play Test Passage Voice'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
