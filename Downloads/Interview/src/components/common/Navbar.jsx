import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Headphones, 
  MessagesSquare, 
  BarChart3, 
  Mic2, 
  Sun, 
  Moon, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function Navbar() {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/listening', label: 'Listening', fullLabel: 'Listening Comprehension', icon: Headphones, badge: '30' },
    { to: '/dialogs', label: 'Dialogs', fullLabel: 'Situational Dialog', icon: MessagesSquare, badge: '30' },
    { to: '/dashboard', label: 'Dashboard', fullLabel: 'Dashboard & Streak', icon: BarChart3 },
    { to: '/speech-test', label: 'Audio Test', fullLabel: 'Mic & Audio Test', icon: Mic2 },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="navbar-header" style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      transition: 'all var(--transition-normal)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '68px',
        maxWidth: '1200px'
      }}>
        {/* Brand */}
        <Link 
          to="/" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
            flexShrink: 0
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '1.25rem',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--primary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              whiteSpace: 'nowrap',
              lineHeight: 1.15
            }}>
              FluentPrep
            </div>
            <div style={{
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              lineHeight: 1
            }}>
              Placement English
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav style={{
          display: 'none',
          alignItems: 'center',
          gap: '0.4rem',
        }} className="desktop-nav">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--primary-light)' : 'transparent',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                  height: '40px',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap' }}>{link.label}</span>
                {link.badge && (
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: 'var(--radius-full)',
                    background: active ? 'var(--primary)' : 'var(--border-subtle)',
                    color: active ? '#FFFFFF' : 'var(--text-muted)',
                    fontWeight: 700,
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap'
                  }}>
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right actions: Theme Toggle & Mobile hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark/light theme"
            className="btn btn-secondary"
            style={{
              width: '40px',
              height: '40px',
              minHeight: '40px',
              padding: 0,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#FBBF24' : '#4F46E5',
              flexShrink: 0
            }}
          >
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="btn btn-secondary mobile-menu-btn"
            style={{
              width: '40px',
              height: '40px',
              minHeight: '40px',
              padding: 0,
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              flexShrink: 0
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.95rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--primary)' : 'var(--text-primary)',
                  background: active ? 'var(--primary-light)' : 'transparent',
                  minHeight: '46px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={19} />
                  <span>{link.fullLabel || link.label}</span>
                </div>
                {link.badge && (
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-full)',
                    background: active ? 'var(--primary)' : 'var(--border-subtle)',
                    color: active ? '#FFFFFF' : 'var(--text-muted)',
                    fontWeight: 700
                  }}>
                    {link.badge} Sets
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
