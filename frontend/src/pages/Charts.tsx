import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import {
  BarChart3,
  Flame,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  History,
  TrendingUp,
  PieChart as PieIcon,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ClassificationResult } from '../types';
import { fetchScanHistory } from '../services/api';
import { PageId } from '../components/Sidebar';
import { EmailProbabilityGraph } from '../components/EmailProbabilityGraph';
import { ThreatScoreWidget } from '../components/ThreatScoreWidget';

interface ChartsProps {
  onNavigate?: (page: PageId) => void;
}

export const Charts: React.FC<ChartsProps> = ({ onNavigate }) => {
  const [scans, setScans] = useState<ClassificationResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [selectedScanForModal, setSelectedScanForModal] = useState<ClassificationResult | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Load saved scans from persistent database
  const loadScans = async () => {
    setLoading(true);
    try {
      const data = await fetchScanHistory();
      const list = data?.scans || [];
      setScans(list);
      if (list.length > 0 && !selectedScanId) {
        setSelectedScanId(list[0].id || list[0].scan_id || null);
      }
    } catch (err) {
      console.error('Failed to load scan history for charts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScans();
    const handleUpdate = () => loadScans();
    window.addEventListener('spamshield_scan_updated', handleUpdate);
    return () => window.removeEventListener('spamshield_scan_updated', handleUpdate);
  }, []);

  // Filtered scans for quick search
  const filteredScans = scans.filter((s) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      (s.subject || '').toLowerCase().includes(term) ||
      (s.sender || '').toLowerCase().includes(term) ||
      (s.id || s.scan_id || '').toLowerCase().includes(term)
    );
  });

  // Selected scan object (Chart A & B)
  const selectedScan =
    scans.find((s) => (s.id || s.scan_id) === selectedScanId) ||
    scans[0] ||
    null;

  // Chart A: Selected Email Individual Probability Bar Data
  const rawSpam = typeof selectedScan?.spam_probability === 'number' ? selectedScan.spam_probability : 0.5;
  const rawHam = typeof selectedScan?.ham_probability === 'number' ? selectedScan.ham_probability : 0.5;
  const total = rawSpam + rawHam;
  const spamProb = total > 0 ? rawSpam / total : 0.5;
  const hamProb = total > 0 ? rawHam / total : 0.5;
  const spamPercent = parseFloat((spamProb * 100).toFixed(1));
  const hamPercent = parseFloat((100 - spamPercent).toFixed(1));

  const individualBarData = [
    {
      category: 'Spam Probability',
      percentage: spamPercent,
      probability: spamProb,
      isPredicted: selectedScan?.prediction === 'SPAM',
      fill: selectedScan?.prediction === 'SPAM' ? '#F59E51' : 'rgba(245, 158, 81, 0.45)'
    },
    {
      category: 'Not Spam Probability',
      percentage: hamPercent,
      probability: hamProb,
      isPredicted: selectedScan?.prediction === 'LEGITIMATE',
      fill: selectedScan?.prediction === 'LEGITIMATE' ? '#10B981' : 'rgba(16, 185, 129, 0.45)'
    }
  ];

  // Chart C: Scan History Threat Score Trend Data
  // Reverse chronological to show chronological progression over time (earliest to latest)
  const historyTrendData = [...scans].reverse().map((s, idx) => {
    const sId = s.id || s.scan_id || `SCAN-${idx + 1}`;
    const score = s.threat_score?.score ?? Math.round((s.spam_probability ?? 0) * 40);
    const label = s.subject ? (s.subject.length > 20 ? s.subject.slice(0, 18) + '...' : s.subject) : sId;
    return {
      index: idx + 1,
      scanId: sId,
      fullSubject: s.subject || 'Scanned Email',
      label,
      score,
      category: s.threat_score?.category || 'Low threat',
      color: s.threat_score?.color || (score >= 80 ? '#EF4444' : score >= 60 ? '#F97316' : score >= 30 ? '#FBBF24' : '#10B981'),
      prediction: s.prediction,
      rawScan: s
    };
  });

  // Chart D: Classification Summary Counts & Percentages
  const totalCount = scans.length;
  const spamCount = scans.filter((s) => s.prediction === 'SPAM').length;
  const legitCount = scans.filter((s) => (s.prediction as string) === 'LEGITIMATE' || (s.prediction as string) === 'NOT_SPAM' || (s.prediction as string) === 'HAM').length;
  const reviewCount = scans.filter((s) => s.prediction === 'NEEDS REVIEW').length;

  const classificationPieData = [
    { name: 'Spam', value: spamCount, color: '#F59E51', pct: totalCount ? ((spamCount / totalCount) * 100).toFixed(1) : 0 },
    { name: 'Not Spam', value: legitCount, color: '#10B981', pct: totalCount ? ((legitCount / totalCount) * 100).toFixed(1) : 0 },
    { name: 'Needs Review', value: reviewCount, color: '#F8D299', pct: totalCount ? ((reviewCount / totalCount) * 100).toFixed(1) : 0 }
  ].filter((d) => d.value > 0);

  // Chart E: Comparative Probability Distribution across Scans
  const distributionData = scans.slice(0, 15).map((s, idx) => {
    const sId = s.id || s.scan_id || `SCAN-${idx + 1}`;
    const sRawSpam = typeof s.spam_probability === 'number' ? s.spam_probability : 0.5;
    const sRawHam = typeof s.ham_probability === 'number' ? s.ham_probability : 0.5;
    const sTotal = sRawSpam + sRawHam;
    const sNormSpam = sTotal > 0 ? sRawSpam / sTotal : 0.5;
    const sSpamPct = parseFloat((sNormSpam * 100).toFixed(1));
    const sHamPct = parseFloat((100 - sSpamPct).toFixed(1));
    const label = s.subject ? (s.subject.length > 18 ? s.subject.slice(0, 16) + '...' : s.subject) : sId;

    return {
      scanId: sId,
      label,
      fullSubject: s.subject || 'Scanned Email',
      spamPct: sSpamPct,
      hamPct: sHamPct,
      prediction: s.prediction,
      threatScore: s.threat_score?.score ?? 0,
      rawScan: s
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#FFF8FF',
              lineHeight: 1.25,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <BarChart3 size={28} color="#F8D299" />
            Security Analytics & Charts
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Comprehensive visual telemetry: individual Bayesian probabilities, dynamic Threat Scores, and persistent scan distributions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={loadScans}
            disabled={loading}
            className="btn-glass"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '0.82rem',
              color: '#E2C9FB'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Telemetry'}
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('scanner')}
              className="btn-neon"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                fontSize: '0.82rem'
              }}
            >
              Scan New Email
            </button>
          )}
        </div>
      </div>

      {/* Empty State Guardrail (Requirement: Handle empty history gracefully) */}
      {!loading && scans.length === 0 && (
        <div
          style={{
            backgroundColor: 'rgba(26, 11, 46, 0.75)',
            border: '1px solid rgba(248, 210, 153, 0.25)',
            borderRadius: '16px',
            padding: '48px 32px',
            textAlign: 'center',
            color: '#FFF8FF'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(248, 210, 153, 0.12)',
              border: '1px solid rgba(248, 210, 153, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}
          >
            <BarChart3 size={32} color="#F8D299" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
            No Scan Records in Telemetry History
          </h3>
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              maxWidth: '520px',
              margin: '0 auto 24px',
              lineHeight: 1.5
            }}
          >
            All charts read directly from genuine, saved email scan audits rather than simulated statistics. Scan your first email to populate the individual probability graphs, threat score gauges, and distribution charts.
          </p>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('scanner')}
              className="btn-neon"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
            >
              Launch Email Scanner <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}

      {/* Main Charts Layout (When scans exist) */}
      {scans.length > 0 && (
        <>
          {/* Top Scan Selector Bar */}
          <div
            style={{
              backgroundColor: 'rgba(26, 11, 46, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#F8D299',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                <Layers size={14} color="#F8D299" />
                Active Email:
              </span>

              <select
                value={selectedScanId || ''}
                onChange={(e) => setSelectedScanId(e.target.value)}
                style={{
                  flex: 1,
                  maxWidth: '560px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(16, 7, 34, 0.85)',
                  border: '1px solid rgba(248, 210, 153, 0.3)',
                  color: '#FFF8FF',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {scans.map((s) => {
                  const sId = s.id || s.scan_id;
                  const dateStr = s.timestamp ? new Date(s.timestamp).toLocaleDateString() : '';
                  const scoreVal = s.threat_score?.score ?? Math.round((s.spam_probability ?? 0) * 40);
                  const predStr = s.prediction;
                  return (
                    <option key={sId} value={sId}>
                      [{predStr} — Threat {scoreVal}/100] "{s.subject || 'Scanned Email'}" ({dateStr})
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono, monospace)'
                }}
              >
                {scans.length} Saved Audit Record{scans.length > 1 ? 's' : ''}
              </span>

              {selectedScan && (
                <button
                  type="button"
                  onClick={() => setSelectedScanForModal(selectedScan)}
                  className="btn-glass"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    color: '#F8D299',
                    borderColor: 'rgba(248, 210, 153, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Open comprehensive graph modal"
                >
                  <ExternalLink size={12} />
                  Inspect Full Modal
                </button>
              )}
            </div>
          </div>

          {/* Section 1: Selected Email Deep Dive (Charts A & B) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
              gap: '20px'
            }}
          >
            {/* Chart A: Individual Email Probability Chart (Requirement 2.A) */}
            <div
              style={{
                backgroundColor: 'rgba(26, 11, 46, 0.75)',
                border: '1px solid rgba(248, 210, 153, 0.25)',
                borderRadius: '16px',
                padding: '22px 24px',
                boxShadow: '0 8px 32px rgba(10, 3, 20, 0.4)',
                color: '#FFF8FF',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '16px',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(245, 158, 81, 0.18)',
                        border: '1px solid rgba(245, 158, 81, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <BarChart3 size={15} color="#F59E51" />
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono, monospace)',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase'
                      }}
                    >
                      Chart A • Individual Probability
                    </span>
                  </div>
                  <h4
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: '#FFF8FF',
                      lineHeight: 1.3
                    }}
                  >
                    "{selectedScan?.subject || 'Scanned Email'}"
                  </h4>
                  {selectedScan?.timestamp && (
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      Scanned on {new Date(selectedScan.timestamp).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Prediction Pill */}
                {selectedScan && (
                  <div
                    style={{
                      padding: '4px 12px',
                      borderRadius: '999px',
                      backgroundColor:
                        selectedScan.prediction === 'SPAM'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : selectedScan.prediction === 'NEEDS REVIEW'
                          ? 'rgba(245, 158, 81, 0.2)'
                          : 'rgba(16, 185, 129, 0.2)',
                      border: `1px solid ${
                        selectedScan.prediction === 'SPAM'
                          ? '#EF4444'
                          : selectedScan.prediction === 'NEEDS REVIEW'
                          ? '#F59E51'
                          : '#10B981'
                      }`,
                      color:
                        selectedScan.prediction === 'SPAM'
                          ? '#FC8181'
                          : selectedScan.prediction === 'NEEDS REVIEW'
                          ? '#F8D299'
                          : '#68D391',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      flexShrink: 0
                    }}
                  >
                    {selectedScan.prediction}
                  </div>
                )}
              </div>

              {/* Bar Chart Container */}
              <div
                style={{
                  backgroundColor: 'rgba(16, 7, 34, 0.55)',
                  borderRadius: '12px',
                  padding: '16px 12px 6px 12px',
                  marginBottom: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ width: '100%', height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={individualBarData}
                      margin={{ top: 20, right: 30, left: 0, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                      <XAxis
                        dataKey="category"
                        tick={{ fill: '#E2C9FB', fontSize: 12, fontWeight: 600 }}
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
                                  backgroundColor: 'rgba(20, 8, 38, 0.95)',
                                  border: '1px solid rgba(248, 210, 153, 0.4)',
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  color: '#FFF8FF',
                                  fontSize: '0.78rem'
                                }}
                              >
                                <div><b>{data.category}</b></div>
                                <div style={{ color: '#F8D299', fontWeight: 700 }}>{data.percentage}%</div>
                                <div style={{ color: 'var(--text-muted)' }}>Raw prob: {data.probability.toFixed(6)}</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="percentage"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={70}
                        label={{
                          position: 'top',
                          fill: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 700,
                          formatter: (val: any) => `${val}%`
                        }}
                      >
                        {individualBarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Mathematical Summary Footnote */}
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.45,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(22, 11, 45, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <b>Complementary Posterior:</b> P(Spam) = <b>{spamPercent}%</b>, P(Not Spam) = <b>{hamPercent}%</b>. Total = <b>{(spamPercent + hamPercent).toFixed(1)}%</b>. Values calculated via Laplace-smoothed Naive Bayes feature likelihoods.
              </div>
            </div>

            {/* Chart B: Threat Score Chart & Reasoning (Requirement 2.B) */}
            <div>
              <ThreatScoreWidget
                threatScore={selectedScan?.threat_score}
                spamProbability={spamProb}
              />
            </div>
          </div>

          {/* Section 2: Historical Telemetry (Charts C, D, E) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '20px'
            }}
          >
            {/* Chart C: Scan History Threat Score Trend (Requirement 2.C) */}
            <div
              style={{
                backgroundColor: 'rgba(26, 11, 46, 0.75)',
                border: '1px solid rgba(248, 210, 153, 0.25)',
                borderRadius: '16px',
                padding: '22px 24px',
                boxShadow: '0 8px 32px rgba(10, 3, 20, 0.4)',
                color: '#FFF8FF'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(239, 68, 68, 0.18)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <TrendingUp size={15} color="#EF4444" />
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase'
                  }}
                >
                  Chart C • Scan History Threat Scores
                </span>
              </div>

              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px' }}>
                Threat Score Trajectory Across Scans
              </h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Dynamic Threat Scores (0–100) plotted chronologically. Click any point to select that email.
              </p>

              <div
                style={{
                  backgroundColor: 'rgba(16, 7, 34, 0.55)',
                  borderRadius: '12px',
                  padding: '16px 12px 6px 12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ width: '100%', height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={historyTrendData}
                      margin={{ top: 15, right: 20, left: -10, bottom: 15 }}
                      onClick={(e: any) => {
                        if (e && e.activePayload && e.activePayload.length) {
                          const item = e.activePayload[0].payload;
                          setSelectedScanId(item.scanId);
                        }
                      }}
                    >
                      <defs>
                        <linearGradient id="threatScoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#804A8A" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#E2C9FB', fontSize: 10 }}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255, 255, 255, 0.15)' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255, 255, 255, 0.15)' }}
                        ticks={[0, 25, 50, 75, 100]}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div
                                style={{
                                  backgroundColor: 'rgba(20, 8, 38, 0.95)',
                                  border: `1px solid ${d.color}`,
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  color: '#FFF8FF',
                                  fontSize: '0.78rem'
                                }}
                              >
                                <div><b>{d.fullSubject}</b></div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>ID: {d.scanId}</div>
                                <div style={{ color: d.color, fontWeight: 700, marginTop: '2px' }}>
                                  Threat Score: {d.score}/100 ({d.category})
                                </div>
                                <div style={{ color: 'var(--text-secondary)' }}>Prediction: {d.prediction}</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#EF4444"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#threatScoreGrad)"
                        activeDot={{ r: 6, fill: '#F8D299', stroke: '#EF4444', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Chart D: Classification Summary (Requirement 2.D) */}
            <div
              style={{
                backgroundColor: 'rgba(26, 11, 46, 0.75)',
                border: '1px solid rgba(248, 210, 153, 0.25)',
                borderRadius: '16px',
                padding: '22px 24px',
                boxShadow: '0 8px 32px rgba(10, 3, 20, 0.4)',
                color: '#FFF8FF',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(16, 185, 129, 0.18)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PieIcon size={15} color="#10B981" />
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase'
                  }}
                >
                  Chart D • Classification Summary
                </span>
              </div>

              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px' }}>
                Prediction Outcome Breakdown
              </h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Aggregate proportion of Spam vs Legitimate vs Needs Review across {totalCount} saved audits.
              </p>

              <div
                style={{
                  backgroundColor: 'rgba(16, 7, 34, 0.55)',
                  borderRadius: '12px',
                  padding: '16px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  flexWrap: 'wrap',
                  gap: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  flex: 1
                }}
              >
                {/* Donut Pie Chart */}
                <div style={{ width: '150px', height: '150px', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0];
                            return (
                              <div
                                style={{
                                  backgroundColor: 'rgba(20, 8, 38, 0.95)',
                                  border: `1px solid ${d.payload.color}`,
                                  borderRadius: '8px',
                                  padding: '6px 10px',
                                  color: '#FFF8FF',
                                  fontSize: '0.75rem'
                                }}
                              >
                                <b>{d.name}</b>: {d.value} ({d.payload.pct}%)
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Pie
                        data={classificationPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={68}
                        stroke="rgba(22, 11, 45, 0.8)"
                        strokeWidth={2}
                      >
                        {classificationPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Donut Center Count */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF8FF', lineHeight: 1 }}>
                      {totalCount}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total Scans</span>
                  </div>
                </div>

                {/* Legend List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#F59E51' }} />
                    <span style={{ fontSize: '0.82rem', color: '#FFF8FF' }}>
                      <b>Spam:</b> {spamCount} ({totalCount ? ((spamCount / totalCount) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#10B981' }} />
                    <span style={{ fontSize: '0.82rem', color: '#FFF8FF' }}>
                      <b>Not Spam:</b> {legitCount} ({totalCount ? ((legitCount / totalCount) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>

                  {reviewCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#F8D299' }} />
                      <span style={{ fontSize: '0.82rem', color: '#FFF8FF' }}>
                        <b>Needs Review:</b> {reviewCount} ({totalCount ? ((reviewCount / totalCount) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Chart E - Probability Distribution Comparison across Scans (Requirement 2.E) */}
          <div
            style={{
              backgroundColor: 'rgba(26, 11, 46, 0.75)',
              border: '1px solid rgba(248, 210, 153, 0.25)',
              borderRadius: '16px',
              padding: '22px 24px',
              boxShadow: '0 8px 32px rgba(10, 3, 20, 0.4)',
              color: '#FFF8FF'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(128, 74, 138, 0.25)',
                      border: '1px solid rgba(128, 74, 138, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <BarChart3 size={15} color="#E2C9FB" />
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono, monospace)',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase'
                    }}
                  >
                    Chart E • Probability Distribution Across Audited Emails
                  </span>
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Comparative Probability Metrics Across Scans
                </h4>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Compares Spam Probability vs Not Spam Probability for each email audit. Click any bar to inspect its individual graph modal.
                </p>
              </div>

              {/* Legend Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.78rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#F59E51' }} />
                  Spam Probability %
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#10B981' }} />
                  Not Spam Probability %
                </span>
              </div>
            </div>

            {/* Grouped Bar Chart */}
            <div
              style={{
                backgroundColor: 'rgba(16, 7, 34, 0.55)',
                borderRadius: '12px',
                padding: '20px 14px 10px 14px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={distributionData}
                    margin={{ top: 20, right: 20, left: -5, bottom: 25 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload.length) {
                        const item = e.activePayload[0].payload;
                        setSelectedScanId(item.scanId);
                        setSelectedScanForModal(item.rawScan);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#E2C9FB', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255, 255, 255, 0.15)' }}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
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
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div
                              style={{
                                backgroundColor: 'rgba(20, 8, 38, 0.95)',
                                border: '1px solid rgba(248, 210, 153, 0.4)',
                                borderRadius: '8px',
                                padding: '10px 14px',
                                color: '#FFF8FF',
                                fontSize: '0.78rem'
                              }}
                            >
                              <div style={{ fontWeight: 700, marginBottom: '2px' }}>{d.fullSubject}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '6px' }}>
                                Scan ID: {d.scanId} • Outcome: {d.prediction}
                              </div>
                              <div style={{ color: '#F59E51', fontWeight: 600 }}>Spam: {d.spamPct}%</div>
                              <div style={{ color: '#10B981', fontWeight: 600 }}>Not Spam: {d.hamPct}%</div>
                              <div style={{ color: '#F8D299', marginTop: '4px', fontSize: '0.72rem' }}>
                                Threat Score: {d.threatScore}/100 • <i>Click bar to open graph</i>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="spamPct" name="Spam %" fill="#F59E51" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="hamPct" name="Not Spam %" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Individual Probability Graph Modal (Requirement 2.E: inspect individual graph) */}
      {selectedScanForModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          {/* Backdrop */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(10, 3, 20, 0.82)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}
            onClick={() => setSelectedScanForModal(null)}
          />

          {/* Modal Content */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '90vh',
              overflowY: 'auto',
              zIndex: 101
            }}
          >
            <EmailProbabilityGraph
              scan={selectedScanForModal}
              onClose={() => setSelectedScanForModal(null)}
              isModal={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
