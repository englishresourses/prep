import React from 'react';

export default function WordDiffViewer({ diff = [], targetResponse = '' }) {
  if (!diff || diff.length === 0) {
    return <div>{targetResponse}</div>;
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.35rem',
      padding: '1rem',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      lineHeight: 1.8,
      fontSize: '1.05rem',
      fontWeight: 500
    }}>
      {diff.map((item, idx) => (
        <span
          key={idx}
          style={{
            padding: '0.15rem 0.4rem',
            borderRadius: 'var(--radius-sm)',
            background: item.matched ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: item.matched ? 'var(--success-text)' : 'var(--danger-text)',
            border: `1px solid ${item.matched ? 'var(--success-border)' : 'var(--danger-border)'}`,
            fontWeight: item.matched ? 600 : 500,
            transition: 'all var(--transition-fast)'
          }}
          title={item.matched ? 'Spoken accurately' : 'Missing or mispronounced word'}
        >
          {item.word}
        </span>
      ))}
    </div>
  );
}
