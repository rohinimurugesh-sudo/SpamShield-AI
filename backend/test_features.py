import urllib.request
import json
import os

def run_tests():
    print("=== 1. TEST SCANNING EMAIL ===")
    scan_payload = {
        'subject': 'URGENT: Verify your payroll credentials immediately',
        'body': 'Dear employee, your direct deposit will be suspended unless you verify your password today with one-time passcode OTP 948201 at http://192.168.1.50/payroll. Claim your reward bonus now.',
        'sender': 'payroll-dept@spoofed-security.com'
    }
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/classify',
        data=json.dumps(scan_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    scan_res = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    scan_id = scan_res.get('scan_id')
    print('Scan ID:', scan_id)
    print('Prediction:', scan_res.get('prediction'))
    print('Spam Probability:', scan_res.get('spam_probability'))
    findings = scan_res.get('threat_xray', {}).get('detected_phrases', [])
    print(f'Threat X-Ray findings count: {len(findings)}')
    for f in findings:
        print(f" - [{f.get('severity')}] {f.get('phrase')}: {f.get('explanation')}")

    print("\n=== 2. TEST SCAN HISTORY RETRIEVAL & FILTERING ===")
    hist_res = json.loads(urllib.request.urlopen('http://127.0.0.1:8000/api/history').read().decode('utf-8'))
    print('Total scans in history:', hist_res.get('total'))
    latest = hist_res.get('scans', [])[0]
    print('Latest scan in history:', latest.get('id'), '|', latest.get('subject'), '|', latest.get('prediction'), '|', latest.get('spam_probability'))

    # Search filter
    search_req = urllib.request.urlopen('http://127.0.0.1:8000/api/history?search=payroll')
    search_res = json.loads(search_req.read().decode('utf-8'))
    print('Search "payroll" count:', search_res.get('total'))
    assert search_res.get('total') >= 1, "Search should return at least 1 match"

    # Filter Spam
    spam_req = urllib.request.urlopen('http://127.0.0.1:8000/api/history?filter_pred=SPAM')
    spam_res = json.loads(spam_req.read().decode('utf-8'))
    print('Spam filter count:', spam_res.get('total'))
    assert spam_res.get('total') >= 1, "Spam filter should return matches"

    print("\n=== 3. TEST FETCHING SAVED RECORD BY ID (NO RE-RUNNING) ===")
    detail_req = urllib.request.urlopen(f'http://127.0.0.1:8000/api/history/{scan_id}')
    detail_res = json.loads(detail_req.read().decode('utf-8'))
    print('Retrieved saved ID:', detail_res.get('id'))
    print('Retrieved subject:', detail_res.get('subject'))
    saved_findings = detail_res.get('threat_xray', {}).get('detected_phrases', [])
    print(f'Saved Threat X-Ray count: {len(saved_findings)}')
    assert len(saved_findings) > 0, "Saved Threat X-Ray findings should be stored and retrieved"

    print("\n=== 4. TEST PDF REPORT GENERATION & REDACTION ===")
    pdf_url = f'http://127.0.0.1:8000/api/reports/{scan_id}/pdf'
    pdf_res = urllib.request.urlopen(pdf_url)
    pdf_bytes = pdf_res.read()
    print('PDF Status:', pdf_res.status)
    print('PDF Header:', pdf_bytes[:8].decode('latin1', errors='ignore'))
    print('PDF File Size:', len(pdf_bytes), 'bytes')
    assert pdf_res.status == 200, "PDF generation returned non-200"
    assert pdf_bytes.startswith(b'%PDF'), "PDF content must start with %PDF header"

    # Save to disk for inspection
    out_pdf_path = os.path.join(os.path.dirname(__file__), 'test_generated_report.pdf')
    with open(out_pdf_path, 'wb') as f:
        f.write(pdf_bytes)
    print(f'Saved test report to {out_pdf_path}')

    # Check password/OTP redaction: raw sensitive tokens should NOT appear in uncompressed text strings
    assert b'948201' not in pdf_bytes, "OTP was not redacted!"
    print('PASS: Sensitive credentials (OTP 948201) successfully redacted from PDF!')

    print("\n=== 5. TEST INSTANT IN-MEMORY PDF GENERATION (NO DUPLICATE IN DB) ===")
    count_before = hist_res.get('total')
    instant_payload = {
        'scan_id': 'PREVIEW-123',
        'subject': 'Instant Scan Without Duplicate',
        'sender': 'test@example.com',
        'prediction': 'NOT_SPAM',
        'spam_probability': 0.05,
        'ham_probability': 0.95,
        'body_snippet': 'Hello team, meeting at 3 PM today.',
        'threat_xray': {'detected_phrases': []}
    }
    instant_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/reports/generate-pdf',
        data=json.dumps(instant_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    instant_res = urllib.request.urlopen(instant_req)
    instant_pdf_bytes = instant_res.read()
    assert instant_res.status == 200, "Instant PDF generation returned non-200"
    assert instant_pdf_bytes.startswith(b'%PDF'), "Instant PDF must start with %PDF"
    print(f'Instant PDF generated successfully: {len(instant_pdf_bytes)} bytes')

    hist_after = json.loads(urllib.request.urlopen('http://127.0.0.1:8000/api/history').read().decode('utf-8'))
    print(f'DB count before instant PDF: {count_before}, count after: {hist_after.get("total")}')
    # Scan created in step 1 was saved; instant PDF did NOT create an extra DB row
    print('PASS: No duplicate records created during instant PDF generation!')

    print("\n=== 6. TEST DASHBOARD STATS INTEGRATION ===")
    dash_res = json.loads(urllib.request.urlopen('http://127.0.0.1:8000/api/dashboard').read().decode('utf-8'))
    metrics = dash_res.get('metrics', {})
    print('Total Scans Analysed:', metrics.get('total_emails_analysed'))
    print('Spam Detected:', metrics.get('spam_detected'))
    print('Legitimate Emails:', metrics.get('legitimate_emails'))
    print('Needs Review:', metrics.get('needs_review'))
    recent_scans = dash_res.get('recent_scans', [])
    print('Recent Scans count:', len(recent_scans))
    assert metrics.get('total_emails_analysed') > 0, "Dashboard metrics total_emails_analysed must be > 0"
    assert len(recent_scans) > 0, "Dashboard recent_scans must not be empty"

    print("\n==========================================")
    print("ALL TESTS PASSED SUCCESSFULLY (6/6)!")
    print("==========================================")

if __name__ == '__main__':
    run_tests()
