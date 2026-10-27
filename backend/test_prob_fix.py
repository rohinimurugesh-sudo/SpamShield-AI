import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_api_scans():
    test_cases = [
        {
            "name": "Obvious Spam",
            "subject": "CONGRATULATIONS: You have won a prize of $25,000 in our international sweepstakes!",
            "sender": "rewards-dept@sweepstakes-winner.xyz",
            "body": "Dear lucky winner, you have won a prize in our exclusive giveaway! Claim now by clicking this link or verify your password at http://claim-funds.xyz immediately to process the wire transfer of your cash prize.",
            "expect_extreme": True,
            "expected_pred": "SPAM"
        },
        {
            "name": "Normal College Email",
            "subject": "Project Meeting & Action Items Sync",
            "sender": "prof.sharma@university.edu",
            "body": "Hi team, please find attached the meeting minutes and project notes from our discussion today. Reminder that our weekly review is scheduled for tomorrow at 2 PM in Room 402.",
            "expect_extreme": True,
            "expected_pred": "LEGITIMATE"
        },
        {
            "name": "Borderline Review Email",
            "subject": "Campus password security update",
            "sender": "it-security@university.edu",
            "body": "Security update: Annual password policy update for university accounts.",
            "expect_extreme": False,
            "expected_pred": "NEEDS REVIEW"
        }
    ]

    print("=== Testing FastAPI Backend Probability Endpoints ===")
    for tc in test_cases:
        resp = requests.post(f"{BASE_URL}/api/classify", json={
            "subject": tc["subject"],
            "sender": tc["sender"],
            "body": tc["body"]
        })
        assert resp.status_code == 200, f"Classify failed: {resp.text}"
        data = resp.json()

        spam_p = data["spam_probability"]
        ham_p = data["ham_probability"]
        pred = data["prediction"]
        graph = data.get("graph_data", {})
        bars = graph.get("bars", [])

        print(f"\n--- {tc['name']} ---")
        print(f"Subject: {tc['subject']}")
        print(f"Prediction: {pred} (expected: {tc['expected_pred']})")
        print(f"Spam Prob: {spam_p * 100:.2f}% | Ham Prob: {ham_p * 100:.2f}%")
        print(f"Sum of probabilities: {spam_p + ham_p:.6f}")
        assert abs((spam_p + ham_p) - 1.0) < 1e-4, f"Probabilities do not total 1.0: {spam_p + ham_p}"

        assert len(bars) == 2, f"Expected 2 graph bars, got {len(bars)}"
        spam_bar = bars[0]
        ham_bar = bars[1]
        print(f"Graph Bars -> Spam: {spam_bar['percentage']}%, Not Spam: {ham_bar['percentage']}%")
        print(f"Sum of Graph Percentages: {spam_bar['percentage'] + ham_bar['percentage']:.1f}%")
        assert abs((spam_bar['percentage'] + ham_bar['percentage']) - 100.0) < 0.2, "Graph bars do not sum to 100.0%"

        if tc["expect_extreme"]:
            if tc["expected_pred"] == "SPAM":
                assert spam_p > 0.95, f"Expected high spam probability, got {spam_p}"
            else:
                assert ham_p > 0.95, f"Expected high ham probability, got {ham_p}"
            print("[PASS] Correctly preserved genuine extreme probability (Rule 8).")
        else:
            assert 0.05 < spam_p < 0.95, f"Expected intermediate probability, got {spam_p}"
            assert 0.05 < ham_p < 0.95, f"Expected intermediate probability, got {ham_p}"
            print(f"[PASS] Confirmed genuine intermediate probabilities: {spam_p*100:.1f}% vs {ham_p*100:.1f}% (NOT 100%/0%)!")

        assert "threat_xray" in data, "threat_xray must be in response"
        assert "bayes_breakdown" in data, "bayes_breakdown must be in response"

    print("\n[ALL TESTS PASSED SUCCESSFULLY!]")

if __name__ == "__main__":
    test_api_scans()
