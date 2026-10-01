import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Headphones, 
  MessagesSquare, 
  BarChart3, 
  CheckCircle2, 
  Sparkles, 
  Flame, 
  Volume2, 
  Mic, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe2
} from 'lucide-react';
import { getDashboardMetrics } from '../services/storage';

export default function HomePage() {
  const metrics = getDashboardMetrics();

  return (
    <div style={{ paddingBottom: '3.5rem' }}>
      {/* Hero Section */}
      <section style={{
        padding: '3rem 0 2rem 0',
        background: 'radial-gradient(ellipse at 50% 0%, var(--primary-light) 0%, transparent 70%)',
        textAlign: 'center'
      }}>
        <div className="container">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            background: 'var(--primary-light)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--primary)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.25rem'
          }}>
            <Sparkles size={16} />
            <span>Campus Placement English Preparation</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.25rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: '1rem',
            maxWidth: '820px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.15
          }}>
            Master Spoken English with Real-Time Voice Practice
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
            color: 'var(--text-secondary)',
            maxWidth: '650px',
            marginLeft: 'auto',
            marginRight: 'auto',
            marginBottom: '2rem'
          }}>
            Listen to realistic passages, answer questions by speaking aloud, and role-play corporate scenarios. 100% in-browser speech recognition and instant evaluation.
          </p>

          {/* Quick Action CTA Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '2.5rem'
          }}>
            <Link to="/listening" className="btn btn-primary" style={{ padding: '0.85rem 1.75rem', fontSize: '1.05rem' }}>
              <Headphones size={20} />
              <span>Practice Listening (30 Sets)</span>
            </Link>
            <Link to="/dialogs" className="btn btn-secondary" style={{ padding: '0.85rem 1.75rem', fontSize: '1.05rem' }}>
              <MessagesSquare size={20} />
              <span>Practice Dialogs (30 Scenarios)</span>
            </Link>
          </div>

          {/* Practice Streak / Stats Bar */}
          {metrics.totalAttempts > 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '1.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Flame size={20} color="#F59E0B" />
                <span style={{ fontWeight: 700 }}>{metrics.streakDays} Day Streak</span>
              </div>
              <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Average Score: </span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{metrics.averagePercentage}%</span>
              </div>
              <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Completed: </span>
                <span style={{ fontWeight: 700 }}>{metrics.totalAttempts} sessions</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Modules Feature Grid */}
      <section className="container" style={{ marginTop: '2rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Module 1 Card */}
          <div className="glass-panel" style={{
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-15px',
              right: '-15px',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'var(--primary-glow)',
              filter: 'blur(30px)',
              pointerEvents: 'none'
            }} />
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: '0.8rem',
                marginBottom: '1rem'
              }}>
                <Headphones size={15} />
                <span>Module 1 • 30 Sets</span>
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Listening Comprehension</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Listen to first-person narrative passages spoken with natural accents. Then listen to each question and answer directly by voice. The app evaluates your keywords, grammar, and fluency.
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span>Passage TTS with 0.8x / 1.0x / 1.2x speed controls</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span>Auto-starts microphone after reading question</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span>Fuzzy keyword scoring & concise answer validation</span>
                </li>
              </ul>
            </div>
            <Link to="/listening" className="btn btn-primary" style={{ width: '100%' }}>
              <span>Start Listening Sets</span>
              <ArrowRight size={18} />
            </Link>
          </div>

          {/* Module 2 Card */}
          <div className="glass-panel" style={{
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-15px',
              right: '-15px',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'rgba(14, 165, 233, 0.25)',
              filter: 'blur(30px)',
              pointerEvents: 'none'
            }} />
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(14, 165, 233, 0.15)',
                color: 'var(--accent-cyan)',
                fontWeight: 700,
                fontSize: '0.8rem',
                marginBottom: '1rem'
              }}>
                <MessagesSquare size={15} />
                <span>Module 2 • 30 Scenarios</span>
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Situational Dialog Role-Play</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Simulate real campus placement interactions, hotel check-ins, office standups, and interview discussions. The app speaks the other speaker's prompt, and you speak the response.
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span>Turn-by-turn interactive voice conversation</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span>Visual word diff: matched in green, missing in red</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span>Strict placement role-play with real-time scoring</span>
                </li>
              </ul>
            </div>
            <Link to="/dialogs" className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}>
              <span>Start Situational Dialogs</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust & Architecture Badges */}
      <section className="container" style={{ marginTop: '3rem' }}>
        <div className="glass-panel" style={{
          padding: '1.75rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <ShieldCheck size={28} color="var(--success)" />
            </div>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>Zero Backend / Private</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              No audio is recorded or sent to any server. Complete browser privacy.
            </p>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <Zap size={28} color="var(--primary)" />
            </div>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>Instant Evaluation</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Fuzzy matching, digit normalization, and keyword analysis run client-side.
            </p>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <Globe2 size={28} color="var(--accent-cyan)" />
            </div>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>Microsoft Mark (en-US)</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Configured with Microsoft Mark - English (United States) as default voice.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
