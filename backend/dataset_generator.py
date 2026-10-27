import random
import os
import pandas as pd
import numpy as np

DATASET_PATH = os.path.join(os.path.dirname(__file__), "emails_dataset.csv")

SPAM_TEMPLATES = [
    "URGENT: Your bank account has been suspended! Verify your credentials immediately at {url} to restore access.",
    "Congratulations! You won the international cash lottery jackpot of $1,500,000. Claim your prize by clicking {url}.",
    "Wire transfer confirmation required. Please transfer payment of $4,950 via Western Union to account {acc}.",
    "Exclusive crypto opportunity: Guaranteed 500% returns in 48 hours! Deposit Bitcoin now to {url}.",
    "Final notice: Unpaid invoice #INV-9821. Please open the attached macro document or pay via {url} today.",
    "Work from home and earn $8,000 weekly! No experience required. Register free today at {url}.",
    "Security alert: Unauthorized login attempt from Russia. Reset your password immediately: {url}.",
    "Cheap pharmacy discounts: Buy generic medications without prescription. Fast discreet shipping at {url}.",
    "Dear beneficiary, I am barrister Johnson. An unclaimed inheritance of $12M is awaiting your signature.",
    "Refinance your mortgage with 0% interest! Limited time offer. Check your eligibility now at {url}.",
    "You have (1) unread confidential voicemail from executive management. Listen here: {url}.",
    "Tax refund notification: The IRS has calculated an overpayment of $780. Submit your direct deposit info at {url}.",
    "Free Walmart gift card worth $500! Complete our 1-minute survey now to claim: {url}.",
    "Account billing failure: Netflix subscription canceled due to declined card. Update billing details immediately: {url}.",
    "Hot singles in your area want to chat tonight. Join free with no credit card required at {url}.",
    "Critical PayPal warning: Your account has been temporarily restricted. Verify identity now at {url}."
]

HAM_TEMPLATES = [
    "Hi team, please find attached the meeting minutes and action items from our weekly sync today.",
    "Reminder: The deadline for submitting the probability micro-project report is this Friday at 5 PM.",
    "Can you please review my pull request on GitHub when you have a moment? I addressed the linter comments.",
    "Attached is the revised project roadmap for Q3. Let me know if you have any questions or feedback.",
    "Thank you for attending today's guest lecture on Bayesian classification. The slides are uploaded on Moodle.",
    "Hi Sarah, could we reschedule our 1:1 to tomorrow at 2 PM? Something urgent came up with the client demo.",
    "The IT department will be performing scheduled server maintenance this Saturday from 2 AM to 6 AM UTC.",
    "Invoice #4092 for web hosting services has been processed and paid via automated billing.",
    "Here is the draft agenda for tomorrow's departmental committee meeting in Conference Room B.",
    "Great presentation today! The statistical analysis on conditional probability and spam detection was very clear.",
    "Hi team, just a heads up that our repository branch has been merged into main. Please pull the latest changes.",
    "Your package from Amazon has been delivered to the front reception desk.",
    "Please submit your course evaluation feedback before the portal closes next Monday.",
    "Let's grab lunch around 12:30 PM at the campus cafeteria if you are free today.",
    "Here are the experimental test results from our Naive Bayes evaluation on the held-out test split.",
    "Attached is the conference paper draft for peer review. Looking forward to your constructive critique."
]

REVIEW_BORDERLINE_TEMPLATES = [
    "Urgent review required: Please verify the invoice details attached before our financial audit meeting.",
    "Free seminar registration: Bayesian inference and Machine Learning workshop this Thursday at 4 PM.",
    "Account verification alert: Your institutional library card needs renewal before the semester ends.",
    "Invoice payment reminder: Annual renewal for your research lab software subscription is due next week.",
    "Congratulations on your paper acceptance! Register for the conference portal to claim early-bird discount.",
    "Security update: Institutional password policy requires annual update for all university accounts."
]

URLS = [
    "http://secure-login-verify882.xyz/login",
    "http://bit.ly/claim-cash-bonus",
    "http://account-update-portal-auth.tk",
    "http://verify-bank-id-alert.info/update",
    "http://crypto-double-bonus.net/deposit",
    "http://free-gift-card-generator.co/claim"
]

def generate_synthetic_dataset(num_samples: int = 1200, seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)

    records = []
    
    # 45% spam, 45% ham, 10% borderline
    spam_target = int(num_samples * 0.45)
    ham_target = int(num_samples * 0.45)
    border_target = num_samples - spam_target - ham_target

    for i in range(spam_target):
        tmpl = random.choice(SPAM_TEMPLATES)
        text = tmpl.format(url=random.choice(URLS), acc=random.randint(1000000, 9999999))
        # Add random variations
        if random.random() < 0.3:
            text += f" Contact agent id #{random.randint(100, 999)} immediately for assistance."
        records.append({"text": text, "label": "spam"})

    for i in range(ham_target):
        tmpl = random.choice(HAM_TEMPLATES)
        records.append({"text": tmpl, "label": "ham"})

    for i in range(border_target):
        tmpl = random.choice(REVIEW_BORDERLINE_TEMPLATES)
        # Randomly split borderline slightly
        label = "spam" if random.random() < 0.4 else "ham"
        records.append({"text": tmpl, "label": label})

    random.shuffle(records)
    df = pd.DataFrame(records)
    df.to_csv(DATASET_PATH, index=False)
    print(f"Generated {len(df)} samples saved to {DATASET_PATH}")
    return df

def get_or_create_dataset():
    if os.path.exists(DATASET_PATH):
        try:
            df = pd.read_csv(DATASET_PATH)
            if len(df) >= 200:
                return df
        except Exception:
            pass
    return generate_synthetic_dataset()

if __name__ == "__main__":
    df = get_or_create_dataset()
    print("Dataset distribution:")
    print(df['label'].value_counts())
