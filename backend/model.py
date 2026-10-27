import re
import math
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple, Optional
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB, BernoulliNB, ComplementNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from scipy.stats import chi2
import joblib
import os

from dataset_generator import get_or_create_dataset

MODEL_DIR = os.path.dirname(__file__)
MODEL_FILE = os.path.join(MODEL_DIR, "classifier.pkl")
VECT_FILE = os.path.join(MODEL_DIR, "vectorizer.pkl")

class SpamClassifierEngine:
    def __init__(self, alpha: float = 1.0):
        self.alpha = alpha
        self.vectorizer = CountVectorizer(
            lowercase=True,
            stop_words='english',
            min_df=2,
            token_pattern=r'(?u)\b[a-zA-Z]{2,}\b'
        )
        self.model = MultinomialNB(alpha=self.alpha)
        self.alt_model = BernoulliNB(alpha=self.alpha) # For McNemar comparative statistical testing
        self.is_trained = False
        self.vocabulary_: Dict[str, int] = {}
        self.feature_names_: List[str] = []
        self.class_log_prior_: np.ndarray = np.array([])
        self.feature_log_prob_: np.ndarray = np.array([]) # shape (2, n_features): 0=ham, 1=spam
        self.evaluation_metrics: Dict[str, Any] = {}
        self.train_size: int = 0
        self.test_size: int = 0

    def preprocess_text(self, text: str) -> str:
        if not text:
            return ""
        text = text.lower()
        # Clean basic spacing
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def train(self, df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
        if df is None:
            df = get_or_create_dataset()

        # Binary labels: 1 for spam, 0 for ham
        df['target'] = df['label'].apply(lambda x: 1 if x.lower() == 'spam' else 0)

        # Reproducible 80/20 train/test split with fixed random seed
        X_train, X_test, y_train, y_test = train_test_split(
            df['text'], df['target'], test_size=0.2, random_state=42, stratify=df['target']
        )

        self.train_size = len(X_train)
        self.test_size = len(X_test)

        # Fit vectorizer on training set only (prevent data leakage)
        X_train_vec = self.vectorizer.fit_transform(X_train)
        X_test_vec = self.vectorizer.transform(X_test)

        # Train primary Multinomial Naive Bayes model
        self.model.fit(X_train_vec, y_train)

        # Train secondary BernoulliNB model for statistical hypothesis testing (McNemar test)
        self.alt_model.fit(X_train_vec, y_train)

        self.feature_names_ = self.vectorizer.get_feature_names_out().tolist()
        self.vocabulary_ = self.vectorizer.vocabulary_
        self.class_log_prior_ = self.model.class_log_prior_
        self.feature_log_prob_ = self.model.feature_log_prob_
        self.is_trained = True

        # Evaluate on held-out test split
        y_pred = self.model.predict(X_test_vec)
        y_pred_proba = self.model.predict_proba(X_test_vec)[:, 1]

        y_alt_pred = self.alt_model.predict(X_test_vec)

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        cm = confusion_matrix(y_test, y_pred).tolist() # [[TN, FP], [FN, TP]]

        tn, fp, fn, tp = cm[0][0], cm[0][1], cm[1][0], cm[1][1]
        fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

        # Statistical comparison: McNemar's test between MultinomialNB and BernoulliNB
        # Table of agreement:
        # b = Model 1 correct, Model 2 wrong
        # c = Model 1 wrong, Model 2 correct
        b = int(np.sum((y_pred == y_test) & (y_alt_pred != y_test)))
        c = int(np.sum((y_pred != y_test) & (y_alt_pred == y_test)))
        
        # McNemar test with continuity correction
        if (b + c) > 0:
            mcnemar_stat = float(((abs(b - c) - 1.0) ** 2) / (b + c))
            p_val = float(1.0 - chi2.cdf(mcnemar_stat, df=1))
        else:
            mcnemar_stat = 0.0
            p_val = 1.0

        self.evaluation_metrics = {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "fpr": round(fpr, 4),
            "fn_count": int(fn),
            "fp_count": int(fp),
            "tp_count": int(tp),
            "tn_count": int(tn),
            "confusion_matrix": cm,
            "train_size": self.train_size,
            "test_size": self.test_size,
            "mcnemar": {
                "b_m1_only": b,
                "c_m2_only": c,
                "statistic": round(mcnemar_stat, 4),
                "p_value": round(p_val, 4),
                "significant": p_val < 0.05,
                "comparison": "MultinomialNB (Model 1) vs BernoulliNB (Model 2)"
            }
        }

        # Save artifacts
        joblib.dump(self.model, MODEL_FILE)
        joblib.dump(self.vectorizer, VECT_FILE)

        return self.evaluation_metrics

    def extract_rule_indicators(self, text: str, subject: str = "", sender: str = "") -> List[Dict[str, Any]]:
        """Extract supplementary heuristic security indicators separate from Naive Bayes model evidence."""
        indicators = []
        combined = f"{subject} {text}"

        # 1. Suspicious URL detector
        urls = re.findall(r'https?://[^\s]+', combined)
        ip_urls = re.findall(r'https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', combined)
        suspicious_tlds = re.findall(r'https?://[^\s]+\.(xyz|tk|info|cc|top|click|fun)\b', combined, re.IGNORECASE)

        if ip_urls:
            indicators.append({
                "type": "IP_HOSTED_URL",
                "severity": "HIGH",
                "description": f"URL hosted on raw IP address detected ({len(ip_urls)} instances)."
            })
        elif suspicious_tlds:
            indicators.append({
                "type": "SUSPICIOUS_TLD",
                "severity": "MEDIUM",
                "description": f"URL uses high-abuse top-level domain ({suspicious_tlds[0]})."
            })
        elif urls:
            indicators.append({
                "type": "HYPERLINK_PRESENT",
                "severity": "LOW",
                "description": f"Contains {len(urls)} external hyperlink(s)."
            })

        # 2. Excessive Urgency & Financial triggers
        urgency_match = re.findall(r'\b(urgent|immediately|act now|suspended|unauthorized|wire transfer|bitcoin|crypto|jackpot|inheritance)\b', combined, re.IGNORECASE)
        if len(urgency_match) >= 2:
            unique_terms = list(set(urgency_match))[:3]
            indicators.append({
                "type": "HIGH_URGENCY_TRIGGER",
                "severity": "MEDIUM",
                "description": f"High psychological pressure terms detected: {', '.join(unique_terms)}."
            })

        # 3. Capitalization & Punctuation Anomaly
        all_caps_words = re.findall(r'\b[A-Z]{3,}\b', combined)
        if len(all_caps_words) >= 3:
            indicators.append({
                "type": "ALL_CAPS_WORDS",
                "severity": "LOW",
                "description": f"{len(all_caps_words)} words in ALL CAPS (shouting style commonly used in spam)."
            })

        exclamation_count = combined.count("!")
        if exclamation_count >= 3:
            indicators.append({
                "type": "EXCESSIVE_PUNCTUATION",
                "severity": "LOW",
                "description": f"Multiple exclamation marks ({exclamation_count} '!') detected."
            })

        # 4. Sender Spoofing Check (heuristic)
        if sender:
            if re.search(r'\b(support|security|alert|admin|service)@', sender, re.IGNORECASE) and not re.search(r'\.(com|org|edu|gov|net)$', sender, re.IGNORECASE):
                indicators.append({
                    "type": "SENDER_DOMAIN_MISMATCH",
                    "severity": "HIGH",
                    "description": f"Security-themed sender username from non-standard domain: {sender}."
                })

        return indicators

    def classify(self, text: str, subject: str = "", sender: str = "",
                 uncertainty_low: float = 0.35, uncertainty_high: float = 0.65) -> Dict[str, Any]:
        if not self.is_trained:
            self.train()

        clean_content = f"{subject} {text}"
        preprocessed = self.preprocess_text(clean_content)

        # Extract words that exist in vocabulary
        tokens = re.findall(r'\b[a-zA-Z]{2,}\b', preprocessed)
        vocab_words = [t for t in tokens if t in self.vocabulary_]

        # Vectorize
        vec = self.vectorizer.transform([clean_content])

        # Dynamically resolve class indices (Rule 4: Do not assume class order)
        classes = list(self.model.classes_)
        if 1 in classes:
            spam_idx = classes.index(1)
        elif "spam" in classes:
            spam_idx = classes.index("spam")
        elif "SPAM" in classes:
            spam_idx = classes.index("SPAM")
        else:
            spam_idx = 1 if len(classes) > 1 else 0

        if 0 in classes:
            ham_idx = classes.index(0)
        elif "ham" in classes:
            ham_idx = classes.index("ham")
        elif "legitimate" in classes:
            ham_idx = classes.index("legitimate")
        elif "LEGITIMATE" in classes:
            ham_idx = classes.index("LEGITIMATE")
        else:
            ham_idx = 0 if spam_idx != 0 else (1 if len(classes) > 1 else 0)

        # Class Priors: P(Spam) and P(Ham) from trained model
        log_prior_spam = float(self.class_log_prior_[spam_idx])
        log_prior_ham = float(self.class_log_prior_[ham_idx])
        p_prior_spam = round(float(np.exp(log_prior_spam)), 6)
        p_prior_ham = round(float(np.exp(log_prior_ham)), 6)

        # Feature vector counts and total document log-likelihood sums
        feature_counts = vec.toarray()[0]
        non_zero_indices = np.nonzero(feature_counts)[0]
        log_lik_spam = float(np.sum(feature_counts * self.feature_log_prob_[spam_idx]))
        log_lik_ham = float(np.sum(feature_counts * self.feature_log_prob_[ham_idx]))

        joint_log_spam = log_prior_spam + log_lik_spam
        joint_log_ham = log_prior_ham + log_lik_ham

        # Rule 3 & 6: Safely compute normalized posterior probabilities with numerical underflow/overflow protection:
        # P(Spam|W) = exp(joint_log_spam) / (exp(joint_log_spam) + exp(joint_log_ham))
        #           = 1 / (1 + exp(-(joint_log_spam - joint_log_ham)))
        # For extreme log-odds differences, preserve genuine near 100% / 0% probabilities (Rule 8)
        log_diff = joint_log_spam - joint_log_ham
        if log_diff > 40.0:
            spam_prob = 1.0
            ham_prob = 0.0
        elif log_diff < -40.0:
            spam_prob = 0.0
            ham_prob = 1.0
        else:
            # Numerically stable logistic sigmoid computation
            spam_prob = float(1.0 / (1.0 + math.exp(-log_diff)))
            ham_prob = float(1.0 - spam_prob)

        # Apply configurable uncertainty threshold
        if spam_prob >= uncertainty_high:
            prediction = "SPAM"
            review_status = "AUTOMATIC_CLASSIFICATION"
            reason = f"Spam posterior probability ({round(spam_prob*100, 1)}%) exceeds high-confidence threshold ({round(uncertainty_high*100, 1)}%)."
        elif spam_prob <= uncertainty_low:
            prediction = "LEGITIMATE"
            review_status = "AUTOMATIC_CLASSIFICATION"
            reason = f"Spam posterior probability ({round(spam_prob*100, 1)}%) is below low threshold ({round(uncertainty_low*100, 1)}%). Likely legitimate."
        else:
            prediction = "NEEDS REVIEW"
            review_status = "FLAGGED_FOR_HUMAN_REVIEW"
            reason = (f"Spam posterior probability ({round(spam_prob*100, 1)}%) falls in the uncertainty interval "
                      f"[{round(uncertainty_low*100, 1)}% – {round(uncertainty_high*100, 1)}%]. Referred for manual human verification.")

        # Influential word evidence (Explainable AI)
        influential_words = []
        unique_tokens = list(set(vocab_words))

        for word in unique_tokens:
            idx = self.vocabulary_[word]
            log_p_ham = float(self.feature_log_prob_[ham_idx][idx])
            log_p_spam = float(self.feature_log_prob_[spam_idx][idx])
            p_ham = float(np.exp(log_p_ham))
            p_spam = float(np.exp(log_p_spam))

            # Likelihood ratio: P(w|Spam) / P(w|Ham)
            # Log ratio > 0 means spam-leaning, < 0 means ham-leaning
            log_ratio = log_p_spam - log_p_ham

            influential_words.append({
                "word": word,
                "p_word_given_spam": round(p_spam, 6),
                "p_word_given_ham": round(p_ham, 6),
                "log_p_spam": round(log_p_spam, 4),
                "log_p_ham": round(log_p_ham, 4),
                "log_likelihood_ratio": round(log_ratio, 4),
                "leaning": "SPAM" if log_ratio > 0.05 else ("HAM" if log_ratio < -0.05 else "NEUTRAL"),
                "impact_score": round(abs(log_ratio), 4)
            })

        # Sort by impact score descending
        influential_words.sort(key=lambda x: x["impact_score"], reverse=True)

        # Rule indicators
        rule_indicators = self.extract_rule_indicators(text, subject, sender)

        # Threat X-Ray Analysis
        threat_xray = self.analyze_threat_xray(
            text=text,
            subject=subject,
            sender=sender,
            influential_words=influential_words,
            prediction=prediction
        )

        # Natural language statistical explanation
        top_spam_words = [w["word"] for w in influential_words if w["leaning"] == "SPAM"][:4]
        top_ham_words = [w["word"] for w in influential_words if w["leaning"] == "HAM"][:4]

        explanation_parts = [
            f"The Naive Bayes engine evaluated {len(vocab_words)} matching vocabulary feature(s) using Laplace smoothing (α={self.alpha})."
        ]
        if top_spam_words:
            explanation_parts.append(f"Words heavily elevating spam likelihood: {', '.join(top_spam_words)}.")
        if top_ham_words:
            explanation_parts.append(f"Words supporting legitimacy: {', '.join(top_ham_words)}.")
        if prediction == "NEEDS REVIEW":
            explanation_parts.append("Because conflicting features or moderate probabilities were found, the uncertainty guardrail triggered a review request.")

        natural_explanation = " ".join(explanation_parts)

        # Detailed token breakdown using actual Laplace-smoothed conditional frequencies
        token_breakdown = []
        for idx in non_zero_indices:
            token_str = self.feature_names_[idx]
            cnt = int(feature_counts[idx])
            lp_spam = float(self.feature_log_prob_[spam_idx][idx])
            lp_ham = float(self.feature_log_prob_[ham_idx][idx])
            token_breakdown.append({
                "word": token_str,
                "count": cnt,
                "p_word_given_spam": round(float(np.exp(lp_spam)), 6),
                "p_word_given_ham": round(float(np.exp(lp_ham)), 6),
                "log_p_spam": round(lp_spam, 4),
                "log_p_ham": round(lp_ham, 4),
                "log_likelihood_ratio": round(lp_spam - lp_ham, 4)
            })
        token_breakdown.sort(key=lambda x: abs(x["log_likelihood_ratio"]), reverse=True)

        bayes_breakdown = {
            "formula": "P(Spam|W) = [P(W|Spam) * P(Spam)] / P(W)",
            "marginal_formula": "P(W) = [P(W|Spam) * P(Spam)] + [P(W|Ham) * P(Ham)]",
            "p_prior_spam": p_prior_spam,
            "p_prior_ham": p_prior_ham,
            "log_prior_spam": round(log_prior_spam, 4),
            "log_prior_ham": round(log_prior_ham, 4),
            "log_likelihood_spam": round(log_lik_spam, 4),
            "log_likelihood_ham": round(log_lik_ham, 4),
            "joint_log_spam": round(joint_log_spam, 4),
            "joint_log_ham": round(joint_log_ham, 4),
            "p_posterior_spam": round(spam_prob, 6),
            "p_posterior_ham": round(ham_prob, 6),
            "tokens_count": len(vocab_words),
            "token_breakdown": token_breakdown[:12]
        }

        # Dynamic Threat Score Engine (0 - 100)
        threat_score = self.calculate_threat_score(
            text=text,
            subject=subject,
            sender=sender,
            spam_probability=spam_prob,
            detected_signs=threat_xray.get("detected_phrases", []),
            rule_indicators=rule_indicators,
            prediction=prediction
        )

        return {
            "prediction": prediction,
            "spam_probability": round(spam_prob, 6),
            "ham_probability": round(ham_prob, 6),
            "review_status": review_status,
            "decision_reason": reason,
            "uncertainty_interval": [uncertainty_low, uncertainty_high],
            "vocabulary_tokens_found": len(vocab_words),
            "influential_words": influential_words[:15], # top 15 words
            "rule_indicators": rule_indicators,
            "threat_xray": threat_xray,
            "threat_score": threat_score,
            "bayes_breakdown": bayes_breakdown,
            "natural_explanation": natural_explanation,
            "class_priors": {
                "p_spam": p_prior_spam,
                "p_ham": p_prior_ham
            },
            "model_version": f"MultinomialNB (Laplace α={self.alpha})"
        }

    def calculate_threat_score(
        self,
        text: str,
        subject: str = "",
        sender: str = "",
        spam_probability: float = 0.5,
        detected_signs: Optional[List[Dict[str, Any]]] = None,
        rule_indicators: Optional[List[Dict[str, Any]]] = None,
        prediction: str = "LEGITIMATE"
    ) -> Dict[str, Any]:
        """
        Documented, deterministic Threat Score Engine (0 - 100).
        Distinct from Spam Probability:
        - Spam Probability P(Spam|W) measures Bayesian feature likelihood belonging to spam text.
        - Threat Score measures weaponization severity: credential harvesting, IP evasion URLs,
          suspicious TLDs, psychological coercion, and model confidence.

        Score Bands:
        - 0 to 29: Low threat (Minimal/safe organizational communication)
        - 30 to 59: Medium threat (Sensitive policy/credentials or Bayesian review required)
        - 60 to 79: High threat (Deceptive lures, high-abuse domains, or commercial scams)
        - 80 to 100: Critical threat (Active credential theft, IP-hosted URLs, or suspension threats)
        """
        detected_signs = detected_signs or []
        rule_indicators = rule_indicators or []
        factors = []

        # 1. Base Bayesian Classifier Contribution (0 - 40 points)
        base_points = int(round(spam_probability * 40.0))
        factors.append({
            "name": "Bayesian Spam Likelihood",
            "points": base_points,
            "description": f"Model evaluated P(Spam) at {round(spam_probability * 100, 1)}% based on vocabulary feature likelihoods."
        })

        # 2. Credential & Authentication Theft Risk (0 - 25 points)
        cred_signs = [s for s in detected_signs if any(k in s.get("category", "") for k in [
            "Credential", "Password", "OTP", "Auth", "One-Time Password"
        ])]
        if cred_signs:
            has_high_cred = any(s.get("severity") == "HIGH" for s in cred_signs)
            cred_pts = 20 if has_high_cred else 15
            if len(cred_signs) > 1:
                cred_pts = min(25, cred_pts + 5)
            factors.append({
                "name": "Credential & Passcode Theft",
                "points": cred_pts,
                "description": f"Detected {len(cred_signs)} explicit authentication/credential request pattern(s) ({', '.join([s['phrase'] for s in cred_signs[:2]])})."
            })
        else:
            cred_pts = 0

        # 3. Malicious Links & Evasion Infrastructure (0 - 20 points)
        has_ip_url = any("IP" in s.get("type", "") for s in rule_indicators) or any("IP" in s.get("category", "") for s in detected_signs)
        has_suspicious_tld = any("TLD" in s.get("type", "") for s in rule_indicators) or any("TLD" in s.get("category", "") for s in detected_signs)
        has_generic_link = any("HYPERLINK" in s.get("type", "") for s in rule_indicators)

        link_pts = 0
        if has_ip_url:
            link_pts = 20
            factors.append({
                "name": "Direct IP-Hosted URL",
                "points": 20,
                "description": "Email contains hyperlinks pointing directly to raw IP addresses, bypassing standard DNS domain reputational security."
            })
        elif has_suspicious_tld:
            link_pts = 12
            factors.append({
                "name": "High-Abuse Domain TLD",
                "points": 12,
                "description": "Hyperlink uses a top-level domain frequently associated with automated malicious campaigns."
            })
        elif has_generic_link and (spam_probability > 0.4 or cred_pts > 0):
            link_pts = 5
            factors.append({
                "name": "External Call-to-Action Link",
                "points": 5,
                "description": "Contains external hyperlinks combined with elevated spam indicators."
            })

        # 4. Psychological Coercion & Urgency Pressure (0 - 15 points)
        coercion_signs = [s for s in detected_signs if any(k in s.get("category", "") for k in [
            "Suspension", "Restriction", "Urgency", "Pressure", "Deadline", "Unauthorized", "Security Alert"
        ])]
        if coercion_signs:
            has_suspension = any("Suspension" in s.get("category", "") or "Restriction" in s.get("category", "") for s in coercion_signs)
            coercion_pts = 12 if has_suspension else 7
            factors.append({
                "name": "Coercion & Urgency Pressure",
                "points": coercion_pts,
                "description": f"High-pressure psychological tactics detected ({', '.join([s['phrase'] for s in coercion_signs[:2]])})."
            })
        else:
            coercion_pts = 0

        # 5. Financial Windfall / Prize Lures (0 - 10 points)
        prize_signs = [s for s in detected_signs if any(k in s.get("category", "") for k in ["Prize", "Windfall", "Sweepstakes", "Lottery"])]
        if prize_signs:
            prize_pts = 10
            factors.append({
                "name": "Financial Windfall / Prize Lure",
                "points": 10,
                "description": f"Unsolicited lottery, prize award, or sweepstakes claim detected ({prize_signs[0]['phrase']})."
            })
        else:
            prize_pts = 0

        # 6. Bayesian Uncertainty Guardrail (0 - 25 points)
        # When model detects conflicting features in [0.35 - 0.65], assign baseline medium threat
        review_pts = 0
        if prediction == "NEEDS REVIEW":
            review_pts = 22
            factors.append({
                "name": "Bayesian Uncertainty Guardrail",
                "points": 22,
                "description": "Posterior probability falls into the uncertainty band [35% - 65%], requiring mandatory human verification."
            })

        # Calculate raw score
        raw_score = base_points + cred_pts + link_pts + coercion_pts + prize_pts + review_pts

        # Safety Guardrail: If email has NO high-severity credential harvesters, NO raw IP URLs,
        # NO suspension threats, and the classifier predicts LEGITIMATE, cap at Low Threat (max 25)
        is_safe_academic = (
            prediction == "LEGITIMATE" and
            spam_probability <= 0.35 and
            not has_ip_url and
            cred_pts == 0 and
            not any("Suspension" in s.get("category", "") for s in detected_signs)
        )
        if is_safe_academic:
            final_score = min(raw_score, 25)
        else:
            final_score = min(100, max(0, raw_score))

        # Interpret Threat Category based on standard bands:
        # 0 - 29: Low threat
        # 30 - 59: Medium threat
        # 60 - 79: High threat
        # 80 - 100: Critical threat
        if final_score >= 80:
            category = "Critical threat"
            band = "CRITICAL"
            color = "#EF4444"
            summary_reason = "Critical danger: Multi-vector attack combining high Bayesian spam probability with active credential/OTP harvesting, IP evasion URLs, or coercion."
        elif final_score >= 60:
            category = "High threat"
            band = "HIGH"
            color = "#F97316"
            summary_reason = "High threat: Aggressive phishing lures, suspicious destination domains, or deceptive financial windfall patterns identified."
        elif final_score >= 30:
            category = "Medium threat"
            band = "MEDIUM"
            color = "#FBBF24"
            summary_reason = "Medium threat: Borderline Bayesian characteristics or sensitive policy/account keywords requiring manual review before interaction."
        else:
            category = "Low threat"
            band = "LOW"
            color = "#10B981"
            summary_reason = "Low threat: Standard organizational communication. Zero deceptive weaponization, credential demands, or malicious indicators detected."

        return {
            "score": final_score,
            "category": category,
            "band": band,
            "color": color,
            "factors": factors,
            "summary_reason": summary_reason
        }

    def analyze_threat_xray(self, text: str, subject: str = "", sender: str = "",
                             influential_words: Optional[List[Dict[str, Any]]] = None,
                             prediction: str = "LEGITIMATE") -> Dict[str, Any]:
        """
        Threat X-Ray Engine: Transparent text analysis and security rule indicators.
        Analyzes the email content to detect specific suspicious phrases, credential-harvesting patterns,
        unexpected prize lures, urgency pressure, and untrusted links, without modifying model inference.
        """
        combined = f"{subject} {text}"
        detected_signs = []
        highlight_phrases = set()

        # Helper to register detected signs without duplicates
        def add_sign(phrase: str, category: str, severity: str, explanation: str, icon_type: str):
            clean_phrase = phrase.strip(" .,;:!?'\"()[]{}<>")
            if not clean_phrase or len(clean_phrase) < 2:
                return
            # Case-insensitive deduplication
            if not any(s["phrase"].lower() == clean_phrase.lower() for s in detected_signs):
                detected_signs.append({
                    "phrase": clean_phrase,
                    "category": category,
                    "severity": severity,
                    "explanation": explanation,
                    "icon_type": icon_type
                })
                highlight_phrases.add(clean_phrase)

        # 1. Credential & Password Requests (Severity: HIGH)
        cred_rules = [
            (r'\b(verify|enter|reset|change|confirm|update|submit|require|share|provide|send|input|type|give)\s+(your\s+|the\s+|an?\s+)?(password|passcode|pin|login|credentials|security\s+code)\b',
             "Credential Theft Risk", "HIGH",
             "Requests password, login credentials, or PIN verification. Legitimate services will never ask for your password via email.", "key"),
            (r'\b(your\s+password|account\s+password)\s+(is\s+required|has\s+expired|will\s+expire|was\s+compromised|is\s+compromised|reset|verification|expiry)\b',
             "Password Expiry / Verification Lure", "HIGH",
             "Claims password expiry or security compromise to prompt credential submission.", "key"),
            (r'\b(password\s+(reset|verification|required|request|expiry|compromised?))\b',
             "Password Action Request", "HIGH",
             "Prompts password entry or credential reset.", "key"),
            (r'\b(requesting|requires?|demanding?)\s+(your\s+|the\s+)?(password|credentials)\b',
             "Credential Demand", "HIGH",
             "Demands account credentials or password information.", "key"),
            (r'\b(wallet\s+credentials|private\s+key|seed\s+phrase|recovery\s+phrase|verify\s+wallet)\b',
             "Crypto Credential Theft", "HIGH",
             "Solicits cryptocurrency wallet recovery keys or credentials. Sharing these results in irreversible loss of assets.", "key"),
        ]

        # 2. OTP Requests & Two-Factor Harvesting (Severity: HIGH)
        otp_rules = [
            (r'\b(verify|enter|confirm|share|provide|send|input|submit|give)\s+(your\s+|the\s+|an?\s+)?(\d+[\s-]*(digit|char)?\s*)?(otp|one-time\s+password|one-time\s+passcode|auth\s+token|verification\s+code|security\s+code|2fa\s+code)\b',
             "OTP Harvesting Risk", "HIGH",
             "Requests a one-time verification passcode (OTP). Sharing an OTP exposes accounts to immediate takeover.", "key"),
            (r'\b(confirm|enter|verify|share|send|provide)\s+(your\s+|the\s+)?otp\b',
             "OTP Verification Request", "HIGH",
             "Prompts one-time passcode verification.", "key"),
            (r'\b(otp\s+(code|verification|sent|required|request))\b',
             "OTP Action Required", "HIGH",
             "Demands OTP code verification.", "key"),
            (r'\b(one-time\s+password|one-time\s+passcode)\b',
             "One-Time Password Reference", "HIGH",
             "References one-time authentication passcodes.", "key"),
        ]

        # 3. Urgency & Psychological Coercion (Severity: MEDIUM)
        urgency_rules = [
            (r'\b(urgent|urgently|immediate|immediately|act\s+now|claim\s+now|right\s+now|asap|as\s+soon\s+as\s+possible|do\s+not\s+delay|hurry)\b',
             "Urgency & Pressure", "MEDIUM",
             "Creates artificial time pressure to prompt quick action before you have time to verify the sender.", "clock"),
            (r'\b(within\s+\d+\s*(hours?|hrs?|minutes?|mins?|days?)|in\s+\d+\s*(hours?|hrs?|minutes?))\b',
             "Artificial Deadline", "MEDIUM",
             "Imposes a strict time window to prevent independent verification.", "clock"),
            (r'\b(final\s+notice|last\s+warning|last\s+chance|immediate\s+action\s+required|action\s+required|limited\s+time|expires?\s+(today|soon|immediately|within))\b',
             "High-Pressure Coercion", "MEDIUM",
             "Uses coercive warning terms claiming imminent negative consequences.", "clock"),
            (r'\b(time-sensitive|critical\s+alert|urgent\s+notice|immediate\s+response)\b',
             "Urgent Notice Lure", "MEDIUM",
             "Uses urgent alert tags to command immediate attention.", "clock"),
        ]

        # 4. Account Suspension Threats & Security Alerts (Severity: HIGH)
        suspension_rules = [
            (r'\b(account\s+(has\s+been\s+|is\s+|will\s+be\s+|temporarily\s+|permanently\s+)?suspended)\b',
             "Account Suspension Threat", "HIGH",
             "Threatens that your account is or will be suspended to provoke panic.", "alert"),
            (r'\b(account\s+suspension|suspension\s+of\s+your\s+account|threat\s+of\s+suspension)\b',
             "Account Suspension Notice", "HIGH",
             "Alleges account suspension to pressure immediate compliance.", "alert"),
            (r'\b(account\s+(locked|disabled|terminated|closed|restricted|deactivated|on\s+hold|flagged|frozen))\b',
             "Account Restriction Threat", "HIGH",
             "Claims account access is locked or restricted.", "alert"),
            (r'\b(unauthorized\s+(activity|access|login|transaction|charges?|sign-in))\b',
             "Security Alert Pretext", "HIGH",
             "Claims unauthorized activity was detected on your account.", "alert"),
            (r'\b(security\s+alert|security\s+warning|suspicious\s+activity\s+detected)\b',
             "Security Alert Pretext", "HIGH",
             "Manufactures a fake security alert to induce panic.", "alert"),
        ]

        # 5. Unexpected Prize & Financial Reward Lures (Severity: HIGH / MEDIUM)
        prize_rules = [
            (r'\b(you\s+(have\s+)?won\s+a\s+prize|you\s+have\s+won|you\'ve\s+won|you\s+are\s+a\s+winner|lottery\s+winner|congratulations\s+you\s+won|congratulations!\s*you\s+won)\b',
             "Unexpected Prize Offer", "HIGH",
             "Promises unexpected prizes, sweepstakes, or lottery winnings. Typically used as bait in advance-fee scams.", "gift"),
            (r'\b(claim\s+(your\s+)?(prize|reward|bonus|funds|cash|gift|winnings))\b',
             "Prize Claim Lure", "HIGH",
             "Entices the recipient to claim unprompted prize winnings.", "gift"),
            (r'\b(cash\s+prize|jackpot\s+winner|sweepstakes\s+winner|free\s+gift\s+card|inheritance\s+fund)\b',
             "Financial Windfall Lure", "HIGH",
             "Promises unexpected financial windfalls or gifts.", "gift"),
            (r'\b(wire\s+transfer|crypto\s+reward|transfer\s+of\s+\$|unclaimed\s+(funds|assets|prizes)|millions\s+of\s+dollars)\b',
             "Financial Windfall Lure", "MEDIUM",
             "Mentions wire transfers or unclaimed funds designed to capture financial attention.", "gift"),
        ]

        # 6. Unsolicited Links & Redirections (Severity: MEDIUM)
        link_rules = [
            (r'\b(click\s+(this\s+|the\s+)?link|click\s+here|follow\s+(this\s+|the\s+)?link|open\s+(this\s+|the\s+)?link|visit\s+(this\s+|the\s+)?link|download\s+(the\s+|this\s+)?attachment)\b',
             "Suspicious Call to Action", "MEDIUM",
             "Directs you to click an external link or download attachments, which can lead to phishing forms or malware.", "link"),
        ]

        # Run all regular expression rules with re.IGNORECASE
        all_rules = cred_rules + otp_rules + urgency_rules + suspension_rules + prize_rules + link_rules
        for pattern, category, severity, explanation, icon_type in all_rules:
            for m in re.finditer(pattern, combined, re.IGNORECASE):
                add_sign(m.group(0), category, severity, explanation, icon_type)

        # 7. Check for IP-hosted URLs (with or without http scheme)
        ip_regex = r'(?:https?://)?(?:\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?(?:/[^\s]*)?)'
        for m in re.finditer(ip_regex, combined, re.IGNORECASE):
            raw_match = m.group(0).strip(" .,;:!?'\"()[]{}<>")
            if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', raw_match):
                add_sign(
                    raw_match,
                    "Raw IP Address URL",
                    "HIGH",
                    "Links directly to an unverified numeric IP address rather than a legitimate named domain.",
                    "link"
                )

        # 8. Check for high-abuse TLDs
        tld_regex = r'https?://[^\s]+\.(xyz|tk|info|cc|top|click|fun|buzz|rest|live|vip)[^\s]*'
        for m in re.finditer(tld_regex, combined, re.IGNORECASE):
            raw_match = m.group(0).strip(" .,;:!?'\"()[]{}<>")
            add_sign(
                raw_match,
                "High-Abuse Domain TLD",
                "MEDIUM",
                "Uses a top-level domain frequently associated with disposable phishing domains.",
                "link"
            )

        # 9. Check sender spoofing indicators
        if sender:
            if re.search(r'\b(support|security|alert|admin|service)@', sender, re.IGNORECASE) and not re.search(r'\.(com|org|edu|gov|net)$', sender, re.IGNORECASE):
                add_sign(
                    sender,
                    "Sender Identity Anomaly",
                    "HIGH",
                    "Security or administrative sender username coming from a non-standard or disposable domain.",
                    "alert"
                )

        # 10. Check influential model tokens (incorporating Bayesian evidence)
        if influential_words:
            for item in influential_words:
                if item.get("leaning") == "SPAM" and item.get("impact_score", 0) > 1.2:
                    word = item["word"]
                    if re.search(rf'\b{re.escape(word)}\b', combined, re.IGNORECASE):
                        if not any(word.lower() in s["phrase"].lower() for s in detected_signs):
                            add_sign(
                                word,
                                "Statistical Bayesian Spam Term",
                                "LOW",
                                f"Vocabulary term with high conditional spam likelihood (P(w|Spam)={item['p_word_given_spam']} vs P(w|Ham)={item['p_word_given_ham']}).",
                                "cpu"
                            )
                        if len(detected_signs) >= 10:
                            break

        # Generate contextual Recommended Actions
        recommended_actions = []
        has_cred_risk = any(s["category"] in ["Credential Theft Risk", "OTP Harvesting Risk", "Crypto Credential Theft", "Password Expiry / Verification Lure", "Password Action Request", "Credential Demand", "OTP Verification Request", "OTP Action Required", "One-Time Password Reference"] for s in detected_signs)
        has_suspension = any("Suspension" in s["category"] or "Restriction" in s["category"] or "Security Alert" in s["category"] for s in detected_signs)
        has_prize_risk = any("Prize" in s["category"] or "Windfall" in s["category"] for s in detected_signs)
        has_link_risk = any("URL" in s["category"] or "Domain" in s["category"] or "Call to Action" in s["category"] for s in detected_signs)
        has_urgency_risk = any("Urgency" in s["category"] or "Pressure" in s["category"] or "Deadline" in s["category"] or "Coercion" in s["category"] for s in detected_signs)

        if has_cred_risk:
            recommended_actions.append("Never share passwords, PINs, or one-time passcodes (OTP) in response to any email.")
        if has_suspension:
            recommended_actions.append("Do not panic over account suspension warnings. Verify account status directly on the official website, not through email links.")
        if has_prize_risk:
            recommended_actions.append("Verify unexpected prize offers or lottery notices through an official source before providing details.")
        if has_link_risk:
            recommended_actions.append("Avoid clicking suspicious links or downloading unverified attachments.")
        if has_urgency_risk:
            recommended_actions.append("Take your time to verify urgent requests independently before taking action.")

        # Default / clean guidance if no warning signs detected
        if not detected_signs:
            recommended_actions.append("No common warning signs were detected. However, remain cautious with unexpected messages from unknown senders.")
            recommended_actions.append("Always verify organizational requests, invoices, or schedule changes through established official channels.")
        elif len(recommended_actions) < 2:
            recommended_actions.append("If unsure of an email's authenticity, contact the organization directly through verified contact details.")

        return {
            "has_warning_signs": len(detected_signs) > 0,
            "warning_count": len(detected_signs),
            "detected_phrases": detected_signs,
            "highlight_phrases": sorted(list(highlight_phrases), key=lambda x: len(x), reverse=True),
            "recommended_actions": recommended_actions,
            "analysis_disclaimer": "Threat X-Ray highlights suspicious phrasing and indicators using transparent security heuristics and Naive Bayes conditional evidence."
        }

# Global singleton
classifier_engine = SpamClassifierEngine()
try:
    classifier_engine.train()
except Exception as e:
    print(f"Initial model training deferred: {e}")
