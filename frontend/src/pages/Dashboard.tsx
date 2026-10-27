import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Mail,
  ArrowRight,
  Zap,
  Sparkles
} from 'lucide-react';
import { DashboardData } from '../types';
import { ThreeShieldScene } from '../components/ThreeShieldScene';
import { PageId } from '../components/Sidebar';

interface Props {
  data: DashboardData;
  onNavigate: (page: PageId) => void;
  onQuickScan?: (text: string) => void;
}

export const Dashboard: React.FC<Props> = ({ data, onNavigate }) => {
  const { metrics, recent_scans } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1040px', margin: '0 auto' }}>
      {/* 1. Simple Welcome Section with Compact 3D Shield */}
      <section
        className="glass-panel"
        style={{
          padding: '36px 40px',
          background: 'linear-gradient(135deg, rgba(58, 3, 83, 0.4) 0%, rgba(22, 11, 45, 0.7) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(248, 210, 153, 0.12)',
              border: '1px solid rgba(248, 210, 153, 0.25)',
              marginBottom: '14px'
            }}
          >
            <Sparkles size={13} color="#F8D299" />
            <span style={{ fontSize: '0.75rem', color: '#F8D299', fontWeight: 600 }}>
              Conditional Probability Engine
            </span>
          </div>

          <h2
            style={{
              fontSize: '2.3rem',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: '10px',
              color: '#FFF8FF'
            }}
          >
            SpamShield <span style={{ color: '#F8D299' }}>AI</span>
          </h2>

          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              marginBottom: '24px',
              maxWidth: '480px'
            }}
          >
            Smart email protection powered by probability.
          </p>

          <button
            onClick={() => onNavigate('scanner')}
            className="btn-primary"
            style={{ padding: '12px 28px', fontSize: '0.95rem' }}
          >
            <Zap size={16} />
            Scan an Email
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Small floating 3D purple shield with envelope */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ThreeShieldScene size={190} />
        </div>
      </section>

      {/* 2. Exactly Three Compact Statistics Cards */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px'
        }}
      >
        {/* Stat 1: Emails Scanned */}
        <div className="glass-panel" style={{ padding: '22px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Emails Scanned
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'rgba(128, 74, 138, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF8FF'
              }}
            >
              <Mail size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#FFF8FF' }}>
            {metrics.total_emails_analysed.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Total emails processed
          </span>
        </div>

        {/* Stat 2: Spam Detected */}
        <div className="glass-panel" style={{ padding: '22px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Spam Detected
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 81, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F59E51'
              }}
            >
              <ShieldAlert size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#F59E51' }}>
            {metrics.spam_detected.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {metrics.spam_percentage}% spam rate
          </span>
        </div>

        {/* Stat 3: Legitimate Emails */}
        <div className="glass-panel" style={{ padding: '22px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Legitimate Emails
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'rgba(128, 74, 138, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#E2C9FB'
              }}
            >
              <ShieldCheck size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#FFF8FF' }}>
            {metrics.legitimate_emails.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {metrics.legit_percentage}% verified safe
          </span>
        </div>
      </section>

      {/* 3. Small Recent Scans Section */}
      <section className="glass-panel" style={{ padding: '26px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#FFF8FF' }}>Recent Scans</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Latest emails evaluated by the classifier
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('reports')}
              className="btn-glass"
              style={{ padding: '6px 14px', fontSize: '0.78rem', color: '#F8D299', borderColor: 'rgba(248, 210, 153, 0.3)' }}
            >
              Reports & Graphs
              <ArrowRight size={13} style={{ marginLeft: '4px' }} />
            </button>
            <button
              onClick={() => onNavigate('history')}
              className="btn-glass"
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              Scan History
            </button>
            <button
              onClick={() => onNavigate('scanner')}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              New Scan
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px' }}>Email Subject</th>
                <th style={{ padding: '10px 12px' }}>Result</th>
                <th style={{ padding: '10px 12px' }}>Spam Probability</th>
              </tr>
            </thead>
            <tbody>
              {recent_scans.slice(0, 4).map(scan => {
                const isSpam = scan.prediction === 'SPAM';
                const isReview = scan.prediction === 'NEEDS REVIEW';
                return (
                  <tr
                    key={scan.id}
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                  >
                    <td style={{ padding: '12px', fontSize: '0.85rem', color: '#FFF8FF', maxWidth: '380px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {scan.subject || 'Untitled Email'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${isSpam ? 'badge-spam' : isReview ? 'badge-review' : 'badge-legit'}`}>
                        {scan.prediction}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: isSpam ? '#F59E51' : isReview ? '#F8D299' : '#B085D6', fontWeight: 600 }}>
                      {(scan.spam_probability * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
