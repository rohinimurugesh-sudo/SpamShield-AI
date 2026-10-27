import io
import re
from datetime import datetime, timezone
from typing import Dict, Any, List

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Group

# SpamShield AI Theme Colors
COLOR_DARK_BG = colors.HexColor("#1A0B2E")      # Deep dark purple
COLOR_PRIMARY = colors.HexColor("#804A8A")      # SpamShield purple
COLOR_PEACH = colors.HexColor("#F8D299")        # Light peach accent
COLOR_ORANGE = colors.HexColor("#F59E51")       # Alert orange
COLOR_DEEP_PURPLE = colors.HexColor("#3A0353")  # Brand deep purple
COLOR_TEXT_MAIN = colors.HexColor("#1A1A24")    # Dark text for crisp PDF reading
COLOR_TEXT_MUTED = colors.HexColor("#5A5266")   # Muted body text
COLOR_CARD_BG = colors.HexColor("#F9F6FC")      # Soft lavender card background
COLOR_CARD_BORDER = colors.HexColor("#D8C8E8")  # Border line
COLOR_DANGER = colors.HexColor("#DC2626")       # Red for High Severity
COLOR_SUCCESS = colors.HexColor("#16A34A")      # Green for Legitimate

def sanitize_sensitive_content(text: str) -> str:
    """
    Redact passwords, OTP tokens, private keys, and sensitive credentials
    to prevent credential leakage in audit PDF reports.
    """
    if not text:
        return ""
    
    # 1. Redact explicit password/passcode values
    text = re.sub(
        r'(?i)\b(?:your\s+|the\s+)?(password|passcode|pin|credentials?|secret)\s*(?:is|was|[:=])?\s*([^\s,;]+)',
        r'\1: [REDACTED_CREDENTIAL]',
        text
    )
    # 2. Redact OTP / 2FA numbers (4 to 8 digits)
    text = re.sub(
        r'(?i)\b(otp|one-time\s+pass(?:word|code)|auth\s+token|verification\s+code|security\s+code|2fa\s+code)\s*(?:is|was|[:=])?\s*([0-9]{4,8})\b',
        r'\1: [REDACTED_OTP]',
        text
    )
    # 3. Redact standalone OTP / auth digits following keywords
    text = re.sub(
        r'(?i)(enter|confirm|verify|share|send|provide|input|type)\s+(?:the\s+|your\s+|an?\s+)?(\d{4,8})\b',
        r'\1 [REDACTED_OTP]',
        text
    )
    # 4. Redact potential private keys or seed phrases
    text = re.sub(
        r'(?i)\b(0x[a-fA-F0-9]{32,64})\b',
        r'[REDACTED_CRYPTO_KEY]',
        text
    )
    return text

def generate_probability_bar_chart(scan: Dict[str, Any], subject: str) -> Drawing:
    """
    Renders a dedicated vector bar chart for this specific email's detection:
    - X-axis: Spam and Not Spam
    - Y-axis: 0% to 100%
    - Exact percentages labeled above each bar
    - Highlighted predicted classification
    - Clean dark-purple themed styling
    """
    spam_prob = float(scan.get("spam_probability", 0.5))
    ham_prob = float(scan.get("ham_probability", 0.5))
    spam_pct = round(spam_prob * 100, 1)
    ham_pct = round(ham_prob * 100, 1)
    pred = scan.get("prediction", "SPAM" if spam_prob >= 0.5 else "LEGITIMATE")
    is_spam = pred == "SPAM"

    draw_width = 540
    draw_height = 145
    d = Drawing(draw_width, draw_height)

    # Card background
    d.add(Rect(0, 0, draw_width, draw_height, fillColor=COLOR_CARD_BG, strokeColor=COLOR_CARD_BORDER, strokeWidth=1, rx=8, ry=8))

    # Title: Probability Analysis — [Email Subject]
    clean_subj = subject.strip() if subject else "Scanned Email"
    truncated_subj = clean_subj if len(clean_subj) <= 46 else clean_subj[:43] + "..."
    chart_title = f"Probability Analysis — \"{truncated_subj}\""
    d.add(String(16, draw_height - 24, chart_title, fontSize=11, fontName="Helvetica-Bold", fillColor=COLOR_DEEP_PURPLE))

    # Badge in top right: PREDICTED CLASSIFICATION
    badge_w = 140
    badge_x = draw_width - badge_w - 16
    badge_bg = COLOR_DANGER if is_spam else COLOR_SUCCESS
    d.add(Rect(badge_x, draw_height - 28, badge_w, 18, fillColor=badge_bg, strokeColor=None, rx=4, ry=4))
    badge_label = f"PREDICTED: {pred}"
    d.add(String(badge_x + 10, draw_height - 23, badge_label, fontSize=8.5, fontName="Helvetica-Bold", fillColor=colors.white))

    # Base line and grid
    base_y = 34
    chart_top_y = 108
    chart_h = chart_top_y - base_y
    axis_x_start = 55
    axis_x_end = draw_width - 30

    for pct, label in [(0, "0%"), (25, "25%"), (50, "50%"), (75, "75%"), (100, "100%")]:
        y_pos = base_y + (pct / 100.0) * chart_h
        d.add(Line(axis_x_start, y_pos, axis_x_end, y_pos, strokeColor=colors.HexColor("#E2D9EC"), strokeWidth=0.5))
        d.add(String(24, y_pos - 3, label, fontSize=7.5, fontName="Helvetica", fillColor=COLOR_TEXT_MUTED))

    # Bars: Spam and Not Spam
    bar_w = 80
    spam_x = 150
    ham_x = 320

    spam_bar_h = max(3, (spam_prob * chart_h))
    ham_bar_h = max(3, (ham_prob * chart_h))

    spam_fill = COLOR_ORANGE if is_spam else colors.HexColor("#FCA5A5")
    spam_stroke = COLOR_DANGER if is_spam else colors.HexColor("#EF4444")
    ham_fill = COLOR_SUCCESS if not is_spam else colors.HexColor("#86EFAC")
    ham_stroke = colors.HexColor("#15803D") if not is_spam else colors.HexColor("#22C55E")

    # Draw Spam bar
    d.add(Rect(spam_x, base_y, bar_w, spam_bar_h, fillColor=spam_fill, strokeColor=spam_stroke, strokeWidth=1.8 if is_spam else 0.8, rx=4, ry=4))
    d.add(String(spam_x + 20, base_y + spam_bar_h + 5, f"{spam_pct}%", fontSize=9.5, fontName="Helvetica-Bold", fillColor=COLOR_DANGER if is_spam else COLOR_TEXT_MAIN))
    d.add(String(spam_x + 22, base_y - 14, "Spam", fontSize=9.5, fontName="Helvetica-Bold" if is_spam else "Helvetica", fillColor=COLOR_DEEP_PURPLE))

    # Draw Not Spam bar
    d.add(Rect(ham_x, base_y, bar_w, ham_bar_h, fillColor=ham_fill, strokeColor=ham_stroke, strokeWidth=1.8 if not is_spam else 0.8, rx=4, ry=4))
    d.add(String(ham_x + 18, base_y + ham_bar_h + 5, f"{ham_pct}%", fontSize=9.5, fontName="Helvetica-Bold", fillColor=COLOR_SUCCESS if not is_spam else COLOR_TEXT_MAIN))
    d.add(String(ham_x + 14, base_y - 14, "Not Spam", fontSize=9.5, fontName="Helvetica-Bold" if not is_spam else "Helvetica", fillColor=COLOR_DEEP_PURPLE))

    return d

def build_pdf_report(scan: Dict[str, Any]) -> bytes:
    """
    Generate a professional PDF Security Audit Report for a given email scan.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=COLOR_DEEP_PURPLE
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=COLOR_PRIMARY
    )

    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=COLOR_DEEP_PURPLE,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=COLOR_TEXT_MAIN
    )

    body_muted = ParagraphStyle(
        'BodyMuted',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=COLOR_TEXT_MUTED
    )

    mono_style = ParagraphStyle(
        'Mono',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=COLOR_DEEP_PURPLE
    )

    badge_spam = ParagraphStyle(
        'BadgeSpam',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=COLOR_DANGER
    )

    badge_legit = ParagraphStyle(
        'BadgeLegit',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=COLOR_SUCCESS
    )

    badge_review = ParagraphStyle(
        'BadgeReview',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=COLOR_ORANGE
    )

    elements = []

    # 1. Header Banner Table
    scan_id = scan.get("id", "SCAN-UNKNOWN")
    raw_timestamp = scan.get("timestamp", datetime.now(timezone.utc).isoformat())
    try:
        dt = datetime.fromisoformat(raw_timestamp.replace("Z", "+00:00"))
        formatted_date = dt.strftime("%B %d, %Y - %H:%M:%S UTC")
    except Exception:
        formatted_date = str(raw_timestamp)

    header_data = [
        [
            Paragraph("<b>SpamShield AI</b>", title_style),
            Paragraph("<b>SECURITY AUDIT REPORT</b>", ParagraphStyle('RHead', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=COLOR_PRIMARY, alignment=2))
        ],
        [
            Paragraph("Intelligent Email Security & Bayesian Threat Assessment", subtitle_style),
            Paragraph(f"<b>Scan ID:</b> {scan_id}<br/><b>Audit Date:</b> {formatted_date}", ParagraphStyle('RSub', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=11, textColor=COLOR_TEXT_MUTED, alignment=2))
        ]
    ]

    header_table = Table(header_data, colWidths=[3.8 * inch, 3.7 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_DEEP_PURPLE, spaceBefore=2, spaceAfter=14))

    # 2. Executive Summary Card
    pred = scan.get("prediction", "UNKNOWN")
    spam_prob = float(scan.get("spam_probability", 0.0))
    ham_prob = float(scan.get("ham_probability", 1.0 - spam_prob))
    spam_pct = f"{round(spam_prob * 100, 1)}%"
    ham_pct = f"{round(ham_prob * 100, 1)}%"

    if pred == "SPAM":
        pred_badge = Paragraph("<b>CRITICAL ALERT: CLASSIFIED AS SPAM</b>", badge_spam)
        decision_box_color = colors.HexColor("#FEE2E2")
        decision_border = COLOR_DANGER
    elif pred == "NEEDS REVIEW":
        pred_badge = Paragraph("<b>AMBIGUOUS EVIDENCE: FLAGGED FOR HUMAN REVIEW</b>", badge_review)
        decision_box_color = colors.HexColor("#FEF3C7")
        decision_border = COLOR_ORANGE
    else:
        pred_badge = Paragraph("<b>VERIFIED SAFE: CLASSIFIED AS LEGITIMATE (NOT SPAM)</b>", badge_legit)
        decision_box_color = colors.HexColor("#DCFCE7")
        decision_border = COLOR_SUCCESS

    t_score_data = scan.get("threat_score") or {}
    t_score_val = t_score_data.get("score")
    t_score_cat = t_score_data.get("category", "Unrated")
    t_score_text = f"<b>Threat Score:</b> <font size=11 color='{COLOR_DEEP_PURPLE.hexval()}'><b>{t_score_val}/100</b></font> ({t_score_cat})" if t_score_val is not None else "<b>Threat Score:</b> N/A"

    summary_data = [
        [pred_badge, ""],
        [
            Paragraph(f"<b>P(Spam | Email):</b> <font size=12 color='{COLOR_DEEP_PURPLE.hexval()}'><b>{spam_pct}</b></font>", body_style),
            Paragraph(f"<b>P(Not Spam | Email):</b> <font size=12 color='{COLOR_PRIMARY.hexval()}'><b>{ham_pct}</b></font>", body_style)
        ],
        [
            Paragraph(t_score_text, body_style),
            Paragraph(f"<b>Model Engine:</b> {scan.get('model_version', 'MultinomialNB (Laplace alpha=1.0)')}", body_muted)
        ],
        [
            Paragraph(f"<b>Prior Base Rate:</b> Spam {round(scan.get('bayes_breakdown', {}).get('p_prior_spam', 0.4906) * 100, 1)}% | Legitimate {round(scan.get('bayes_breakdown', {}).get('p_prior_ham', 0.5094) * 100, 1)}%", body_muted),
            Paragraph(f"<b>Decision Status:</b> {scan.get('review_status', 'AUTOMATIC_CLASSIFICATION')}", body_muted)
        ]
    ]

    summary_table = Table(summary_data, colWidths=[3.75 * inch, 3.75 * inch])
    summary_table.setStyle(TableStyle([
        ('SPAN', (0, 0), (1, 0)),
        ('BACKGROUND', (0, 0), (-1, -1), decision_box_color),
        ('BOX', (0, 0), (-1, -1), 1.2, decision_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 14))

    # 3. Email Information & Sanitized Content
    elements.append(Paragraph("<b>Email Information & Forensic Context</b>", section_header_style))

    raw_subject = scan.get("subject", "No subject line provided")
    raw_sender = scan.get("sender", "Unknown sender")
    raw_body = scan.get("body_snippet", "")

    sanitized_subject = sanitize_sensitive_content(raw_subject)
    sanitized_sender = sanitize_sensitive_content(raw_sender)
    sanitized_body = sanitize_sensitive_content(raw_body)

    meta_rows = [
        [Paragraph("<b>Subject:</b>", body_style), Paragraph(sanitized_subject, body_style)],
        [Paragraph("<b>Sender:</b>", body_style), Paragraph(sanitized_sender, body_style)],
        [
            Paragraph("<b>Redacted Body Excerpt:</b>", body_style),
            Paragraph(sanitized_body if sanitized_body else "<i>(Full body redacted for privacy according to storage configuration)</i>", body_muted)
        ]
    ]
    meta_table = Table(meta_rows, colWidths=[1.5 * inch, 6.0 * inch])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_CARD_BG),
        ('BOX', (0, 0), (-1, -1), 0.8, COLOR_CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_CARD_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 12))

    # 4. Individual Probability Analysis Graph & Conditional Probability Explanation
    elements.append(Paragraph("<b>Probability Analysis & Conditional Probability Graph</b>", section_header_style))
    prob_chart = generate_probability_bar_chart(scan, sanitized_subject)
    elements.append(prob_chart)
    elements.append(Spacer(1, 6))

    spam_pct_val = round(spam_prob * 100, 1)
    ham_pct_val = round(ham_prob * 100, 1)
    influential_list = scan.get("influential_words", [])
    top_words = ", ".join([f"'{w['word']}' ({w.get('leaning', 'SPAM')})" for w in influential_list[:4]]) if influential_list else "vocabulary evidence tokens"
    chart_explanation = (
        f"<b>Conditional Probability Evaluation:</b> The engine evaluated this email using Bayes' Theorem: "
        f"<i>P(Spam | Email) = P(Email | Spam) × P(Spam) / P(Email)</i>. "
        f"Based on feature likelihoods (influential words: {top_words}), the computed posterior probability is "
        f"<b>{spam_pct_val}% Spam</b> vs <b>{ham_pct_val}% Not Spam</b>. "
        f"The message is assigned to <b>{pred}</b> because its evidence score heavily outweighs the alternative classification."
    )
    elements.append(Paragraph(chart_explanation, body_style))
    elements.append(Spacer(1, 14))

    # 5. Threat X-Ray Findings
    threat_xray = scan.get("threat_xray") or {}
    detected_signs = threat_xray.get("detected_phrases", [])
    has_warning_signs = threat_xray.get("has_warning_signs", len(detected_signs) > 0)

    elements.append(Paragraph("<b>Threat X-Ray Forensic Indicators</b>", section_header_style))

    if has_warning_signs and detected_signs:
        signs_table_data = [
            [
                Paragraph("<b>Detected Indicator</b>", ParagraphStyle('TH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.5, textColor=COLOR_DEEP_PURPLE)),
                Paragraph("<b>Threat Category</b>", ParagraphStyle('TH2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.5, textColor=COLOR_DEEP_PURPLE)),
                Paragraph("<b>Severity</b>", ParagraphStyle('TH3', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.5, textColor=COLOR_DEEP_PURPLE)),
                Paragraph("<b>Forensic Explanation</b>", ParagraphStyle('TH4', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.5, textColor=COLOR_DEEP_PURPLE))
            ]
        ]

        for sign in detected_signs:
            sev = sign.get("severity", "MEDIUM")
            sev_color = COLOR_DANGER if sev == "HIGH" else (COLOR_ORANGE if sev == "MEDIUM" else COLOR_PRIMARY)
            phrase = sanitize_sensitive_content(sign.get("phrase", ""))

            signs_table_data.append([
                Paragraph(f"<b>\"{phrase}\"</b>", mono_style),
                Paragraph(sign.get("category", "Suspicious Pattern"), body_style),
                Paragraph(f"<b>{sev}</b>", ParagraphStyle('Sev', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, textColor=sev_color)),
                Paragraph(sign.get("explanation", ""), body_muted)
            ])

        xray_table = Table(signs_table_data, colWidths=[1.8 * inch, 1.6 * inch, 0.9 * inch, 3.2 * inch])
        xray_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#EDE9FE")),
            ('BOX', (0, 0), (-1, -1), 0.8, COLOR_CARD_BORDER),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_CARD_BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(xray_table)
    else:
        clean_msg = [
            [Paragraph("<b>Status: CLEAN AUDIT</b><br/>No common warning signs detected (passwords, OTPs, high urgency, account suspensions, or raw IP URLs). Linguistic pattern is consistent with legitimate institutional communication.", body_style)]
        ]
        clean_table = Table(clean_msg, colWidths=[7.5 * inch])
        clean_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F0FDF4")),
            ('BOX', (0, 0), (-1, -1), 1.0, COLOR_SUCCESS),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(clean_table)

    elements.append(Spacer(1, 14))

    # 5. Safety Recommendations Checklist
    elements.append(Paragraph("<b>Recommended Safety Actions</b>", section_header_style))
    recs = threat_xray.get("recommended_actions", [])
    if not recs:
        if pred == "SPAM":
            recs = [
                "Do not reply to this email or click any embedded hyperlinks.",
                "Never share your account password, passcode, or OTP under any circumstance.",
                "Report this email to your organization's IT security department as a phishing attempt.",
                "If you entered credentials, reset your password immediately from an official browser bookmark."
            ]
        else:
            recs = [
                "Verified safe linguistic structure. Standard caution with unexpected sender addresses applies.",
                "Always verify unexpected invoices, bank account updates, or financial requests via out-of-band communication.",
                "Maintain multi-factor authentication (MFA/2FA) on all institutional and personal accounts."
            ]

    rec_items = [[Paragraph(f"• {r}", body_style)] for r in recs]
    rec_table = Table(rec_items, colWidths=[7.5 * inch])
    rec_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_CARD_BG),
        ('BOX', (0, 0), (-1, -1), 0.8, COLOR_CARD_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(rec_table)
    elements.append(Spacer(1, 14))

    # 6. Mathematical Explanation (only when supported by actual model)
    bayes = scan.get("bayes_breakdown")
    if bayes and isinstance(bayes, dict):
        elements.append(KeepTogether([
            Paragraph("<b>Bayesian Statistical Breakdown & Mathematical Proof</b>", section_header_style),
            Paragraph(
                "SpamShield AI applies Bayes' Theorem with Laplace-smoothed conditional word likelihoods: "
                "<b>P(Spam | Words) = [ P(Words | Spam) × P(Spam) ] / P(Words)</b>",
                body_muted
            ),
            Spacer(1, 4)
        ]))

        math_rows = [
            [
                Paragraph("<b>Joint Log Spam:</b>", body_style),
                Paragraph(f"{bayes.get('joint_log_spam', 'N/A')} (log prior: {bayes.get('log_prior_spam', '-0.7121')} + sum log lik: {bayes.get('log_likelihood_spam', 'N/A')})", mono_style)
            ],
            [
                Paragraph("<b>Joint Log Ham:</b>", body_style),
                Paragraph(f"{bayes.get('joint_log_ham', 'N/A')} (log prior: {bayes.get('log_prior_ham', '-0.6746')} + sum log lik: {bayes.get('log_likelihood_ham', 'N/A')})", mono_style)
            ],
            [
                Paragraph("<b>Normalized Posteriors:</b>", body_style),
                Paragraph(f"P(Spam|Email) = <b>{round(bayes.get('p_posterior_spam', spam_prob) * 100, 1)}%</b> | P(Not Spam|Email) = <b>{round(bayes.get('p_posterior_ham', ham_prob) * 100, 1)}%</b>", body_style)
            ]
        ]

        token_list = bayes.get("token_breakdown", [])
        if token_list:
            top_tokens = ", ".join([f"{t['word']} (P(w|S)={t['p_word_given_spam']}, P(w|H)={t['p_word_given_ham']})" for t in token_list[:4]])
            math_rows.append([
                Paragraph("<b>Top Features Evaluated:</b>", body_style),
                Paragraph(top_tokens, body_muted)
            ])

        math_table = Table(math_rows, colWidths=[2.2 * inch, 5.3 * inch])
        math_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLOR_CARD_BG),
            ('BOX', (0, 0), (-1, -1), 0.8, COLOR_CARD_BORDER),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_CARD_BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(math_table)
        elements.append(Spacer(1, 14))

    # 7. Security & Privacy Notice Footer
    elements.append(Spacer(1, 8))
    footer_text = (
        "<b>Confidential Security Audit Report</b> generated by SpamShield AI — Intelligent Email Security Platform. "
        "Sensitive email credentials, passwords, and one-time passcodes (OTPs) are automatically masked to ensure privacy compliance. "
        "Generated using persistent SQLite audit logs."
    )
    elements.append(Paragraph(footer_text, ParagraphStyle('Footer', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=10, textColor=COLOR_TEXT_MUTED, alignment=1)))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
