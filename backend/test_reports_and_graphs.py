import urllib.request
import json
import os

def run_tests():
    print("===================================================================")
    print("TESTING: SpamShield AI - Reports & Individual Probability Graphs")
    print("===================================================================")

    # 1. TEST SPAM EMAIL SCAN
    print("\n[Step 1] Scanning Suspicious / Spam Email...")
    spam_payload = {
        'subject': 'URGENT: Your account credentials have been compromised - Verify password immediately',
        'body': 'Dear user, your bank account access will be suspended within 24 hours. Please verify your password with one-time passcode OTP 726194 at http://192.168.1.99/login to prevent permanent suspension.',
        'sender': 'security-alert@bank-verification-dept.xyz'
    }
    req_spam = urllib.request.Request(
        'http://127.0.0.1:8000/api/classify',
        data=json.dumps(spam_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    spam_res = json.loads(urllib.request.urlopen(req_spam).read().decode('utf-8'))
    spam_id = spam_res.get('scan_id')
    print(f" -> Scan ID: {spam_id}")
    print(f" -> Prediction: {spam_res.get('prediction')}")
    print(f" -> P(Spam): {spam_res.get('spam_probability') * 100:.1f}%")
    print(f" -> P(Not Spam): {spam_res.get('ham_probability') * 100:.1f}%")
    assert spam_res.get('prediction') == 'SPAM', f"Expected SPAM, got {spam_res.get('prediction')}"
    assert spam_res.get('spam_probability') > 0.8, "Expected high spam probability"
    assert 'graph_data' in spam_res, "Scan must include graph_data"
    spam_graph = spam_res['graph_data']
    print(f" -> Graph Title: {spam_graph.get('chart_title')}")
    print(f" -> Graph Bars: {spam_graph.get('bars')}")
    assert spam_graph['bars'][0]['category'] == 'Spam'
    assert spam_graph['bars'][0]['is_predicted'] is True, "Spam bar must be marked is_predicted=True"

    # Download Spam PDF Report
    pdf_spam_url = f"http://127.0.0.1:8000/api/reports/{spam_id}/pdf"
    pdf_spam_res = urllib.request.urlopen(pdf_spam_url)
    pdf_spam_bytes = pdf_spam_res.read()
    print(f" -> Downloaded Spam PDF Report: {len(pdf_spam_bytes)} bytes (HTTP {pdf_spam_res.status})")
    assert pdf_spam_res.status == 200, "PDF download returned non-200"
    assert pdf_spam_bytes.startswith(b'%PDF'), "PDF content must start with %PDF header"
    assert b'726194' not in pdf_spam_bytes, "Raw OTP 726194 must be redacted from PDF!"
    print(" -> PASS: OTP 726194 was verified REDACTED from PDF report.")

    # 2. TEST NOT SPAM (LEGITIMATE) EMAIL SCAN
    print("\n[Step 2] Scanning Legitimate / College Email...")
    ham_payload = {
        'subject': 'College Academic Council: Minutes of Meeting & Schedule',
        'body': 'Dear faculty and student representatives, please find attached the approved minutes of the academic council meeting held on Friday. Our next department curriculum review is scheduled for Tuesday at 10 AM in the seminar hall. Regards, Dean Office.',
        'sender': 'academic.council@university.edu'
    }
    req_ham = urllib.request.Request(
        'http://127.0.0.1:8000/api/classify',
        data=json.dumps(ham_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    ham_res = json.loads(urllib.request.urlopen(req_ham).read().decode('utf-8'))
    ham_id = ham_res.get('scan_id')
    print(f" -> Scan ID: {ham_id}")
    print(f" -> Prediction: {ham_res.get('prediction')}")
    print(f" -> P(Spam): {ham_res.get('spam_probability') * 100:.1f}%")
    print(f" -> P(Not Spam): {ham_res.get('ham_probability') * 100:.1f}%")
    assert ham_res.get('prediction') in ('LEGITIMATE', 'NOT SPAM', 'HAM'), f"Expected LEGITIMATE, got {ham_res.get('prediction')}"
    assert ham_res.get('ham_probability') > 0.7, "Expected high ham probability"
    assert 'graph_data' in ham_res, "Scan must include graph_data"
    ham_graph = ham_res['graph_data']
    print(f" -> Graph Title: {ham_graph.get('chart_title')}")
    print(f" -> Graph Bars: {ham_graph.get('bars')}")
    assert ham_graph['bars'][1]['category'] == 'Not Spam'
    assert ham_graph['bars'][1]['is_predicted'] is True, "Not Spam bar must be marked is_predicted=True"

    # Verify both emails have distinct graphs
    assert spam_graph['chart_title'] != ham_graph['chart_title'], "Each email must have its own graph title"
    assert spam_graph['bars'][0]['percentage'] != ham_graph['bars'][0]['percentage'], "Probabilities must differ"
    print(" -> PASS: Both scans have individual, distinct graph datasets!")

    # Download Ham PDF Report
    pdf_ham_url = f"http://127.0.0.1:8000/api/reports/{ham_id}/pdf"
    pdf_ham_res = urllib.request.urlopen(pdf_ham_url)
    pdf_ham_bytes = pdf_ham_res.read()
    print(f" -> Downloaded Not Spam PDF Report: {len(pdf_ham_bytes)} bytes (HTTP {pdf_ham_res.status})")
    assert pdf_ham_res.status == 200, "PDF download returned non-200"
    assert pdf_ham_bytes.startswith(b'%PDF'), "PDF content must start with %PDF header"

    # 3. TEST PERSISTENCE & RETRIEVAL (Browser Reload Simulation)
    print("\n[Step 3] Verifying Reports Persistence & Retrieval from SQLite...")
    hist_req = urllib.request.urlopen('http://127.0.0.1:8000/api/history?limit=10')
    hist_res = json.loads(hist_req.read().decode('utf-8'))
    print(f" -> Total Scans in SQLite: {hist_res.get('total')}")
    scans_list = hist_res.get('scans', [])
    ids = [s.get('id') for s in scans_list]
    assert spam_id in ids, f"Spam scan {spam_id} must be in saved history"
    assert ham_id in ids, f"Ham scan {ham_id} must be in saved history"

    # Verify retrieving individual saved record preserves graph data WITHOUT re-running model
    saved_spam = next(s for s in scans_list if s.get('id') == spam_id)
    assert 'graph_data' in saved_spam, "Saved scan must retain graph_data"
    assert saved_spam['graph_data']['bars'][0]['is_predicted'] is True, "Saved graph must preserve prediction highlight"
    print(f" -> Successfully verified saved graph data for {spam_id}")

    saved_ham = next(s for s in scans_list if s.get('id') == ham_id)
    assert 'graph_data' in saved_ham, "Saved scan must retain graph_data"
    assert saved_ham['graph_data']['bars'][1]['is_predicted'] is True, "Saved graph must preserve prediction highlight"
    print(f" -> Successfully verified saved graph data for {ham_id}")

    # Search filter test on Reports
    search_req = urllib.request.urlopen('http://127.0.0.1:8000/api/history?search=Academic')
    search_res = json.loads(search_req.read().decode('utf-8'))
    print(f" -> Search query 'Academic' returned {search_res.get('total')} records")
    assert any(s.get('id') == ham_id for s in search_res.get('scans', [])), "Search must find the college email"

    # Filter by Spam
    filter_spam_req = urllib.request.urlopen('http://127.0.0.1:8000/api/history?filter_pred=SPAM')
    filter_spam_res = json.loads(filter_spam_req.read().decode('utf-8'))
    assert any(s.get('id') == spam_id for s in filter_spam_res.get('scans', [])), "Spam filter must include spam scan"

    # 4. TEST DASHBOARD STATS INTEGRATION
    print("\n[Step 4] Verifying Dashboard Calculation from Saved History...")
    dash_req = urllib.request.urlopen('http://127.0.0.1:8000/api/dashboard')
    dash_res = json.loads(dash_req.read().decode('utf-8'))
    metrics = dash_res.get('metrics', {})
    print(f" -> Total Emails Analysed: {metrics.get('total_emails_analysed')}")
    print(f" -> Spam Detected: {metrics.get('spam_detected')}")
    print(f" -> Legitimate Emails: {metrics.get('legitimate_emails')}")
    print(f" -> Recent Scans count: {len(dash_res.get('recent_scans', []))}")
    assert metrics.get('total_emails_analysed') >= 2
    assert metrics.get('spam_detected') >= 1
    assert metrics.get('legitimate_emails') >= 1

    print("\n===================================================================")
    print("ALL TESTS PASSED! (Both emails analysed, individual graphs verified,")
    print("PDFs downloaded and credentials redacted, persistence verified).")
    print("===================================================================")

if __name__ == '__main__':
    run_tests()
