import React from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  BrainCircuit,
  X,
  Mail,
  History,
  FileText,
  BarChart3
} from 'lucide-react';

export type PageId = 'dashboard' | 'scanner' | 'history' | 'reports' | 'charts' | 'insights';

interface Props {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scanner', label: 'Email Scanner', icon: ShieldCheck },
  { id: 'history', label: 'Scan History', icon: History },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'charts', label: 'Charts', icon: BarChart3 },
  { id: 'insights', label: 'Model Insights', icon: BrainCircuit }
];

export const Sidebar: React.FC<Props> = ({
  activePage,
  onSelectPage,
  isOpenMobile,
  onCloseMobile
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(22, 11, 45, 0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 40
          }}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        style={{
          width: '260px',
          height: '100vh',
          position: 'sticky',
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(28, 13, 50, 0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 50,
          transition: 'transform 0.3s ease',
          padding: '24px 16px',
          flexShrink: 0
        }}
        className={`sidebar-container ${isOpenMobile ? 'mobile-open' : ''}`}
      >
        {/* Brand Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #804A8A 0%, #3A0353 60%, #F59E51 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(128, 74, 138, 0.4)',
                border: '1px solid rgba(248, 210, 153, 0.3)'
              }}
            >
              <Mail size={20} color="#FFF8FF" />
            </div>

            <div>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: '#FFF8FF',
                  letterSpacing: '-0.02em'
                }}
              >
                SpamShield <span style={{ color: '#F8D299' }}>AI</span>
              </div>
              <p
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.02em'
                }}
              >
                Intelligent Email Security
              </p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="mobile-close-btn"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'none',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 3 Main Navigation Items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectPage(item.id);
                  onCloseMobile();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: isActive
                    ? '1px solid rgba(248, 210, 153, 0.35)'
                    : '1px solid transparent',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(128, 74, 138, 0.4) 0%, rgba(58, 3, 83, 0.4) 100%)'
                    : 'transparent',
                  color: isActive ? '#FFF8FF' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 16px rgba(128, 74, 138, 0.25)' : 'none',
                  textAlign: 'left'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = '#FFF8FF';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <Icon
                  size={19}
                  color={isActive ? '#F8D299' : 'currentColor'}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.92rem',
                    fontWeight: isActive ? 600 : 500
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Clean Footer Info */}
        <div
          style={{
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#F8D299',
                boxShadow: '0 0 6px #F8D299'
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Naive Bayes</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#F8D299', fontFamily: 'var(--font-mono)' }}>v2.4</span>
        </div>
      </aside>

      <style>{`
        @media (max-width: 900px) {
          .sidebar-container {
            position: fixed !important;
            left: 0;
            top: 0;
            transform: translateX(-100%);
          }
          .sidebar-container.mobile-open {
            transform: translateX(0);
          }
          .mobile-close-btn {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
};
