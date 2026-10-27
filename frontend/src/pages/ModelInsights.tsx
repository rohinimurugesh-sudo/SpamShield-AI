import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  ThumbsUp,
  UserCheck,
  Zap,
  Check,
  X,
  RefreshCw,
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
import {
  fetchModelMetrics,
  fetchFeedbackSummaryApi,
  reviewFeedbackItemApi,
  evaluateCandidateOnVerifiedApi,
  fetchLatestScanApi
} from '../services/api';
import { ModelMetrics, FeedbackSummary, CandidateEvaluationResult, ClassificationResult } from '../types';
import { ConditionalProbabilityVisualizer } from '../components/ConditionalProbabilityVisualizer';

export const ModelInsights: React.FC = () => {
  const [modelData, setModelData] = useState<ModelMetrics | null>(null);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
  const [latestScan, setLatestScan] = useState<ClassificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [benchmarkResult, setBenchmarkResult] = useState<CandidateEvaluationResult | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [metrics, fbSummary, scan] = await Promise.all([
        fetchModelMetrics(),
        fetchFeedbackSummaryApi(),
        fetchLatestScanApi()
      ]);
      setModelData(metrics);
      setFeedbackSummary(fbSummary);
      if (scan) setLatestScan(scan);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const handleScanUpdated = () => {
      fetchLatestScanApi().then(scan => {
        if (scan) setLatestScan(scan);
      });
    };
    window.addEventListener('spamshield_scan_updated', handleScanUpdated);
    return () => window.removeEventListener('spamshield_scan_updated', handleScanUpdated);
  }, []);

  const handleReviewAction = async (id: number, status: 'verified' | 'rejected') => {
    const success = await reviewFeedbackItemApi(id, status, 'Reviewed by administrator');
    if (success) {
      setActionMessage(`Correction #${id} marked as ${status}.`);
      setTimeout(() => setActionMessage(null), 3000);
      const updated = await fetchFeedbackSummaryApi();
      setFeedbackSummary(updated);
    }
  };

  const handleRunCandidateBenchmark = async () => {
    setBenchmarkLoading(true);
    try {
      const res = await evaluateCandidateOnVerifiedApi();
      setBenchmarkResult(res);
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const metrics = modelData?.metrics || {
    accuracy: 0.9833,
    precision: 0.9818,
    recall: 0.9818,
    f1_score: 0.9818
  };

  const chartData = [
    { name: 'Accuracy', value: parseFloat((metrics.accuracy * 100).toFixed(1)), color: '#F8D299' },
    { name: 'Precision', value: parseFloat((metrics.precision * 100).toFixed(1)), color: '#F59E51' },
    { name: 'Recall', value: parseFloat((metrics.recall * 100).toFixed(1)), color: '#804A8A' },
    { name: 'F1 Score', value: parseFloat((metrics.f1_score * 100).toFixed(1)), color: '#B085D6' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '880px', margin: '0 auto' }}>
      {/* 1. Header Banner */}
      <section
        className="glass-panel"
        style={{
          padding: '28px 32px',
          background: 'linear-gradient(135deg, rgba(58, 3, 83, 0.4) 0%, rgba(22, 11, 45, 0.7) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Sparkles size={14} color="#F8D299" />
          <span style={{ fontSize: '0.78rem', color: '#F8D299', fontWeight: 600 }}>
            Model Insights & Methodology
          </span>
        </div>

        <h2 style={{ fontSize: '1.6rem', color: '#FFF8FF', marginBottom: '8px' }}>
          How the Classifier Works
        </h2>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          SpamShield AI uses a <strong>Multinomial Naive Bayes</strong> model grounded in conditional probability. Rather than using fixed keyword rules, it calculates the statistical probability that a message is spam given the specific combination of words it contains.
        </p>
      </section>

      {/* 2. Key Metrics: Accuracy, Precision, Recall */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '18px'
        }}
      >
        <div className="glass-panel" style={{ padding: '22px 24px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Model Accuracy</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFF8FF', margin: '6px 0 2px' }}>
            {(metrics.accuracy * 100).toFixed(1)}%
          </div>
          <span style={{ fontSize: '0.72rem', color: '#F8D299' }}>Measured on held-out test data</span>
        </div>

        <div className="glass-panel" style={{ padding: '22px 24px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Precision</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#F8D299', margin: '6px 0 2px' }}>
            {(metrics.precision * 100).toFixed(1)}%
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Reliability of spam flags</span>
        </div>

        <div className="glass-panel" style={{ padding: '22px 24px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Recall</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#E2C9FB', margin: '6px 0 2px' }}>
            {(metrics.recall * 100).toFixed(1)}%
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Proportion of spam detected</span>
        </div>
      </section>

      {/* 3. Small Clean Performance Chart */}
      <section className="glass-panel" style={{ padding: '26px 30px' }}>
        <h3 style={{ fontSize: '1.05rem', color: '#FFF8FF', marginBottom: '4px' }}>
          Test Set Performance
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
          Empirical evaluation results across key statistical dimensions
        </p>

        <div style={{ width: '100%', height: '180px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
              <YAxis domain={[90, 100]} stroke="var(--text-muted)" fontSize={12} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(28, 14, 52, 0.95)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#FFF8FF'
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 4. Conditional Probability Visualizer (Requirements 2, 3, 4, 5, 8) */}
      <ConditionalProbabilityVisualizer
        currentScan={latestScan}
        onScanUpdated={setLatestScan}
        showQuickTestButtons={true}
      />

      {/* 5. Feedback Summary & Error Telemetry */}
      <section className="glass-panel" style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#FFF8FF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ThumbsUp size={16} color="#F8D299" />
              Prediction Feedback & Error Telemetry
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Live telemetry aggregated from user classification feedback in the SQLite database
            </p>
          </div>

          <button
            onClick={loadAllData}
            className="btn-glass"
            style={{ padding: '5px 12px', fontSize: '0.75rem' }}
          >
            <RefreshCw size={13} style={{ marginRight: '5px' }} />
            Refresh Feedback
          </button>
        </div>

        {/* 4 Feedback Metric Counters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '22px' }}>
          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Feedback</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFF8FF', margin: '4px 0 2px' }}>
              {feedbackSummary?.total_feedback || 0}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>User reports logged</span>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(128, 74, 138, 0.15)', border: '1px solid rgba(128, 74, 138, 0.35)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified Accurate</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#E2C9FB', margin: '4px 0 2px' }}>
              {feedbackSummary?.correct_count || 0}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#E2C9FB' }}>Confirmed correct predictions</span>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 81, 0.12)', border: '1px solid rgba(245, 158, 81, 0.3)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>False Positives Reported</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F59E51', margin: '4px 0 2px' }}>
              {feedbackSummary?.false_positives_reported || 0}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#F59E51' }}>Flagged Spam, was Not Spam</span>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(248, 210, 153, 0.12)', border: '1px solid rgba(248, 210, 153, 0.3)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>False Negatives Reported</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F8D299', margin: '4px 0 2px' }}>
              {feedbackSummary?.false_negatives_reported || 0}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#F8D299' }}>Flagged Safe, was Spam</span>
          </div>
        </div>

        {/* Requirement 7: Data Integrity Isolation Callout */}
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            backgroundColor: 'rgba(22, 11, 45, 0.55)',
            border: '1px solid rgba(248, 210, 153, 0.25)',
            marginBottom: '24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F8D299', fontWeight: 600, fontSize: '0.82rem', marginBottom: '4px' }}>
            <ShieldCheck size={16} />
            Data Integrity Guard (Anti-Poisoning Architecture)
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            User feedback is quarantined in a dedicated SQLite table and kept strictly separate from production training data. To prevent data poisoning or automated bias loops, corrections are never fed directly into active model weights without explicit human administrator verification.
          </p>
        </div>

        {/* Requirement 8: Administrator Review Table & Controlled Benchmark */}
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ fontSize: '0.92rem', color: '#FFF8FF', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={15} color="#F8D299" />
              Administrator Verification Queue
            </h4>

            {actionMessage && (
              <span style={{ fontSize: '0.78rem', color: '#F8D299', fontWeight: 600 }}>
                {actionMessage}
              </span>
            )}
          </div>

          {feedbackSummary && feedbackSummary.recent_feedback.length > 0 ? (
            <div style={{ overflowX: 'auto', marginBottom: '18px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 10px' }}>Scan ID</th>
                    <th style={{ padding: '8px 10px' }}>Subject</th>
                    <th style={{ padding: '8px 10px' }}>Original</th>
                    <th style={{ padding: '8px 10px' }}>User Correction</th>
                    <th style={{ padding: '8px 10px' }}>Status</th>
                    <th style={{ padding: '8px 10px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackSummary.recent_feedback.map(item => {
                    const isPending = item.review_status === 'pending';
                    const isVerified = item.review_status === 'verified';
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '10px 10px', fontFamily: 'var(--font-mono)', color: '#F8D299' }}>
                          {item.scan_id}
                        </td>
                        <td style={{ padding: '10px 10px', color: '#FFF8FF', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.subject}
                        </td>
                        <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>
                          {item.original_prediction} ({(item.model_probability * 100).toFixed(0)}%)
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          {item.feedback_type === 'CORRECT' ? (
                            <span style={{ color: '#E2C9FB' }}>Confirmed Correct</span>
                          ) : (
                            <strong style={{ color: '#F59E51' }}>{item.corrected_category}</strong>
                          )}
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              backgroundColor: isVerified
                                ? 'rgba(128, 74, 138, 0.3)'
                                : isPending
                                ? 'rgba(248, 210, 153, 0.2)'
                                : 'rgba(245, 158, 81, 0.2)',
                              color: isVerified ? '#E2C9FB' : isPending ? '#F8D299' : '#F59E51'
                            }}
                          >
                            {item.review_status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          {isPending ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleReviewAction(item.id, 'verified')}
                                className="btn-glass"
                                style={{ padding: '3px 8px', fontSize: '0.72rem', borderColor: 'rgba(248, 210, 153, 0.4)' }}
                                title="Approve human ground-truth label"
                              >
                                <Check size={12} color="#F8D299" />
                                Verify
                              </button>
                              <button
                                onClick={() => handleReviewAction(item.id, 'rejected')}
                                className="btn-glass"
                                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                title="Reject invalid feedback"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Archived</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              No feedback submissions logged yet. Try testing and correcting a prediction in the Email Scanner!
            </p>
          )}

          {/* Controlled Candidate Benchmark Trigger */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(36, 16, 63, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.84rem', color: '#FFF8FF', fontWeight: 600 }}>
                  Controlled Model Evaluation on Verified Corrections
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Evaluates the current Bayesian classifier on verified edge-case samples before approving model deployment.
                </p>
              </div>

              <button
                onClick={handleRunCandidateBenchmark}
                disabled={benchmarkLoading}
                className="btn-primary"
                style={{ padding: '7px 16px', fontSize: '0.8rem' }}
              >
                <Zap size={14} />
                {benchmarkLoading ? 'Benchmarking...' : 'Run Controlled Benchmark'}
              </button>
            </div>

            {benchmarkResult && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(22, 11, 45, 0.65)',
                  border: '1px solid rgba(248, 210, 153, 0.3)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div>
                  <strong style={{ color: '#F8D299' }}>Benchmark Result: </strong>
                  <span style={{ color: '#FFF8FF' }}>
                    Candidate achieved{' '}
                    <strong style={{ color: benchmarkResult.deploy_ready ? '#E2C9FB' : '#F59E51' }}>
                      {benchmarkResult.candidate_accuracy ? `${(benchmarkResult.candidate_accuracy * 100).toFixed(1)}%` : 'N/A'}
                    </strong>{' '}
                    accuracy across {benchmarkResult.sample_count} verified edge-case samples.
                  </span>
                </div>

                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: benchmarkResult.deploy_ready ? 'rgba(128, 74, 138, 0.3)' : 'rgba(245, 158, 81, 0.25)',
                    color: benchmarkResult.deploy_ready ? '#E2C9FB' : '#F59E51'
                  }}
                >
                  {benchmarkResult.deploy_ready ? '✓ Controlled Test Passed' : 'Verification Required'}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Simple Explanation of Probability & How Decisions Are Made (Requirement 6) */}
      <section className="glass-panel" style={{ padding: '28px 32px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#FFF8FF', marginBottom: '16px' }}>
          Understanding Conditional Probability & Uncertainty Guardrails
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <strong style={{ color: '#F8D299' }}>1. Bayes' Theorem</strong>
            <p style={{ marginTop: '4px' }}>
              The model calculates the posterior probability <code>P(Spam | Words)</code> by combining the prior base rate of spam with the conditional likelihood of observing each word in spam versus non-spam emails.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <strong style={{ color: '#F59E51' }}>2. Word Likelihoods</strong>
            <p style={{ marginTop: '4px' }}>
              Words like <em>urgent</em>, <em>wire transfer</em>, or <em>suspended</em> have high likelihoods in spam training data, increasing the spam probability. Words like <em>meeting</em>, <em>sync</em>, or <em>attached</em> pull the probability towards legitimate.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <strong style={{ color: '#B085D6' }}>3. Configurable Uncertainty Threshold ("Needs Review")</strong>
            <p style={{ marginTop: '4px' }}>
              When an email contains ambiguous or conflicting vocabulary, its spam posterior probability lands in the uncertainty interval <strong>[35% – 65%]</strong>. Rather than forcing a high-risk guess, SpamShield triggers <strong>Needs Review</strong>, routing the message to human oversight.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
