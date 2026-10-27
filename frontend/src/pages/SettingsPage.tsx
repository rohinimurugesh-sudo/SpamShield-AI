import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Sliders,
  EyeOff,
  Database,
  Save,
  CheckCircle2,
  Info,
  Scale,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { AppSettings } from '../types';
import { fetchSettingsApi, saveSettingsApi } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    uncertainty_low: '0.35',
    uncertainty_high: '0.65',
    privacy_store_body: 'false',
    laplace_alpha: '1.0',
    model_version: 'MultinomialNB-v2.4',
    anomaly_z_threshold: '2.5'
  });

  const [lowVal, setLowVal] = useState(0.35);
  const [highVal, setHighVal] = useState(0.65);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchSettingsApi().then(data => {
      setSettings(data);
      setLowVal(parseFloat(data.uncertainty_low) || 0.35);
      setHighVal(parseFloat(data.uncertainty_high) || 0.65);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await saveSettingsApi({
      ...settings,
      uncertainty_low: lowVal.toFixed(2),
      uncertainty_high: highVal.toFixed(2)
    });
    setSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    setLowVal(0.35);
    setHighVal(0.65);
    setSettings(prev => ({
      ...prev,
      uncertainty_low: '0.35',
      uncertainty_high: '0.65',
      privacy_store_body: 'false',
      laplace_alpha: '1.0',
      anomaly_z_threshold: '2.5'
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Settings Header */}
      <section
        className="glass-panel"
        style={{
          padding: '28px 32px',
          background: 'radial-gradient(120% 120% at 85% 15%, rgba(128, 74, 138, 0.25) 0%, rgba(36, 16, 63, 0.5) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-review">Probabilistic Calibration</span>
            <span style={{ fontSize: '0.8rem', color: '#F8D299', fontWeight: 600 }}>
              Uncertainty-Aware Guardrails
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', color: '#FFF8FF', marginBottom: '6px' }}>
            Uncertainty Threshold & System Configuration
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '680px' }}>
            Configure decision intervals for automated spam filtering versus manual human triage, balancing false positive risks against false negative threats.
          </p>
        </div>

        <button onClick={handleResetDefaults} className="btn-glass" style={{ padding: '8px 16px' }}>
          <RotateCcw size={14} style={{ marginRight: '6px' }} />
          Reset to Baseline
        </button>
      </section>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Core Feature: Uncertainty Interval Tuner */}
        <div className="glass-panel" style={{ padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Sliders size={20} color="#F8D299" />
            <div>
              <h3 style={{ fontSize: '1.2rem', color: '#FFF8FF' }}>Uncertainty Decision Interval Configuration</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Emails with posterior probability falling between Low and High will be flagged as <strong>NEEDS REVIEW</strong>
              </p>
            </div>
          </div>

          {/* Visual 3-Zone Decision Spectrum */}
          <div style={{ margin: '24px 0 32px' }}>
            <div style={{ display: 'flex', height: '24px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              {/* Legitimate Zone */}
              <div
                style={{
                  width: `${lowVal * 100}%`,
                  backgroundColor: 'rgba(128, 74, 138, 0.65)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#FFF8FF',
                  transition: 'width 0.2s ease'
                }}
              >
                LEGITIMATE (&lt; {(lowVal * 100).toFixed(0)}%)
              </div>

              {/* Review Zone */}
              <div
                style={{
                  width: `${(highVal - lowVal) * 100}%`,
                  backgroundColor: 'rgba(248, 210, 153, 0.65)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#160B2D',
                  transition: 'width 0.2s ease'
                }}
              >
                NEEDS REVIEW [{(lowVal * 100).toFixed(0)}% – {(highVal * 100).toFixed(0)}%]
              </div>

              {/* Spam Zone */}
              <div
                style={{
                  width: `${(1 - highVal) * 100}%`,
                  backgroundColor: 'rgba(245, 158, 81, 0.75)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#160B2D',
                  transition: 'width 0.2s ease'
                }}
              >
                SPAM (&ge; {(highVal * 100).toFixed(0)}%)
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <span>0% Probability</span>
              <span>Low Threshold: {(lowVal * 100).toFixed(0)}%</span>
              <span>High Threshold: {(highVal * 100).toFixed(0)}%</span>
              <span>100% Probability</span>
            </div>
          </div>

          {/* Slider Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <span>Low Confidence Cutoff (P_low)</span>
                <strong style={{ color: '#E2C9FB', fontFamily: 'var(--font-mono)' }}>{(lowVal * 100).toFixed(0)}%</strong>
              </label>
              <input
                type="range"
                min="0.10"
                max="0.48"
                step="0.01"
                value={lowVal}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (val < highVal) setLowVal(val);
                }}
                style={{ width: '100%', accentColor: '#804A8A' }}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                Any score below this is automatically deemed legitimate.
              </span>
            </div>

            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <span>High Confidence Cutoff (P_high)</span>
                <strong style={{ color: '#F59E51', fontFamily: 'var(--font-mono)' }}>{(highVal * 100).toFixed(0)}%</strong>
              </label>
              <input
                type="range"
                min="0.52"
                max="0.90"
                step="0.01"
                value={highVal}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (val > lowVal) setHighVal(val);
                }}
                style={{ width: '100%', accentColor: '#F59E51' }}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                Any score above this triggers automatic quarantine.
              </span>
            </div>
          </div>
        </div>

        {/* Supplementary Settings Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Privacy Controls */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <EyeOff size={18} color="#F8D299" />
              <h4 style={{ fontSize: '1rem', color: '#FFF8FF' }}>Data Privacy & Redaction</h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Protect sensitive email communications by default by storing only a 180-character statistical snippet in the database.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', color: '#FFF8FF' }}>
              <input
                type="checkbox"
                checked={settings.privacy_store_body === 'true'}
                onChange={e =>
                  setSettings({
                    ...settings,
                    privacy_store_body: e.target.checked ? 'true' : 'false'
                  })
                }
                style={{ accentColor: '#F8D299', width: '16px', height: '16px' }}
              />
              Store Full Email Content in SQLite Database
            </label>
          </div>

          {/* Model Hyperparameters */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Scale size={18} color="#F8D299" />
              <h4 style={{ fontSize: '1rem', color: '#FFF8FF' }}>Laplace Additive Smoothing</h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Standard α=1.0 parameter handles zero-probability words outside the training vocabulary.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Smoothing α:</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="5.0"
                value={settings.laplace_alpha}
                onChange={e => setSettings({ ...settings, laplace_alpha: e.target.value })}
                className="glass-input"
                style={{ width: '100px', padding: '6px 10px' }}
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'flex-end' }}>
          {savedSuccess && (
            <span style={{ fontSize: '0.85rem', color: '#F8D299', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} />
              Settings saved successfully!
            </span>
          )}
          <button type="submit" className="btn-primary" style={{ padding: '12px 28px' }}>
            <Save size={16} />
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
};
