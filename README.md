# SpamShield AI — Intelligent Email Security

> Advanced Cybersecurity Platform with Bayesian Email Classification, Real-Time Threat Scoring, Explainable AI, and Interactive Analytics.

---

## Overview

**SpamShield AI** is a full-stack, enterprise-grade cybersecurity web application designed to detect, analyze, and mitigate malicious email threats. Combining mathematical **Multinomial Naive Bayes (Laplace Smoothing)** with an explainable **Threat X-Ray Engine** and a dynamic multi-factor **Threat Score Engine (0–100)**, SpamShield AI provides transparent, explainable threat detection.

---

## Key Features

1. **Intelligent Email Scanner**:
   - Real-time classification: `SPAM`, `LEGITIMATE`, or `NEEDS REVIEW`.
   - Continuous normalized posterior probabilities: $P(\text{Spam} \mid \text{Evidence})$ and $P(\text{Not Spam} \mid \text{Evidence})$.
   - Explainable AI (XAI) feature breakdown with top influential words and log-likelihood ratios.

2. **Dynamic Threat Score Engine (0–100)**:
   - Distinct from Bayesian probability: quantifies actual weaponization (credential harvesting, raw IP redirection, high-abuse TLDs, and psychological coercion).
   - Clear risk categories:
     - **0 – 29**: `Low threat` (benign communication)
     - **30 – 59**: `Medium threat` (borderline/marketing pressure)
     - **60 – 79**: `High threat` (phishing lures/scams)
     - **80 – 100**: `Critical threat` (active credential/OTP theft)

3. **Threat X-Ray**:
   - Transparent heuristic rule analysis detecting password harvesting, OTP requests, urgency pressure, account suspension lures, and IP-hosted URLs.
   - Actionable cybersecurity recommendations.

4. **Interactive Visual Analytics (Charts Page)**:
   - **Chart A**: Individual Email Probability Chart (Spam vs Not Spam %).
   - **Chart B**: Threat Score Circular Gauge with risk bands and factor breakdowns.
   - **Chart C**: Scan History Threat Score Trajectory over time.
   - **Chart D**: Classification Distribution Summary (Donut Chart).
   - **Chart E**: Comparative Probability Distribution across audits with modal graph inspection.

5. **Scan History & PDF Reporting**:
   - Persistent SQLite audit logging.
   - Synchronized historical graph inspection.
   - Downloadable forensic PDF Security Incident Reports.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Recharts, Lucide Icons, Vanilla CSS Design System.
- **Backend**: FastAPI (Python 3.10+), Uvicorn, Scikit-learn, NumPy, Pandas, SciPy, ReportLab.
- **Database**: SQLite with automatic column schema migrations.

---

## Getting Started

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+) & pip
- Git

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend server will be live at `http://127.0.0.1:8000` (API documentation at `http://127.0.0.1:8000/docs`).

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
The Vite frontend will be live at `http://127.0.0.1:5173`.

---

## License

MIT License. Designed and developed for Intelligent Email Security & Bayesian Threat Detection.
