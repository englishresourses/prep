import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Headphones, 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  Mic, 
  MicOff, 
  SkipForward, 
  Keyboard, 
  CheckCircle2, 
  ArrowRight, 
  Award,
  Sparkles,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import listeningData from '../data/listening.json';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { scoreListeningAnswer } from '../utils/listeningScorer';
import { saveAttempt } from '../services/storage';
import RubricBreakdown from '../components/common/RubricBreakdown';
import VoiceControlBar from '../components/common/VoiceControlBar';
import { playMicStartBeep, playMicStopBeep } from '../utils/audioCue';

export default function ListeningSessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const set = listeningData.find(s => s.id === id);

  // States: 'passage' | 'question' | 'feedback' | 'summary'
  const [phase, setPhase] = useState('passage');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [questionScores, setQuestionScores] = useState([]);
  const [showTypingFallback, setShowTypingFallback] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');

  // Speech synthesis & recognition hooks
  const { 
    speak, 
    stop: stopTTS, 
    isPlaying: isTTSPlaying, 
    pause: pauseTTS, 
    resume: resumeTTS, 
    isPaused: isTTSPaused, 
    rate, 
    setRate, 
    replayCount, 
    maxReplays, 
    canReplay,
    voices,
    selectedVoice,
    setSelectedVoice
  } = useSpeechSynthesis();

  const {
    isListening,
    transcript,
    setTranscript,
    interimTranscript,
    combinedTranscript,
    audioLevel,
    isPauseDetected,
    error: micError,
    confidence,
    timing,
    recordedAudioUrl,
    getTranscript,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    defaultLang: 'en-US',
    autoStopOnPause: true,
    pauseTimeoutMs: 1800,
    onSpeechEnd: () => {
      playMicStopBeep();
    }
  });

  // Automatically keep typedAnswer synchronized with live speech recognition
  useEffect(() => {
    if (combinedTranscript) {
      setTypedAnswer(combinedTranscript);
    }
  }, [combinedTranscript]);

  // Stop all audio on unmount or route change
  useEffect(() => {
    return () => {
      stopTTS();
      stopListening();
    };
  }, [stopTTS, stopListening]);

  if (!set) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>Listening Set Not Found</h2>
        <Link to="/listening" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Listening Sets
        </Link>
      </div>
    );
  }

  const currentQuestion = set.questions[currentQIndex];

  // Handler to play passage aloud
  const handlePlayPassage = () => {
    if (isTTSPlaying) {
      pauseTTS();
    } else if (isTTSPaused) {
      resumeTTS();
    } else {
      speak(set.passage, { 
        rate, 
        trackReplay: true, 
        onEnd: () => {} 
      });
    }
  };

  // Begin Question flow
  const handleStartQuestions = () => {
    stopTTS();
    setPhase('question');
    setCurrentQIndex(0);
    setQuestionScores([]);
    readQuestionAndStartMic(0);
  };

  // Speaks question aloud, then auto-starts microphone with audio beep
  const readQuestionAndStartMic = (qIdx) => {
    const q = set.questions[qIdx];
    if (!q) return;

    resetTranscript();
    setTypedAnswer('');
    setShowTypingFallback(false);

    speak(q.q, {
      rate,
      onEnd: () => {
        // Play beep cue when mic opens and starts recording
        playMicStartBeep();
        startListening();
      }
    });
  };

  // Handler to re-record speech answer directly
  const handleRerecord = () => {
    stopListening();
    resetTranscript();
    setTypedAnswer('');
    setShowTypingFallback(false);
    playMicStartBeep();
    startListening();
  };

  // Evaluate current question answer
  const handleEvaluate = (manualText = null) => {
    const finalSpeech = stopListening() || getTranscript() || combinedTranscript;
    stopTTS();

    const candidate = manualText !== null ? manualText : (typedAnswer || finalSpeech);
    const answerText = (candidate || '').trim();

    // Calculate score using the JSON-driven rubric engine
    const evaluation = scoreListeningAnswer({
      transcript: answerText,
      confidence: confidence || (manualText !== null ? 0.95 : 0.85),
      timing: timing,
      item: {
        q: currentQuestion.q,
        modelAnswer: currentQuestion.modelAnswer,
        keywords: currentQuestion.keywords
      }
    });

    const evaluatedQuestion = {
      qIndex: currentQIndex,
      question: currentQuestion.q,
      modelAnswer: currentQuestion.modelAnswer,
      studentTranscript: answerText || '(No speech recorded)',
      evaluation: evaluation,
      score: evaluation.total,
      maxScore: evaluation.max
    };

    const updatedScores = [...questionScores, evaluatedQuestion];
    setQuestionScores(updatedScores);
    setPhase('feedback');
  };

  // Proceed to next question or complete session
  const handleNextQuestion = () => {
    if (currentQIndex + 1 < set.questions.length) {
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      setPhase('question');
      readQuestionAndStartMic(nextIdx);
    } else {
      // Completed all questions -> Summary phase
      setPhase('summary');
      const totalScore = questionScores.reduce((acc, q) => acc + q.score, 0) + (questionScores[currentQIndex]?.score || 0);
      const maxTotal = set.questions.length * 10;

      // Save to localStorage
      saveAttempt({
        module: 'listening',
        setId: set.id,
        title: set.title,
        rubricId: 'listening',
        rubricVersion: 1,
        score: totalScore,
        maxScore: maxTotal,
        details: questionScores
      });

      if ((totalScore / maxTotal) >= 0.75) {
        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch (e) {}
      }
    }
  };

  // Retry current question
  const handleRetryQuestion = () => {
    // Remove last score if in feedback
    if (phase === 'feedback') {
      setQuestionScores(prev => prev.slice(0, -1));
    }
    setPhase('question');
    readQuestionAndStartMic(currentQIndex);
  };

  // Skip current question with 0 marks
  const handleSkipQuestion = () => {
    handleEvaluate('');
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem 4rem 1rem', maxWidth: '820px' }}>
      {/* Top back navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <Link to="/listening" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} />
          <span>Exit to Sets</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-primary">{set.id}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {phase === 'passage' ? 'Passage Briefing' : (phase === 'summary' ? 'Session Complete' : `Question ${currentQIndex + 1} of ${set.questions.length}`)}
          </span>
        </div>
      </div>

      {/* PHASE 1: PASSAGE BRIEFING & AUDIO PLAYER */}
      {phase === 'passage' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '1rem'
          }}>
            <Headphones size={15} />
            <span>First-Person Passage • Answer as the Character</span>
          </div>

          <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>{set.title}</h1>

          {/* Audio Listening Card (Passage text is hidden for listening comprehension practice) */}
          <div style={{
            padding: '1.75rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            background: isTTSPlaying ? 'var(--primary-light)' : 'var(--bg-secondary)',
            border: `1.5px solid ${isTTSPlaying ? 'var(--primary)' : 'var(--border-subtle)'}`,
            marginBottom: '1.75rem',
            transition: 'all var(--transition-normal)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: isTTSPlaying ? 'var(--primary)' : 'var(--bg-card)',
                color: isTTSPlaying ? '#FFFFFF' : 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: isTTSPlaying ? '0 4px 14px var(--primary-glow)' : 'none'
              }}>
                <Headphones size={24} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: isTTSPlaying ? 'var(--primary)' : 'var(--text-primary)' }}>
                  {isTTSPlaying ? 'Speaking passage aloud... Listen carefully' : (isTTSPaused ? 'Passage paused' : 'Audio-Only Listening Passage')}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {isTTSPlaying
                    ? 'Pay close attention to key names, dates, items, and reasons.'
                    : 'The passage text is hidden to test your listening comprehension. Click "Play Passage" below to listen.'}
                </div>
              </div>

              {isTTSPlaying && (
                <div className="waveform-container">
                  <div className="wave-bar active" />
                  <div className="wave-bar active" />
                  <div className="wave-bar active" />
                  <div className="wave-bar active" />
                  <div className="wave-bar active" />
                </div>
              )}
            </div>
          </div>

          {/* Audio Controls Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={handlePlayPassage}
                disabled={!canReplay && !isTTSPlaying && !isTTSPaused}
                className="btn btn-primary"
                style={{ minHeight: '44px' }}
              >
                {isTTSPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                <span>
                  {isTTSPlaying ? 'Pause Passage' : (isTTSPaused ? 'Resume Passage' : `Play Passage (${replayCount}/${maxReplays} plays)`)}
                </span>
              </button>

              <span style={{ fontSize: '0.85rem', color: canReplay ? 'var(--text-muted)' : 'var(--danger)' }}>
                {canReplay ? `${maxReplays - replayCount} replay(s) remaining` : 'Max replays reached'}
              </span>
            </div>

            {/* Speed toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Speed:</span>
              {[0.8, 1.0, 1.2].map(s => (
                <button
                  key={s}
                  onClick={() => setRate(s)}
                  className={`btn ${rate === s ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minHeight: '34px', padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Start questions button */}
          <button
            onClick={handleStartQuestions}
            className="btn btn-primary"
            style={{ width: '100%', minHeight: '52px', fontSize: '1.05rem' }}
          >
            <span>I'm Ready — Start Spoken Questions</span>
            <ArrowRight size={20} />
          </button>
        </div>
      )}

      {/* PHASE 2: QUESTION & VOICE INPUT */}
      {phase === 'question' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          {/* Question Audio Listening Card (Question text is intentionally hidden during answering) */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.04em' }}>
                QUESTION {currentQIndex + 1} OF {set.questions.length}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <VoiceControlBar
                  voices={voices}
                  selectedVoice={selectedVoice}
                  onSelectVoice={setSelectedVoice}
                  rate={rate}
                  onChangeRate={setRate}
                  compact={true}
                  previewSample="This is how the questions are read aloud."
                />
                <button
                  onClick={() => speak(currentQuestion.q, { rate })}
                  disabled={isTTSPlaying}
                  className="btn btn-secondary"
                  style={{ minHeight: '32px', padding: '0.25rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Volume2 size={15} color="var(--primary)" />
                  <span>{isTTSPlaying ? 'Playing Audio...' : 'Listen to Question Again'}</span>
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: isTTSPlaying ? 'var(--primary-light)' : 'var(--bg-card)',
              border: `1px solid ${isTTSPlaying ? 'var(--primary)' : 'var(--border-subtle)'}`,
              transition: 'all var(--transition-fast)'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: isTTSPlaying ? 'var(--primary)' : 'var(--border-subtle)',
                color: isTTSPlaying ? '#FFFFFF' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Volume2 size={20} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: isTTSPlaying ? 'var(--primary)' : 'var(--text-primary)' }}>
                  {isTTSPlaying ? 'Speaking question aloud... Listen carefully' : 'Question has been spoken aloud'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Listen carefully and speak your answer. Question text is hidden during practice and will be revealed after evaluation.
                </div>
              </div>

              {isTTSPlaying && (
                <div className="waveform-container" style={{ height: '24px' }}>
                  <div className="wave-bar active" />
                  <div className="wave-bar active" />
                  <div className="wave-bar active" />
                  <div className="wave-bar active" />
                </div>
              )}
            </div>
          </div>

          {/* Answer Card: Live Speech-to-Text & Editable Answer */}
          <div 
            className={isListening ? 'recording-border-active' : ''}
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: `2px solid ${isListening ? '#EF4444' : (typedAnswer.trim() ? 'var(--success)' : 'var(--border-subtle)')}`,
              marginBottom: '1.5rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            {/* Header Status & Direct Mic Toggle Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) {
                      playMicStopBeep();
                      stopListening();
                    } else {
                      playMicStartBeep();
                      startListening();
                    }
                  }}
                  className={`btn ${isListening ? 'btn-danger' : 'btn-primary'}`}
                  style={{
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    borderRadius: 'var(--radius-full)'
                  }}
                >
                  {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                  <span>{isListening ? 'Stop Speaking' : 'Tap to Speak'}</span>
                </button>

                {isListening ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)' }}>
                    <span className="recording-blink-dot" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#EF4444', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Listening... Speak Now
                    </span>
                  </div>
                ) : typedAnswer.trim() ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', color: 'var(--success)' }}>
                    <CheckCircle2 size={14} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                      Answer Captured
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                    Your Spoken Answer:
                  </span>
                )}
              </div>

              {isListening && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: audioLevel > 8 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                    {audioLevel > 8 ? 'Voice Detected' : 'Listening...'}
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

            {/* Editable Text Area synced with speech recognition in real-time */}
            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
              <textarea
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                placeholder={isListening ? "Listening for speech... Your words will convert to text here automatically." : "Tap 'Tap to Speak' above or type your answer here..."}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '1.05rem',
                  lineHeight: '1.5',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>
                {isListening ? '✨ Words transcribe into text automatically. You can also edit or type.' : 'Click "Evaluate Answer" when ready, or tap "Tap to Speak" to record again.'}
              </span>
              {confidence !== null && (
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                  Speech Clarity: {Math.round(confidence * 100)}%
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>📱</span>
              <span>On mobile? Tap <strong>Tap to Speak</strong> or tap the microphone icon on your mobile keyboard (Gboard/iOS) to dictate.</span>
            </div>

            {/* Recorded Audio Player if available */}
            {recordedAudioUrl && !isListening && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginTop: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)'
              }}>
                <Headphones size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Your Recorded Audio:
                </span>
                <audio controls src={recordedAudioUrl} style={{ height: '30px', flex: 1, outline: 'none' }} />
              </div>
            )}
          </div>

          {/* Mic error notice if any */}
          {micError && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{micError}</span>
            </div>
          )}

          {/* Action buttons: Evaluate, Re-record, Skip */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleEvaluate()}
              disabled={!typedAnswer.trim() && !combinedTranscript}
              className="btn btn-primary"
              style={{ flex: 2, minHeight: '52px', fontSize: '1.05rem', fontWeight: 700 }}
            >
              <CheckCircle2 size={20} />
              <span>Evaluate Answer</span>
            </button>

            <button
              onClick={handleRerecord}
              className="btn btn-secondary"
              style={{ minHeight: '52px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.25rem' }}
              title="Re-record your speech"
            >
              <RotateCcw size={18} />
              <span>Re-record</span>
            </button>

            <button
              onClick={handleSkipQuestion}
              className="btn btn-secondary"
              style={{ minHeight: '52px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0 1.15rem', color: 'var(--text-muted)' }}
              title="Skip Question"
            >
              <SkipForward size={18} />
              <span>Skip</span>
            </button>
          </div>
        </div>
      )}

      {/* PHASE 3: FEEDBACK MODAL / BREAKDOWN */}
      {phase === 'feedback' && questionScores.length > 0 && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
              QUESTION {currentQIndex + 1} EVALUATION
            </span>
            <h2 style={{ fontSize: '1.25rem', marginTop: '0.35rem', color: 'var(--text-primary)' }}>
              {currentQuestion.q}
            </h2>
          </div>

          {/* Student vs Model Answer Comparison */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>
                What You Said:
              </div>
              <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>
                {questionScores[currentQIndex]?.studentTranscript}
              </div>
            </div>

            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--success-text)', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>
                Model Answer:
              </div>
              <div style={{ fontWeight: 500, fontSize: '0.95rem', color: 'var(--success-text)' }}>
                {currentQuestion.modelAnswer}
              </div>
            </div>
          </div>

          {/* Generic Rubric Engine Output Breakdown */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Rubric Evaluation Breakdown:</h3>
            <RubricBreakdown evaluation={questionScores[currentQIndex]?.evaluation} />
          </div>

          {/* Navigation to next */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={handleRetryQuestion} className="btn btn-secondary">
              <RotateCcw size={16} />
              <span>Try Question Again</span>
            </button>
            <button onClick={handleNextQuestion} className="btn btn-primary">
              <span>{currentQIndex + 1 < set.questions.length ? 'Next Question' : 'View Session Results'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* PHASE 4: FINAL SUMMARY SCREEN */}
      {phase === 'summary' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto'
            }}>
              <Award size={36} />
            </div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Session Complete!</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {set.title} ({set.id})
            </p>

            {/* Total score pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.85rem 1.75rem',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              marginTop: '1.25rem'
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Score</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>
                  {questionScores.reduce((acc, q) => acc + q.score, 0)} / {set.questions.length * 10}
                </div>
              </div>
              <div style={{ width: '1px', height: '36px', background: 'var(--border-subtle)' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accuracy</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)', lineHeight: 1.1 }}>
                  {Math.round((questionScores.reduce((acc, q) => acc + q.score, 0) / (set.questions.length * 10)) * 100)}%
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown for each question */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Question Breakdown & Feedback:</h3>
            {questionScores.map((qs, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    Q{idx + 1}: {qs.question}
                  </span>
                  <span style={{
                    fontWeight: 800,
                    fontSize: '1rem',
                    color: qs.score >= 7.5 ? 'var(--success)' : 'var(--warning)'
                  }}>
                    {qs.score} / {qs.maxScore} pts
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  <strong>Your Answer:</strong> {qs.studentTranscript}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--success-text)', marginBottom: '0.75rem' }}>
                  <strong>Model Answer:</strong> {qs.modelAnswer}
                </div>

                {/* Compact Rubric Breakdown */}
                <RubricBreakdown evaluation={qs.evaluation} showHeader={false} compact={true} />
              </div>
            ))}
          </div>

          {/* Bottom actions */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setPhase('passage');
                setCurrentQIndex(0);
                setQuestionScores([]);
              }}
              className="btn btn-secondary"
            >
              <RotateCcw size={18} />
              <span>Retry This Set</span>
            </button>
            <Link to="/listening" className="btn btn-primary">
              <span>Next Listening Set</span>
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
