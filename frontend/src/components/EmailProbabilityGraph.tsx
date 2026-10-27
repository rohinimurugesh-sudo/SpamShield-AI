import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from 'recharts';
import {
  BarChart3,
  Download,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Info,
  Calculator,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ClassificationResult } from '../types';
import { downloadPdfReportApi, generateInstantPdfApi } from '../services/api';

interface EmailProbabilityGraphProps {
  scan: ClassificationResult;
  onClose?: () => void;
  isModal?: boolean;
}

export const EmailProbabilityGraph: React.FC<EmailProbabilityGraphProps> = ({
  scan,
  onClose,
  isModal = false
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showMathDetails, setShowMathDetails] = useState(false);

  // Derive genuine probability values and normalize to ensure complementary total of 100%
  const rawSpam = typeof scan.spam_probability === 'number' ? scan.spam_probability : 0.5;
  const rawHam = typeof scan.ham_probability === 'number' ? scan.ham_probability : 0.5;
  const total = rawSpam + rawHam;
  const spamProb = total > 0 ? rawSpam / total : 0.5;
  const hamProb = total > 0 ? rawHam / total : 0.5;

  const spamPercent = parseFloat((spamProb * 100).toFixed(1));
  const hamPercent = parseFloat((100 - spamPercent).toFixed(1));

  const isSpam = scan.prediction === 'SPAM';
  const isReview = scan.prediction === 'NEEDS REVIEW';
  const isLegit = !isSpam && !isReview;

  const subject = scan.subject || 'Scanned Email';
  const chartTitle = scan.graph_data?.chart_title || `Probability Analysis — "${subject}"`;

  // Bar Chart Data (X-axis: Spam and Not Spam, Y-axis: 0% to 100%)
  const chartData = [
    {
      category: 'Spam',
      percentage: spamPercent,
      probability: spamProb,
      isPredicted: isSpam,
      color: isSpam ? '#F59E51' : 'rgba(245, 158, 81, 0.45)',
      borderColor: isSpam ? '#EF4444' : 'rgba(239, 68, 68, 0.3)'
    },
    {
      category: 'Not Spam',
      percentage: hamPercent,
      probability: hamProb,
      isPredicted: isLegit,
      color: isLegit ? '#10B981' : 'rgba(16, 185, 129, 0.45)',
      borderColor: isLegit ? '#059669' : 'rgba(16, 185, 129, 0.3)'
    }
  ];

  // Influential tokens from model
  const topSpamWords = (scan.influential_words || [])
    .filter(w => w.leaning === 'SPAM')
    .slice(0, 4);

  const topHamWords = (scan.influential_words || [])
    .filter(w => w.leaning === 'HAM')
    .slice(0, 4);

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const scanId = scan.id || scan.scan_id;
      if (scanId) {
        await downloadPdfReportApi(scanId, scan.subject);
      } else {
        await generateInstantPdfApi(scan, scan.subject);
      }
    } catch (err) {
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Custom Bar Shape with Exact Percentage Label Above Bar
  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#FFFFFF"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '13px',
          fontWeight: 700,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)'
        }}
      >
        {value}%
      </text>
    );
  };

  return (
    <div
      style={{
        borderRadius: isModal ? '20px' : '16px',
        backgroundColor: 'rgba(26, 11, 46, 0.85)',
        border: '1px solid rgba(248, 210, 153, 0.28)',
        boxShadow: isModal
          ? '0 25px 60px rgba(10, 3, 20, 0.8), 0 0 40px rgba(128, 74, 138, 0.2)'
          : '0 8px 32px rgba(16, 7, 34, 0.4)',
        padding: isModal ? '28px 32px' : '24px 28px',
        color: '#FFF8FF',
        position: 'relative'
      }}
    >
      {/* Header with Title and Predicted Classification Badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ flex: 1, minWidth: '260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 81, 0.18)',
                border: '1px solid rgba(245, 158, 81, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <BarChart3 size={18} color="#F59E51" />
            </div>
            <span
              style={{
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--text-muted)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}
            >
              Individual Scan Graph • ID: {scan.id || scan.scan_id || 'LOCAL-SCAN'}
            </span>
          </div>

          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#FFF8FF',
              lineHeight: 1.35
            }}
          >
            {chartTitle}
          </h3>
          {scan.timestamp && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Recorded on {new Date(scan.timestamp).toLocaleString()}
            </p>
          )}
        </div>

        {/* Right side: Badge and PDF button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Classification Pill Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '999px',
              backgroundColor: isSpam
                ? 'rgba(239, 68, 68, 0.2)'
                : isLegit
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(245, 158, 81, 0.2)',
              border: `1.5px solid ${
                isSpam ? '#EF4444' : isLegit ? '#10B981' : '#F59E51'
              }`
            }}
          >
            {isSpam ? (
              <ShieldAlert size={18} color="#FC8181" />
            ) : isLegit ? (
              <ShieldCheck size={18} color="#68D391" />
            ) : (
              <AlertTriangle size={18} color="#F8D299" />
            )}
            <div>
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: isSpam ? '#FC8181' : isLegit ? '#68D391' : '#F8D299',
                  textTransform: 'uppercase'
                }}
              >
                Predicted: {scan.prediction}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Confidence: {isSpam ? spamPercent : hamPercent}%
              </div>
            </div>
          </div>

          {/* Threat Score Pill Badge */}
          {scan.threat_score && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '999px',
                backgroundColor: `${scan.threat_score.color}20`,
                border: `1.5px solid ${scan.threat_score.color}`,
                color: scan.threat_score.color
              }}
            >
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>
                  Threat: {scan.threat_score.score}/100
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {scan.threat_score.category}
                </div>
              </div>
            </div>
          )}

          {/* Download PDF button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="btn-glass"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '0.82rem',
              color: '#F8D299',
              borderColor: 'rgba(248, 210, 153, 0.35)'
            }}
            title="Download PDF report for this scan"
          >
            <Download size={14} />
            {downloadingPdf ? 'Exporting...' : 'PDF Report'}
          </button>
        </div>
      </div>

      {/* Main Bar Chart Container */}
      <div
        style={{
          backgroundColor: 'rgba(16, 7, 34, 0.55)',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px 16px 12px 16px',
          marginBottom: '20px'
        }}
      >
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 25, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
              <XAxis
                dataKey="category"
                tick={{ fill: '#E2C9FB', fontSize: 13, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.15)' }}
              />
              <YAxis
                domain={[0, 100]}
                unit="%"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.15)' }}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div
                        style={{
                          backgroundColor: 'rgba(26, 11, 46, 0.95)',
                          border: `1px solid ${data.borderColor}`,
                          borderRadius: '10px',
                          padding: '10px 14px',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
                        }}
                      >
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>
                          {data.category}
                        </div>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            fontFamily: 'var(--font-mono, monospace)',
                            color: data.category === 'Spam' ? '#F59E51' : '#10B981',
                            marginTop: '4px'
                          }}
                        >
                          Probability: <b>{data.percentage}%</b> (raw: {data.probability.toFixed(6)})
                        </div>
                        {data.isPredicted && (
                          <div
                            style={{
                              marginTop: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#F8D299',
                              textTransform: 'uppercase'
                            }}
                          >
                            ★ Predicted Category
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="percentage"
                radius={[8, 8, 0, 0]}
                maxBarSize={110}
                label={renderCustomBarLabel}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={entry.borderColor}
                    strokeWidth={entry.isPredicted ? 2.5 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Predicted highlight notice */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '24px',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                backgroundColor: isSpam ? '#F59E51' : 'rgba(245, 158, 81, 0.45)',
                border: isSpam ? '2px solid #EF4444' : '1px solid rgba(239, 68, 68, 0.3)'
              }}
            />
            <span>
              Spam Probability: <b>{spamPercent}%</b> {isSpam ? '(Classification)' : ''}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                backgroundColor: isLegit ? '#10B981' : 'rgba(16, 185, 129, 0.45)',
                border: isLegit ? '2px solid #059669' : '1px solid rgba(16, 185, 129, 0.3)'
              }}
            />
            <span>
              Not Spam Probability: <b>{hamPercent}%</b> {isLegit ? '(Classification)' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Short Explanation Below Chart (Requirement 3 & 4) */}
      <div
        style={{
          padding: '16px 20px',
          borderRadius: '12px',
          backgroundColor: 'rgba(58, 3, 83, 0.35)',
          border: '1px solid rgba(248, 210, 153, 0.2)',
          marginBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <Info size={18} color="#F8D299" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFF8FF', marginBottom: '4px' }}>
              Conditional Probability Explanation
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Based on the Naive Bayes conditional probability analysis, this email has an estimated{' '}
              <b style={{ color: '#F59E51' }}>{spamPercent}%</b> probability of being Spam and{' '}
              <b style={{ color: '#68D391' }}>{hamPercent}%</b> probability of being Not Spam.
              The engine classified it as <b style={{ color: isSpam ? '#FC8181' : '#68D391' }}>{scan.prediction}</b>{' '}
              because the posterior probability{' '}
              <i>P({scan.prediction === 'SPAM' ? 'Spam' : 'Not Spam'} | Email Features)</i>{' '}
              {isSpam
                ? 'heavily exceeds the uncertainty threshold.'
                : 'confirms legitimate email characteristics.'}
            </p>

            {/* Influential Words Chips */}
            {(topSpamWords.length > 0 || topHamWords.length > 0) && (
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Influential evidence:
                </span>
                {topSpamWords.map((item, idx) => (
                  <span
                    key={`spam-${idx}`}
                    style={{
                      fontSize: '0.74rem',
                      fontFamily: 'var(--font-mono, monospace)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#FC8181'
                    }}
                  >
                    '{item.word}' → Spam
                  </span>
                ))}
                {topHamWords.map((item, idx) => (
                  <span
                    key={`ham-${idx}`}
                    style={{
                      fontSize: '0.74rem',
                      fontFamily: 'var(--font-mono, monospace)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#68D391'
                    }}
                  >
                    '{item.word}' → Safe
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Mathematical Breakdown (Requirement 4) */}
      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
        <button
          type="button"
          onClick={() => setShowMathDetails(!showMathDetails)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#F8D299',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: 0
          }}
        >
          <Calculator size={14} />
          {showMathDetails ? 'Hide Mathematical Calculation' : 'Show Mathematical Calculation (Bayes\' Formula)'}
          {showMathDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showMathDetails && (
          <div
            style={{
              marginTop: '12px',
              padding: '14px 18px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 7, 34, 0.6)',
              border: '1px solid rgba(248, 210, 153, 0.18)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)'
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                color: '#E2C9FB',
                marginBottom: '8px'
              }}
            >
              P(Spam | Email) = [ P(Email | Spam) × P(Spam) ] / P(Email)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '8px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Prior P(Spam): </span>
                <b style={{ color: '#FFF' }}>
                  {((scan.bayes_breakdown?.p_prior_spam ?? 0.4906) * 100).toFixed(2)}%
                </b>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Prior P(Not Spam): </span>
                <b style={{ color: '#FFF' }}>
                  {((scan.bayes_breakdown?.p_prior_ham ?? 0.5094) * 100).toFixed(2)}%
                </b>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Posterior P(Spam|Email): </span>
                <b style={{ color: '#F59E51' }}>{spamPercent}%</b>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Posterior P(Not Spam|Email): </span>
                <b style={{ color: '#10B981' }}>{hamPercent}%</b>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
