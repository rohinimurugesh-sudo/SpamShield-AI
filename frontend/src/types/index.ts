export interface InfluentialWord {
  word: string;
  p_word_given_spam: number;
  p_word_given_ham: number;
  log_p_spam: number;
  log_p_ham: number;
  log_likelihood_ratio: number;
  leaning: 'SPAM' | 'HAM' | 'NEUTRAL';
  impact_score: number;
}

export interface RuleIndicator {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export interface ThreatXRaySign {
  phrase: string;
  category: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  icon_type: 'key' | 'gift' | 'clock' | 'link' | 'alert' | 'cpu';
}

export interface ThreatXRayData {
  has_warning_signs: boolean;
  warning_count: number;
  detected_phrases: ThreatXRaySign[];
  highlight_phrases: string[];
  recommended_actions: string[];
  analysis_disclaimer: string;
}

export interface TokenBreakdownItem {
  word: string;
  count: number;
  p_word_given_spam: number;
  p_word_given_ham: number;
  log_p_spam: number;
  log_p_ham: number;
  log_likelihood_ratio: number;
}

export interface BayesBreakdown {
  formula: string;
  marginal_formula: string;
  p_prior_spam: number;
  p_prior_ham: number;
  log_prior_spam?: number;
  log_prior_ham?: number;
  log_likelihood_spam?: number;
  log_likelihood_ham?: number;
  joint_log_spam?: number;
  joint_log_ham?: number;
  p_posterior_spam: number;
  p_posterior_ham: number;
  tokens_count: number;
  token_breakdown?: TokenBreakdownItem[];
}

export interface EmailGraphBar {
  category: string;
  probability: number;
  percentage: number;
  is_predicted: boolean;
  color?: string;
}

export interface EmailGraphData {
  chart_title: string;
  subject?: string;
  prediction?: string;
  bars: EmailGraphBar[];
  explanation: string;
}

export interface ThreatScoreFactor {
  name: string;
  points: number;
  description: string;
}

export interface ThreatScoreData {
  score: number; // 0 to 100
  category: 'Low threat' | 'Medium threat' | 'High threat' | 'Critical threat';
  band: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  color: string;
  factors: ThreatScoreFactor[];
  summary_reason: string;
}

export interface ClassificationResult {
  scan_id?: string;
  id?: string;
  timestamp?: string;
  sender?: string;
  subject?: string;
  body_snippet?: string;
  prediction: 'SPAM' | 'LEGITIMATE' | 'NEEDS REVIEW';
  spam_probability: number;
  ham_probability: number;
  review_status: string;
  decision_reason?: string;
  uncertainty_interval?: [number, number];
  vocabulary_tokens_found?: number;
  influential_words?: InfluentialWord[];
  rule_indicators?: RuleIndicator[];
  threat_xray?: ThreatXRayData;
  threat_score?: ThreatScoreData;
  bayes_breakdown?: BayesBreakdown;
  graph_data?: EmailGraphData;
  explanation?: string;
  natural_explanation?: string;
  class_priors?: {
    p_spam: number;
    p_ham: number;
  };
  model_version?: string;
}

export interface DashboardMetrics {
  total_emails_analysed: number;
  spam_detected: number;
  legitimate_emails: number;
  needs_review: number;
  spam_percentage: number;
  legit_percentage: number;
  review_percentage: number;
}

export interface RecentScanItem {
  id: string;
  timestamp: string;
  sender: string;
  subject: string;
  prediction: 'SPAM' | 'LEGITIMATE' | 'NEEDS REVIEW';
  spam_probability: number;
  review_status: string;
}

export interface ActivityTimelinePoint {
  time: string;
  total: number;
  spam: number;
  legitimate: number;
  review: number;
}

export interface DashboardData {
  status: string;
  engine_online: boolean;
  metrics: DashboardMetrics;
  model_summary: {
    version: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    test_size: number;
  };
  activity_timeline: ActivityTimelinePoint[];
  recent_scans: RecentScanItem[];
}

export interface TrafficEvent {
  hour: string;
  total_volume: number;
  spam_count: number;
  ham_count: number;
  review_count: number;
  spam_rate_pct: number;
  is_anomaly: boolean;
  z_score: number;
}

export interface TrafficAnomaly {
  hour: string;
  total_volume: number;
  spam_rate_pct: number;
  z_score: number;
  reason: string;
}

export interface DomainDistribution {
  domain: string;
  volume: number;
  spam_volume: number;
  spam_ratio: number;
}

export interface TrafficSummary {
  timeline: TrafficEvent[];
  anomalies_detected: TrafficAnomaly[];
  domain_distribution: DomainDistribution[];
  baseline_methodology: string;
  course_outcome: string;
}

export interface ModelMetrics {
  model_name: string;
  features_count: number;
  train_dataset_size: number;
  test_dataset_size: number;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    fpr: number;
    fn_count: number;
    fp_count: number;
    tp_count: number;
    tn_count: number;
    confusion_matrix: number[][];
    train_size: number;
    test_size: number;
    mcnemar: {
      b_m1_only: number;
      c_m2_only: number;
      statistic: number;
      p_value: number;
      significant: boolean;
      comparison: string;
    };
  };
  active_thresholds: {
    low: number;
    high: number;
  };
  statistical_hypothesis_test: any;
  evaluation_timestamp: string;
}

export interface AppSettings {
  uncertainty_low: string;
  uncertainty_high: string;
  privacy_store_body: string;
  laplace_alpha: string;
  model_version: string;
  anomaly_z_threshold: string;
}

export interface FeedbackItem {
  id: number;
  scan_id: string;
  subject: string;
  sender: string;
  original_prediction: string;
  model_probability: number;
  feedback_type: 'CORRECT' | 'WRONG';
  corrected_category?: string;
  comment?: string;
  review_status: 'pending' | 'verified' | 'rejected';
  timestamp: string;
  reviewed_at?: string;
  reviewer_notes?: string;
}

export interface FeedbackSummary {
  total_feedback: number;
  correct_count: number;
  wrong_count: number;
  accuracy_perception_rate: number;
  false_positives_reported: number;
  false_negatives_reported: number;
  uncertain_reviews_resolved: number;
  verified_count: number;
  pending_count: number;
  recent_feedback: FeedbackItem[];
}

export interface CandidateEvaluationResult {
  status: string;
  sample_count: number;
  candidate_accuracy: number | null;
  correct_count: number;
  deploy_ready: boolean;
  message?: string;
  eval_details?: Array<{
    scan_id: string;
    verified_label: string;
    model_prediction: string;
    spam_prob: number;
    is_concordant: boolean;
  }>;
}
