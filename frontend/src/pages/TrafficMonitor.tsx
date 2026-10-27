import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertOctagon,
  TrendingUp,
  Globe,
  Clock,
  ShieldAlert,
  Info,
  CheckCircle2,
  RefreshCw,
  Zap,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { TrafficSummary } from '../types';
import { fetchTrafficSummary } from '../services/api';

export const TrafficMonitor: React.FC = () => {
  const [trafficData, setTrafficData] = useState<TrafficSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const summary = await fetchTrafficSummary();
    setTrafficData(summary);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !trafficData) {
    return (
      <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
        <RefreshCw size={28} className="animate-spin" color="#F8D299" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading 24-hour email telemetry stream...</p>
      </div>
    );
  }

  const { timeline, anomalies_detected, domain_distribution, baseline_methodology, course_outcome } = trafficData;

  // Aggregate metrics
  const totalEmails = timeline.reduce((sum, item) => sum + item.total_volume, 0);
  const totalSpam = timeline.reduce((sum, item) => sum + item.spam_count, 0);
  const avgSpamRate = totalEmails > 0 ? ((totalSpam / totalEmails) * 100).toFixed(1) : '0';
  const peakHour = [...timeline].sort((a, b) => b.total_volume - a.total_volume)[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* CO3 Header Banner */}
      <section
        className="glass-panel"
        style={{
          padding: '24px 32px',
          background: 'radial-gradient(120% 120% at 85% 15%, rgba(245, 158, 81, 0.2) 0%, rgba(36, 16, 63, 0.5) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-review">Course Outcome CO3 Aligned</span>
            <span style={{ fontSize: '0.8rem', color: '#F8D299', fontWeight: 600 }}>
              24-Hour Statistical Anomaly Telemetry
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', color: '#FFF8FF', marginBottom: '6px' }}>
            Email Inbound Traffic & Statistical Spike Detection
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '680px' }}>
            Evaluates aggregated network traffic anomalies using a 24-hour rolling z-score baseline. Flags sudden DDoS-style spam surges without requiring individual payload inspection.
          </p>
        </div>

        <button onClick={loadData} className="btn-glass" style={{ padding: '8px 16px' }}>
          <RefreshCw size={14} style={{ marginRight: '6px' }} />
          Refresh Feed
        </button>
      </section>

      {/* 4 Summary Metric Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '22px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>24h Total Inbound Volume</span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#FFF8FF', margin: '8px 0 4px' }}>
            {totalEmails.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Aggregate email transmissions</span>
        </div>

        <div className="glass-panel" style={{ padding: '22px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Average Spam Ratio</span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#F59E51', margin: '8px 0 4px' }}>
            {avgSpamRate}%
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{totalSpam.toLocaleString()} spam messages intercepted</span>
        </div>

        <div className="glass-panel" style={{ padding: '22px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Anomalies Flagged</span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: anomalies_detected.length > 0 ? '#F8D299' : '#B085D6', margin: '8px 0 4px' }}>
            {anomalies_detected.length} Detected
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Threshold: z &ge; 2.50 standard deviations</span>
        </div>

        <div className="glass-panel" style={{ padding: '22px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Peak Hourly Surge</span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#FFF8FF', margin: '8px 0 4px' }}>
            {peakHour?.total_volume} <span style={{ fontSize: '0.9rem', color: '#F8D299', fontWeight: 500 }}>emails/hr</span>
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Occurred at {peakHour?.hour} UTC</span>
        </div>
      </section>

      {/* Main Charts: Volume vs Spam Over Time */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }} className="traffic-grid">
        {/* Time-series Volume Line Chart */}
        <div className="glass-panel" style={{ padding: '26px 30px' }}>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#FFF8FF' }}>Traffic Volume & Spam Rate Over Time</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Tracking inbound email surges against spam concentrations
            </p>
          </div>

          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" unit="%" stroke="#F59E51" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(28, 14, 52, 0.95)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#FFF8FF'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '8px' }} />
                <Line yAxisId="left" type="monotone" dataKey="total_volume" stroke="#FFF8FF" strokeWidth={2} name="Total Volume" dot={{ fill: '#FFF8FF', r: 3 }} />
                <Line yAxisId="left" type="monotone" dataKey="spam_count" stroke="#804A8A" strokeWidth={2} name="Spam Volume" />
                <Line yAxisId="right" type="monotone" dataKey="spam_rate_pct" stroke="#F59E51" strokeWidth={2.5} name="Spam Rate %" strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sender Domain Volume Breakdown */}
        <div className="glass-panel" style={{ padding: '26px 30px' }}>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#FFF8FF' }}>Email Volume by Sender Domain</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Domain reputational distribution and spam ratios
            </p>
          </div>

          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domain_distribution} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={11} />
                <YAxis type="category" dataKey="domain" stroke="var(--text-muted)" fontSize={11} width={110} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(28, 14, 52, 0.95)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#FFF8FF'
                  }}
                />
                <Bar dataKey="volume" fill="#804A8A" radius={[0, 4, 4, 0]} name="Total Volume" />
                <Bar dataKey="spam_volume" fill="#F59E51" radius={[0, 4, 4, 0]} name="Spam Volume" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Statistical Anomaly Timeline Section */}
      <section className="glass-panel" style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <AlertOctagon size={22} color="#F59E51" />
          <div>
            <h3 style={{ fontSize: '1.2rem', color: '#FFF8FF' }}>Statistical Anomaly Timeline (z-Score &ge; 2.5)</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Events flagged via rolling Gaussian z-score baseline
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {anomalies_detected.map((anom, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px 20px',
                borderRadius: '14px',
                backgroundColor: 'rgba(245, 158, 81, 0.12)',
                border: '1px solid rgba(245, 158, 81, 0.35)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(245, 158, 81, 0.25)',
                    color: '#F59E51',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}
                >
                  {anom.hour} UTC
                </div>
                <div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FFF8FF' }}>
                    {anom.reason}
                  </span>
                  <div style={{ display: 'flex', gap: '14px', marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <span>Volume: <strong style={{ color: '#FFF8FF' }}>{anom.total_volume} emails</strong></span>
                    <span>Spam Proportion: <strong style={{ color: '#F59E51' }}>{anom.spam_rate_pct}%</strong></span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(22, 11, 45, 0.6)',
                  border: '1px solid rgba(248, 210, 153, 0.3)',
                  fontSize: '0.82rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#F8D299'
                }}
              >
                z = +{anom.z_score}σ
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Clarification banner on simulated vs live telemetry */}
      <section className="glass-panel" style={{ padding: '20px 24px', borderLeft: '4px solid #804A8A' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: '#F8D299' }}>Academic Telemetry Note:</strong> This Traffic Monitor simulates real-world mail server traffic telemetry according to <strong>Course Outcome CO3</strong>. Anomaly detection distinguishes network-level flood events from individual content classification decisions, demonstrating full probabilistic defense-in-depth.
        </p>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .traffic-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
