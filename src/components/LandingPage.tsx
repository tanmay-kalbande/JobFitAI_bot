import { useState, useEffect } from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onEnter: () => void;
}

const FEATURES = [
  {
    icon: '◈',
    label: 'Generate',
    title: 'Instant Resume Structuring',
    desc: 'Paste your raw career details - get a clean, professional resume in seconds.',
  },
  {
    icon: '◉',
    label: 'Tailor',
    title: 'Job-Specific Tailoring',
    desc: 'Feed it a job description. Watch your resume reshape itself to match exactly what they\'re hiring for.',
  },
  {
    icon: '◇',
    label: 'Polish',
    title: 'AI Agent Editing',
    desc: 'Chat with an AI agent to fine-tune any section. It detects intent even through typos.',
  },
];

const PROVIDERS = ['Google AI', 'Cerebras', 'Mistral AI', 'Groq', 'SambaNova', 'Z.AI', 'OpenRouter'];

export function LandingPage({ onEnter }: LandingPageProps) {
  const [providerIdx, setProviderIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setProviderIdx(i => (i + 1) % PROVIDERS.length);
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className={`lp-root ${visible ? 'lp-visible' : ''}`} role="main">
      {/* Background container (clips orbs) */}
      <div className="lp-bg-wrapper" aria-hidden="true">
        <div className="lp-grain" />
        <div className="lp-grid" />
        <div className="lp-orb lp-orb-a" />
        <div className="lp-orb lp-orb-b" />
        <div className="lp-orb lp-orb-c" />
      </div>

      {/* Top bar */}
      <header className="lp-header">
        <nav className="lp-logo" aria-label="JobFit AI Home">
          <span className="lp-logo-mark" aria-hidden="true">◈</span>
          <span className="lp-logo-word">JOBFIT</span>
        </nav>
      </header>

      {/* Hero */}
      <section className="lp-hero" aria-label="Hero">
        <div className="lp-hero-eyebrow">
          <span className="lp-pill">AI-POWERED RESUME BUILDER</span>
        </div>

        <h1 className="lp-hero-title">
          <span className="lp-hero-line">Resumes that</span>
          <span className="lp-hero-line lp-hero-accent">actually get you hired.</span>
        </h1>

        <p className="lp-hero-sub">
          Paste your career details. Paste a job description. Get a tailored,
          ATS-optimised resume with alignment scoring and an AI agent that edits on command.
        </p>

        <div className="lp-hero-cta">
          <button className="lp-btn-primary" onClick={onEnter} aria-label="Build My Resume Now - Open JobFit AI App">
            <span>Build My Resume Now</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
          <span className="lp-hero-note">
            Runs on{' '}
            <span className="lp-provider-cycle" key={providerIdx}>
              {PROVIDERS[providerIdx]}
            </span>
            {' '} - your key, your data.
          </span>
        </div>
      </section>

      {/* Feature grid */}
      <section className="lp-features-wrapper" aria-label="Features">
        <h2 className="sr-only">Key Features</h2>
        <div className="lp-features-grid">
          {FEATURES.map((f, i) => (
            <article className="lp-feature-card" key={f.label} style={{ animationDelay: `${0.7 + i * 0.1}s` }}>
              <div className="lp-feature-top">
                <span className="lp-feature-icon" aria-hidden="true">{f.icon}</span>
                <span className="lp-feature-tag">{f.label}</span>
              </div>
              <h3 className="lp-feature-title">{f.title}</h3>
              <p className="lp-feature-desc">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-tags">
          <span className="lp-tag">FREE</span>
          <span className="lp-tag-dot" aria-hidden="true">•</span>
          <span className="lp-tag">OPEN SOURCE</span>
          <span className="lp-tag-dot" aria-hidden="true">•</span>
          <span className="lp-tag">PRIVACY FIRST</span>
        </div>
      </footer>
    </div>
  );
}
