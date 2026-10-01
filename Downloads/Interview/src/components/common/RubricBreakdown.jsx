import React from 'react';
import { CheckCircle2, AlertCircle, Sparkles, HelpCircle, Info } from 'lucide-react';

export default function RubricBreakdown({ evaluation, showHeader = true, compact = false }) {
  if (!evaluation || !Array.isArray(evaluation.parameters)) {
    return null;
  }

  const { total, max, parameters, rubricId, rubricVersion } = evaluation;
  const percentage = Math.round((total / max) * 100);

  const getScoreColor = (marks, paramMax) => {
    const ratio = marks / paramMax;
    if (ratio >= 0.8) return 'var(--success)';
    if (ratio >= 0.5) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="rubric-breakdown" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {showHeader && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: percentage >= 75 ? 'var(--success-bg)' : 'var(--primary-light)',
          border: `1px solid ${percentage >= 75 ? 'var(--success-border)' : 'var(--border-subtle)'}`,
          marginBottom: '0.25rem'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Evaluation Score: {total} / {max}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Rubric: {rubricId} (v{rubricVersion})
            </div>
          </div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: percentage >= 75 ? 'var(--success)' : 'var(--primary)'
          }}>
            {percentage}%
          </div>
        </div>
      )}

      {/* Dynamic parameter breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '0.5rem' : '0.75rem' }}>
        {parameters.map((param) => {
          const scoreColor = getScoreColor(param.marks, param.max);

          return (
            <div
              key={param.id}
              style={{
                padding: compact ? '0.65rem 0.85rem' : '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{param.label}</span>
                  {param.estimated && (
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      letterSpacing: '0.03em'
                    }}>
                      ESTIMATED
                    </span>
                  )}
                  {param.band && (
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: scoreColor,
                      padding: '0.1rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-primary)'
                    }}>
                      {param.band}
                    </span>
                  )}
                </div>

                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: scoreColor }}>
                  {param.marks} / {param.max}
                </div>
              </div>

              {param.descriptor && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {param.descriptor}
                </div>
              )}

              {param.tip && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                  color: 'var(--warning-text)',
                  background: 'var(--warning-bg)',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: '0.2rem'
                }}>
                  <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span><strong>Tip:</strong> {param.tip}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
