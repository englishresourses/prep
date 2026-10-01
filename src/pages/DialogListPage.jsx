import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessagesSquare, Search, Award, Play } from 'lucide-react';
import dialogsData from '../data/dialogs.json';
import { getSetScoreInfo } from '../services/storage';

export default function DialogListPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDialogs = dialogsData.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.situation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container" style={{ padding: '2rem 1rem 4rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          <MessagesSquare size={18} />
          <span>MODULE 2</span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: '0.5rem' }}>
          Situational Dialog Role-Play
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '650px', fontSize: '1rem' }}>
          Practice 30 conversational scenarios for campus placements, campus life, and workplace interviews. The app speaks the prompt, and you speak the response.
        </p>
      </div>

      {/* Search Bar */}
      <div style={{
        marginBottom: '2rem',
        position: 'relative',
        maxWidth: '450px'
      }}>
        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search by scenario, topic, or keyword..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            height: '48px',
            paddingLeft: '2.75rem',
            paddingRight: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            outline: 'none',
            boxShadow: 'var(--shadow-sm)'
          }}
        />
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
        gap: '1.25rem'
      }}>
        {filteredDialogs.map((dialog) => {
          const scoreInfo = getSetScoreInfo('dialog', dialog.id);

          return (
            <div
              key={dialog.id}
              className="glass-panel"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(14, 165, 233, 0.15)',
                    color: 'var(--accent-cyan)'
                  }}>
                    {dialog.id}
                  </span>

                  {scoreInfo && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: scoreInfo.bestPercentage >= 75 ? 'var(--success)' : 'var(--warning)',
                      background: scoreInfo.bestPercentage >= 75 ? 'var(--success-bg)' : 'var(--warning-bg)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-full)'
                    }}>
                      <Award size={14} />
                      <span>Best: {scoreInfo.bestScore} / {scoreInfo.maxScore}</span>
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                  {dialog.title}
                </h3>

                <p style={{
                  fontSize: '0.88rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: '1rem'
                }}>
                  {dialog.situation}
                </p>
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.85rem',
                  marginBottom: '1rem'
                }}>
                  <span>{dialog.turns.length} Turn-by-Turn Exchanges</span>
                  <span>Max Score: {dialog.turns.length * 10} pts</span>
                </div>

                <Link
                  to={`/dialogs/${dialog.id}`}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    fontSize: '0.95rem',
                    background: 'linear-gradient(135deg, #0EA5E9, #0284C7)'
                  }}
                >
                  <Play size={16} fill="currentColor" />
                  <span>{scoreInfo ? 'Practice Again' : 'Start Role-Play'}</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDialogs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          No dialog scenarios found matching "{searchTerm}".
        </div>
      )}
    </div>
  );
}
