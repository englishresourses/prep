import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  MessagesSquare, 
  ArrowLeft, 
  Play, 
  Volume2, 
  Mic, 
  MicOff, 
  RotateCcw, 
  ArrowRight, 
  CheckCircle2, 
  Award, 
  AlertCircle,
  Sparkles,
  SkipForward
} from 'lucide-react';
import confetti from 'canvas-confetti';
import dialogsData from '../data/dialogs.json';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { evaluateDialogTurn, evaluateDialogSession } from '../utils/dialogScorer';
import { saveAttempt, getAppSettings, saveAppSettings } from '../services/storage';
import WordDiffViewer from '../components/dialog/WordDiffViewer';
import RubricBreakdown from '../components/common/RubricBreakdown';
import VoiceControlBar from '../components/common/VoiceControlBar';

export default function DialogSessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dialog = dialogsData.find(d => d.id === id);

  // States: 'situation' | 'turn' | 'feedback' | 'summary'
  const [phase, setPhase] = useState('situation');
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [turnScores, setTurnScores] = useState([]);
  const [showTypingFallback, setShowTypingFallback] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');

  // Timestamp when prompt audio finished reading
  const promptEndTimeRef = useRef(null);

  const { speak, stop: stopTTS, isPlaying: isTTSPlaying, rate, setRate, voices, selectedVoice, setSelectedVoice } = useSpeechSynthesis();
  const {
    isListening,
    transcript,
    interimTranscript,
    combinedTranscript,
    audioLevel,
    isPauseDetected,
    error: micError,
    confidence,
    timing,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    defaultLang: 'en-US',
    autoStopOnPause: true,
    pauseTimeoutMs: 1800
  });

  useEffect(() => {
    return () => {
      stopTTS();
      stopListening();
    };
  }, [stopTTS, stopListening]);

  if (!dialog) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>Dialog Scenario Not Found</h2>
        <Link to="/dialogs" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Dialogs
        </Link>
      </div>
    );
  }

  const currentTurn = dialog.turns[currentTurnIndex];

  // Start the conversational turns
  const handleStartRolePlay = () => {
    stopTTS();
    setPhase('turn');
    setCurrentTurnIndex(0);
    setTurnScores([]);
    playPromptAndListen(0);
  };

  // Speaks the prompt (the other speaker), then opens microphone
  const playPromptAndListen = (turnIdx) => {
    const turn = dialog.turns[turnIdx];
    if (!turn) return;

    resetTranscript();
    setTypedAnswer('');
    setShowTypingFallback(false);
    promptEndTimeRef.current = null;

    speak(turn.prompt, {
      rate,
      onEnd: () => {
        // Record latency reference point when prompt speech finishes
        promptEndTimeRef.current = Date.now();
        startListening();
      }
    });
  };

  // Evaluate current turn
  const handleEvaluateTurn = (manualText = null) => {
    stopListening();
    stopTTS();

    const fullSpeech = combinedTranscript || [transcript, interimTranscript].filter(Boolean).join(' ').trim();
    const answerText = manualText !== null ? manualText : fullSpeech;
    
    // Latency is measured from prompt TTS onEnd to first speech result
    let measuredLatencySec = 1.0;
    if (promptEndTimeRef.current && timing.firstResultTime) {
      measuredLatencySec = Math.max(0.1, (timing.firstResultTime - promptEndTimeRef.current) / 1000);
    } else if (promptEndTimeRef.current && timing.micStartTime) {
      measuredLatencySec = Math.max(0.1, (Date.now() - promptEndTimeRef.current) / 1000);
    }

    const evaluation = evaluateDialogTurn({
      transcript: answerText,
      confidence: confidence || (manualText !== null ? 0.95 : 0.88),
      latencySec: measuredLatencySec,
      timing: {
        ...timing,
        micStartTime: promptEndTimeRef.current || timing.micStartTime
      },
      turn: currentTurn
    });

    const turnResult = {
      turnIndex: currentTurnIndex,
      turnNumber: currentTurn.n,
      prompt: currentTurn.prompt,
      targetResponse: currentTurn.response,
      studentTranscript: answerText || '(No speech recorded)',
      diff: evaluation.diff,
      score: evaluation.score,
      maxScore: evaluation.maxScore,
      parameters: evaluation.parameters,
      evaluation: evaluation
    };

    setTurnScores(prev => [...prev, turnResult]);
    setPhase('feedback');
  };

  // Move to next turn or finish
  const handleNextTurn = () => {
    if (currentTurnIndex + 1 < dialog.turns.length) {
      const nextIdx = currentTurnIndex + 1;
      setCurrentTurnIndex(nextIdx);
      setPhase('turn');
      playPromptAndListen(nextIdx);
    } else {
      setPhase('summary');
      const allTurnScores = [...turnScores];
      const sessionSummary = evaluateDialogSession(allTurnScores);

      saveAttempt({
        module: 'dialog',
        setId: dialog.id,
        title: dialog.title,
        rubricId: 'dialogs',
        rubricVersion: 1,
        score: sessionSummary.overallScore,
        maxScore: sessionSummary.maxScore,
        details: allTurnScores,
        parameterAverages: sessionSummary.parameterAverages
      });

      if (sessionSummary.percentage >= 75) {
        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch (e) {}
      }
    }
  };

  const handleRetryTurn = () => {
    if (phase === 'feedback') {
      setTurnScores(prev => prev.slice(0, -1));
    }
    setPhase('turn');
    playPromptAndListen(currentTurnIndex);
  };

  const handleSkipTurn = () => {
    handleEvaluateTurn('');
  };

  const sessionSummary = evaluateDialogSession(turnScores);

  return (
    <div className="container" style={{ padding: '2rem 1rem 4rem 1rem', maxWidth: '840px' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link to="/dialogs" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} />
          <span>Exit Scenarios</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 700, fontSize: '0.8rem' }}>
            Strict Mode
          </span>
          <span className="badge badge-primary">{dialog.id}</span>
        </div>
      </div>

      {/* PHASE 1: SITUATION BRIEFING */}
      {phase === 'situation' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(14, 165, 233, 0.15)',
            color: 'var(--accent-cyan)',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '1rem'
          }}>
            <MessagesSquare size={15} />
            <span>Situational Role-Play • {dialog.turns.length} Turn Exchanges</span>
          </div>

          <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>{dialog.title}</h1>

          {/* Situation card */}
          <div style={{
            padding: '1.5rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
              Your Scenario Context:
            </div>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
              {dialog.situation}
            </p>
          </div>

          {/* Instructions note */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            fontSize: '0.9rem',
            marginBottom: '2rem'
          }}>
            <Sparkles size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>How it works:</strong> The app speaks the other person's prompt aloud. When the prompt ends, your microphone activates automatically. Speak your line clearly to receive word-by-word visual feedback and full rubric scoring.
            </div>
          </div>

          {/* Voice Selector & Audio Settings for Conversation Partner */}
          <VoiceControlBar
            voices={voices}
            selectedVoice={selectedVoice}
            onSelectVoice={setSelectedVoice}
            rate={rate}
            onChangeRate={setRate}
            label="Conversation Partner / Interviewer Voice"
            previewSample="Hello! I will be your conversation partner for this scenario."
          />

          <button
            onClick={handleStartRolePlay}
            className="btn btn-primary"
            style={{ width: '100%', minHeight: '52px', fontSize: '1.05rem', background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}
          >
            <span>Start Turn-by-Turn Role-Play</span>
            <ArrowRight size={20} />
          </button>
        </div>
      )}

      {/* PHASE 2: TURN-BY-TURN INTERACTION */}
      {phase === 'turn' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          {/* Audio-Only Prompt Player Card (Prompt text/script is strictly audio, hidden during answering) */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderLeft: '4px solid var(--accent-cyan)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.04em' }}>
                  TURN {currentTurnIndex + 1} OF {dialog.turns.length}
                </span>
                <span className="badge" style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent-cyan)', fontSize: '0.75rem', fontWeight: 600 }}>
                  Audio Only
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <VoiceControlBar
                  voices={voices}
                  selectedVoice={selectedVoice}
                  onSelectVoice={setSelectedVoice}
                  rate={rate}
                  onChangeRate={setRate}
                  compact={true}
                  previewSample="This is your conversation partner's voice."
                />
                <button
                  onClick={() => {
                    stopListening();
                    playPromptAndListen(currentTurnIndex);
                  }}
                  disabled={isTTSPlaying}
                  className="btn btn-secondary"
                  style={{ minHeight: '32px', padding: '0.25rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Volume2 size={15} color="var(--accent-cyan)" />
                  <span>{isTTSPlaying ? 'Playing Audio...' : 'Replay Prompt Audio'}</span>
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: isTTSPlaying ? 'rgba(14, 165, 233, 0.12)' : 'var(--bg-card)',
              border: `1px solid ${isTTSPlaying ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
              transition: 'all var(--transition-fast)'
            }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: isTTSPlaying ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                color: isTTSPlaying ? '#FFFFFF' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Volume2 size={20} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: isTTSPlaying ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                  {isTTSPlaying ? 'Other speaker is speaking aloud... Listen carefully' : 'Audio prompt spoken'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Prompt text is hidden during practice. Listen to the audio and speak your response naturally.
                </div>
              </div>

              {isTTSPlaying && (
                <div className="waveform-container" style={{ height: '24px' }}>
                  <div className="wave-bar active" />
                  <div className="wave-bar active" />
                  <div className="wave-bar active" />
                  <div className="wave-bar active" />
                  <div className="wave-bar active" />
                </div>
              )}
            </div>
          </div>

          {/* Mic Status & Live Transcript */}
          <div style={{
            minHeight: '130px',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            border: `2px solid ${isListening ? 'var(--primary)' : 'var(--border-subtle)'}`,
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: isListening ? 'var(--primary)' : (isPauseDetected ? 'var(--success)' : 'var(--text-muted)')
                }}>
                  {isListening 
                    ? '🔴 Listening... (Stops automatically when you finish speaking)' 
                    : (isPauseDetected ? '✓ Finished Speaking (Pause Detected)' : 'Your Spoken Response:')}
                </span>

                {isListening && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: audioLevel > 8 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {audioLevel > 8 ? 'Voice Detected' : 'Auto-Gain Active'}
                    </span>
                    <div className="waveform-container" style={{ height: '18px' }}>
                      {[0.5, 0.9, 1.3, 0.9, 0.5].map((scale, idx) => (
                        <div
                          key={idx}
                          className="wave-bar"
                          style={{
                            height: `${Math.max(4, Math.min(18, (audioLevel / 100) * 18 * scale))}px`,
                            background: audioLevel > 10 ? 'var(--accent-cyan)' : 'var(--primary)',
                            transition: 'height 0.08s ease'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '1.15rem', color: 'var(--text-primary)', wordBreak: 'break-word', fontWeight: 500 }}>
                {transcript || (
                  <span style={{ color: isListening ? 'var(--primary)' : 'var(--text-muted)', fontStyle: 'italic' }}>
                    {interimTranscript ? interimTranscript : (isListening ? 'Listening for speech...' : 'Press Start Mic to speak, or type your response.')}
                  </span>
                )}
                {interimTranscript && transcript && (
                  <span style={{ color: 'var(--primary)', opacity: 0.8 }}> {interimTranscript}</span>
                )}
              </div>
            </div>
          </div>

          {/* Typing fallback */}
          {showTypingFallback ? (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Type response (Keyboard fallback):
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Type your response here..."
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEvaluateTurn(typedAnswer); }}
                  style={{
                    flex: 1,
                    height: '48px',
                    padding: '0 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
                <button
                  onClick={() => handleEvaluateTurn(typedAnswer)}
                  disabled={!typedAnswer.trim()}
                  className="btn btn-primary"
                  style={{ minHeight: '48px' }}
                >
                  Submit
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'right', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setShowTypingFallback(true);
                }}
                style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'underline' }}
              >
                Microphone trouble? Type response instead
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={isListening ? stopListening : startListening}
              className={`btn ${isListening ? 'btn-danger mic-active' : 'btn-secondary'}`}
              style={{ flex: 1, minHeight: '48px' }}
              title={isListening ? "Manual stop (Or simply pause speaking)" : "Start speaking"}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              <span>{isListening ? 'Stop (Or Pause)' : 'Start Mic'}</span>
            </button>

            <button
              onClick={() => handleEvaluateTurn()}
              disabled={!transcript && !interimTranscript}
              className="btn btn-primary"
              style={{ flex: 1.5, minHeight: '48px', background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}
            >
              <CheckCircle2 size={18} />
              <span>Evaluate Turn</span>
            </button>

            <button
              onClick={handleRetryTurn}
              className="btn btn-secondary"
              style={{ minHeight: '48px' }}
              title="Clear & Retry"
            >
              <RotateCcw size={18} />
            </button>

            <button
              onClick={handleSkipTurn}
              className="btn btn-secondary"
              style={{ minHeight: '48px', color: 'var(--text-muted)' }}
              title="Skip Turn"
            >
              <SkipForward size={18} />
              <span>Skip</span>
            </button>
          </div>
        </div>
      )}

      {/* PHASE 3: TURN FEEDBACK & WORD DIFF */}
      {phase === 'feedback' && turnScores.length > 0 && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                TURN {currentTurnIndex + 1} FEEDBACK & WORD ALIGNMENT
              </span>
              <h2 style={{ fontSize: '1.2rem', marginTop: '0.35rem' }}>
                Other Person: "{currentTurn.prompt}"
              </h2>
            </div>
          </div>

          {/* Word Diff Viewer: Matched in green, missing in red */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Target Sentence Accuracy (Green = Matched, Red = Missing):
              </span>
            </div>
            <WordDiffViewer
              diff={turnScores[currentTurnIndex]?.diff}
              targetResponse={currentTurn.response}
            />
          </div>

          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
              What you spoke:
            </div>
            <div>{turnScores[currentTurnIndex]?.studentTranscript}</div>
          </div>

          {/* Rubric Breakdown (Four rows from engine output) */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Turn Rubric Breakdown:</h3>
            <RubricBreakdown
              evaluation={turnScores[currentTurnIndex]?.evaluation}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={handleRetryTurn} className="btn btn-secondary">
              <RotateCcw size={16} />
              <span>Try Turn Again</span>
            </button>
            <button onClick={handleNextTurn} className="btn btn-primary">
              <span>{currentTurnIndex + 1 < dialog.turns.length ? 'Next Turn' : 'View Role-Play Results'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* PHASE 4: SUMMARY & MEAN PER PARAMETER */}
      {phase === 'summary' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(14, 165, 233, 0.15)',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto'
            }}>
              <Award size={36} />
            </div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Role-Play Finished!</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {dialog.title} ({dialog.id})
            </p>

            {/* Mean overall score out of 10 */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '1.25rem',
              padding: '0.85rem 1.75rem',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              marginTop: '1.25rem'
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mean Score</div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--accent-cyan)', lineHeight: 1.1 }}>
                  {sessionSummary.overallScore} <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ 10</span>
                </div>
              </div>
              <div style={{ width: '1px', height: '40px', background: 'var(--border-subtle)' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overall Accuracy</div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: sessionSummary.percentage >= 75 ? 'var(--success)' : 'var(--warning)', lineHeight: 1.1 }}>
                  {sessionSummary.percentage}%
                </div>
              </div>
            </div>
          </div>

          {/* Mean Per Parameter Breakdown */}
          {sessionSummary.parameterAverages.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.85rem' }}>Mean Performance by Rubric Dimension:</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {sessionSummary.parameterAverages.map(param => (
                  <div
                    key={param.id}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{param.label}</span>
                      {param.estimated && (
                        <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-full)', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }}>
                          EST
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {param.averageMarks} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {param.max}</span>
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: param.percentage >= 75 ? 'var(--success)' : 'var(--warning)' }}>
                        {param.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List of Weak Turns */}
          {(() => {
            const weakTurns = turnScores.filter(t => (t.score / t.maxScore) < 0.75);
            return weakTurns.length > 0 ? (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', marginBottom: '0.75rem' }}>
                  <AlertCircle size={20} />
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>Turns Needing Polish (&lt; 75% accuracy):</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {weakTurns.map(t => (
                    <div key={t.turnIndex} style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Turn {t.turnIndex + 1}</span>
                        </div>
                        <span style={{ fontWeight: 800, color: 'var(--warning)' }}>{t.score} / {t.maxScore} pts</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        Prompt: "{t.prompt}"
                      </div>
                      <WordDiffViewer diff={t.diff} targetResponse={t.targetResponse} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--success-bg)',
                color: 'var(--success-text)',
                marginBottom: '2rem',
                fontWeight: 600
              }}>
                🌟 Flawless delivery! Every turn scored 75% or higher.
              </div>
            );
          })()}

          {/* Bottom actions */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setPhase('situation');
                setCurrentTurnIndex(0);
                setTurnScores([]);
              }}
              className="btn btn-secondary"
            >
              <RotateCcw size={18} />
              <span>Retry This Scenario</span>
            </button>
            <Link to="/dialogs" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}>
              <span>Next Scenario</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/dashboard" className="btn btn-secondary">
              <span>View Dashboard</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
