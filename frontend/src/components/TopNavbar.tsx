import React from 'react';
import { Menu, Mail } from 'lucide-react';
import { PageId } from './Sidebar';

interface Props {
  activePage: PageId;
  onOpenMobile: () => void;
  isBackendOnline: boolean;
}

const PAGE_INFO: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'System overview and recent classification telemetry'
  },
  scanner: {
    title: 'Email Scanner',
    subtitle: 'Classify incoming emails with conditional probability & explainable tokens'
  },
  history: {
    title: 'Scan History',
    subtitle: 'Audited log of previous email scans, threat findings, and PDF reports'
  },
  reports: {
    title: 'Security Reports & Probability Graphs',
    subtitle: 'View individual scan probability graphs, audit dossiers, and download PDF reports'
  },
  charts: {
    title: 'Visual Security Charts & Analytics',
    subtitle: 'Multi-dimensional telemetry: individual probabilities, threat scores, scan distributions'
  },
  insights: {
    title: 'Model Insights',
    subtitle: 'How the Naive Bayes classifier calculates probabilities'
  }
};

export const TopNavbar: React.FC<Props> = ({
  activePage,
  onOpenMobile,
  isBackendOnline
}) => {
  const { title } = PAGE_INFO[activePage] || {
    title: 'SpamShield AI',
    subtitle: 'Intelligent Email Security'
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        height: '68px',
        backgroundColor: 'rgba(22, 11, 45, 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        zIndex: 30
      }}
    >
      {/* Left: Mobile Toggle & Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={onOpenMobile}
          className="mobile-hamburger"
          style={{
            background: 'none',
            border: 'none',
            color: '#FFF8FF',
            cursor: 'pointer',
            padding: '6px',
            display: 'none'
          }}
        >
          <Menu size={20} />
        </button>

        <div>
          <h1
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: '#FFF8FF',
              margin: 0
            }}
          >
            {title}
          </h1>
        </div>
      </div>

      {/* Right: Engine status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: '9999px',
            backgroundColor: isBackendOnline
              ? 'rgba(128, 74, 138, 0.25)'
              : 'rgba(245, 158, 81, 0.18)',
            border: `1px solid ${
              isBackendOnline ? 'rgba(248, 210, 153, 0.3)' : 'rgba(245, 158, 81, 0.35)'
            }`,
            fontSize: '0.75rem',
            fontWeight: 500
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isBackendOnline ? '#F8D299' : '#F59E51',
              boxShadow: isBackendOnline ? '0 0 8px #F8D299' : '0 0 8px #F59E51'
            }}
          />
          <span style={{ color: isBackendOnline ? '#FFF8FF' : '#F8D299' }}>
            {isBackendOnline ? 'ML Engine Online' : 'Bayes Engine Active'}
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .mobile-hamburger {
            display: block !important;
          }
        }
      `}</style>
    </header>
  );
};
