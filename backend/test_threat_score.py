from model import classifier_engine
from typing import List, Dict, Any

def calculate_threat_score(
    text: str,
    subject: str = "",
    sender: str = "",
    spam_probability: float = 0.5,
    detected_signs: List[Dict[str, Any]] = None,
    rule_indicators: List[Dict[str, Any]] = None,
    prediction: str = "LEGITIMATE"
) -> Dict[str, Any]:
    detected_signs = detected_signs or []
    rule_indicators = rule_indicators or []
    factors = []

    # 1. Base statistical risk from Bayesian Classifier (0 - 40 points)
    base_points = int(round(spam_probability * 40.0))
    factors.append({
        "name": "Bayesian Spam Likelihood",
        "points": base_points,
        "description": f"Model evaluated P(Spam) at {round(spam_probability * 100, 1)}% based on vocabulary feature likelihoods."
    })

    # 2. Credential & Authentication Theft Risk (0 - 25 points)
    cred_signs = [s for s in detected_signs if any(k in s["category"] for k in [
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
    coercion_signs = [s for s in detected_signs if any(k in s["category"] for k in [
        "Suspension", "Restriction", "Urgency", "Pressure", "Deadline", "Unauthorized", "Security Alert"
    ])]
    if coercion_signs:
        has_suspension = any("Suspension" in s["category"] or "Restriction" in s["category"] for s in coercion_signs)
        coercion_pts = 12 if has_suspension else 7
        factors.append({
            "name": "Coercion & Urgency Pressure",
            "points": coercion_pts,
            "description": f"High-pressure psychological tactics detected ({', '.join([s['phrase'] for s in coercion_signs[:2]])})."
        })
    else:
        coercion_pts = 0

    # 5. Financial Windfall / Prize Lures (0 - 10 points)
    prize_signs = [s for s in detected_signs if any(k in s["category"] for k in ["Prize", "Windfall", "Sweepstakes", "Lottery"])]
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

test_emails = [
    ("Password & OTP Phishing", "URGENT: Security alert - Verify your password & confirm your OTP immediately", "Dear customer, unauthorized activity was detected on your account. Your account has been suspended! Please verify your password and confirm your OTP at http://192.168.1.105/auth within 24 hours to prevent permanent account suspension."),
    ("Sweepstakes Prize Scam", "CONGRATULATIONS: You have won a prize of $25,000 in our international sweepstakes!", "Dear lucky winner, you have won a prize in our exclusive giveaway! Claim now by clicking this link or verify your password at http://claim-funds.xyz immediately to process the wire transfer of your cash prize."),
    ("Normal College Email", "Project Meeting & Action Items Sync", "Hi team, please find attached the meeting minutes and project notes from our discussion today. Reminder that our weekly review is scheduled for tomorrow at 2 PM in Room 402."),
    ("Borderline Email", "Campus password security update", "Security update: Annual password policy update for university accounts.")
]

for label, subj, body in test_emails:
    res = classifier_engine.classify(body, subject=subj)
    ts = calculate_threat_score(
        text=body,
        subject=subj,
        sender="",
        spam_probability=res["spam_probability"],
        detected_signs=res["threat_xray"]["detected_phrases"],
        rule_indicators=res["rule_indicators"],
        prediction=res["prediction"]
    )
    print(f"=== {label} ===")
    print(f"P(Spam): {res['spam_probability'] * 100:.1f}% | Prediction: {res['prediction']}")
    print(f"Threat Score: {ts['score']}/100 [{ts['category']}] ({ts['band']})")
    print(f"Factors: {[f['name'] + ' (+' + str(f['points']) + ')' for f in ts['factors']]}")
    print(f"Summary: {ts['summary_reason']}\n")
