import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  GraduationCap,
  RefreshCw,
  Layers,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { ClassificationResult } from '../types';
import { classifyEmailApi } from '../services/api';

interface ConditionalProbabilityVisualizerProps {
  currentScan?: ClassificationResult | null;
  onScanUpdated?: (newScan: ClassificationResult) => void;
  showQuickTestButtons?: boolean;
}

const SAMPLE_SUSPICIOUS = {
  subject: 'URGENT: Security alert - Verify your password & confirm your OTP immediately',
  sender: 'account-security@bank-alert-verify.info',
  body: 'Dear customer, unauthorized activity was detected on your account. Your account has been suspended! Please verify your password and confirm your OTP at http://192.168.1.105/auth within 24 hours to prevent permanent account suspension.'
};

const SAMPLE_COLLEGE = {
  subject: 'Project Meeting & Action Items Sync',
  sender: 'prof.sharma@university.edu',
  body: 'Hi team, please find attached the meeting minutes and project notes from our discussion today. Reminder that our weekly review is scheduled for tomorrow at 2 PM in Room 402.'
};

const SAMPLE_BORDERLINE = {
  subject: 'Campus password security update',
  sender: 'it-security@university.edu',
  body: 'Security update: Annual password policy update for university accounts.'
};

export const ConditionalProbabilityVisualizer: React.FC<ConditionalProbabilityVisualizerProps> = ({
  currentScan,
  onScanUpdated,
  showQuickTestButtons = true
}) => {
  const [showMath, setShowMath] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [localScan, setLocalScan] = useState<ClassificationResult | null>(null);

  // Active scan is either local override from quick test or prop
  const activeScan = localScan || currentScan;

  // Handle Quick Test execution
  const handleQuickTest = async (sample: typeof SAMPLE_SUSPICIOUS) => {
    setIsTesting(true);
    try {
      const res = await classifyEmailApi(sample.body, sample.subject, sample.sender);
      setLocalScan(res);
      if (onScanUpdated) {
        onScanUpdated(res);
      }
    } finally {
      setIsTesting(false);
    }
  };

  // Derive probability values from active scan or fallback baseline and normalize to ensure complementary total of 100%
  const rawSpamProb = activeScan ? activeScan.spam_probability : 0.5;
  const rawHamProb = activeScan ? activeScan.ham_probability : 0.5;
  const totalProb = rawSpamProb + rawHamProb;
  const spamProb = totalProb > 0 ? rawSpamProb / totalProb : 0.5;
  const hamProb = totalProb > 0 ? rawHamProb / totalProb : 0.5;
  const spamPercent = parseFloat((spamProb * 100).toFixed(1));
  const hamPercent = parseFloat((100 - spamPercent).toFixed(1));

  // Prior probabilities from actual classifier (Laplace-smoothed training corpus)
  const priorSpam = activeScan?.bayes_breakdown?.p_prior_spam ?? (activeScan?.class_priors?.p_spam ?? 0.4906);
  const priorHam = activeScan?.bayes_breakdown?.p_prior_ham ?? (activeScan?.class_priors?.p_ham ?? 0.5094);
  const priorSpamPct = parseFloat((priorSpam * 100).toFixed(1));
  const priorHamPct = parseFloat((priorHam * 100).toFixed(1));

  // Log probabilities from active scan
  const logPriorSpam = activeScan?.bayes_breakdown?.log_prior_spam ?? -0.7121;
  const logPriorHam = activeScan?.bayes_breakdown?.log_prior_ham ?? -0.6746;
  const logLikSpam = activeScan?.bayes_breakdown?.log_likelihood_spam ?? 0.0;
  const logLikHam = activeScan?.bayes_breakdown?.log_likelihood_ham ?? 0.0;
  const jointLogSpam = activeScan?.bayes_breakdown?.joint_log_spam ?? (logPriorSpam + logLikSpam);
  const jointLogHam = activeScan?.bayes_breakdown?.joint_log_ham ?? (logPriorHam + logLikHam);
  const tokenBreakdown = activeScan?.bayes_breakdown?.token_breakdown || [];

  // Chart data for responsive bar chart
  const barData = [
    {
      name: 'Spam',
      probability: spamPercent,
      color: spamProb >= 0.5 ? '#F59E51' : '#E2C9FB',
      description: 'Probability message is unsolicited or malicious'
    },
    {
      name: 'Not Spam',
      probability: hamPercent,
      color: hamProb >= 0.5 ? '#804A8A' : '#F8D299',
      description: 'Probability message is legitimate communication'
    }
  ];

  return (
    <section
      className="glass-panel"
      style={{
        padding: '28px 32px',
        background: 'linear-gradient(135deg, rgba(58, 3, 83, 0.45) 0%, rgba(22, 11, 45, 0.75) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        position: 'relative'
      }}
    >
      {/* 1. Header with Metadata */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Sparkles size={15} color="#F8D299" />
            <span style={{ fontSize: '0.78rem', color: '#F8D299', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Conditional Probability Visualizer
            </span>
          </div>

          <h3 style={{ fontSize: '1.35rem', color: '#FFF8FF', fontWeight: 700, margin: 0 }}>
            Bayesian Posterior Distribution
          </h3>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '580px' }}>
            Visualizing P(Spam | Email) and P(Not Spam | Email) calculated via Bayes' Theorem using Laplace-smoothed conditional word likelihoods.
          </p>
        </div>

        {/* Scan Status Badge */}
        {activeScan && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '4px'
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                backgroundColor:
                  activeScan.prediction === 'SPAM'
                    ? 'rgba(245, 158, 81, 0.25)'
                    : activeScan.prediction === 'LEGITIMATE'
                    ? 'rgba(128, 74, 138, 0.35)'
                    : 'rgba(248, 210, 153, 0.25)',
                color:
                  activeScan.prediction === 'SPAM'
                    ? '#F59E51'
                    : activeScan.prediction === 'LEGITIMATE'
                    ? '#E2C9FB'
                    : '#F8D299',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
              CLASSIFIED AS {activeScan.prediction}
            </div>

            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {activeScan.subject ? `"${activeScan.subject.slice(0, 38)}..."` : 'Scanned Email Evidence'}
            </span>
          </div>
        )}
      </div>

      {/* Quick Test Switcher Buttons (Requirement 8) */}
      {showQuickTestButtons && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            padding: '12px 16px',
            backgroundColor: 'rgba(22, 11, 45, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            marginBottom: '22px'
          }}
        >
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Layers size={13} color="#F8D299" />
            Quick Test Comparison:
          </span>

          <button
            onClick={() => handleQuickTest(SAMPLE_SUSPICIOUS)}
            disabled={isTesting}
            className="btn-glass"
            style={{
              padding: '5px 12px',
              fontSize: '0.75rem',
              color: '#F59E51',
              borderColor: 'rgba(245, 158, 81, 0.35)'
            }}
          >
            <Zap size={12} color="#F59E51" />
            Test Suspicious Email (Password/OTP)
          </button>

          <button
            onClick={() => handleQuickTest(SAMPLE_COLLEGE)}
            disabled={isTesting}
            className="btn-glass"
            style={{
              padding: '5px 12px',
              fontSize: '0.75rem',
              color: '#E2C9FB',
              borderColor: 'rgba(128, 74, 138, 0.5)'
            }}
          >
            <GraduationCap size={13} color="#E2C9FB" />
            Test Normal College Email (Meeting Sync)
          </button>

          <button
            onClick={() => handleQuickTest(SAMPLE_BORDERLINE)}
            disabled={isTesting}
            className="btn-glass"
            style={{
              padding: '5px 12px',
              fontSize: '0.75rem',
              color: '#F8D299',
              borderColor: 'rgba(248, 210, 153, 0.45)'
            }}
          >
            <AlertTriangle size={12} color="#F8D299" />
            Test Borderline Review Email (Campus Security)
          </button>

          {isTesting && (
            <span style={{ fontSize: '0.72rem', color: '#F8D299', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RefreshCw size={11} className="spin" /> Computing probabilities...
            </span>
          )}
        </div>
      )}

      {/* 2. Responsive Bar Chart Section (Requirement 2 & 3) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.4fr) minmax(220px, 1fr)', gap: '22px', alignItems: 'center', marginBottom: '22px' }}>
        {/* Main Bar Chart */}
        <div style={{ width: '100%', height: '190px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 10, right: 35, left: 15, bottom: 5 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                unit="%"
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#FFF8FF"
                fontSize={13}
                fontWeight={600}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(val: any) => [`${val}%`, 'Posterior Probability']}
                contentStyle={{
                  backgroundColor: 'rgba(28, 14, 52, 0.95)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#FFF8FF',
                  fontSize: '0.8rem'
                }}
              />
              <Bar dataKey="probability" radius={[0, 8, 8, 0]} barSize={28}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Posterior Summary Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245, 158, 81, 0.12)',
              border: '1px solid rgba(245, 158, 81, 0.25)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: '#F59E51', fontWeight: 600, textTransform: 'uppercase' }}>
                P(Spam | Email)
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF8FF' }}>
                {spamPercent}%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Prior Base Rate</span>
              <div style={{ fontSize: '0.85rem', color: '#F8D299', fontWeight: 600 }}>
                {priorSpamPct}%
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '14px 18px',
              borderRadius: '12px',
              backgroundColor: 'rgba(128, 74, 138, 0.15)',
              border: '1px solid rgba(128, 74, 138, 0.35)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: '#E2C9FB', fontWeight: 600, textTransform: 'uppercase' }}>
                P(Not Spam | Email)
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF8FF' }}>
                {hamPercent}%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Prior Base Rate</span>
              <div style={{ fontSize: '0.85rem', color: '#E2C9FB', fontWeight: 600 }}>
                {priorHamPct}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Probability Shift Narrative */}
      <div
        style={{
          padding: '10px 16px',
          borderRadius: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '18px'
        }}
      >
        <strong style={{ color: '#F8D299' }}>Evidence Shift:</strong>
        <span>Prior P(Spam) = {priorSpamPct}%</span>
        <ArrowRight size={13} color="#F8D299" />
        <span>Conditioned on {activeScan?.vocabulary_tokens_found ?? activeScan?.influential_words?.length ?? 0} vocabulary token(s)</span>
        <ArrowRight size={13} color="#F8D299" />
        <span style={{ color: '#FFF8FF', fontWeight: 700 }}>Posterior P(Spam) = {spamPercent}%</span>
      </div>

      {/* 3. Expandable “Show Mathematical Calculation” Section (Requirement 4 & 5) */}
      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
        <button
          onClick={() => setShowMath(!showMath)}
          className="btn-glass"
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 16px',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#F8D299',
            borderColor: 'rgba(248, 210, 153, 0.25)',
            backgroundColor: 'rgba(36, 16, 63, 0.45)'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calculator size={15} color="#F8D299" />
            {showMath ? 'Hide Mathematical Calculation' : 'Show Mathematical Calculation'}
          </span>
          {showMath ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showMath && (
          <div
            style={{
              marginTop: '16px',
              padding: '20px 22px',
              borderRadius: '12px',
              backgroundColor: 'rgba(20, 9, 40, 0.7)',
              border: '1px solid rgba(248, 210, 153, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              fontSize: '0.83rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.55
            }}
          >
            {/* Step 1: Classical Bayes Theorem Formula */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F8D299', fontWeight: 700, marginBottom: '6px' }}>
                <span style={{ padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(248, 210, 153, 0.2)', fontSize: '0.72rem' }}>
                  STEP 1
                </span>
                Bayes' Theorem for Text Classification
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(36, 16, 63, 0.6)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  color: '#FFF8FF',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div>P(Spam | Words) = [ P(Words | Spam) × P(Spam) ] / P(Words)</div>
                <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#F8D299' }}>
                  where P(Words) = [ P(Words | Spam) × P(Spam) ] + [ P(Words | Not Spam) × P(Not Spam) ]
                </div>
              </div>
            </div>

            {/* Step 2: Available Prior Probabilities */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F8D299', fontWeight: 700, marginBottom: '6px' }}>
                <span style={{ padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(248, 210, 153, 0.2)', fontSize: '0.72rem' }}>
                  STEP 2
                </span>
                Available Prior Probabilities (Trained Training Corpus)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Prior P(Spam)</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F59E51', marginTop: '2px' }}>
                    {priorSpam} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>({priorSpamPct}%)</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    log P(Spam) = {logPriorSpam}
                  </div>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Prior P(Not Spam)</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#E2C9FB', marginTop: '2px' }}>
                    {priorHam} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>({priorHamPct}%)</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    log P(Not Spam) = {logPriorHam}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Feature Likelihoods Table (Laplace-Smoothed Conditional Probabilities) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F8D299', fontWeight: 700, marginBottom: '6px' }}>
                <span style={{ padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(248, 210, 153, 0.2)', fontSize: '0.72rem' }}>
                  STEP 3
                </span>
                Individual Feature Likelihoods P(w | Class)
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Calculated using Laplace smoothing (α=1.0) over document feature frequencies:
              </p>

              {tokenBreakdown.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '6px 8px' }}>Token (w)</th>
                        <th style={{ padding: '6px 8px' }}>P(w | Spam)</th>
                        <th style={{ padding: '6px 8px' }}>P(w | Not Spam)</th>
                        <th style={{ padding: '6px 8px' }}>Log Ratio</th>
                        <th style={{ padding: '6px 8px' }}>Leaning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenBreakdown.map((t, idx) => {
                        const isSpamLeaning = t.log_likelihood_ratio > 0.05;
                        const isHamLeaning = t.log_likelihood_ratio < -0.05;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                            <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', color: '#FFF8FF', fontWeight: 600 }}>
                              {t.word}
                            </td>
                            <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', color: '#F59E51' }}>
                              {t.p_word_given_spam.toFixed(6)}
                            </td>
                            <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', color: '#E2C9FB' }}>
                              {t.p_word_given_ham.toFixed(6)}
                            </td>
                            <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>
                              {t.log_likelihood_ratio > 0 ? `+${t.log_likelihood_ratio}` : t.log_likelihood_ratio}
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                  backgroundColor: isSpamLeaning
                                    ? 'rgba(245, 158, 81, 0.2)'
                                    : isHamLeaning
                                    ? 'rgba(128, 74, 138, 0.3)'
                                    : 'rgba(255, 255, 255, 0.1)',
                                  color: isSpamLeaning ? '#F59E51' : isHamLeaning ? '#E2C9FB' : 'var(--text-muted)'
                                }}
                              >
                                {isSpamLeaning ? 'Spam' : isHamLeaning ? 'Ham' : 'Neutral'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Scan an email containing recognized vocabulary words to see per-token likelihoods.
                </p>
              )}

              {/* Document Log-Likelihood Sums */}
              <div style={{ marginTop: '10px', display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.74rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Σ log P(w|Spam) = <strong style={{ color: '#F59E51' }}>{logLikSpam}</strong>
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  Σ log P(w|Not Spam) = <strong style={{ color: '#E2C9FB' }}>{logLikHam}</strong>
                </span>
              </div>
            </div>

            {/* Step 4: Final Posterior Normalization */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F8D299', fontWeight: 700, marginBottom: '6px' }}>
                <span style={{ padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(248, 210, 153, 0.2)', fontSize: '0.72rem' }}>
                  STEP 4
                </span>
                Joint Log Probability & Softmax Normalization
              </div>

              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(36, 16, 63, 0.6)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div>Joint Log Spam = log P(Spam) + Σ log P(w|Spam) = {logPriorSpam} + ({logLikSpam}) = <strong style={{ color: '#F59E51' }}>{jointLogSpam}</strong></div>
                <div>Joint Log Ham  = log P(Ham) + Σ log P(w|Ham)   = {logPriorHam} + ({logLikHam}) = <strong style={{ color: '#E2C9FB' }}>{jointLogHam}</strong></div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px', marginTop: '4px' }}>
                  Δ log = Joint Log Spam - Joint Log Ham = <strong style={{ color: '#F8D299' }}>{(jointLogSpam - jointLogHam).toFixed(4)}</strong>
                </div>
                <div>
                  P(Spam | Email) = 1 / (1 + exp(-Δ log)) = <strong style={{ color: '#FFF8FF' }}>{spamProb} ({spamPercent}%)</strong>
                </div>
                <div>
                  P(Not Spam | Email) = 1 - P(Spam | Email) = <strong style={{ color: '#FFF8FF' }}>{hamProb} ({hamPercent}%)</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
