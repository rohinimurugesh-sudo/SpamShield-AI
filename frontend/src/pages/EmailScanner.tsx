import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  Zap,
  RotateCcw,
  Sparkles,
  Check,
  X,
  ThumbsUp,
  CheckCircle2,
  ScanLine,
  Key,
  Gift,
  Clock,
  ExternalLink,
  AlertTriangle,
  Cpu,
  FileText,
  Shield,
  AlertOctagon,
  FileDown,
  RefreshCw
} from 'lucide-react';
import { ClassificationResult } from '../types';
import { classifyEmailApi, submitFeedbackApi, downloadPdfReportApi, generateInstantPdfApi } from '../services/api';
import { ConditionalProbabilityVisualizer } from '../components/ConditionalProbabilityVisualizer';
import { EmailProbabilityGraph } from '../components/EmailProbabilityGraph';
import { ThreatScoreWidget } from '../components/ThreatScoreWidget';

const QUICK_SAMPLES = [
  {
    label: 'Unexpected Prize',
    subject: 'CONGRATULATIONS: You have won a prize of $25,000 in our international sweepstakes!',
    sender: 'rewards-dept@sweepstakes-winner.xyz',
    body: 'Dear lucky winner, you have won a prize in our exclusive giveaway! Claim now by clicking this link or verify your password at http://claim-funds.xyz immediately to process the wire transfer of your cash prize.'
  },
  {
    label: 'Password & OTP Alert',
    subject: 'URGENT: Security alert - Verify your password & confirm your OTP immediately',
    sender: 'account-security@bank-alert-verify.info',
    body: 'Dear customer, unauthorized activity was detected on your account. Your account has been suspended! Please verify your password and confirm your OTP at http://192.168.1.105/auth within 24 hours to prevent permanent account suspension.'
  },
  {
    label: 'Normal College Email',
    subject: 'Project Meeting & Action Items Sync',
    sender: 'prof.sharma@university.edu',
    body: 'Hi team, please find attached the meeting minutes and project notes from our discussion today. Reminder that our weekly review is scheduled for tomorrow at 2 PM in Room 402.'
  },
  {
    label: 'Borderline Review',
    subject: 'Campus password security update',
    sender: 'it-security@university.edu',
    body: 'Security update: Annual password policy update for university accounts.'
  }
];

export const EmailScanner: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [sender, setSender] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Preserved content for Threat X-Ray display
  const [scannedBody, setScannedBody] = useState('');
  const [scannedSubject, setScannedSubject] = useState('');

  // Prediction Feedback state
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState<'Spam' | 'Not Spam' | null>(null);
  const [correctionComment, setCorrectionComment] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const handleDownloadPdfReport = async () => {
    if (!result) return;
    setIsPdfGenerating(true);
    try {
      if (result.scan_id) {
        await downloadPdfReportApi(result.scan_id);
      } else {
        await generateInstantPdfApi(result);
      }
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleSelectSample = (sample: typeof QUICK_SAMPLES[0]) => {
    setSubject(sample.subject);
    setSender(sample.sender);
    setBody(sample.body);
    setErrorMsg('');
  };

  const handleClear = () => {
    setSubject('');
    setSender('');
    setBody('');
    setScannedBody('');
    setScannedSubject('');
    setResult(null);
    setErrorMsg('');
    resetFeedbackState();
  };

  const resetFeedbackState = () => {
    setFeedbackSubmitted(false);
    setFeedbackMessage('');
    setShowCorrectionForm(false);
    setSelectedCorrection(null);
    setCorrectionComment('');
  };

  const handleAnalyse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!body.trim()) {
      setErrorMsg('Please enter an email body to analyse.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    resetFeedbackState();
    setScannedBody(body);
    setScannedSubject(subject);

    try {
      const res = await classifyEmailApi(body, subject, sender);
      setResult(res);
    } catch {
      setErrorMsg('Classification failed. Please check your backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Safe Text Highlighter for Threat X-Ray (100% XSS-Safe, pure string children)
  const renderHighlightedEmailText = (content: string, highlightPhrases?: string[]) => {
    if (!content) return null;
    if (!highlightPhrases || highlightPhrases.length === 0) {
      return <span>{content}</span>;
    }

    // Filter valid phrases and sort by length descending to match longest phrases first
    const cleanPhrases = Array.from(new Set(highlightPhrases))
      .map(p => p.trim())
      .filter(p => p.length > 1)
      .sort((a, b) => b.length - a.length);

    if (cleanPhrases.length === 0) {
      return <span>{content}</span>;
    }

    const escaped = cleanPhrases.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');

    const parts = content.split(regex);

    return (
      <>
        {parts.map((part, idx) => {
          const isMatch = cleanPhrases.some(p => p.toLowerCase() === part.toLowerCase());
          if (isMatch) {
            return (
              <mark
                key={idx}
                className="xray-highlight"
                title={`Suspicious phrase / indicator: "${part}"`}
              >
                {part}
              </mark>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </>
    );
  };

  const renderSignIcon = (iconType: string) => {
    switch (iconType) {
      case 'key':
        return <Key size={16} color="#FC8181" style={{ flexShrink: 0 }} />;
      case 'gift':
        return <Gift size={16} color="#F59E51" style={{ flexShrink: 0 }} />;
      case 'clock':
        return <Clock size={16} color="#F8D299" style={{ flexShrink: 0 }} />;
      case 'link':
        return <ExternalLink size={16} color="#F59E51" style={{ flexShrink: 0 }} />;
      case 'alert':
        return <AlertTriangle size={16} color="#FC8181" style={{ flexShrink: 0 }} />;
      case 'cpu':
        return <Cpu size={16} color="#E2C9FB" style={{ flexShrink: 0 }} />;
      default:
        return <AlertOctagon size={16} color="#F59E51" style={{ flexShrink: 0 }} />;
    }
  };

  // Feedback: User confirms prediction is Correct
  const handleFeedbackCorrect = async () => {
    if (!result) return;
    setFeedbackLoading(true);
    try {
      const resp = await submitFeedbackApi({
        scan_id: result.scan_id || `SCAN-${Date.now().toString(36).toUpperCase()}`,
        original_prediction: result.prediction,
        model_probability: result.spam_probability,
        feedback_type: 'CORRECT',
        corrected_category: null,
        comment: 'User verified as correct classification.'
      });
      setFeedbackSubmitted(true);
      setFeedbackMessage(resp.message || 'Thank you! Confirmation saved in database.');
    } catch {
      setFeedbackMessage('Failed to save feedback. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Feedback: User reports prediction is Wrong and provides correction
  const handleFeedbackWrongSubmit = async () => {
    if (!result || !selectedCorrection) return;
    setFeedbackLoading(true);
    try {
      const resp = await submitFeedbackApi({
        scan_id: result.scan_id || `SCAN-${Date.now().toString(36).toUpperCase()}`,
        original_prediction: result.prediction,
        model_probability: result.spam_probability,
        feedback_type: 'WRONG',
        corrected_category: selectedCorrection,
        comment: correctionComment
      });
      setFeedbackSubmitted(true);
      setFeedbackMessage(
        `Correction saved! Scan #${result.scan_id} logged as "${selectedCorrection}". Queued for admin verification.`
      );
      setShowCorrectionForm(false);
    } catch {
      setFeedbackMessage('Failed to save correction.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const isSpam = result?.prediction === 'SPAM';
  const isReview = result?.prediction === 'NEEDS REVIEW';
  const spamPct = result ? (result.spam_probability * 100).toFixed(1) : '0';
  const hamPct = result ? (result.ham_probability * 100).toFixed(1) : '0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '860px', margin: '0 auto' }}>
      {/* Sample Quick-Fill Buttons */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          backgroundColor: 'rgba(36, 16, 63, 0.4)'
        }}
      >
        <span style={{ fontSize: '0.8rem', color: '#F8D299', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={13} /> Try Sample Email:
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {QUICK_SAMPLES.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectSample(sample)}
              className="btn-glass"
              style={{
                fontSize: '0.78rem',
                padding: '5px 12px',
                borderRadius: '8px'
              }}
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form Card */}
      <div className="glass-panel" style={{ padding: '30px 36px' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#FFF8FF', marginBottom: '18px' }}>
          Scan an Email
        </h3>

        <form onSubmit={handleAnalyse} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Subject Line
            </label>
            <input
              type="text"
              placeholder="e.g. Action Required: Account Notification..."
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="glass-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Sender Email <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. sender@example.com"
              value={sender}
              onChange={e => setSender(e.target.value)}
              className="glass-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Email Body <span style={{ color: '#F59E51' }}>*</span>
            </label>
            <textarea
              rows={6}
              placeholder="Paste email text here to classify with Naive Bayes and inspect with Threat X-Ray..."
              value={body}
              onChange={e => setBody(e.target.value)}
              className="glass-input"
              style={{ resize: 'vertical' }}
            />
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#FC8181',
                fontSize: '0.82rem'
              }}
            >
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{ flex: 1, padding: '12px' }}
            >
              <Zap size={16} />
              {isLoading ? 'Analysing with Threat X-Ray...' : 'Analyse Email'}
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="btn-glass"
              style={{ padding: '12px 18px' }}
            >
              <RotateCcw size={15} />
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Result Panel */}
      {result && (
        <div
          className="glass-panel"
          style={{
            padding: '30px 36px',
            border: `1px solid ${
              isSpam
                ? 'rgba(239, 68, 68, 0.45)'
                : isReview
                ? 'rgba(245, 158, 81, 0.45)'
                : 'rgba(16, 185, 129, 0.45)'
            }`
          }}
        >
          {/* Result Badge Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Classification Result:
              </span>
              <span
                className={`badge ${isSpam ? 'badge-spam' : isReview ? 'badge-review' : 'badge-legit'}`}
                style={{ fontSize: '0.92rem', padding: '6px 16px' }}
              >
                {isSpam && <ShieldAlert size={16} />}
                {!isSpam && !isReview && <ShieldCheck size={16} />}
                {isReview && <HelpCircle size={16} />}
                {isSpam ? 'SPAM' : isReview ? 'UNCERTAIN (NEEDS REVIEW)' : 'NOT SPAM'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleDownloadPdfReport}
                disabled={isPdfGenerating}
                className="btn-glass"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  color: '#F8D299',
                  borderColor: 'rgba(248, 210, 153, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Download Official PDF Security Audit Report"
              >
                {isPdfGenerating ? (
                  <RefreshCw size={13} className="spin" />
                ) : (
                  <FileDown size={14} color="#F8D299" />
                )}
                {isPdfGenerating ? 'Generating PDF...' : 'Download PDF Report'}
              </button>

              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Scan: {result.scan_id}
              </span>
            </div>
          </div>

          {/* Two Simple Probability Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            {/* Spam Probability Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Spam Probability</span>
                <strong style={{ color: isSpam ? '#FC8181' : '#F59E51', fontFamily: 'var(--font-mono)' }}>{spamPct}%</strong>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${spamPct}%`,
                    height: '100%',
                    backgroundColor: isSpam ? '#EF4444' : '#F59E51',
                    borderRadius: '4px',
                    transition: 'width 0.6s ease'
                  }}
                />
              </div>
            </div>

            {/* Not Spam Probability Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Not Spam Probability</span>
                <strong style={{ color: !isSpam && !isReview ? '#68D391' : '#E2C9FB', fontFamily: 'var(--font-mono)' }}>{hamPct}%</strong>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${hamPct}%`,
                    height: '100%',
                    backgroundColor: !isSpam && !isReview ? '#10B981' : '#804A8A',
                    borderRadius: '4px',
                    transition: 'width 0.6s ease'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Explainable AI: Important Words Found & How They Influenced Result */}
          <div
            style={{
              padding: '18px 22px',
              borderRadius: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <h4 style={{ fontSize: '0.9rem', color: '#FFF8FF', marginBottom: '8px' }}>
              Why this result was chosen (Explainable AI)
            </h4>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
              {result.natural_explanation}
            </p>

            {/* Word Chips */}
            {result.influential_words && result.influential_words.length > 0 && (
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Important words that influenced the prediction:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {result.influential_words.slice(0, 8).map((item, idx) => {
                    const wordIsSpam = item.leaning === 'SPAM';
                    return (
                      <span
                        key={idx}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 500,
                          backgroundColor: wordIsSpam ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          border: `1px solid ${wordIsSpam ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
                          color: wordIsSpam ? '#FC8181' : '#68D391'
                        }}
                      >
                        {item.word} {wordIsSpam ? '→ Spam' : '→ Safe'}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Threat Score Widget (0 - 100) */}
          <div style={{ marginTop: '24px' }}>
            <ThreatScoreWidget
              threatScore={result.threat_score}
              spamProbability={result.spam_probability}
            />
          </div>

          {/* NEW FEATURE: THREAT X-RAY (Requirements 1, 2, 3, 5, 6, 7) */}
          <div
            style={{
              marginTop: '24px',
              padding: '24px 28px',
              borderRadius: '16px',
              backgroundColor: 'rgba(28, 12, 54, 0.65)',
              border: '1px solid rgba(248, 210, 153, 0.3)',
              boxShadow: '0 8px 32px rgba(16, 7, 34, 0.4)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(245, 158, 81, 0.2)',
                    border: '1px solid rgba(245, 158, 81, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ScanLine size={20} color="#F59E51" />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', color: '#FFF8FF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Threat X-Ray
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Transparent heuristic security inspection & highlighted phrase analysis
                  </p>
                </div>
              </div>

              {/* Counter badge */}
              <span
                className={result.threat_xray?.has_warning_signs ? 'xray-sev-med' : 'xray-sev-low'}
                style={{ padding: '5px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {result.threat_xray?.has_warning_signs ? (
                  <>
                    <AlertTriangle size={13} />
                    {result.threat_xray.warning_count} Warning Sign{result.threat_xray.warning_count > 1 ? 's' : ''} Detected
                  </>
                ) : (
                  <>
                    <ShieldCheck size={13} color="#68D391" />
                    No Common Warning Signs Detected
                  </>
                )}
              </span>
            </div>

            {/* Email Content Viewer with Noticeable Highlighting (Req 2) */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: '#F8D299', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} /> Scanned Email Content & Phrase Highlights:
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Highlighted words triggered security rules or Naive Bayes spam priors
                </span>
              </div>

              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(15, 7, 30, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.86rem',
                  lineHeight: 1.65,
                  color: 'var(--text-main)',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  fontFamily: 'var(--font-body)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {scannedSubject && (
                  <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.07)' }}>
                    <strong style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Subject: </strong>
                    {renderHighlightedEmailText(scannedSubject, result.threat_xray?.highlight_phrases)}
                  </div>
                )}
                <div>
                  {renderHighlightedEmailText(scannedBody || body, result.threat_xray?.highlight_phrases)}
                </div>
              </div>
            </div>

            {/* Explanation Panel: "Why was this email flagged?" (Req 3) */}
            <div style={{ marginBottom: '22px' }}>
              <h5 style={{ fontSize: '0.9rem', color: '#FFF8FF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <HelpCircle size={15} color="#F8D299" />
                Why was this email flagged?
              </h5>

              {result.threat_xray?.has_warning_signs && result.threat_xray.detected_phrases.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.threat_xray.detected_phrases.map((sign, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${
                          sign.severity === 'HIGH'
                            ? 'rgba(239, 68, 68, 0.3)'
                            : sign.severity === 'MEDIUM'
                            ? 'rgba(245, 158, 81, 0.3)'
                            : 'rgba(128, 74, 138, 0.3)'
                        }`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {renderSignIcon(sign.icon_type)}
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              color: '#FFF8FF',
                              backgroundColor: 'rgba(0,0,0,0.3)',
                              padding: '2px 8px',
                              borderRadius: '5px'
                            }}
                          >
                            "{sign.phrase}"
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            ({sign.category})
                          </span>
                        </div>

                        <span
                          className={
                            sign.severity === 'HIGH'
                              ? 'xray-sev-high'
                              : sign.severity === 'MEDIUM'
                              ? 'xray-sev-med'
                              : 'xray-sev-low'
                          }
                        >
                          {sign.severity} SEVERITY
                        </span>
                      </div>

                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, paddingLeft: '24px' }}>
                        {sign.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                /* If no warning signs are detected (Req 3 exact wording) */
                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <ShieldCheck size={24} color="#68D391" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.86rem', color: '#68D391', fontWeight: 600 }}>
                      No common warning signs were detected. This does not guarantee that the email is safe.
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      The text does not contain common phishing triggers, credential theft requests, artificial urgency, or suspicious link redirects.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Safety Recommendation: "Recommended Action" (Req 5) */}
            <div
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <h5 style={{ fontSize: '0.86rem', color: '#F8D299', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Shield size={14} color="#F8D299" />
                Recommended Action
              </h5>
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {result.threat_xray?.recommended_actions && result.threat_xray.recommended_actions.length > 0 ? (
                  result.threat_xray.recommended_actions.map((action, idx) => (
                    <li key={idx}>{action}</li>
                  ))
                ) : (
                  <>
                    <li>Avoid clicking suspicious links or downloading unexpected attachments.</li>
                    <li>Verify unexpected prize offers or financial rewards through official channels.</li>
                    <li>Never share passwords, PINs, or OTPs in response to an unsolicited email.</li>
                    <li>Always remain cautious with unexpected messages from unknown senders.</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* INDIVIDUAL PROBABILITY GRAPH FOR THIS EMAIL DETECTION (Requirement 3 & 4) */}
          <div style={{ marginTop: '22px' }}>
            <EmailProbabilityGraph scan={result} />
          </div>

          {/* Conditional Probability Visualizer (Extended Theory & Feature Likelihood Breakdown) */}
          <div style={{ marginTop: '22px' }}>
            <ConditionalProbabilityVisualizer
              currentScan={result}
              showQuickTestButtons={false}
            />
          </div>

          {/* Prediction Feedback & Error Correction (Preserved) */}
          <div
            style={{
              marginTop: '22px',
              padding: '20px 24px',
              borderRadius: '14px',
              backgroundColor: 'rgba(58, 3, 83, 0.3)',
              border: '1px solid rgba(248, 210, 153, 0.25)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <div>
                <h4 style={{ fontSize: '0.92rem', color: '#FFF8FF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ThumbsUp size={15} color="#F8D299" />
                  Prediction Feedback & Error Correction
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Was this prediction accurate? Help verify and calibrate our model.
                </p>
              </div>
            </div>

            {!feedbackSubmitted ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleFeedbackCorrect}
                    disabled={feedbackLoading}
                    className="btn-glass"
                    style={{
                      padding: '8px 18px',
                      fontSize: '0.82rem',
                      borderColor: 'rgba(176, 133, 214, 0.4)',
                      color: '#E2C9FB'
                    }}
                  >
                    <Check size={14} style={{ marginRight: '6px' }} />
                    Correct Prediction
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCorrectionForm(!showCorrectionForm)}
                    disabled={feedbackLoading}
                    className="btn-glass"
                    style={{
                      padding: '8px 18px',
                      fontSize: '0.82rem',
                      borderColor: 'rgba(245, 158, 81, 0.4)',
                      color: '#F59E51'
                    }}
                  >
                    <X size={14} style={{ marginRight: '6px' }} />
                    Wrong Prediction
                  </button>
                </div>

                {/* Sub-form when user reports "Wrong Prediction" */}
                {showCorrectionForm && (
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '16px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(22, 11, 45, 0.65)',
                      border: '1px solid rgba(248, 210, 153, 0.2)'
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: '#F8D299', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                      Select the actual correct category:
                    </span>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedCorrection('Spam')}
                        className={selectedCorrection === 'Spam' ? 'btn-primary' : 'btn-glass'}
                        style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                      >
                        Actual Category: Spam
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCorrection('Not Spam')}
                        className={selectedCorrection === 'Not Spam' ? 'btn-primary' : 'btn-glass'}
                        style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                      >
                        Actual Category: Not Spam
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Optional note (e.g. promotional notification, invoice false positive)..."
                        value={correctionComment}
                        onChange={e => setCorrectionComment(e.target.value)}
                        className="glass-input"
                        style={{ flex: 1, fontSize: '0.82rem', padding: '8px 12px' }}
                      />
                      <button
                        type="button"
                        onClick={handleFeedbackWrongSubmit}
                        disabled={!selectedCorrection || feedbackLoading}
                        className="btn-primary"
                        style={{ padding: '8px 18px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                      >
                        {feedbackLoading ? 'Saving...' : 'Submit Correction'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Success Message Banner (Requirement 4) */
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(248, 210, 153, 0.15)',
                  border: '1px solid rgba(248, 210, 153, 0.35)',
                  color: '#F8D299',
                  fontSize: '0.84rem',
                  fontWeight: 500
                }}
              >
                <CheckCircle2 size={18} color="#F8D299" />
                <span>{feedbackMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
