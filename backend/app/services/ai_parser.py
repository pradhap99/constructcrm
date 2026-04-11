import json
import re
from typing import Dict, Any, Optional


def parse_invoice_text(text: str) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "invoice_number": None,
        "invoice_date": None,
        "vendor_name": None,
        "gstin": None,
        "total_amount": None,
        "gst_amount": None,
        "items": [],
    }

    m = re.search(r'(?:Invoice|INV|Bill)\s*(?:No|Number|#)?\s*[:\-]?\s*([A-Z0-9\-\/]+)', text, re.IGNORECASE)
    if m:
        result["invoice_number"] = m.group(1).strip()

    m = re.search(r'\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b', text)
    if m:
        result["gstin"] = m.group(1)

    m = re.search(r'(?:Total|Grand Total|Amount)\s*[:\-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)', text, re.IGNORECASE)
    if m:
        result["total_amount"] = float(m.group(1).replace(",", ""))

    return result


def parse_po_text(text: str) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "po_number": None,
        "vendor_name": None,
        "items": [],
        "total_amount": None,
    }

    m = re.search(r'(?:PO|Purchase Order)\s*(?:No|Number|#)?\s*[:\-]?\s*([A-Z0-9\-\/]+)', text, re.IGNORECASE)
    if m:
        result["po_number"] = m.group(1).strip()

    return result


def extract_document(text: str, document_type: str) -> Dict[str, Any]:
    if document_type == "invoice":
        return parse_invoice_text(text)
    elif document_type == "purchase_order":
        return parse_po_text(text)
    return {"raw": text}


async def parse_with_openai(text: str, document_type: str, api_key: str) -> Dict[str, Any]:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        prompt = (
            f"Extract structured data from the following {document_type} document. "
            f"Return a JSON object with relevant fields.\nDocument:\n{text}"
        )
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception:
        return extract_document(text, document_type)
