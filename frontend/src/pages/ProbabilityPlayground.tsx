import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Split,
  BookOpen,
  Zap,
  Info,
  Scale
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { runClientBayesClassification } from '../services/localBayesEngine';
import { ClassificationResult } from '../types';

export const ProbabilityPlayground: React.FC = () => {
  // Mode: Single Interactive Email vs Side-by-Side Comparison
  const [mode, setMode] = useState<'single' | 'compare'>('single');

  // Single mode state
  const [emailText, setEmailText] = useState(
    'Please find attached the project meeting schedule for this Friday.'
  );
  const [activeTokens, setActiveTokens] = useState<string[]>([]);
  const [singleResult, setSingleResult] = useState<ClassificationResult>(() =>
    runClientBayesClassification(emailText)
  );

  // Side-by-Side Compare state
  const [emailA, setEmailA] = useState(
    'Hi Sarah, can you review the attached project schedule for our team sync?'
  );
  const [emailB, setEmailB] = useState(
    'Hi Sarah, urgent: verify your crypto account immediately to claim bonus prize!'
  );
  const [resultA, setResultA] = useState<ClassificationResult>(() =>
    runClientBayesClassification(emailA)
  );
  const [resultB, setResultB] = useState<ClassificationResult>(() =>
    runClientBayesClassification(emailB)
  );

  // Suggested words to inject / test
  const INJECTABLE_SPAM_WORDS = ['urgent', 'lottery', 'wire', 'transfer', 'crypto', 'jackpot', 'suspended', 'verify', 'free'];
  const INJECTABLE_HAM_WORDS = ['meeting', 'attached', 'sync', 'deadline', 'assignment', 'thanks', 'schedule', 'review'];

  useEffect(() => {
    const res = runClientBayesClassification(emailText);
    setSingleResult(res);
    const tokens = (emailText.toLowerCase().match(/\b[a-z]{2,}\b/g) || []);
    setActiveTokens(Array.from(new Set(tokens)));
  }, [emailText]);

  useEffect(() => {
    setResultA(runClientBayesClassification(emailA));
  }, [emailA]);

  useEffect(() => {
    setResultB(runClientBayesClassification(emailB));
  }, [emailB]);

  const addWord = (word: string) => {
    setEmailText(prev => `${prev.trim()} ${word}`);
  };

  const removeWord = (word: string) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    setEmailText(prev => prev.replace(regex, '').replace(/\s+/g, ' ').trim());
  };

  const handleReset = () => {
    setEmailText('Please find attached the project meeting schedule for this Friday.');
  };

  // Bar chart comparing Spam vs Ham for single email
  const singleProbData = [
    { name: 'Spam Probability', value: parseFloat((singleResult.spam_probability * 100).toFixed(2)), color: '#F59E51' },
    { name: 'Legitimate Probability', value: parseFloat((singleResult.ham_probability * 100).toFixed(2)), color: '#804A8A' }
  ];

  // Compare Chart Data
  const compareData = [
    { name: 'Email A (Ham-leaning)', spam: parseFloat((resultA.spam_probability * 100).toFixed(1)), ham: parseFloat((resultA.ham_probability * 100).toFixed(1)) },
    { name: 'Email B (Spam-leaning)', spam: parseFloat((resultB.spam_probability * 100).toFixed(1)), ham: parseFloat((resultB.ham_probability * 100).toFixed(1)) }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Controls & Mode Switcher */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', color: '#FFF8FF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={22} color="#F8D299" />
            Interactive Conditional Probability Simulator
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Experience Bayes' theorem dynamically: observe how adding single tokens changes posterior odds
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setMode('single')}
            className={mode === 'single' ? 'btn-primary' : 'btn-glass'}
            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
          >
            Interactive Word Inserter
          </button>
          <button
            onClick={() => setMode('compare')}
            className={mode === 'compare' ? 'btn-primary' : 'btn-glass'}
            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
          >
            <Split size={14} style={{ marginRight: '6px' }} />
            Side-by-Side Comparison
          </button>
        </div>
      </div>

      {mode === 'single' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }} className="playground-grid">
          {/* Left: Interactive Email Editor & Quick Word Injectors */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.9rem', color: '#FFF8FF', fontWeight: 600 }}>
                Test Message Workspace
              </span>
              <button onClick={handleReset} className="btn-glass" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                <RotateCcw size={12} style={{ marginRight: '4px' }} />
                Reset
              </button>
            </div>

            <textarea
              rows={5}
              value={emailText}
              onChange={e => setEmailText(e.target.value)}
              className="glass-input"
              style={{ marginBottom: '18px', resize: 'vertical' }}
            />

            {/* Quick Word Injection Buttons */}
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '0.78rem', color: '#F59E51', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Inject Spam-Biased Tokens (+ log-odds):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {INJECTABLE_SPAM_WORDS.map(word => (
                  <button
                    key={word}
                    onClick={() => addWord(word)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(245, 158, 81, 0.15)',
                      border: '1px solid rgba(245, 158, 81, 0.35)',
                      color: '#F59E51',
                      fontSize: '0.78rem',
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={12} />
                    {word}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '0.78rem', color: '#B085D6', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Inject Ham-Biased Tokens (- log-odds):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {INJECTABLE_HAM_WORDS.map(word => (
                  <button
                    key={word}
                    onClick={() => addWord(word)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(128, 74, 138, 0.25)',
                      border: '1px solid rgba(128, 74, 138, 0.45)',
                      color: '#E2C9FB',
                      fontSize: '0.78rem',
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={12} />
                    {word}
                  </button>
                ))}
              </div>
            </div>

            {/* Currently Active Tokens in text (Click to Remove) */}
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Tokens in Message (Click token to remove):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {activeTokens.map((token, idx) => (
                  <button
                    key={idx}
                    onClick={() => removeWord(token)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFF8FF',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Click to remove from message"
                  >
                    {token}
                    <Minus size={10} color="#F8D299" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Live Probability Gauge & Mathematical Impact */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.9rem', color: '#FFF8FF', fontWeight: 600 }}>
                Live Posterior Outcome
              </span>
              <span
                className={`badge ${singleResult.prediction === 'SPAM' ? 'badge-spam' : singleResult.prediction === 'NEEDS REVIEW' ? 'badge-review' : 'badge-legit'}`}
              >
                {singleResult.prediction}
              </span>
            </div>

            {/* Gauge Percentages */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(245, 158, 81, 0.12)',
                  border: '1px solid rgba(245, 158, 81, 0.3)',
                  textAlign: 'center'
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>P(Spam | Text)</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#F59E51', fontFamily: 'var(--font-mono)' }}>
                  {(singleResult.spam_probability * 100).toFixed(1)}%
                </div>
              </div>

              <div
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(128, 74, 138, 0.2)',
                  border: '1px solid rgba(128, 74, 138, 0.4)',
                  textAlign: 'center'
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>P(Not Spam | Text)</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#E2C9FB', fontFamily: 'var(--font-mono)' }}>
                  {(singleResult.ham_probability * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Real-time Probability Bar Chart */}
            <div style={{ width: '100%', height: '170px', marginBottom: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={singleProbData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} unit="%" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={11} width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(28, 14, 52, 0.95)',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      color: '#FFF8FF'
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {singleProbData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Explanation box */}
            <div
              style={{
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.45
              }}
            >
              <strong style={{ color: '#F8D299' }}>Conditional Probability Impact:</strong>{' '}
              {singleResult.decision_reason}
            </div>
          </div>
        </div>
      ) : (
        /* Side-by-Side Comparison Mode */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="playground-grid">
          {/* Email A */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.95rem', color: '#B085D6', fontWeight: 600 }}>Message A (Legitimate Candidate)</span>
              <span className={`badge ${resultA.prediction === 'SPAM' ? 'badge-spam' : resultA.prediction === 'NEEDS REVIEW' ? 'badge-review' : 'badge-legit'}`}>
                {resultA.prediction}
              </span>
            </div>
            <textarea
              rows={4}
              value={emailA}
              onChange={e => setEmailA(e.target.value)}
              className="glass-input"
              style={{ marginBottom: '14px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Spam Posterior:</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F59E51', fontFamily: 'var(--font-mono)' }}>
                {(resultA.spam_probability * 100).toFixed(2)}%
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${resultA.spam_probability * 100}%`, height: '100%', backgroundColor: '#F59E51' }} />
            </div>
          </div>

          {/* Email B */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.95rem', color: '#F59E51', fontWeight: 600 }}>Message B (Phishing / Spam Candidate)</span>
              <span className={`badge ${resultB.prediction === 'SPAM' ? 'badge-spam' : resultB.prediction === 'NEEDS REVIEW' ? 'badge-review' : 'badge-legit'}`}>
                {resultB.prediction}
              </span>
            </div>
            <textarea
              rows={4}
              value={emailB}
              onChange={e => setEmailB(e.target.value)}
              className="glass-input"
              style={{ marginBottom: '14px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Spam Posterior:</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F59E51', fontFamily: 'var(--font-mono)' }}>
                {(resultB.spam_probability * 100).toFixed(2)}%
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${resultB.spam_probability * 100}%`, height: '100%', backgroundColor: '#F59E51' }} />
            </div>
          </div>
        </div>
      )}

      {/* Educational Theory Reference Panel */}
      <section
        className="glass-panel"
        style={{
          padding: '24px 28px',
          border: '1px solid rgba(248, 210, 153, 0.25)',
          backgroundColor: 'rgba(36, 16, 63, 0.45)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Scale size={20} color="#F8D299" />
          <h3 style={{ fontSize: '1.1rem', color: '#FFF8FF' }}>
            Probability Theory Concepts Demonstrated in this Playground
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(22, 11, 45, 0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.78rem', color: '#F8D299', fontWeight: 600 }}>PRIOR PROBABILITY P(C)</span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Base probability of an email being spam before inspecting its text words. Derived from dataset class distribution (~48% spam, 52% ham).
            </p>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(22, 11, 45, 0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.78rem', color: '#F8D299', fontWeight: 600 }}>CONDITIONAL LIKELIHOOD P(w|C)</span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              The learned frequency of observing token <em>w</em> given that the message is in class <em>C</em>. Calculated with Laplace smoothing.
            </p>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(22, 11, 45, 0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.78rem', color: '#F8D299', fontWeight: 600 }}>NAIVE INDEPENDENCE ASSUMPTION</span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Assumes all word features are conditionally independent given the class: P(w₁, w₂ | C) = P(w₁|C) · P(w₂|C). Highly effective for text classification.
            </p>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .playground-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
