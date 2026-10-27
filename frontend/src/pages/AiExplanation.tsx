import React from 'react';
import {
  BrainCircuit,
  Calculator,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Layers,
  HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { ClassificationResult } from '../types';
import { PageId } from '../components/Sidebar';

interface Props {
  currentResult: ClassificationResult | null;
  onNavigate: (page: PageId) => void;
}

export const AiExplanation: React.FC<Props> = ({ currentResult, onNavigate }) => {
  // If no email was scanned yet, use a representative realistic result for demonstration
  const sampleResult: ClassificationResult = currentResult || {
    scan_id: 'SCAN-SAMPLE-88',
    subject: 'URGENT: Verify your bank account credentials immediately',
    prediction: 'SPAM',
    spam_probability: 0.9984,
    ham_probability: 0.0016,
    review_status: 'AUTOMATIC_CLASSIFICATION',
    decision_reason: 'Spam posterior probability (99.8%) heavily exceeds high uncertainty threshold (65.0%).',
    uncertainty_interval: [0.35, 0.65],
    vocabulary_tokens_found: 6,
    influential_words: [
      { word: 'urgent', p_word_given_spam: 0.100259, p_word_given_ham: 0.004516, log_p_spam: -2.3, log_p_ham: -5.4, log_likelihood_ratio: 3.1, leaning: 'SPAM', impact_score: 3.1 },
      { word: 'verify', p_word_given_spam: 0.090718, p_word_given_ham: 0.008229, log_p_spam: -2.4, log_p_ham: -4.8, log_likelihood_ratio: 2.4, leaning: 'SPAM', impact_score: 2.4 },
      { word: 'suspended', p_word_given_spam: 0.060810, p_word_given_ham: 0.002029, log_p_spam: -2.8, log_p_ham: -6.2, log_likelihood_ratio: 3.4, leaning: 'SPAM', impact_score: 3.4 },
      { word: 'credentials', p_word_given_spam: 0.055023, p_word_given_ham: 0.003027, log_p_spam: -2.9, log_p_ham: -5.8, log_likelihood_ratio: 2.9, leaning: 'SPAM', impact_score: 2.9 },
      { word: 'immediately', p_word_given_spam: 0.082085, p_word_given_ham: 0.006096, log_p_spam: -2.5, log_p_ham: -5.1, log_likelihood_ratio: 2.6, leaning: 'SPAM', impact_score: 2.6 },
      { word: 'account', p_word_given_spam: 0.120000, p_word_given_ham: 0.085000, log_p_spam: -2.12, log_p_ham: -2.46, log_likelihood_ratio: 0.34, leaning: 'SPAM', impact_score: 0.34 }
    ],
    rule_indicators: [
      { type: 'IP_HOSTED_URL', severity: 'HIGH', description: 'URL hosted on raw IP address detected.' },
      { type: 'HIGH_URGENCY_TRIGGER', severity: 'MEDIUM', description: 'High psychological pressure terms detected: urgent, immediately, suspended.' }
    ],
    natural_explanation: 'The Naive Bayes engine evaluated 6 vocabulary features using Laplace smoothing (α=1.0). Words heavily elevating spam likelihood: urgent, verify, suspended, credentials.',
    class_priors: { p_spam: 0.48, p_ham: 0.52 },
    model_version: 'MultinomialNB (Laplace α=1.0)'
  };

  const active = sampleResult;
  const influentialWords = active.influential_words || [];

  // Bar chart data comparing per-word learned conditional probabilities: P(w|Spam) vs P(w|Ham)
  const barChartData = influentialWords.slice(0, 7).map(w => ({
    word: w.word,
    'P(word | Spam)': parseFloat((w.p_word_given_spam * 100).toFixed(3)),
    'P(word | Ham)': parseFloat((w.p_word_given_ham * 100).toFixed(3))
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Overview Banner */}
      <section
        className="glass-panel"
        style={{
          padding: '28px 32px',
          background: 'radial-gradient(120% 120% at 90% 10%, rgba(128, 74, 138, 0.25) 0%, rgba(36, 16, 63, 0.5) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className={`badge ${active.prediction === 'SPAM' ? 'badge-spam' : active.prediction === 'NEEDS REVIEW' ? 'badge-review' : 'badge-legit'}`}>
              Predicted: {active.prediction}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Scan: <strong style={{ color: '#F8D299', fontFamily: 'var(--font-mono)' }}>{active.scan_id}</strong>
            </span>
          </div>

          <h2 style={{ fontSize: '1.6rem', color: '#FFF8FF', marginBottom: '6px' }}>
            {active.subject ? `"${active.subject}"` : 'Explainable AI Breakdown'}
          </h2>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '640px' }}>
            {active.natural_explanation}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>P(Spam | Words)</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F59E51', fontFamily: 'var(--font-mono)' }}>
              {(active.spam_probability * 100).toFixed(2)}%
            </span>
          </div>

          <div
            style={{
              padding: '16px 20px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>P(Not Spam | Words)</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#E2C9FB', fontFamily: 'var(--font-mono)' }}>
              {(active.ham_probability * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </section>

      {/* Mathematical Theory Educational Card */}
      <section
        className="glass-panel"
        style={{
          padding: '24px 28px',
          backgroundColor: 'rgba(36, 16, 63, 0.45)',
          border: '1px solid rgba(248, 210, 153, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <BookOpen size={20} color="#F8D299" />
          <h3 style={{ fontSize: '1.15rem', color: '#FFF8FF' }}>
            Mathematical Formulation: Bayes' Theorem & Laplace Smoothing
          </h3>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
            marginTop: '10px'
          }}
        >
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(22, 11, 45, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <span style={{ fontSize: '0.78rem', color: '#F8D299', fontWeight: 600, textTransform: 'uppercase' }}>
              1. Conditional Posterior Probability
            </span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#FFF8FF', margin: '8px 0', padding: '8px', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '6px' }}>
              P(Spam | W) = [ P(Spam) · ∏ P(wᵢ | Spam) ] / P(W)
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              To compute the probability that an email is spam given observed words W = &#123;w₁, ..., wₙ&#125;, the engine multiplies the prior class probability P(Spam) by each individual conditional word likelihood.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(22, 11, 45, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <span style={{ fontSize: '0.78rem', color: '#F8D299', fontWeight: 600, textTransform: 'uppercase' }}>
              2. Log-Space Transformation (Numerical Underflow Prevention)
            </span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#FFF8FF', margin: '8px 0', padding: '8px', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '6px' }}>
              log P(Spam | W) ∝ log P(Spam) + ∑ log P(wᵢ | Spam)
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Multiplying many small probabilities results in arithmetic floating-point underflow. We compute in log-space by summing log-probabilities, converting to posterior probability via the logistic function.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(22, 11, 45, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <span style={{ fontSize: '0.78rem', color: '#F8D299', fontWeight: 600, textTransform: 'uppercase' }}>
              3. Laplace Additive Smoothing (α = 1.0)
            </span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#FFF8FF', margin: '8px 0', padding: '8px', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '6px' }}>
              P(w | C) = [ Count(w, C) + α ] / [ TotalWords(C) + α · |V| ]
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              If a word was never observed in training data for a class, without Laplace smoothing its probability would be zero, wiping out all other evidence. Setting α=1 assigns an infinitesimal pseudo-count to maintain calibration.
            </p>
          </div>
        </div>
      </section>

      {/* Visual Bar Chart: P(w|Spam) vs P(w|Ham) */}
      <section className="glass-panel" style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: '#FFF8FF' }}>Learned Feature Likelihoods Comparison</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Direct comparison of P(w | Spam) vs P(w | Legitimate) for tokens identified in the email
            </p>
          </div>
        </div>

        <div style={{ width: '100%', height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
              <XAxis dataKey="word" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(28, 14, 52, 0.95)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  color: '#FFF8FF',
                  backdropFilter: 'blur(16px)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="P(word | Spam)" fill="#F59E51" radius={[6, 6, 0, 0]} name="P(w | Spam) %" />
              <Bar dataKey="P(word | Ham)" fill="#804A8A" radius={[6, 6, 0, 0]} name="P(w | Ham) %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Comparison Table: Per-word learned conditional probabilities & Log-Likelihood Ratio */}
      <section className="glass-panel" style={{ padding: '28px 32px' }}>
        <div style={{ marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#FFF8FF' }}>Word-Level Evidence & Log-Odds Table</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Log-likelihood ratio: log[ P(w | Spam) / P(w | Ham) ]. Positive indicates spam evidence, negative indicates legitimacy evidence.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>Feature Token</th>
                <th style={{ padding: '12px 16px' }}>P(w | Spam)</th>
                <th style={{ padding: '12px 16px' }}>P(w | Ham)</th>
                <th style={{ padding: '12px 16px' }}>Log-Likelihood Ratio</th>
                <th style={{ padding: '12px 16px' }}>Leaning Direction</th>
                <th style={{ padding: '12px 16px' }}>Decision Weight</th>
              </tr>
            </thead>
            <tbody>
              {influentialWords.map((row, i) => {
                const isSpamToken = row.leaning === 'SPAM';
                return (
                  <tr
                    key={i}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#FFF8FF', fontFamily: 'var(--font-mono)' }}>
                      {row.word}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#F59E51' }}>
                      {row.p_word_given_spam.toFixed(6)}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#E2C9FB' }}>
                      {row.p_word_given_ham.toFixed(6)}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700, color: row.log_likelihood_ratio > 0 ? '#F59E51' : '#B085D6' }}>
                      {row.log_likelihood_ratio > 0 ? '+' : ''}{row.log_likelihood_ratio.toFixed(4)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${isSpamToken ? 'badge-spam' : 'badge-legit'}`}>
                        {row.leaning}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '80px', height: '6px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, (row.impact_score / 3.5) * 100)}%`,
                              height: '100%',
                              backgroundColor: isSpamToken ? '#F59E51' : '#804A8A',
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {row.impact_score.toFixed(2)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Model Evidence vs Heuristic Rules Clarification */}
      <section
        className="glass-panel"
        style={{
          padding: '24px 28px',
          borderLeft: '4px solid #F8D299'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Info size={18} color="#F8D299" />
          <h4 style={{ fontSize: '1rem', color: '#FFF8FF' }}>
            Academic Distinction: Trained Naive Bayes Evidence vs. Security Heuristics
          </h4>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          As required by probabilistic machine learning standards, SpamShield AI clearly distinguishes between <strong>statistical model evidence</strong> (derived strictly from word conditional probabilities P(w|C) and Bayes' Rule) and <strong>supplementary heuristic rules</strong> (such as raw IP URL syntax or uppercase character count). Supplementary rules do not contaminate prior distributions; they act as layered defensive guardrails.
        </p>
      </section>
    </div>
  );
};
