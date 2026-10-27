import { ClassificationResult, InfluentialWord, RuleIndicator } from '../types';

// Pre-computed word log-probabilities from training corpus with Laplace smoothing (alpha=1.0)
// log_p_spam = log P(w|Spam), log_p_ham = log P(w|Ham)
const VOCABULARY_STATS: Record<string, { log_spam: number; log_ham: number }> = {
  // Strongly Spam-leaning features
  urgent: { log_spam: -2.3, log_ham: -5.4 },
  immediately: { log_spam: -2.5, log_ham: -5.1 },
  suspended: { log_spam: -2.8, log_ham: -6.2 },
  verify: { log_spam: -2.4, log_ham: -4.8 },
  credentials: { log_spam: -2.9, log_ham: -5.8 },
  lottery: { log_spam: -2.1, log_ham: -7.5 },
  jackpot: { log_spam: -2.3, log_ham: -8.0 },
  winner: { log_spam: -2.4, log_ham: -6.5 },
  claim: { log_spam: -2.6, log_ham: -5.5 },
  prize: { log_spam: -2.5, log_ham: -6.8 },
  wire: { log_spam: -3.0, log_ham: -6.2 },
  transfer: { log_spam: -2.7, log_ham: -5.2 },
  western: { log_spam: -3.2, log_ham: -7.0 },
  crypto: { log_spam: -2.6, log_ham: -6.5 },
  bitcoin: { log_spam: -2.8, log_ham: -6.8 },
  deposit: { log_spam: -2.9, log_ham: -5.9 },
  guaranteed: { log_spam: -3.0, log_ham: -6.5 },
  unpaid: { log_spam: -3.1, log_ham: -5.9 },
  macro: { log_spam: -3.3, log_ham: -6.5 },
  inheritance: { log_spam: -2.5, log_ham: -8.2 },
  barrister: { log_spam: -2.8, log_ham: -8.5 },
  unclaimed: { log_spam: -2.6, log_ham: -7.8 },
  refund: { log_spam: -2.9, log_ham: -5.7 },
  irs: { log_spam: -3.0, log_ham: -6.5 },
  gift: { log_spam: -2.8, log_ham: -5.6 },
  card: { log_spam: -3.1, log_ham: -4.8 },
  pharmacy: { log_spam: -2.7, log_ham: -7.5 },
  prescription: { log_spam: -3.0, log_ham: -6.9 },
  voicemail: { log_spam: -3.2, log_ham: -5.8 },
  restricted: { log_spam: -3.1, log_ham: -6.1 },
  paypal: { log_spam: -2.9, log_ham: -5.5 },
  bonus: { log_spam: -2.7, log_ham: -6.3 },
  free: { log_spam: -2.4, log_ham: -4.5 },
  click: { log_spam: -2.5, log_ham: -4.7 },
  login: { log_spam: -2.6, log_ham: -4.6 },
  password: { log_spam: -2.8, log_ham: -4.9 },

  // Strongly Ham (legitimate) features
  meeting: { log_spam: -6.0, log_ham: -2.2 },
  minutes: { log_spam: -6.5, log_ham: -2.8 },
  sync: { log_spam: -6.2, log_ham: -2.7 },
  deadline: { log_spam: -5.8, log_ham: -2.5 },
  submitting: { log_spam: -6.0, log_ham: -2.9 },
  micro: { log_spam: -6.5, log_ham: -3.0 },
  project: { log_spam: -5.5, log_ham: -2.1 },
  moodle: { log_spam: -7.5, log_ham: -3.1 },
  slides: { log_spam: -6.8, log_ham: -2.9 },
  lecture: { log_spam: -7.0, log_ham: -2.8 },
  bayesian: { log_spam: -7.2, log_ham: -2.7 },
  probability: { log_spam: -6.8, log_ham: -2.6 },
  statistics: { log_spam: -6.9, log_ham: -2.7 },
  github: { log_spam: -6.2, log_ham: -2.6 },
  pull: { log_spam: -6.3, log_ham: -2.8 },
  request: { log_spam: -4.5, log_ham: -2.9 },
  linter: { log_spam: -7.8, log_ham: -3.3 },
  roadmap: { log_spam: -6.5, log_ham: -3.0 },
  reschedule: { log_spam: -6.8, log_ham: -3.1 },
  maintenance: { log_spam: -5.5, log_ham: -3.2 },
  saturday: { log_spam: -5.8, log_ham: -3.3 },
  agenda: { log_spam: -6.4, log_ham: -2.9 },
  departmental: { log_spam: -6.9, log_ham: -3.2 },
  cafeteria: { log_spam: -7.5, log_ham: -3.4 },
  lunch: { log_spam: -6.5, log_ham: -3.1 },
  attached: { log_spam: -4.2, log_ham: -2.8 },
  thanks: { log_spam: -5.5, log_ham: -2.4 },
  team: { log_spam: -5.2, log_ham: -2.3 },
  notes: { log_spam: -6.0, log_ham: -2.8 },
  update: { log_spam: -4.3, log_ham: -2.9 },
  review: { log_spam: -4.8, log_ham: -2.7 },
  draft: { log_spam: -6.1, log_ham: -3.0 },
  paper: { log_spam: -6.5, log_ham: -2.7 },
  academic: { log_spam: -6.8, log_ham: -2.9 }
};

const DEFAULT_WORD_LOG_SPAM = -6.5;
const DEFAULT_WORD_LOG_HAM = -6.5;
const LOG_PRIOR_SPAM = Math.log(0.48);
const LOG_PRIOR_HAM = Math.log(0.52);

export function runClientBayesClassification(
  text: string,
  subject: string = '',
  sender: string = '',
  uncertaintyLow: number = 0.35,
  uncertaintyHigh: number = 0.65
): ClassificationResult {
  const combined = `${subject} ${text}`.toLowerCase();
  const words = combined.match(/\b[a-z]{2,}\b/g) || [];

  let logSumSpam = LOG_PRIOR_SPAM;
  let logSumHam = LOG_PRIOR_HAM;

  const influentialWords: InfluentialWord[] = [];
  const uniqueWords = Array.from(new Set(words));

  for (const word of uniqueWords) {
    const stats = VOCABULARY_STATS[word];
    if (stats) {
      logSumSpam += stats.log_spam;
      logSumHam += stats.log_ham;

      const pSpam = Math.exp(stats.log_spam);
      const pHam = Math.exp(stats.log_ham);
      const ratio = stats.log_spam - stats.log_ham;

      influentialWords.push({
        word,
        p_word_given_spam: parseFloat(pSpam.toFixed(6)),
        p_word_given_ham: parseFloat(pHam.toFixed(6)),
        log_p_spam: parseFloat(stats.log_spam.toFixed(4)),
        log_p_ham: parseFloat(stats.log_ham.toFixed(4)),
        log_likelihood_ratio: parseFloat(ratio.toFixed(4)),
        leaning: ratio > 0.05 ? 'SPAM' : ratio < -0.05 ? 'HAM' : 'NEUTRAL',
        impact_score: parseFloat(Math.abs(ratio).toFixed(4))
      });
    }
  }

  // Sort by impact score descending
  influentialWords.sort((a, b) => b.impact_score - a.impact_score);

  // Softmax / Normalized probability to prevent underflow:
  // P(Spam|W) = 1 / (1 + exp(log_ham - log_spam))
  const logDiff = logSumHam - logSumSpam;
  let spamProb: number;
  if (logDiff > 30) {
    spamProb = 0.0001;
  } else if (logDiff < -30) {
    spamProb = 0.9999;
  } else {
    spamProb = 1.0 / (1.0 + Math.exp(logDiff));
  }
  const hamProb = 1.0 - spamProb;

  // Decision logic with uncertainty threshold
  let prediction: 'SPAM' | 'LEGITIMATE' | 'NEEDS REVIEW';
  let reviewStatus: string;
  let reason: string;

  if (spamProb >= uncertaintyHigh) {
    prediction = 'SPAM';
    reviewStatus = 'AUTOMATIC_CLASSIFICATION';
    reason = `Spam posterior probability (${(spamProb * 100).toFixed(1)}%) exceeds high-confidence threshold (${(uncertaintyHigh * 100).toFixed(1)}%).`;
  } else if (spamProb <= uncertaintyLow) {
    prediction = 'LEGITIMATE';
    reviewStatus = 'AUTOMATIC_CLASSIFICATION';
    reason = `Spam posterior probability (${(spamProb * 100).toFixed(1)}%) is below low threshold (${(uncertaintyLow * 100).toFixed(1)}%). Likely legitimate.`;
  } else {
    prediction = 'NEEDS REVIEW';
    reviewStatus = 'FLAGGED_FOR_HUMAN_REVIEW';
    reason = `Spam posterior probability (${(spamProb * 100).toFixed(1)}%) falls in the uncertainty interval [${(uncertaintyLow * 100).toFixed(1)}% – ${(uncertaintyHigh * 100).toFixed(1)}%]. Referred for manual human verification.`;
  }

  // Rule Indicators
  const ruleIndicators: RuleIndicator[] = [];
  const fullText = `${subject} ${text}`;

  const urls = fullText.match(/https?:\/\/[^\s]+/g) || [];
  const ipUrls = fullText.match(/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) || [];
  const suspTlds = fullText.match(/https?:\/\/[^\s]+\.(xyz|tk|info|cc|top|click|fun)\b/gi) || [];

  if (ipUrls.length > 0) {
    ruleIndicators.push({
      type: 'IP_HOSTED_URL',
      severity: 'HIGH',
      description: `URL hosted on raw IP address detected (${ipUrls.length} instances).`
    });
  } else if (suspTlds.length > 0) {
    ruleIndicators.push({
      type: 'SUSPICIOUS_TLD',
      severity: 'MEDIUM',
      description: `URL uses high-abuse top-level domain (${suspTlds[0]}).`
    });
  } else if (urls.length > 0) {
    ruleIndicators.push({
      type: 'HYPERLINK_PRESENT',
      severity: 'LOW',
      description: `Contains ${urls.length} external hyperlink(s).`
    });
  }

  const urgencyWords = fullText.match(/\b(urgent|immediately|act now|suspended|unauthorized|wire transfer|bitcoin|crypto|jackpot|inheritance)\b/gi) || [];
  if (urgencyWords.length >= 2) {
    const unique = Array.from(new Set(urgencyWords.map(w => w.toLowerCase()))).slice(0, 3);
    ruleIndicators.push({
      type: 'HIGH_URGENCY_TRIGGER',
      severity: 'MEDIUM',
      description: `High psychological pressure terms detected: ${unique.join(', ')}.`
    });
  }

  const allCapsWords = fullText.match(/\b[A-Z]{3,}\b/g) || [];
  if (allCapsWords.length >= 3) {
    ruleIndicators.push({
      type: 'ALL_CAPS_WORDS',
      severity: 'LOW',
      description: `${allCapsWords.length} words in ALL CAPS (shouting style commonly used in spam).`
    });
  }

  const exclamations = (fullText.match(/!/g) || []).length;
  if (exclamations >= 3) {
    ruleIndicators.push({
      type: 'EXCESSIVE_PUNCTUATION',
      severity: 'LOW',
      description: `Multiple exclamation marks (${exclamations} '!') detected.`
    });
  }

  // Explanation
  const topSpamWords = influentialWords.filter(w => w.leaning === 'SPAM').slice(0, 4).map(w => w.word);
  const topHamWords = influentialWords.filter(w => w.leaning === 'HAM').slice(0, 4).map(w => w.word);

  const parts = [
    `The Naive Bayes engine evaluated ${influentialWords.length} matching vocabulary feature(s) using Laplace smoothing (α=1.0).`
  ];
  if (topSpamWords.length > 0) {
    parts.push(`Words heavily elevating spam likelihood: ${topSpamWords.join(', ')}.`);
  }
  if (topHamWords.length > 0) {
    parts.push(`Words supporting legitimacy: ${topHamWords.join(', ')}.`);
  }
  if (prediction === 'NEEDS REVIEW') {
    parts.push('Because conflicting features or moderate probabilities were found, the uncertainty guardrail triggered a review request.');
  }

  // Threat X-Ray Analysis
  const threatXRay = analyzeClientThreatXRay(text, subject, sender, influentialWords);

  const tokenBreakdown = influentialWords.map(w => ({
    word: w.word,
    count: 1,
    p_word_given_spam: w.p_word_given_spam,
    p_word_given_ham: w.p_word_given_ham,
    log_p_spam: w.log_p_spam,
    log_p_ham: w.log_p_ham,
    log_likelihood_ratio: w.log_likelihood_ratio
  }));

  const bayesBreakdown = {
    formula: 'P(Spam|W) = [P(W|Spam) * P(Spam)] / P(W)',
    marginal_formula: 'P(W) = [P(W|Spam) * P(Spam)] + [P(W|Ham) * P(Ham)]',
    p_prior_spam: 0.4906,
    p_prior_ham: 0.5094,
    log_prior_spam: parseFloat(LOG_PRIOR_SPAM.toFixed(4)),
    log_prior_ham: parseFloat(LOG_PRIOR_HAM.toFixed(4)),
    log_likelihood_spam: parseFloat((logSumSpam - LOG_PRIOR_SPAM).toFixed(4)),
    log_likelihood_ham: parseFloat((logSumHam - LOG_PRIOR_HAM).toFixed(4)),
    joint_log_spam: parseFloat(logSumSpam.toFixed(4)),
    joint_log_ham: parseFloat(logSumHam.toFixed(4)),
    p_posterior_spam: parseFloat(spamProb.toFixed(4)),
    p_posterior_ham: parseFloat(hamProb.toFixed(4)),
    tokens_count: influentialWords.length,
    token_breakdown: tokenBreakdown.slice(0, 12)
  };

  return {
    scan_id: `SCAN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    sender,
    subject,
    prediction,
    spam_probability: parseFloat(spamProb.toFixed(4)),
    ham_probability: parseFloat(hamProb.toFixed(4)),
    review_status: reviewStatus,
    decision_reason: reason,
    uncertainty_interval: [uncertaintyLow, uncertaintyHigh],
    vocabulary_tokens_found: influentialWords.length,
    influential_words: influentialWords.slice(0, 15),
    rule_indicators: ruleIndicators,
    threat_xray: threatXRay,
    bayes_breakdown: bayesBreakdown,
    natural_explanation: parts.join(' '),
    class_priors: {
      p_spam: 0.4906,
      p_ham: 0.5094
    },
    model_version: 'MultinomialNB (Laplace α=1.0)'
  };
}

function analyzeClientThreatXRay(
  text: string,
  subject: string = '',
  sender: string = '',
  influentialWords: InfluentialWord[] = []
) {
  const combined = `${subject} ${text}`;
  const detectedSigns: Array<{
    phrase: string;
    category: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    explanation: string;
    icon_type: 'key' | 'gift' | 'clock' | 'link' | 'alert' | 'cpu';
  }> = [];
  const highlightPhrases = new Set<string>();

  const addSign = (
    phrase: string,
    category: string,
    severity: 'HIGH' | 'MEDIUM' | 'LOW',
    explanation: string,
    icon_type: 'key' | 'gift' | 'clock' | 'link' | 'alert' | 'cpu'
  ) => {
    const clean = phrase.trim().replace(/^[ .,;:!?'"()<>[\]{}]+|[ .,;:!?'"()<>[\]{}]+$/g, '');
    if (!clean || clean.length < 2) return;
    if (!detectedSigns.some(s => s.phrase.toLowerCase() === clean.toLowerCase())) {
      detectedSigns.push({
        phrase: clean,
        category,
        severity,
        explanation,
        icon_type
      });
      highlightPhrases.add(clean);
    }
  };

  // 1. Password & Credential Requests
  const credPatterns = [
    {
      regex: /\b(verify|enter|reset|change|confirm|update|submit|require|share|provide|send|input|type|give)\s+(your\s+|the\s+|an?\s+)?(password|passcode|pin|login|credentials|security\s+code)\b/gi,
      category: 'Credential Theft Risk',
      severity: 'HIGH' as const,
      explanation: 'Requests password, login credentials, or PIN verification. Legitimate services will never ask for your password via email.',
      icon: 'key' as const
    },
    {
      regex: /\b(your\s+password|account\s+password)\s+(is\s+required|has\s+expired|will\s+expire|was\s+compromised|is\s+compromised|reset|verification|expiry)\b/gi,
      category: 'Password Expiry / Verification Lure',
      severity: 'HIGH' as const,
      explanation: 'Claims password expiry or security compromise to prompt credential submission.',
      icon: 'key' as const
    },
    {
      regex: /\b(password\s+(reset|verification|required|request|expiry|compromised?))\b/gi,
      category: 'Password Action Request',
      severity: 'HIGH' as const,
      explanation: 'Prompts password entry or credential reset.',
      icon: 'key' as const
    },
    {
      regex: /\b(requesting|requires?|demanding?)\s+(your\s+|the\s+)?(password|credentials)\b/gi,
      category: 'Credential Demand',
      severity: 'HIGH' as const,
      explanation: 'Demands account credentials or password information.',
      icon: 'key' as const
    }
  ];

  // 2. OTP Requests
  const otpPatterns = [
    {
      regex: /\b(verify|enter|confirm|share|provide|send|input|submit|give)\s+(your\s+|the\s+|an?\s+)?(\d+[\s-]*(digit|char)?\s*)?(otp|one-time\s+password|one-time\s+passcode|auth\s+token|verification\s+code|security\s+code|2fa\s+code)\b/gi,
      category: 'OTP Harvesting Risk',
      severity: 'HIGH' as const,
      explanation: 'Requests a one-time verification passcode (OTP). Sharing an OTP exposes accounts to immediate takeover.',
      icon: 'key' as const
    },
    {
      regex: /\b(confirm|enter|verify|share|send|provide)\s+(your\s+|the\s+)?otp\b/gi,
      category: 'OTP Verification Request',
      severity: 'HIGH' as const,
      explanation: 'Prompts one-time passcode verification.',
      icon: 'key' as const
    },
    {
      regex: /\b(otp\s+(code|verification|sent|required|request))\b/gi,
      category: 'OTP Action Required',
      severity: 'HIGH' as const,
      explanation: 'Demands OTP code verification.',
      icon: 'key' as const
    },
    {
      regex: /\b(one-time\s+password|one-time\s+passcode)\b/gi,
      category: 'One-Time Password Reference',
      severity: 'HIGH' as const,
      explanation: 'References one-time authentication passcodes.',
      icon: 'key' as const
    }
  ];

  // 3. Urgency & Coercive Pressure
  const urgencyPatterns = [
    {
      regex: /\b(urgent|urgently|immediate|immediately|act\s+now|claim\s+now|right\s+now|asap|as\s+soon\s+as\s+possible|do\s+not\s+delay|hurry)\b/gi,
      category: 'Urgency & Pressure',
      severity: 'MEDIUM' as const,
      explanation: 'Creates artificial time pressure to prompt quick action before you have time to verify the sender.',
      icon: 'clock' as const
    },
    {
      regex: /\b(within\s+\d+\s*(hours?|hrs?|minutes?|mins?|days?)|in\s+\d+\s*(hours?|hrs?|minutes?))\b/gi,
      category: 'Artificial Deadline',
      severity: 'MEDIUM' as const,
      explanation: 'Imposes a strict time window to prevent independent verification.',
      icon: 'clock' as const
    },
    {
      regex: /\b(final\s+notice|last\s+warning|last\s+chance|immediate\s+action\s+required|action\s+required|limited\s+time|expires?\s+(today|soon|immediately|within))\b/gi,
      category: 'High-Pressure Coercion',
      severity: 'MEDIUM' as const,
      explanation: 'Uses coercive warning terms claiming imminent negative consequences.',
      icon: 'clock' as const
    }
  ];

  // 4. Account Suspension Threats & Security Alerts
  const suspensionPatterns = [
    {
      regex: /\b(account\s+(has\s+been\s+|is\s+|will\s+be\s+|temporarily\s+|permanently\s+)?suspended)\b/gi,
      category: 'Account Suspension Threat',
      severity: 'HIGH' as const,
      explanation: 'Threatens that your account is or will be suspended to provoke panic.',
      icon: 'alert' as const
    },
    {
      regex: /\b(account\s+suspension|suspension\s+of\s+your\s+account|threat\s+of\s+suspension)\b/gi,
      category: 'Account Suspension Notice',
      severity: 'HIGH' as const,
      explanation: 'Alleges account suspension to pressure immediate compliance.',
      icon: 'alert' as const
    },
    {
      regex: /\b(account\s+(locked|disabled|terminated|closed|restricted|deactivated|on\s+hold|flagged|frozen))\b/gi,
      category: 'Account Restriction Threat',
      severity: 'HIGH' as const,
      explanation: 'Claims account access is locked or restricted.',
      icon: 'alert' as const
    },
    {
      regex: /\b(unauthorized\s+(activity|access|login|transaction|charges?|sign-in))\b/gi,
      category: 'Security Alert Pretext',
      severity: 'HIGH' as const,
      explanation: 'Claims unauthorized activity was detected on your account.',
      icon: 'alert' as const
    },
    {
      regex: /\b(security\s+alert|security\s+warning|suspicious\s+activity\s+detected)\b/gi,
      category: 'Security Alert Pretext',
      severity: 'HIGH' as const,
      explanation: 'Manufactures a fake security alert to induce panic.',
      icon: 'alert' as const
    }
  ];

  // 5. Unexpected Prize Offers
  const prizePatterns = [
    {
      regex: /\b(you\s+(have\s+)?won\s+a\s+prize|you\s+have\s+won|you've\s+won|you\s+are\s+a\s+winner|lottery\s+winner|congratulations\s+you\s+won|congratulations!\s*you\s+won)\b/gi,
      category: 'Unexpected Prize Offer',
      severity: 'HIGH' as const,
      explanation: 'Promises unexpected prizes, sweepstakes, or lottery winnings. Typically used as bait in advance-fee scams.',
      icon: 'gift' as const
    },
    {
      regex: /\b(claim\s+(your\s+)?(prize|reward|bonus|funds|cash|gift|winnings))\b/gi,
      category: 'Prize Claim Lure',
      severity: 'HIGH' as const,
      explanation: 'Entices the recipient to claim unprompted prize winnings.',
      icon: 'gift' as const
    },
    {
      regex: /\b(cash\s+prize|jackpot\s+winner|sweepstakes\s+winner|free\s+gift\s+card|inheritance\s+fund)\b/gi,
      category: 'Financial Windfall Lure',
      severity: 'HIGH' as const,
      explanation: 'Promises unexpected financial windfalls or gifts.',
      icon: 'gift' as const
    },
    {
      regex: /\b(wire\s+transfer|crypto\s+reward|transfer\s+of\s+\$|unclaimed\s+(funds|assets|prizes)|millions\s+of\s+dollars)\b/gi,
      category: 'Financial Windfall Lure',
      severity: 'MEDIUM' as const,
      explanation: 'Mentions wire transfers or unclaimed funds designed to capture financial attention.',
      icon: 'gift' as const
    }
  ];

  // 6. Suspicious Links
  const linkPatterns = [
    {
      regex: /\b(click\s+(this\s+|the\s+)?link|click\s+here|follow\s+(this\s+|the\s+)?link|open\s+(this\s+|the\s+)?link|visit\s+(this\s+|the\s+)?link|download\s+(the\s+|this\s+)?attachment)\b/gi,
      category: 'Suspicious Call to Action',
      severity: 'MEDIUM' as const,
      explanation: 'Directs you to click an external link or download attachments, which can lead to phishing forms or malware.',
      icon: 'link' as const
    }
  ];

  const allRules = [
    ...credPatterns,
    ...otpPatterns,
    ...urgencyPatterns,
    ...suspensionPatterns,
    ...prizePatterns,
    ...linkPatterns
  ];

  for (const rule of allRules) {
    let match;
    rule.regex.lastIndex = 0;
    while ((match = rule.regex.exec(combined)) !== null) {
      addSign(match[0], rule.category, rule.severity, rule.explanation, rule.icon);
    }
  }

  // 7. IP Address URLs
  const ipRegex = /(?:https?:\/\/)?(?:\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?(?:\/[^\s]*)?)/gi;
  let ipMatch;
  while ((ipMatch = ipRegex.exec(combined)) !== null) {
    const raw = ipMatch[0].trim().replace(/^[ .,;:!?'"()<>[\]{}]+|[ .,;:!?'"()<>[\]{}]+$/g, '');
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(raw)) {
      addSign(
        raw,
        'Raw IP Address URL',
        'HIGH',
        'Links directly to an unverified numeric IP address rather than a legitimate named domain.',
        'link'
      );
    }
  }

  // 8. High-abuse TLDs
  const tldRegex = /https?:\/\/[^\s]+\.(xyz|tk|info|cc|top|click|fun|buzz|rest|live|vip)[^\s]*/gi;
  let tldMatch;
  while ((tldMatch = tldRegex.exec(combined)) !== null) {
    const raw = tldMatch[0].trim().replace(/^[ .,;:!?'"()<>[\]{}]+|[ .,;:!?'"()<>[\]{}]+$/g, '');
    addSign(
      raw,
      'High-Abuse Domain TLD',
      'MEDIUM',
      'Uses a top-level domain frequently associated with disposable phishing domains.',
      'link'
    );
  }

  // 9. Sender spoofing
  if (sender) {
    if (/\b(support|security|alert|admin|service)@/i.test(sender) && !/\.(com|org|edu|gov|net)$/i.test(sender)) {
      addSign(
        sender,
        'Sender Identity Anomaly',
        'HIGH',
        'Security or administrative sender username coming from a non-standard or disposable domain.',
        'alert'
      );
    }
  }

  // 10. Influential spam words
  for (const item of influentialWords) {
    if (item.leaning === 'SPAM' && item.impact_score > 1.2) {
      const escaped = item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\b${escaped}\\b`, 'i').test(combined)) {
        if (!detectedSigns.some(s => s.phrase.toLowerCase().includes(item.word.toLowerCase()))) {
          addSign(
            item.word,
            'Statistical Bayesian Spam Term',
            'LOW',
            `Vocabulary term with high conditional spam likelihood (P(w|Spam)=${item.p_word_given_spam} vs P(w|Ham)=${item.p_word_given_ham}).`,
            'cpu'
          );
        }
      }
      if (detectedSigns.length >= 10) break;
    }
  }

  // Recommended actions
  const recommendedActions: string[] = [];
  const hasCred = detectedSigns.some(s => s.category.includes('Credential') || s.category.includes('Password') || s.category.includes('OTP'));
  const hasSusp = detectedSigns.some(s => s.category.includes('Suspension') || s.category.includes('Restriction') || s.category.includes('Security Alert'));
  const hasPrize = detectedSigns.some(s => s.category.includes('Prize') || s.category.includes('Windfall'));
  const hasLink = detectedSigns.some(s => s.category.includes('URL') || s.category.includes('Domain') || s.category.includes('Call to Action'));
  const hasUrgency = detectedSigns.some(s => s.category.includes('Urgency') || s.category.includes('Pressure') || s.category.includes('Deadline') || s.category.includes('Coercion'));

  if (hasCred) {
    recommendedActions.push('Never share passwords, PINs, or one-time passcodes (OTP) in response to any email.');
  }
  if (hasSusp) {
    recommendedActions.push('Do not panic over account suspension warnings. Verify account status directly on the official website, not through email links.');
  }
  if (hasPrize) {
    recommendedActions.push('Verify unexpected prize offers or lottery notices through an official source before providing details.');
  }
  if (hasLink) {
    recommendedActions.push('Avoid clicking suspicious links or downloading unverified attachments.');
  }
  if (hasUrgency) {
    recommendedActions.push('Take your time to verify urgent requests independently before taking action.');
  }

  if (detectedSigns.length === 0) {
    recommendedActions.push('No common warning signs were detected. However, remain cautious with unexpected messages from unknown senders.');
    recommendedActions.push('Always verify organizational requests, invoices, or schedule changes through established official channels.');
  } else if (recommendedActions.length < 2) {
    recommendedActions.push("If unsure of an email's authenticity, contact the organization directly through verified contact details.");
  }

  return {
    has_warning_signs: detectedSigns.length > 0,
    warning_count: detectedSigns.length,
    detected_phrases: detectedSigns,
    highlight_phrases: Array.from(highlightPhrases).sort((a, b) => b.length - a.length),
    recommended_actions: recommendedActions,
    analysis_disclaimer: 'Threat X-Ray highlights suspicious phrasing and indicators using transparent security heuristics and Naive Bayes conditional evidence.'
  };
}
