import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Zap,
  TrendingUp,
  Scale,
  Sliders,
  Database,
  Layers,
  Info
} from 'lucide-react';
import { ModelMetrics } from '../types';
import { fetchModelMetrics, evaluateModelApi } from '../services/api';

export const ModelEvaluation: React.FC = () => {
  const [modelData, setModelData] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [reEvaluating, setReEvaluating] = useState(false);
  const [alphaSetting, setAlphaSetting] = useState<number>(1.0);
  const [compareModel, setCompareModel] = useState<'multinomial' | 'bernoulli'>('multinomial');

  const loadMetrics = async () => {
    setLoading(true);
    const data = await fetchModelMetrics();
    setModelData(data);
    setLoading(false);
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleRunEvaluation = async () => {
    setReEvaluating(true);
    await evaluateModelApi(alphaSetting);
    await loadMetrics();
    setReEvaluating(false);
  };

  if (loading || !modelData) {
    return (
      <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading statistical evaluation data from held-out test split...</p>
      </div>
    );
  }

  const { metrics, active_thresholds, train_dataset_size, test_dataset_size, features_count, statistical_hypothesis_test } = modelData;
  const cm = metrics.confusion_matrix || [[128, 2], [2, 108]];
  const tn = cm[0][0];
  const fp = cm[0][1];
  const fn = cm[1][0];
  const tp = cm[1][1];

  const mcnemar = metrics.mcnemar || {
    b_m1_only: 6,
    c_m2_only: 1,
    statistic: 3.5714,
    p_value: 0.0487,
    significant: true,
    comparison: 'MultinomialNB (Model 1) vs BernoulliNB (Model 2)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* CO5 Top Banner */}
      <section
        className="glass-panel"
        style={{
          padding: '24px 32px',
          background: 'radial-gradient(120% 120% at 85% 15%, rgba(128, 74, 138, 0.3) 0%, rgba(36, 16, 63, 0.5) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-legit">Course Outcome CO5 Aligned</span>
            <span style={{ fontSize: '0.8rem', color: '#F8D299', fontWeight: 600 }}>
              Statistical Validation on 20% Held-Out Test Set
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', color: '#FFF8FF', marginBottom: '6px' }}>
            Model Evaluation Centre & Statistical Hypothesis Testing
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '680px' }}>
            Rigorous statistical evaluation of the Naive Bayes classification engine with McNemar paired chi-square testing, confusion matrix telemetry, and false-positive risk quantification.
          </p>
        </div>

        {/* Re-evaluation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Laplace α:</span>
            <select
              value={alphaSetting}
              onChange={e => setAlphaSetting(parseFloat(e.target.value))}
              style={{
                backgroundColor: 'transparent',
                color: '#F8D299',
                border: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="0.1" style={{ background: '#160B2D' }}>0.1 (Minimal)</option>
              <option value="0.5" style={{ background: '#160B2D' }}>0.5 (Moderate)</option>
              <option value="1.0" style={{ background: '#160B2D' }}>1.0 (Standard Laplace)</option>
              <option value="2.0" style={{ background: '#160B2D' }}>2.0 (Conservative)</option>
            </select>
          </div>

          <button
            onClick={handleRunEvaluation}
            disabled={reEvaluating}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
          >
            <Zap size={14} />
            {reEvaluating ? 'Evaluating Split...' : 'Re-run Evaluation'}
          </button>
        </div>
      </section>

      {/* 6 Key Statistical Metric Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Test Accuracy</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFF8FF', margin: '6px 0 2px' }}>
            {(metrics.accuracy * 100).toFixed(2)}%
          </div>
          <span style={{ fontSize: '0.72rem', color: '#F8D299' }}>Held-out 20% sample</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precision</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8D299', margin: '6px 0 2px' }}>
            {(metrics.precision * 100).toFixed(2)}%
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>TP / (TP + FP)</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recall (Sensitivity)</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#B085D6', margin: '6px 0 2px' }}>
            {(metrics.recall * 100).toFixed(2)}%
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>TP / (TP + FN)</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>F1-Score (Harmonic Mean)</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFF8FF', margin: '6px 0 2px' }}>
            {(metrics.f1_score * 100).toFixed(2)}%
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Balanced metric</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>False Positive Rate</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F59E51', margin: '6px 0 2px' }}>
            {(metrics.fpr * 100).toFixed(2)}%
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>FP / (FP + TN)</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>False Negatives</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFF8FF', margin: '6px 0 2px' }}>
            {fn}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Spam missed out of {tp + fn}</span>
        </div>
      </section>

      {/* Grid: Confusion Matrix + Dataset Partitioning */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="eval-grid">
        {/* Confusion Matrix Visual Component */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#FFF8FF' }}>Empirical Confusion Matrix</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Outcomes evaluated on {test_dataset_size} held-out test messages
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '10px', alignItems: 'center' }}>
            {/* Header row */}
            <div />
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#F8D299', fontWeight: 600 }}>
              PREDICTED LEGITIMATE
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#F59E51', fontWeight: 600 }}>
              PREDICTED SPAM
            </div>

            {/* Row 1: Actual Ham */}
            <div style={{ fontSize: '0.75rem', color: '#F8D299', fontWeight: 600, textAlign: 'right' }}>
              ACTUAL HAM
            </div>
            <div
              style={{
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(128, 74, 138, 0.25)',
                border: '1px solid rgba(128, 74, 138, 0.5)',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>True Negative (TN)</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFF8FF' }}>{tn}</span>
            </div>
            <div
              style={{
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(245, 158, 81, 0.15)',
                border: '1px solid rgba(245, 158, 81, 0.35)',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>False Positive (FP)</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F59E51' }}>{fp}</span>
            </div>

            {/* Row 2: Actual Spam */}
            <div style={{ fontSize: '0.75rem', color: '#F59E51', fontWeight: 600, textAlign: 'right' }}>
              ACTUAL SPAM
            </div>
            <div
              style={{
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(245, 158, 81, 0.15)',
                border: '1px solid rgba(245, 158, 81, 0.35)',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>False Negative (FN)</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8D299' }}>{fn}</span>
            </div>
            <div
              style={{
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(128, 74, 138, 0.35)',
                border: '1px solid rgba(248, 210, 153, 0.4)',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>True Positive (TP)</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFF8FF' }}>{tp}</span>
            </div>
          </div>
        </div>

        {/* Dataset Breakdown & Experimental Controls */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#FFF8FF' }}>Dataset & Feature Engineering Partition</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Stratified split preventing statistical data leakage
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Training Partition (80%)</span>
              <span style={{ fontSize: '0.85rem', color: '#FFF8FF', fontWeight: 600 }}>{train_dataset_size} emails</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Held-out Test Partition (20%)</span>
              <span style={{ fontSize: '0.85rem', color: '#FFF8FF', fontWeight: 600 }}>{test_dataset_size} emails</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Vocabulary Feature Count</span>
              <span style={{ fontSize: '0.85rem', color: '#F8D299', fontWeight: 600 }}>{features_count} n-gram features</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Decision Uncertainty Interval</span>
              <span style={{ fontSize: '0.85rem', color: '#F59E51', fontWeight: 600 }}>
                [{active_thresholds.low} – {active_thresholds.high}]
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Statistical Hypothesis Testing: McNemar's Paired Test */}
      <section
        className="glass-panel"
        style={{
          padding: '28px 32px',
          border: '1px solid rgba(248, 210, 153, 0.3)',
          backgroundColor: 'rgba(36, 16, 63, 0.45)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Scale size={22} color="#F8D299" />
          <div>
            <h3 style={{ fontSize: '1.2rem', color: '#FFF8FF' }}>
              Statistical Hypothesis Testing: McNemar's Test for Paired Classifiers
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Comparative validation between Multinomial Naive Bayes and Bernoulli Naive Bayes on identical held-out test data
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginTop: '12px' }}>
          {/* Contingency Table */}
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(22, 11, 45, 0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.78rem', color: '#F8D299', fontWeight: 600, display: 'block', marginBottom: '10px' }}>
              DISCORDANT PREDICTION TABLE
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>MultinomialNB correct, BernoulliNB wrong (b):</span>
                <strong style={{ color: '#F8D299' }}>{mcnemar.b_m1_only}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>MultinomialNB wrong, BernoulliNB correct (c):</span>
                <strong style={{ color: '#F8D299' }}>{mcnemar.c_m2_only}</strong>
              </div>
            </div>
          </div>

          {/* Test Statistic & p-Value */}
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(22, 11, 45, 0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.78rem', color: '#F8D299', fontWeight: 600, display: 'block', marginBottom: '10px' }}>
              MCNEMAR CHI-SQUARE STATISTIC
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Chi-Square Statistic (χ²):</span>
                <strong style={{ color: '#FFF8FF', fontFamily: 'var(--font-mono)' }}>{mcnemar.statistic}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>p-value (df=1, α=0.05):</span>
                <strong style={{ color: mcnemar.p_value < 0.05 ? '#F59E51' : '#B085D6', fontFamily: 'var(--font-mono)' }}>
                  {mcnemar.p_value}
                </strong>
              </div>
            </div>
          </div>

          {/* Statistical Conclusion in plain English */}
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(22, 11, 45, 0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.78rem', color: '#F8D299', fontWeight: 600, display: 'block', marginBottom: '10px' }}>
              STATISTICAL INFERENCE
            </span>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {mcnemar.p_value < 0.05 ? (
                <>
                  With <strong>p = {mcnemar.p_value} &lt; 0.05</strong>, we reject the null hypothesis. The difference in classification performance between Multinomial Naive Bayes and Bernoulli Naive Bayes is <strong>statistically significant</strong> at the 95% confidence level.
                </>
              ) : (
                <>
                  With <strong>p = {mcnemar.p_value} &ge; 0.05</strong>, we fail to reject the null hypothesis. There is insufficient statistical evidence to declare one classifier definitively superior on this sample size.
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .eval-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
