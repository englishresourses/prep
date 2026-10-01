import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  Flame, 
  Award, 
  Headphones, 
  MessagesSquare, 
  RotateCcw, 
  AlertCircle,
  Calendar,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { getDashboardMetrics, clearAllProgress } from '../services/storage';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState(getDashboardMetrics());
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  useEffect(() => {
    setMetrics(getDashboardMetrics());
  }, []);

  const handleClear = () => {
    clearAllProgress();
    setMetrics(getDashboardMetrics());
    setShowConfirmClear(false);
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem 4rem 1rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            <BarChart3 size={18} />
            <span>PROGRESS & ANALYTICS</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: '0.5rem' }}>
            Student Practice Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track your verbal accuracy, day streaks, and target your weakest placement practice sets.
          </p>
        </div>

        {metrics.totalAttempts > 0 && (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', color: 'var(--danger)', height: '40px' }}
          >
            <RotateCcw size={16} />
            <span>Reset History</span>
          </button>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmClear && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ maxWidth: '420px', padding: '1.75rem', background: 'var(--bg-secondary)' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Clear all practice records?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              This will erase all past scores, history, and streak records stored in your browser. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirmClear(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleClear} className="btn btn-danger">
                Yes, Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Streak */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F59E0B'
          }}>
            <Flame size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Practice Streak
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1 }}>
              {metrics.streakDays} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Days</span>
            </div>
          </div>
        </div>

        {/* Avg Score */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <TrendingUp size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Average Score
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1, color: 'var(--primary)' }}>
              {metrics.averagePercentage}%
            </div>
          </div>
        </div>

        {/* Listening Sessions */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Headphones size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Listening Sessions
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1 }}>
              {metrics.listeningCount}
            </div>
          </div>
        </div>

        {/* Dialog Sessions */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(14, 165, 233, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan)'
          }}>
            <MessagesSquare size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Dialog Sessions
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1 }}>
              {metrics.dialogCount}
            </div>
          </div>
        </div>
      </div>

      {/* Weakest Sets Section (Targeted Practice) */}
      {metrics.weakestSets.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--warning)' }}>
            <AlertCircle size={20} />
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Target Practice: Needs Improvement (&lt; 75%)</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Sets where your scores were below 75%. Retrying these will build placement confidence:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {metrics.weakestSets.map(set => (
              <div
                key={set.setId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      background: set.module === 'listening' ? 'var(--primary-light)' : 'rgba(14, 165, 233, 0.15)',
                      color: set.module === 'listening' ? 'var(--primary)' : 'var(--accent-cyan)'
                    }}>
                      {set.setId}
                    </span>
                    <span style={{ fontWeight: 600 }}>{set.title}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Average: {set.averageScore} / {set.maxScore} ({set.averagePercentage}%) • {set.attempts} attempts
                  </div>
                </div>

                <Link
                  to={set.module === 'listening' ? `/listening/${set.setId}` : `/dialogs/${set.setId}`}
                  className="btn btn-outline"
                  style={{ height: '38px', padding: '0 1rem', fontSize: '0.85rem' }}
                >
                  <span>Practice Now</span>
                  <ChevronRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent History Table */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Recent Practice History</h2>

        {metrics.recentAttempts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
            No practice sessions recorded yet. Start practicing with Listening Comprehension or Situational Dialog!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {metrics.recentAttempts.map((attempt) => (
              <div
                key={attempt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--radius-md)',
                    background: attempt.module === 'listening' ? 'var(--primary-light)' : 'rgba(14, 165, 233, 0.15)',
                    color: attempt.module === 'listening' ? 'var(--primary)' : 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {attempt.module === 'listening' ? <Headphones size={20} /> : <MessagesSquare size={20} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        {attempt.title} ({attempt.setId})
                      </span>
                      {attempt.rubricId ? (
                        <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }}>
                          {attempt.rubricId} v{attempt.rubricVersion || 1}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)', background: 'var(--warning-bg)', color: 'var(--warning-text)', fontWeight: 700 }}>
                          legacy
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={13} />
                      <span>{new Date(attempt.date).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      color: attempt.percentage >= 75 ? 'var(--success)' : (attempt.percentage >= 50 ? 'var(--warning)' : 'var(--danger)')
                    }}>
                      {attempt.score} / {attempt.maxScore}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {attempt.percentage}%
                    </div>
                  </div>

                  <Link
                    to={attempt.module === 'listening' ? `/listening/${attempt.setId}` : `/dialogs/${attempt.setId}`}
                    className="btn btn-secondary"
                    style={{ height: '36px', padding: '0 0.75rem', fontSize: '0.8rem' }}
                  >
                    Retry
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
