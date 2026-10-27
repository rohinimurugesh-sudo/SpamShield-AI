import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  FileDown,
  Trash2,
  Eye,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Info,
  Calendar,
  Mail,
  User,
  Clock,
  ExternalLink,
  Key,
  Gift,
  Cpu,
  RefreshCw,
  X,
  CheckCircle2,
  AlertOctagon,
  BarChart3
} from 'lucide-react';
import { ClassificationResult, ThreatXRaySign } from '../types';
import { fetchScanHistory, deleteScanApi, downloadPdfReportApi, fetchScanDetailApi } from '../services/api';
import { EmailProbabilityGraph } from '../components/EmailProbabilityGraph';
import { PageId } from '../components/Sidebar';

interface ScanHistoryProps {
  onNavigate?: (page: PageId) => void;
}

export const ScanHistory: React.FC<ScanHistoryProps> = ({ onNavigate }) => {
  const [scans, setScans] = useState<ClassificationResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL'); // 'ALL' | 'SPAM' | 'LEGITIMATE' | 'NEEDS REVIEW'
  const [selectedScan, setSelectedScan] = useState<ClassificationResult | null>(null);
  const [selectedScanForGraph, setSelectedScanForGraph] = useState<ClassificationResult | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const filterParam = activeFilter === 'ALL' ? '' : activeFilter;
      const res = await fetchScanHistory(searchTerm, filterParam);
      setScans(res.scans || []);
      setTotal(res.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [activeFilter]);

  // Handle Search on Enter or debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHistory();
  };

  // Open Saved Details without rerunning classifier
  const handleViewDetails = async (scanId: string) => {
    setModalLoading(true);
    try {
      const fullDetail = await fetchScanDetailApi(scanId);
      if (fullDetail) {
        setSelectedScan(fullDetail);
      } else {
        const found = scans.find(s => (s.id || s.scan_id) === scanId);
        if (found) setSelectedScan(found);
      }
    } finally {
      setModalLoading(false);
    }
  };

  // Download PDF Report
  const handleDownloadPdf = async (scanId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDownloadingId(scanId);
    try {
      const success = await downloadPdfReportApi(scanId);
      if (success) {
        setActionNotice(`PDF Report for ${scanId} generated & downloaded successfully.`);
        setTimeout(() => setActionNotice(null), 4000);
      } else {
        setActionNotice(`Failed to generate PDF. Check backend connectivity.`);
        setTimeout(() => setActionNotice(null), 4000);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  // Delete Scan Record
  const handleDelete = async (scanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete scan record ${scanId}?`)) {
      const ok = await deleteScanApi(scanId);
      if (ok) {
        setScans(prev => prev.filter(s => (s.id || s.scan_id) !== scanId));
        setTotal(prev => Math.max(0, prev - 1));
        if (selectedScan && (selectedScan.id === scanId || selectedScan.scan_id === scanId)) {
          setSelectedScan(null);
        }
        setActionNotice(`Scan record ${scanId} removed from audit history.`);
        setTimeout(() => setActionNotice(null), 3000);
      }
    }
  };

  const renderSignIcon = (iconType?: string) => {
    switch (iconType) {
      case 'key':
        return <Key size={14} color="#FC8181" style={{ flexShrink: 0 }} />;
      case 'gift':
        return <Gift size={14} color="#F59E51" style={{ flexShrink: 0 }} />;
      case 'clock':
        return <Clock size={14} color="#F8D299" style={{ flexShrink: 0 }} />;
      case 'link':
        return <ExternalLink size={14} color="#F59E51" style={{ flexShrink: 0 }} />;
      case 'alert':
        return <AlertTriangle size={14} color="#FC8181" style={{ flexShrink: 0 }} />;
      default:
        return <AlertOctagon size={14} color="#F59E51" style={{ flexShrink: 0 }} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1040px', margin: '0 auto' }}>
      {/* 1. Header & Audit Storage Notice Banner */}
      <section
        className="glass-panel"
        style={{
          padding: '28px 32px',
          background: 'linear-gradient(135deg, rgba(58, 3, 83, 0.45) 0%, rgba(22, 11, 45, 0.75) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <History size={15} color="#F8D299" />
          <span style={{ fontSize: '0.78rem', color: '#F8D299', fontWeight: 600, letterSpacing: '0.5px' }}>
            Audited Scan Registry
          </span>
        </div>

        <h2 style={{ fontSize: '1.65rem', color: '#FFF8FF', marginBottom: '8px', fontWeight: 800 }}>
          Email Scan History & PDF Reports
        </h2>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px', maxWidth: '720px' }}>
          Review historical classification outcomes, inspect original Threat X-Ray forensic findings, and generate official cryptographic audit PDF reports.
        </p>

        {/* Persistent Storage Notice */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(22, 11, 45, 0.55)',
            border: '1px solid rgba(248, 210, 153, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}
        >
          <Info size={16} color="#F8D299" style={{ flexShrink: 0 }} />
          <span>
            <strong style={{ color: '#F8D299' }}>Centralized Audit Storage Notice: </strong>
            Records are persisted centrally in the application's SQLite database. Because user authentication is not enabled, this audit log reflects all incoming scans processed by the engine across client sessions.
          </span>
        </div>
      </section>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div
          style={{
            padding: '12px 20px',
            borderRadius: '10px',
            backgroundColor: 'rgba(128, 74, 138, 0.35)',
            border: '1px solid rgba(248, 210, 153, 0.4)',
            color: '#FFF8FF',
            fontSize: '0.84rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <CheckCircle2 size={16} color="#F8D299" />
          {actionNotice}
        </div>
      )}

      {/* 2. Search & Filter Bar */}
      <section
        className="glass-panel"
        style={{
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={15}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search by subject line or sender address..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field"
              style={{
                width: '100%',
                paddingLeft: '36px',
                paddingTop: '8px',
                paddingBottom: '8px',
                fontSize: '0.82rem'
              }}
            />
          </div>
          <button type="submit" className="btn-glass" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
            Search
          </button>
        </form>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={12} /> Filter:
          </span>

          {[
            { id: 'ALL', label: 'All' },
            { id: 'SPAM', label: 'Spam' },
            { id: 'LEGITIMATE', label: 'Not Spam' },
            { id: 'NEEDS REVIEW', label: 'Needs Review' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={activeFilter === f.id ? 'btn-primary' : 'btn-glass'}
              style={{
                padding: '5px 12px',
                fontSize: '0.74rem',
                borderRadius: '9999px',
                fontWeight: activeFilter === f.id ? 700 : 500
              }}
            >
              {f.label}
            </button>
          ))}

          <button
            onClick={loadHistory}
            className="btn-glass"
            style={{ padding: '5px 10px', fontSize: '0.74rem' }}
            title="Refresh Scan History"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </section>

      {/* 3. History Records Table */}
      <section className="glass-panel" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', color: '#FFF8FF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Recorded Scans</span>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(128, 74, 138, 0.3)',
                color: '#E2C9FB',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {total} Total
            </span>
          </h3>

          {onNavigate && (
            <button
              onClick={() => onNavigate('scanner')}
              className="btn-glass"
              style={{ padding: '5px 14px', fontSize: '0.76rem' }}
            >
              + New Scan
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '0.85rem' }}>Loading scan history records...</p>
          </div>
        ) : scans.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px dashed rgba(255, 255, 255, 0.1)'
            }}
          >
            <Mail size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
            <h4 style={{ fontSize: '1rem', color: '#FFF8FF', marginBottom: '6px' }}>
              No scan records found
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 18px' }}>
              {searchTerm || activeFilter !== 'ALL'
                ? 'No scans match your active search and filter criteria. Try clearing filters.'
                : 'Your audit history is empty. Start by scanning your first email in the Email Scanner.'}
            </p>
            {onNavigate && (
              <button onClick={() => onNavigate('scanner')} className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem' }}>
                Go to Email Scanner
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                  <th style={{ padding: '10px 12px' }}>Date / Scan ID</th>
                  <th style={{ padding: '10px 12px' }}>Subject & Sender</th>
                  <th style={{ padding: '10px 12px' }}>Classification</th>
                  <th style={{ padding: '10px 12px' }}>Model Probability</th>
                  <th style={{ padding: '10px 12px' }}>Threat X-Ray</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.map(scan => {
                  const scanId = scan.id || scan.scan_id || 'UNKNOWN';
                  const isSpam = scan.prediction === 'SPAM';
                  const isReview = scan.prediction === 'NEEDS REVIEW';
                  const spamPct = (scan.spam_probability * 100).toFixed(1);
                  const hamPct = (scan.ham_probability * 100).toFixed(1);
                  const isDownloading = downloadingId === scanId;

                  // Format timestamp
                  let dateStr = scan.timestamp || '';
                  try {
                    const d = new Date(scan.timestamp || '');
                    dateStr = d.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  } catch (e) {}

                  // Threat X-Ray summary
                  const xray = scan.threat_xray;
                  const warningCount = xray?.warning_count ?? (xray?.detected_phrases?.length || 0);

                  return (
                    <tr
                      key={scanId}
                      onClick={() => handleViewDetails(scanId)}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      className="history-row"
                    >
                      {/* Date & Scan ID */}
                      <td style={{ padding: '12px' }}>
                        <div style={{ color: '#FFF8FF', fontWeight: 500, fontSize: '0.8rem' }}>
                          {dateStr}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#F8D299', marginTop: '2px' }}>
                          {scanId}
                        </div>
                      </td>

                      {/* Subject & Sender */}
                      <td style={{ padding: '12px', maxWidth: '320px' }}>
                        <div
                          style={{
                            color: '#FFF8FF',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={scan.subject}
                        >
                          {scan.subject || 'No subject line'}
                        </div>
                        <div
                          style={{
                            fontSize: '0.74rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '2px'
                          }}
                        >
                          {scan.sender ? `From: ${scan.sender}` : scan.body_snippet ? scan.body_snippet.slice(0, 45) + '...' : ''}
                        </div>
                      </td>

                      {/* Prediction Badge */}
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${isSpam ? 'badge-spam' : isReview ? 'badge-review' : 'badge-legit'}`}>
                          {scan.prediction}
                        </span>
                      </td>

                      {/* Model Probability & Threat Score */}
                      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)' }}>
                        <div style={{ color: isSpam ? '#F59E51' : isReview ? '#F8D299' : '#E2C9FB', fontWeight: 700 }}>
                          {isSpam ? `${spamPct}% Spam` : `${hamPct}% Legit`}
                        </div>
                        {scan.threat_score && (
                          <div style={{ fontSize: '0.72rem', color: scan.threat_score.color, fontWeight: 700, marginTop: '2px' }}>
                            Threat: {scan.threat_score.score}/100 ({scan.threat_score.band})
                          </div>
                        )}
                      </td>

                      {/* Threat X-Ray Findings */}
                      <td style={{ padding: '12px' }}>
                        {warningCount > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#F87171',
                              fontWeight: 600
                            }}
                          >
                            <AlertTriangle size={11} />
                            {warningCount} Warning{warningCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(22, 163, 74, 0.15)',
                              border: '1px solid rgba(22, 163, 74, 0.3)',
                              color: '#4ADE80',
                              fontWeight: 600
                            }}
                          >
                            <ShieldCheck size={11} />
                            Clean Audit
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(scanId);
                            }}
                            className="btn-glass"
                            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            title="View original saved scan details"
                          >
                            <Eye size={12} style={{ marginRight: '4px' }} />
                            View
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedScanForGraph(scan);
                            }}
                            className="btn-glass"
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              color: '#F8D299',
                              borderColor: 'rgba(248, 210, 153, 0.3)'
                            }}
                            title="View individual probability graph"
                          >
                            <BarChart3 size={12} style={{ marginRight: '4px' }} />
                            Graph
                          </button>

                          <button
                            onClick={(e) => handleDownloadPdf(scanId, e)}
                            disabled={isDownloading}
                            className="btn-glass"
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              color: '#F8D299',
                              borderColor: 'rgba(248, 210, 153, 0.3)'
                            }}
                            title="Download PDF Security Report"
                          >
                            {isDownloading ? (
                              <RefreshCw size={12} className="spin" />
                            ) : (
                              <>
                                <FileDown size={12} style={{ marginRight: '4px' }} />
                                PDF
                              </>
                            )}
                          </button>

                          <button
                            onClick={(e) => handleDelete(scanId, e)}
                            className="btn-glass"
                            style={{ padding: '4px 7px', fontSize: '0.72rem', color: '#FC8181' }}
                            title="Delete this record"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. Original Saved Scan Detail Modal (Requirement: Clicking a record shows original result, NOT rerun classifier) */}
      {selectedScan && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 3, 20, 0.8)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedScan(null)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '88vh',
              overflowY: 'auto',
              backgroundColor: 'rgba(26, 11, 46, 0.95)',
              border: '1px solid rgba(248, 210, 153, 0.3)',
              borderRadius: '16px',
              padding: '28px',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Sparkles size={14} color="#F8D299" />
                  <span style={{ fontSize: '0.74rem', color: '#F8D299', fontWeight: 600, textTransform: 'uppercase' }}>
                    Historical Audit Record
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', color: '#FFF8FF', margin: 0, fontWeight: 700 }}>
                  Scan Details ({selectedScan.id || selectedScan.scan_id})
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Recorded on: {selectedScan.timestamp || 'Unknown date'}
                </span>
              </div>

              <button
                onClick={() => setSelectedScan(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Classification Outcome Banner */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  backgroundColor:
                    selectedScan.prediction === 'SPAM'
                      ? 'rgba(245, 158, 81, 0.15)'
                      : selectedScan.prediction === 'LEGITIMATE'
                      ? 'rgba(128, 74, 138, 0.25)'
                      : 'rgba(248, 210, 153, 0.15)',
                  border: `1px solid ${
                    selectedScan.prediction === 'SPAM'
                      ? 'rgba(245, 158, 81, 0.4)'
                      : selectedScan.prediction === 'LEGITIMATE'
                      ? 'rgba(128, 74, 138, 0.5)'
                      : 'rgba(248, 210, 153, 0.4)'
                  }`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Original Classification
                  </span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF8FF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedScan.prediction === 'SPAM' ? (
                      <ShieldAlert size={22} color="#F59E51" />
                    ) : (
                      <ShieldCheck size={22} color="#E2C9FB" />
                    )}
                    {selectedScan.prediction}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Spam Probability</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8D299', fontFamily: 'var(--font-mono)' }}>
                    {(selectedScan.spam_probability * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Subject & Sender Meta */}
              <div style={{ padding: '14px 18px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#F8D299', fontSize: '0.78rem' }}>Subject: </strong>
                  <span style={{ color: '#FFF8FF', fontSize: '0.85rem' }}>{selectedScan.subject || 'None'}</span>
                </div>
                {selectedScan.sender && (
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#F8D299', fontSize: '0.78rem' }}>Sender: </strong>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{selectedScan.sender}</span>
                  </div>
                )}
                {selectedScan.body_snippet && (
                  <div>
                    <strong style={{ color: '#F8D299', fontSize: '0.78rem' }}>Content Excerpt: </strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                      "{selectedScan.body_snippet}"
                    </span>
                  </div>
                )}
              </div>

              {/* Saved Threat X-Ray Findings */}
              <div>
                <h4 style={{ fontSize: '0.88rem', color: '#FFF8FF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={14} color="#F8D299" />
                  Threat X-Ray Forensic Indicators
                </h4>

                {selectedScan.threat_xray?.has_warning_signs && selectedScan.threat_xray.detected_phrases?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedScan.threat_xray.detected_phrases.map((sign: ThreatXRaySign, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid ${sign.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 81, 0.3)'}`,
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ color: '#FFF8FF', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                            "{sign.phrase}"
                          </span>
                          <span style={{ fontSize: '0.7rem', color: sign.severity === 'HIGH' ? '#FC8181' : '#F59E51', fontWeight: 700 }}>
                            {sign.severity} SEVERITY
                          </span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
                          {sign.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'rgba(22, 163, 74, 0.1)', border: '1px solid rgba(22, 163, 74, 0.3)', color: '#4ADE80', fontSize: '0.8rem' }}>
                    ✓ Clean Audit — No suspicious credential, urgency, OTP, or suspension indicators were detected.
                  </div>
                )}
              </div>

              {/* Saved Bayesian Mathematical Breakdown */}
              {selectedScan.bayes_breakdown && (
                <div style={{ padding: '14px 18px', borderRadius: '10px', backgroundColor: 'rgba(36, 16, 63, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <h4 style={{ fontSize: '0.84rem', color: '#F8D299', marginBottom: '8px' }}>
                    Original Bayesian Likelihoods
                  </h4>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>Prior P(Spam): {selectedScan.bayes_breakdown.p_prior_spam ?? 0.4906} | Prior P(Ham): {selectedScan.bayes_breakdown.p_prior_ham ?? 0.5094}</div>
                    {selectedScan.bayes_breakdown.joint_log_spam !== undefined && (
                      <div>Joint Log Spam: {selectedScan.bayes_breakdown.joint_log_spam} | Joint Log Ham: {selectedScan.bayes_breakdown.joint_log_ham}</div>
                    )}
                    <div>Tokens Analyzed: {selectedScan.bayes_breakdown.tokens_count ?? selectedScan.vocabulary_tokens_found ?? 0} vocabulary token(s)</div>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedScan(null)}
                  className="btn-glass"
                  style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedScanForGraph(selectedScan);
                  }}
                  className="btn-glass"
                  style={{ padding: '8px 18px', fontSize: '0.82rem', color: '#F8D299', borderColor: 'rgba(248, 210, 153, 0.35)' }}
                >
                  <BarChart3 size={14} style={{ marginRight: '6px' }} />
                  View Probability Graph
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedScan.id || selectedScan.scan_id || '')}
                  disabled={downloadingId === (selectedScan.id || selectedScan.scan_id)}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.82rem' }}
                >
                  <FileDown size={14} />
                  {downloadingId === (selectedScan.id || selectedScan.scan_id) ? 'Generating PDF...' : 'Download Official PDF Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Probability Graph Modal */}
      {selectedScanForGraph && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 3, 20, 0.82)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
          onClick={() => setSelectedScanForGraph(null)}
        >
          <div
            style={{
              maxWidth: '820px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedScanForGraph(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(26, 11, 46, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFF8FF',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
                Close Graph
              </button>
            </div>
            <EmailProbabilityGraph
              scan={selectedScanForGraph}
              isModal={true}
              onClose={() => setSelectedScanForGraph(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
