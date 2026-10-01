import React from 'react';
import { AlertTriangle, Globe, CheckCircle2 } from 'lucide-react';

export default function BrowserSupportBanner() {
  const isSpeechRecognitionSupported = 
    typeof window !== 'undefined' && 
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  if (isSpeechRecognitionSupported) {
    return null;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
      borderBottom: '1px solid #F59E0B',
      color: '#92400E',
      padding: '0.75rem 1rem',
      fontSize: '0.9rem',
      fontWeight: 600,
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <AlertTriangle size={20} color="#D97706" />
          <span>
            <strong>Please use Chrome or Edge</strong>: Speech recognition is not supported in this browser. You can still practice using keyboard answers, but speech works best on Chrome or Microsoft Edge.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>HTTPS required</span>
        </div>
      </div>
    </div>
  );
}
