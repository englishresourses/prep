import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Headphones, CheckCircle2, Search, ArrowRight, Award, Play } from 'lucide-react';
import listeningData from '../data/listening.json';
import { getSetScoreInfo } from '../services/storage';

export default function ListeningListPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSets = listeningData.filter(set => 
    set.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    set.passage.toLowerCase().includes(searchTerm.toLowerCase()) ||
    set.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container" style={{ padding: '2rem 1rem 4rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          <Headphones size={18} />
          <span>MODULE 1</span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: '0.5rem' }}>
          Listening Comprehension
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '650px', fontSize: '1rem' }}>
          Choose from 30 first-person narrative situations. Listen to the passage carefully, then answer 4 spoken questions to score points.
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
          placeholder="Search by topic, character, or place..."
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

      {/* Sets Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
        gap: '1.25rem'
      }}>
        {filteredSets.map((set) => {
          const scoreInfo = getSetScoreInfo('listening', set.id);

          return (
            <div
              key={set.id}
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
                    background: 'var(--primary-light)',
                    color: 'var(--primary)'
                  }}>
                    {set.id}
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
                  {set.title}
                </h3>

                <p style={{
                  fontSize: '0.88rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  marginBottom: '1rem'
                }}>
                  🎧 First-person spoken scenario. Listen to the passage audio carefully to answer 4 spoken questions.
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
                  <span>{set.questions.length} Spoken Questions</span>
                  <span>Max Score: {set.questions.length * 10} pts</span>
                </div>

                <Link
                  to={`/listening/${set.id}`}
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '0.95rem' }}
                >
                  <Play size={16} fill="currentColor" />
                  <span>{scoreInfo ? 'Practice Again' : 'Start Set'}</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          No listening sets found matching "{searchTerm}".
        </div>
      )}
    </div>
  );
}
