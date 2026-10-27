import sqlite3
import json
import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "spamshield.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Scans table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        sender TEXT,
        subject TEXT,
        body_snippet TEXT,
        prediction TEXT NOT NULL,
        spam_probability REAL NOT NULL,
        ham_probability REAL NOT NULL,
        review_status TEXT NOT NULL,
        influential_words TEXT,
        rule_indicators TEXT,
        explanation TEXT,
        model_version TEXT
    )
    """)

    # Migrate scans table for bayes_breakdown and threat_xray column if missing
    cursor.execute("PRAGMA table_info(scans)")
    scan_cols = [row["name"] for row in cursor.fetchall()]
    if "bayes_breakdown" not in scan_cols:
        try:
            cursor.execute("ALTER TABLE scans ADD COLUMN bayes_breakdown TEXT")
        except Exception:
            pass
    if "threat_xray" not in scan_cols:
        try:
            cursor.execute("ALTER TABLE scans ADD COLUMN threat_xray TEXT")
        except Exception:
            pass
    if "graph_data" not in scan_cols:
        try:
            cursor.execute("ALTER TABLE scans ADD COLUMN graph_data TEXT")
        except Exception:
            pass
    if "threat_score" not in scan_cols:
        try:
            cursor.execute("ALTER TABLE scans ADD COLUMN threat_score TEXT")
        except Exception:
            pass

    # Check if existing feedback table has obsolete user_label column and drop to re-create
    cursor.execute("PRAGMA table_info(feedback)")
    cols = [row["name"] for row in cursor.fetchall()]
    if "user_label" in cols:
        cursor.execute("DROP TABLE feedback")

    # Feedback table with full error-correction & admin review schema
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scan_id TEXT NOT NULL,
        original_prediction TEXT NOT NULL,
        model_probability REAL NOT NULL,
        feedback_type TEXT NOT NULL,          -- 'CORRECT' or 'WRONG'
        corrected_category TEXT,              -- 'Spam' or 'Not Spam'
        comment TEXT,
        review_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
        timestamp TEXT NOT NULL,
        reviewed_at TEXT,
        reviewer_notes TEXT,
        FOREIGN KEY(scan_id) REFERENCES scans(id)
    )
    """)

    # Check and migrate columns in feedback if existing table was from previous schema
    cursor.execute("PRAGMA table_info(feedback)")
    cols = [row["name"] for row in cursor.fetchall()]
    needed_cols = {
        "original_prediction": "TEXT DEFAULT 'UNKNOWN'",
        "model_probability": "REAL DEFAULT 0.5",
        "feedback_type": "TEXT DEFAULT 'CORRECT'",
        "corrected_category": "TEXT",
        "review_status": "TEXT DEFAULT 'pending'",
        "reviewed_at": "TEXT",
        "reviewer_notes": "TEXT"
    }
    for col_name, col_def in needed_cols.items():
        if col_name not in cols:
            try:
                cursor.execute(f"ALTER TABLE feedback ADD COLUMN {col_name} {col_def}")
            except Exception:
                pass

    # Traffic events table (simulated network traffic for CO3)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS traffic_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        hour_slot TEXT NOT NULL,
        total_emails INTEGER NOT NULL,
        spam_count INTEGER NOT NULL,
        ham_count INTEGER NOT NULL,
        review_count INTEGER NOT NULL,
        sender_domain TEXT NOT NULL,
        is_anomaly INTEGER DEFAULT 0,
        z_score REAL DEFAULT 0.0
    )
    """)

    # Model evaluation runs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS model_evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        model_name TEXT NOT NULL,
        accuracy REAL NOT NULL,
        precision REAL NOT NULL,
        recall REAL NOT NULL,
        f1_score REAL NOT NULL,
        fpr REAL NOT NULL,
        fn_count INTEGER NOT NULL,
        test_size INTEGER NOT NULL,
        train_size INTEGER NOT NULL,
        confusion_matrix TEXT NOT NULL,
        mcnemar_statistic REAL,
        mcnemar_p_value REAL
    )
    """)

    # Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    # Default settings
    default_settings = {
        "uncertainty_low": "0.35",
        "uncertainty_high": "0.65",
        "privacy_store_body": "false",
        "laplace_alpha": "1.0",
        "model_version": "MultinomialNB-v2.4",
        "anomaly_z_threshold": "2.5"
    }

    for k, v in default_settings.items():
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v))

    conn.commit()
    conn.close()

def build_graph_data(scan_data: Dict[str, Any]) -> Dict[str, Any]:
    raw_spam = float(scan_data.get("spam_probability", 0.5))
    raw_ham = float(scan_data.get("ham_probability", 0.5))

    # Normalize to ensure complementary probabilities totaling 100%
    total = raw_spam + raw_ham
    if total > 0:
        spam_prob = raw_spam / total
        ham_prob = raw_ham / total
    else:
        spam_prob = 0.5
        ham_prob = 0.5

    # Compute percentages ensuring complementary sum equals exactly 100.0%
    spam_pct = round(spam_prob * 100.0, 1)
    ham_pct = round(100.0 - spam_pct, 1)

    pred = scan_data.get("prediction")
    if not pred:
        if spam_prob >= 0.65:
            pred = "SPAM"
        elif spam_prob <= 0.35:
            pred = "LEGITIMATE"
        else:
            pred = "NEEDS REVIEW"

    subj = scan_data.get("subject") or "Scanned Email"
    is_spam_pred = pred == "SPAM"
    is_ham_pred = pred in ("LEGITIMATE", "NOT_SPAM", "HAM")

    return {
        "chart_title": f"Probability Analysis — \"{subj}\"",
        "subject": subj,
        "prediction": pred,
        "bars": [
            {
                "category": "Spam",
                "probability": round(spam_prob, 6),
                "percentage": spam_pct,
                "is_predicted": is_spam_pred,
                "color": "#F59E51" if is_spam_pred else "#FC8181"
            },
            {
                "category": "Not Spam",
                "probability": round(ham_prob, 6),
                "percentage": ham_pct,
                "is_predicted": is_ham_pred,
                "color": "#10B981" if is_ham_pred else "#68D391"
            }
        ],
        "explanation": (
            f"Based on the Naive Bayes conditional probability analysis, this email has an estimated {spam_pct}% probability of being Spam "
            f"and {ham_pct}% probability of being Not Spam. The engine classifies it as {pred} because P({pred} | Evidence) exceeds the decision threshold."
        )
    }

def fallback_threat_score(row_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Calculates deterministic Threat Score for legacy scans lacking explicit threat_score JSON."""
    spam_p = float(row_dict.get("spam_probability", 0.5))
    pred = row_dict.get("prediction", "LEGITIMATE")
    base_pts = int(round(spam_p * 40.0))

    xray = row_dict.get("threat_xray")
    if isinstance(xray, str):
        try:
            xray = json.loads(xray)
        except Exception:
            xray = {}
    signs = xray.get("detected_phrases", []) if isinstance(xray, dict) else []

    cred_signs = [s for s in signs if any(k in s.get("category", "") for k in ["Credential", "Password", "OTP", "Auth", "One-Time Password"])]
    cred_pts = 20 if cred_signs else 0
    if len(cred_signs) > 1:
        cred_pts = 25

    link_signs = [s for s in signs if any(k in s.get("category", "") for k in ["URL", "Domain", "Link", "TLD"])]
    has_ip = any("IP" in s.get("category", "") for s in signs)
    link_pts = 20 if has_ip else (12 if link_signs else 0)

    coercion_signs = [s for s in signs if any(k in s.get("category", "") for k in ["Suspension", "Restriction", "Urgency", "Alert"])]
    coercion_pts = 12 if coercion_signs else 0

    prize_signs = [s for s in signs if any(k in s.get("category", "") for k in ["Prize", "Windfall", "Sweepstakes"])]
    prize_pts = 10 if prize_signs else 0

    review_pts = 22 if pred == "NEEDS REVIEW" else 0

    raw = base_pts + cred_pts + link_pts + coercion_pts + prize_pts + review_pts
    if pred == "LEGITIMATE" and spam_p <= 0.35 and cred_pts == 0 and not any("Suspension" in s.get("category", "") for s in signs):
        score = min(raw, 25)
    else:
        score = min(100, max(0, raw))

    if score >= 80:
        cat, band, color = "Critical threat", "CRITICAL", "#EF4444"
        summary = "Critical danger: Multi-vector attack combining high Bayesian spam probability with active credential/OTP harvesting, IP evasion URLs, or coercion."
    elif score >= 60:
        cat, band, color = "High threat", "HIGH", "#F97316"
        summary = "High threat: Aggressive phishing lures, suspicious destination domains, or deceptive financial windfall patterns identified."
    elif score >= 30:
        cat, band, color = "Medium threat", "MEDIUM", "#FBBF24"
        summary = "Medium threat: Borderline Bayesian characteristics or sensitive policy/account keywords requiring manual review before interaction."
    else:
        cat, band, color = "Low threat", "LOW", "#10B981"
        summary = "Low threat: Standard organizational communication. Zero deceptive weaponization, credential demands, or malicious indicators detected."

    factors = [{"name": "Bayesian Spam Likelihood", "points": base_pts, "description": f"Model evaluated P(Spam) at {round(spam_p * 100, 1)}%."}]
    if cred_pts:
        factors.append({"name": "Authentication Threat Risk", "points": cred_pts, "description": "Credential harvesting or passcode request patterns."})
    if link_pts:
        factors.append({"name": "Suspicious Link / Infrastructure", "points": link_pts, "description": "High-risk links or domain indicators."})
    if coercion_pts:
        factors.append({"name": "Psychological Coercion", "points": coercion_pts, "description": "Urgency or account suspension warnings."})
    if prize_pts:
        factors.append({"name": "Financial / Windfall Lure", "points": prize_pts, "description": "Unexpected prize or financial transfer lures."})
    if review_pts:
        factors.append({"name": "Bayesian Uncertainty Guardrail", "points": review_pts, "description": "Ambiguous evidence requiring human review."})

    return {
        "score": score,
        "category": cat,
        "band": band,
        "color": color,
        "factors": factors,
        "summary_reason": summary
    }

def save_scan(scan_data: Dict[str, Any]):
    conn = get_db()
    cursor = conn.cursor()
    graph_obj = scan_data.get("graph_data") or build_graph_data(scan_data)
    threat_obj = scan_data.get("threat_score") or fallback_threat_score(scan_data)
    cursor.execute("""
    INSERT INTO scans (
        id, timestamp, sender, subject, body_snippet, prediction,
        spam_probability, ham_probability, review_status, influential_words,
        rule_indicators, explanation, model_version, bayes_breakdown, threat_xray, graph_data, threat_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        scan_data["id"],
        scan_data.get("timestamp", datetime.now(timezone.utc).isoformat()),
        scan_data.get("sender", ""),
        scan_data.get("subject", ""),
        scan_data.get("body_snippet", ""),
        scan_data["prediction"],
        scan_data["spam_probability"],
        scan_data["ham_probability"],
        scan_data["review_status"],
        json.dumps(scan_data.get("influential_words", [])),
        json.dumps(scan_data.get("rule_indicators", [])),
        scan_data.get("explanation", ""),
        scan_data.get("model_version", "v1.0"),
        json.dumps(scan_data.get("bayes_breakdown", {})),
        json.dumps(scan_data.get("threat_xray", {})),
        json.dumps(graph_obj),
        json.dumps(threat_obj)
    ))
    conn.commit()
    conn.close()

def get_scans(limit: int = 50, offset: int = 0, search: str = "", filter_pred: str = ""):
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM scans WHERE 1=1"
    params = []
    if search:
        query += " AND (subject LIKE ? OR sender LIKE ? OR body_snippet LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
    if filter_pred:
        query += " AND prediction = ?"
        params.append(filter_pred)
    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()

    cursor.execute("SELECT COUNT(*) FROM scans")
    total = cursor.fetchone()[0]

    scans = []
    for row in rows:
        row_dict = dict(row)
        g_data = json.loads(row["graph_data"]) if ("graph_data" in row.keys() and row["graph_data"]) else build_graph_data(row_dict)
        t_score = None
        if "threat_score" in row.keys() and row["threat_score"]:
            try:
                t_score = json.loads(row["threat_score"])
            except Exception:
                pass
        if not t_score:
            t_score = fallback_threat_score(row_dict)

        scans.append({
            "id": row["id"],
            "timestamp": row["timestamp"],
            "sender": row["sender"],
            "subject": row["subject"],
            "body_snippet": row["body_snippet"],
            "prediction": row["prediction"],
            "spam_probability": row["spam_probability"],
            "ham_probability": row["ham_probability"],
            "review_status": row["review_status"],
            "influential_words": json.loads(row["influential_words"] or "[]"),
            "rule_indicators": json.loads(row["rule_indicators"] or "[]"),
            "explanation": row["explanation"],
            "model_version": row["model_version"],
            "bayes_breakdown": json.loads(row["bayes_breakdown"]) if ("bayes_breakdown" in row.keys() and row["bayes_breakdown"]) else None,
            "threat_xray": json.loads(row["threat_xray"]) if ("threat_xray" in row.keys() and row["threat_xray"]) else None,
            "graph_data": g_data,
            "threat_score": t_score
        })
    conn.close()
    return scans, total

def get_latest_scan() -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scans ORDER BY timestamp DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    row_dict = dict(row)
    g_data = json.loads(row["graph_data"]) if ("graph_data" in row.keys() and row["graph_data"]) else build_graph_data(row_dict)
    t_score = None
    if "threat_score" in row.keys() and row["threat_score"]:
        try:
            t_score = json.loads(row["threat_score"])
        except Exception:
            pass
    if not t_score:
        t_score = fallback_threat_score(row_dict)

    return {
        "id": row["id"],
        "timestamp": row["timestamp"],
        "sender": row["sender"],
        "subject": row["subject"],
        "body_snippet": row["body_snippet"],
        "prediction": row["prediction"],
        "spam_probability": row["spam_probability"],
        "ham_probability": row["ham_probability"],
        "review_status": row["review_status"],
        "influential_words": json.loads(row["influential_words"] or "[]"),
        "rule_indicators": json.loads(row["rule_indicators"] or "[]"),
        "explanation": row["explanation"],
        "model_version": row["model_version"],
        "bayes_breakdown": json.loads(row["bayes_breakdown"]) if ("bayes_breakdown" in row.keys() and row["bayes_breakdown"]) else None,
        "threat_xray": json.loads(row["threat_xray"]) if ("threat_xray" in row.keys() and row["threat_xray"]) else None,
        "graph_data": g_data,
        "threat_score": t_score
    }

def get_scan_by_id(scan_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scans WHERE id = ?", (scan_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    row_dict = dict(row)
    g_data = json.loads(row["graph_data"]) if ("graph_data" in row.keys() and row["graph_data"]) else build_graph_data(row_dict)
    t_score = None
    if "threat_score" in row.keys() and row["threat_score"]:
        try:
            t_score = json.loads(row["threat_score"])
        except Exception:
            pass
    if not t_score:
        t_score = fallback_threat_score(row_dict)

    return {
        "id": row["id"],
        "timestamp": row["timestamp"],
        "sender": row["sender"],
        "subject": row["subject"],
        "body_snippet": row["body_snippet"],
        "prediction": row["prediction"],
        "spam_probability": row["spam_probability"],
        "ham_probability": row["ham_probability"],
        "review_status": row["review_status"],
        "influential_words": json.loads(row["influential_words"] or "[]"),
        "rule_indicators": json.loads(row["rule_indicators"] or "[]"),
        "explanation": row["explanation"],
        "model_version": row["model_version"],
        "bayes_breakdown": json.loads(row["bayes_breakdown"]) if ("bayes_breakdown" in row.keys() and row["bayes_breakdown"]) else None,
        "threat_xray": json.loads(row["threat_xray"]) if ("threat_xray" in row.keys() and row["threat_xray"]) else None,
        "graph_data": g_data,
        "threat_score": t_score
    }

def delete_scan(scan_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM scans WHERE id = ?", (scan_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def get_dashboard_stats():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM scans")
    total_scans = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM scans WHERE prediction = 'SPAM'")
    spam_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM scans WHERE prediction IN ('LEGITIMATE', 'NOT SPAM')")
    legit_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM scans WHERE prediction = 'NEEDS REVIEW'")
    review_count = cursor.fetchone()[0]

    # Recent scans
    cursor.execute("SELECT * FROM scans ORDER BY timestamp DESC LIMIT 6")
    recent = []
    for row in cursor.fetchall():
        recent.append({
            "id": row["id"],
            "timestamp": row["timestamp"],
            "sender": row["sender"],
            "subject": row["subject"],
            "prediction": row["prediction"],
            "spam_probability": row["spam_probability"],
            "review_status": row["review_status"]
        })

    conn.close()
    return {
        "total_scans": total_scans,
        "spam_count": spam_count,
        "legit_count": legit_count,
        "review_count": review_count,
        "recent_scans": recent
    }

def get_settings() -> Dict[str, str]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    settings = {row["key"]: row["value"] for row in cursor.fetchall()}
    conn.close()
    return settings

def update_settings(new_settings: Dict[str, str]):
    conn = get_db()
    cursor = conn.cursor()
    for k, v in new_settings.items():
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, str(v)))
    conn.commit()
    conn.close()

# -------------------------------------------------------------
# Prediction Feedback & Error Correction (Requirements 1, 2, 3, 5, 7, 8)
# -------------------------------------------------------------
def save_feedback(data: Dict[str, Any]) -> int:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO feedback (
        scan_id, original_prediction, model_probability,
        feedback_type, corrected_category, comment,
        review_status, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data["scan_id"],
        data.get("original_prediction", "UNKNOWN"),
        float(data.get("model_probability", 0.5)),
        data["feedback_type"],  # 'CORRECT' or 'WRONG'
        data.get("corrected_category"),  # 'Spam', 'Not Spam', or None
        data.get("comment", ""),
        data.get("review_status", "pending"),  # 'pending' ensures quarantine from training
        data.get("timestamp", datetime.now(timezone.utc).isoformat())
    ))
    conn.commit()
    feedback_id = cursor.lastrowid
    conn.close()
    return feedback_id

def get_feedback_summary() -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM feedback")
    total_feedback = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM feedback WHERE feedback_type = 'CORRECT'")
    correct_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM feedback WHERE feedback_type = 'WRONG'")
    wrong_count = cursor.fetchone()[0]

    # False Positive reported: Model predicted SPAM, but human corrected to Not Spam / Legitimate
    cursor.execute("""
    SELECT COUNT(*) FROM feedback
    WHERE feedback_type = 'WRONG'
      AND original_prediction = 'SPAM'
      AND (corrected_category LIKE '%Not Spam%' OR corrected_category LIKE '%LEGITIMATE%')
    """)
    false_positives_reported = cursor.fetchone()[0]

    # False Negative reported: Model predicted LEGITIMATE/NOT SPAM, but human corrected to Spam
    cursor.execute("""
    SELECT COUNT(*) FROM feedback
    WHERE feedback_type = 'WRONG'
      AND original_prediction IN ('LEGITIMATE', 'NOT SPAM')
      AND (corrected_category LIKE '%Spam%' OR corrected_category = 'SPAM')
    """)
    false_negatives_reported = cursor.fetchone()[0]

    # Uncertain review resolved: Model predicted NEEDS REVIEW
    cursor.execute("""
    SELECT COUNT(*) FROM feedback
    WHERE original_prediction = 'NEEDS REVIEW'
    """)
    uncertain_reviews_resolved = cursor.fetchone()[0]

    # Admin verification counts
    cursor.execute("SELECT COUNT(*) FROM feedback WHERE review_status = 'verified'")
    verified_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM feedback WHERE review_status = 'pending'")
    pending_count = cursor.fetchone()[0]

    # Recent feedback entries joined with scan subjects
    cursor.execute("""
    SELECT f.*, s.subject, s.body_snippet, s.sender
    FROM feedback f
    LEFT JOIN scans s ON f.scan_id = s.id
    ORDER BY f.timestamp DESC
    LIMIT 10
    """)
    recent = []
    for r in cursor.fetchall():
        recent.append({
            "id": r["id"],
            "scan_id": r["scan_id"],
            "subject": r["subject"] or "Scanned Email",
            "sender": r["sender"] or "—",
            "original_prediction": r["original_prediction"],
            "model_probability": r["model_probability"],
            "feedback_type": r["feedback_type"],
            "corrected_category": r["corrected_category"],
            "comment": r["comment"],
            "review_status": r["review_status"] or "pending",
            "timestamp": r["timestamp"],
            "reviewed_at": r["reviewed_at"],
            "reviewer_notes": r["reviewer_notes"]
        })

    conn.close()
    return {
        "total_feedback": total_feedback,
        "correct_count": correct_count,
        "wrong_count": wrong_count,
        "accuracy_perception_rate": round((correct_count / total_feedback * 100), 1) if total_feedback > 0 else 0.0,
        "false_positives_reported": false_positives_reported,
        "false_negatives_reported": false_negatives_reported,
        "uncertain_reviews_resolved": uncertain_reviews_resolved,
        "verified_count": verified_count,
        "pending_count": pending_count,
        "recent_feedback": recent
    }

def update_feedback_review_status(feedback_id: int, status: str, notes: str = ""):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE feedback
    SET review_status = ?, reviewed_at = ?, reviewer_notes = ?
    WHERE id = ?
    """, (status, datetime.now(timezone.utc).isoformat(), notes, feedback_id))
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated

def get_verified_feedback_samples() -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT f.*, s.subject, s.body_snippet
    FROM feedback f
    JOIN scans s ON f.scan_id = s.id
    WHERE f.review_status = 'verified' AND f.corrected_category IS NOT NULL
    """)
    samples = []
    for r in cursor.fetchall():
        samples.append({
            "id": r["id"],
            "scan_id": r["scan_id"],
            "text": f"{r['subject']} {r['body_snippet']}".strip(),
            "target": 1 if 'spam' in r['corrected_category'].lower() else 0,
            "corrected_category": r["corrected_category"],
            "original_prediction": r["original_prediction"]
        })
    conn.close()
    return samples
