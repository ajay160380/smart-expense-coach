"""
Account Aggregator (AA) Service Interface
Standardized interface for ingesting bank transactions from RBI Account Aggregators (Setu, Finvu, OneMoney).
Bridges seamlessly into the Phase 9 auto-expense engine with zero database schema changes.
"""

import re
import logging
from decimal import Decimal
from datetime import datetime
from tracker.auto_expense_service import process_auto_expense

logger = logging.getLogger(__name__)

# Common Indian bank narration patterns (UPI, NEFT, IMPS, POS)
NARRATION_PATTERNS = [
    # UPI-specific: UPI/1234567890/Merchant Name/Bank
    re.compile(r'UPI/(?:CR/|DR/)?\d+/(?P<merchant>[^/]+)', re.IGNORECASE),
    # POS/Card: POS 12345678 MERCHANT NAME CITY
    re.compile(r'POS\s+\d+\s+(?P<merchant>[A-Za-z0-9\s&.-]+?)(?:\s+[A-Z]{2,})?$', re.IGNORECASE),
    # E-commerce: ECOM/MERCHANT/REF
    re.compile(r'ECOM/(?P<merchant>[^/]+)', re.IGNORECASE),
]

def extract_merchant_from_narration(narration: str) -> str:
    """
    Extracts a clean merchant name from bank narration strings.
    E.g., 'UPI/312456789/SWIGGY BANGALORE/PAYTM' -> 'Swiggy'
    """
    if not narration:
        return "Bank Transaction"

    clean = narration.strip()
    for pattern in NARRATION_PATTERNS:
        match = pattern.search(clean)
        if match:
            raw_merchant = match.group("merchant").strip()
            # Remove trailing bank identifiers or city names
            words = raw_merchant.split()
            if words:
                return words[0].title()

    # Fallback: clean words
    cleaned = re.sub(r'[0-9]{5,}', '', clean)
    words = [w for w in cleaned.split() if len(w) > 2 and not w.isdigit()]
    return " ".join(words[:2]).title() if words else "Bank Transaction"

def ingest_account_aggregator_transaction(
    user,
    bank_name: str,
    bank_txn_id: str,
    amount: Decimal,
    narration: str,
    txn_type: str = "DEBIT",
    timestamp: datetime = None
) -> dict:
    """
    Drop-in interface for processing decrypted RBI AA transactions.
    Calls process_auto_expense() with source='bank' and hash-based deduplication.
    """
    if str(txn_type).upper() != "DEBIT":
        return {
            "status": "skipped",
            "reason": "non_debit_transaction",
            "message": f"Skipped {txn_type} transaction"
        }

    merchant = extract_merchant_from_narration(narration) or bank_name
    client_txn_id = f"aa_{bank_name.lower().replace(' ', '_')}_{bank_txn_id}"

    success, data, code = process_auto_expense(
        user=user,
        amount=amount,
        merchant=merchant,
        source="bank",
        timestamp=timestamp,
        client_txn_id=client_txn_id
    )
    return data
