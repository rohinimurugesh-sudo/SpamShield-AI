import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  BarChart3,
  Download,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  X,
  Mail,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import { ClassificationResult } from '../types';
import { fetchScanHistory, downloadPdfReportApi } from '../services/api';
import { EmailProbabilityGraph } from '../components/EmailProbabilityGraph';
import { PageId } from '../components/Sidebar';

interface ReportsProps {
  onNavigate?: (page: PageId) => void;
}

export const Reports: React.FC<ReportsProps> = ({ onNavigate }) => {
  const [reports, setReports] = useState<ClassificationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SPAM' | 'HAM'>('ALL');
  const [selectedScanForGraph, setSelectedScanForGraph] = useState<ClassificationResult | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Load reports from saved scan history
  const loadReports = async () => {
    setLoading(true);
    try {
      const filterParam = filterType === 'ALL' ? '' : (filterType === 'SPAM' ? 'SPAM' : 'LEGITIMATE');
      const res = await fetchScanHistory(searchTerm, filterParam);
      setReports(res.scans || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [filterType]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadReports();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Listen for new scans added across app
  useEffect(() => {
    const handleUpdate = () => loadReports();
    window.addEventListener('spamshield_scan_updated', handleUpdate);
    return () => window.removeEventListener('spamshield_scan_updated', handleUpdate);
  }, []);

  // Format timestamp helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Download PDF Report action
  const handleDownloadPdf = async (scan: ClassificationResult) => {
    const scanId = scan.id || scan.scan_id;
    if (!scanId) return;

    setDownloadingId(scanId);
    try {
      await downloadPdfReportApi(scanId, scan.subject);
    } catch (err) {
      alert('Could not download PDF report. Please verify the backend is running.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <section
        className="glass-panel"
        style={{
          padding: '24px 28px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(58, 3, 83, 0.45) 0%, rgba(26, 11, 46, 0.7) 100%)',
          border: '1px solid rgba(248, 210, 153, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '8px',
                backgroundColor: 'rgba(248, 210, 153, 0.15)',
                border: '1px solid rgba(248, 210, 153, 0.3)',
                color: '#F8D299',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              <FileText size={13} />
              Security Audit Dossiers & Probability Graphs
            </span>
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#FFF8FF' }}>
            Email Security Reports
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '680px' }}>
            Browse previously completed email scans. Each detection features its own dedicated probability graph,
            actual model confidence metrics, and downloadable PDF reports.
          </p>
        </div>

        <button
          onClick={loadReports}
          className="btn-glass"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            fontSize: '0.84rem',
            color: '#F8D299'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Reports
        </button>
      </section>

      {/* Persistent Storage Notice Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 18px',
          borderRadius: '12px',
          backgroundColor: 'rgba(26, 11, 46, 0.55)',
          border: '1px solid rgba(128, 74, 138, 0.3)',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)'
        }}
      >
        <Database size={16} color="#F8D299" style={{ flexShrink: 0 }} />
        <span>
          <b style={{ color: '#F8D299' }}>Persistent Audit Storage:</b> Reports and individual probability graphs are
          saved in persistent SQLite storage. All metrics, probability scores, and graphs reflect original analysis
          results without rerunning the model.
        </span>
      </div>

      {/* Search & Filter Controls */}
      <section
        className="glass-panel"
        style={{
          padding: '18px 24px',
          borderRadius: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '440px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          <input
            type="text"
            placeholder="Search reports by subject or sender..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 7, 34, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFF8FF',
              fontSize: '0.84rem'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterType('ALL')}
            className={filterType === 'ALL' ? 'btn-primary' : 'btn-glass'}
            style={{ padding: '8px 18px', fontSize: '0.82rem' }}
          >
            All Scans ({totalCount})
          </button>
          <button
            onClick={() => setFilterType('SPAM')}
            className={filterType === 'SPAM' ? 'btn-primary' : 'btn-glass'}
            style={{
              padding: '8px 18px',
              fontSize: '0.82rem',
              borderColor: filterType === 'SPAM' ? undefined : 'rgba(239, 68, 68, 0.3)',
              color: filterType === 'SPAM' ? undefined : '#FC8181'
            }}
          >
            Spam
          </button>
          <button
            onClick={() => setFilterType('HAM')}
            className={filterType === 'HAM' ? 'btn-primary' : 'btn-glass'}
            style={{
              padding: '8px 18px',
              fontSize: '0.82rem',
              borderColor: filterType === 'HAM' ? undefined : 'rgba(16, 185, 129, 0.3)',
              color: filterType === 'HAM' ? undefined : '#68D391'
            }}
          >
            Not Spam
          </button>
        </div>
      </section>

      {/* Reports Table / List */}
      <section
        className="glass-panel"
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
          padding: '0'
        }}
      >
        {loading && reports.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <p>Loading security reports and probability data...</p>
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <FileText size={42} color="var(--text-muted)" style={{ margin: '0 auto 14px', opacity: 0.5 }} />
            <h4 style={{ fontSize: '1.1rem', color: '#FFF8FF', marginBottom: '8px' }}>
              No Email Reports Found
            </h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 20px' }}>
              {searchTerm || filterType !== 'ALL'
                ? 'No saved reports match your search query or filter.'
                : 'No emails have been scanned yet. Scan an email in the Email Scanner to generate persistent reports and probability graphs.'}
            </p>
            {onNavigate && (
              <button
                onClick={() => onNavigate('scanner')}
                className="btn-primary"
                style={{ padding: '10px 24px', fontSize: '0.86rem' }}
              >
                Scan An Email Now
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'rgba(26, 11, 46, 0.85)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#E2C9FB'
                  }}
                >
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Scan ID</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Email Subject</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Predicted Result</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Spam Prob.</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Not Spam Prob.</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((scan, idx) => {
                  const scanId = scan.id || scan.scan_id || `SCAN-${idx}`;
                  const isSpam = scan.prediction === 'SPAM';
                  const isReview = scan.prediction === 'NEEDS REVIEW';
                  const isLegit = !isSpam && !isReview;

                  const spamPct = typeof scan.spam_probability === 'number'
                    ? (scan.spam_probability * 100).toFixed(1)
                    : '50.0';

                  const hamPct = typeof scan.ham_probability === 'number'
                    ? (scan.ham_probability * 100).toFixed(1)
                    : '50.0';

                  return (
                    <tr
                      key={scanId}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        backgroundColor: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(128, 74, 138, 0.12)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'transparent';
                      }}
                    >
                      {/* Scan ID */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            color: '#F8D299'
                          }}
                        >
                          {scanId}
                        </span>
                      </td>

                      {/* Date and Time */}
                      <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {formatDate(scan.timestamp)}
                      </td>

                      {/* Email Subject */}
                      <td style={{ padding: '16px 20px', maxWidth: '320px' }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: '#FFF8FF',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={scan.subject || 'No subject line'}
                        >
                          {scan.subject || 'No Subject'}
                        </div>
                        {scan.sender && (
                          <div
                            style={{
                              fontSize: '0.74rem',
                              color: 'var(--text-muted)',
                              marginTop: '2px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            From: {scan.sender}
                          </div>
                        )}
                      </td>

                      {/* Predicted Result: Spam or Not Spam */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            borderRadius: '999px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            backgroundColor: isSpam
                              ? 'rgba(239, 68, 68, 0.18)'
                              : isLegit
                              ? 'rgba(16, 185, 129, 0.18)'
                              : 'rgba(245, 158, 81, 0.18)',
                            border: `1px solid ${
                              isSpam
                                ? 'rgba(239, 68, 68, 0.4)'
                                : isLegit
                                ? 'rgba(16, 185, 129, 0.4)'
                                : 'rgba(245, 158, 81, 0.4)'
                            }`,
                            color: isSpam ? '#FC8181' : isLegit ? '#68D391' : '#F8D299'
                          }}
                        >
                          {isSpam ? <ShieldAlert size={12} /> : isLegit ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
                          {isSpam ? 'Spam' : isLegit ? 'Not Spam' : 'Review'}
                        </span>
                        {scan.threat_score && (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: scan.threat_score.color,
                              fontWeight: 700,
                              marginTop: '4px',
                              fontFamily: 'var(--font-mono, monospace)'
                            }}
                          >
                            Threat: {scan.threat_score.score}/100 ({scan.threat_score.band})
                          </div>
                        )}
                      </td>

                      {/* Spam Probability */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono, monospace)',
                              fontWeight: 700,
                              color: isSpam ? '#F59E51' : 'var(--text-secondary)'
                            }}
                          >
                            {spamPct}%
                          </span>
                        </div>
                      </td>

                      {/* Not Spam Probability */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono, monospace)',
                              fontWeight: 700,
                              color: isLegit ? '#68D391' : 'var(--text-secondary)'
                            }}
                          >
                            {hamPct}%
                          </span>
                        </div>
                      </td>

                      {/* Actions: View Graph & Download PDF Report */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          {/* View Graph Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedScanForGraph(scan)}
                            className="btn-glass"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              fontSize: '0.78rem',
                              color: '#F8D299',
                              borderColor: 'rgba(248, 210, 153, 0.35)',
                              cursor: 'pointer'
                            }}
                            title="View probability graph for this detection"
                          >
                            <BarChart3 size={14} color="#F8D299" />
                            View Graph
                          </button>

                          {/* Download PDF Report Button */}
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(scan)}
                            disabled={downloadingId === scanId}
                            className="btn-glass"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              fontSize: '0.78rem',
                              color: '#E2C9FB',
                              borderColor: 'rgba(176, 133, 214, 0.35)',
                              cursor: 'pointer'
                            }}
                            title="Download official PDF audit report"
                          >
                            <Download size={14} />
                            {downloadingId === scanId ? 'Exporting...' : 'PDF'}
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

      {/* Probability Graph Modal (Requirement 3 & 6) */}
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
            {/* Modal Close Button Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '10px'
              }}
            >
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

            {/* Individual Email Probability Graph Card */}
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
