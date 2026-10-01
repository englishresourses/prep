import React, { useState } from 'react';
import { Volume2, Play, Square, Settings2 } from 'lucide-react';

export default function VoiceControlBar({
  voices = [],
  selectedVoice = null,
  onSelectVoice,
  rate = 1.0,
  onChangeRate,
  label = 'Audio Narration Voice',
  previewSample = 'Hello! This is a voice preview for English verbal placement practice.',
  compact = false
}) {
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const handleTestPreview = (e) => {
    e.preventDefault();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPreviewPlaying) {
      window.speechSynthesis.cancel();
      setIsPreviewPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(previewSample);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = rate;
    utterance.onstart = () => setIsPreviewPlaying(true);
    utterance.onend = () => setIsPreviewPlaying(false);
    utterance.onerror = () => setIsPreviewPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  if (!voices || voices.length === 0) {
    return null;
  }

  // Format readable label for each voice option
  const formatVoiceLabel = (v) => {
    const isEn = v.lang.toLowerCase().startsWith('en');
    const cleanName = v.name.replace(/Microsoft |Google |Apple /i, '');
    return `${isEn ? '🗣️ ' : '🌐 '}${cleanName} (${v.lang})`;
  };

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
        fontSize: '0.8rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
          <Volume2 size={15} color="var(--primary)" />
          <span style={{ fontWeight: 600 }}>Voice:</span>
        </div>
        <select
          value={selectedVoice ? selectedVoice.name : ''}
          onChange={(e) => {
            const v = voices.find(item => item.name === e.target.value);
            if (v && onSelectVoice) onSelectVoice(v);
          }}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            maxWidth: '220px',
            outline: 'none'
          }}
        >
          {voices.map(v => (
            <option key={v.name} value={v.name}>
              {formatVoiceLabel(v)}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleTestPreview}
          className="btn btn-secondary"
          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', minHeight: '26px' }}
          title="Preview Voice Sample"
        >
          {isPreviewPlaying ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
          <span>{isPreviewPlaying ? 'Stop' : 'Preview'}</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1rem 1.25rem',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      marginBottom: '1.25rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings2 size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
            {label}
          </span>
          <span className="badge" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
            {voices.length} Available
          </span>
        </div>

        {onChangeRate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Speed:</span>
            {[0.8, 1.0, 1.2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChangeRate(s)}
                className={`btn ${rate === s ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minHeight: '28px', padding: '0.15rem 0.5rem', fontSize: '0.75rem' }}
              >
                {s}x
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <select
            value={selectedVoice ? selectedVoice.name : ''}
            onChange={(e) => {
              const v = voices.find(item => item.name === e.target.value);
              if (v && onSelectVoice) onSelectVoice(v);
            }}
            style={{
              width: '100%',
              height: '38px',
              padding: '0 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {formatVoiceLabel(v)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleTestPreview}
          className={`btn ${isPreviewPlaying ? 'btn-danger' : 'btn-secondary'}`}
          style={{ minHeight: '38px', padding: '0 0.85rem', fontSize: '0.8rem', flexShrink: 0 }}
          title="Preview Voice Sample"
        >
          {isPreviewPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          <span>{isPreviewPlaying ? 'Stop' : 'Test Voice'}</span>
        </button>
      </div>
    </div>
  );
}
