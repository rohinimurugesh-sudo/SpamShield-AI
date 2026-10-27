import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Flame
} from 'lucide-react';
import { ThreatScoreData } from '../types';

interface ThreatScoreWidgetProps {
  threatScore?: ThreatScoreData;
  spamProbability?: number;
  isCompact?: boolean;
}

export const ThreatScoreWidget: React.FC<ThreatScoreWidgetProps> = ({
  threatScore,
  spamProbability,
  isCompact = false
}) => {
  const [showFactors, setShowFactors] = useState(false);

  // Fallback defaults if threatScore not yet calculated
  const score = threatScore?.score ?? 0;
  const category = threatScore?.category ?? (score >= 80 ? 'Critical threat' : score >= 60 ? 'High threat' : score >= 30 ? 'Medium threat' : 'Low threat');
  const band = threatScore?.band ?? (score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW');
  const color = threatScore?.color ?? (score >= 80 ? '#EF4444' : score >= 60 ? '#F97316' : score >= 30 ? '#FBBF24' : '#10B981');
  const summary = threatScore?.summary_reason ?? 'Evaluation based on composite security indicators and Bayesian spam likelihood.';
  const factors = threatScore?.factors ?? [
    {
      name: 'Bayesian Spam Likelihood',
      points: Math.round((spamProbability ?? 0) * 40),
      description: `Model calculated P(Spam) at ${((spamProbability ?? 0) * 100).toFixed(1)}%.`
    }
  ];

  // Radial progress calculations (circle circumference 2 * PI * r)
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div
      style={{
        backgroundColor: 'rgba(26, 11, 46, 0.75)',
        border: `1px solid ${color}40`,
        borderRadius: '16px',
        padding: isCompact ? '16px 20px' : '22px 26px',
        boxShadow: `0 8px 30px rgba(10, 3, 20, 0.4), 0 0 20px ${color}15`,
        color: '#FFF8FF',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Subtle background color sheen */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          backgroundColor: `${color}15`,
          filter: 'blur(30px)',
          pointerEvents: 'none'
        }}
      />

      {/* Header with Title and Distinction Note */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              backgroundColor: `${color}25`,
              border: `1px solid ${color}60`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {band === 'CRITICAL' || band === 'HIGH' ? (
              <Flame size={16} color={color} />
            ) : band === 'MEDIUM' ? (
              <AlertTriangle size={15} color={color} />
            ) : (
              <ShieldCheck size={16} color={color} />
            )}
          </div>
          <div>
            <h4
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#FFF8FF',
                margin: 0
              }}
            >
              Dynamic Threat Score
            </h4>
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono, monospace)'
              }}
            >
              CYBERSECURITY SEVERITY INDEX (0–100)
            </span>
          </div>
        </div>

        {/* Threat Band Pill */}
        <div
          style={{
            padding: '4px 12px',
            borderRadius: '999px',
            backgroundColor: `${color}20`,
            border: `1.5px solid ${color}`,
            color: color,
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}`
            }}
          />
          {category}
        </div>
      </div>

      {/* Gauge and Metric Display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap',
          marginBottom: '16px'
        }}
      >
        {/* SVG Circular Progress Gauge */}
        <div style={{ position: 'relative', width: '104px', height: '104px', flexShrink: 0 }}>
          <svg width="104" height="104" viewBox="0 0 104 104" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background Track */}
            <circle
              cx="52"
              cy="52"
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="9"
              fill="transparent"
            />
            {/* Colored Progress Arc */}
            <circle
              cx="52"
              cy="52"
              r={radius}
              stroke={color}
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{
                transition: 'stroke-dashoffset 0.8s ease-in-out',
                filter: `drop-shadow(0 0 6px ${color}80)`
              }}
            />
          </svg>

          {/* Numerical Score in Center */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'none'
            }}
          >
            <span
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: color,
                lineHeight: 1,
                fontFamily: 'var(--font-mono, monospace)',
                textShadow: `0 0 12px ${color}50`
              }}
            >
              {score}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              / 100
            </span>
          </div>
        </div>

        {/* Narrative & Interpretation */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          <p
            style={{
              fontSize: '0.84rem',
              color: '#FFF8FF',
              lineHeight: 1.45,
              marginBottom: '8px'
            }}
          >
            {summary}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              fontSize: '0.73rem',
              color: 'var(--text-secondary)'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#10B981', fontWeight: 600 }}>0–29:</span> Low
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#FBBF24', fontWeight: 600 }}>30–59:</span> Medium
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#F97316', fontWeight: 600 }}>60–79:</span> High
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#EF4444', fontWeight: 600 }}>80–100:</span> Critical
            </span>
          </div>
        </div>
      </div>

      {/* Distinction Callout */}
      <div
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(128, 74, 138, 0.15)',
          border: '1px solid rgba(248, 210, 153, 0.2)',
          fontSize: '0.74rem',
          color: '#F8D299',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          marginBottom: '12px',
          lineHeight: 1.4
        }}
      >
        <Info size={14} color="#F8D299" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <b>Threat Score vs Spam Probability:</b> The Naive Bayes classifier measures statistical text patterns (P(Spam)). The Threat Score quantifies real-world cyber weaponization (credential theft, IP redirection, and coercion).
        </div>
      </div>

      {/* Expandable Score Factors Breakdown */}
      {factors.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowFactors(!showFactors)}
            style={{
              background: 'none',
              border: 'none',
              color: '#E2C9FB',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 0'
            }}
          >
            <Activity size={13} color="#E2C9FB" />
            {showFactors ? 'Hide Score Calculation Factors' : `View ${factors.length} Calculation Factor(s)`}
            {showFactors ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showFactors && (
            <div
              style={{
                marginTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              {factors.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(22, 11, 45, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '12px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#FFF8FF' }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {f.description}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: f.points > 0 ? color : 'var(--text-muted)',
                      flexShrink: 0
                    }}
                  >
                    +{f.points} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
