"""
D2Com Survey — Google Sheets Service
Handles creating sheets and appending survey rows on submit.
Uses gspread + service account authentication.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import gspread
from google.oauth2.service_account import Credentials

from backend.config import settings

logger = logging.getLogger(__name__)

# Scopes needed for Sheets + Drive (create files in folder)
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


def _get_client() -> Optional[gspread.Client]:
    """Get authenticated gspread client. Returns None if not configured."""
    # Option 1: JSON string from env var (Railway)
    sa_json = settings.GDRIVE_SERVICE_ACCOUNT_JSON
    if sa_json:
        try:
            import json
            info = json.loads(sa_json)
            creds = Credentials.from_service_account_info(info, scopes=SCOPES)
            return gspread.authorize(creds)
        except Exception as e:
            logger.error(f"Failed to auth gspread from JSON env: {e}")
            return None

    # Option 2: JSON file path (local dev)
    sa_file = settings.GDRIVE_SERVICE_ACCOUNT_FILE
    if not sa_file:
        logger.debug("No service account configured, skipping Sheets")
        return None
    try:
        creds = Credentials.from_service_account_file(sa_file, scopes=SCOPES)
        return gspread.authorize(creds)
    except Exception as e:
        logger.error(f"Failed to auth gspread from file: {e}")
        return None


def create_sheet_in_folder(
    client: gspread.Client,
    title: str,
    folder_id: str,
    headers: list[str],
) -> str:
    """Create a new Google Sheet inside a Drive folder. Returns sheet ID."""
    spreadsheet = client.create(title, folder_id=folder_id)
    worksheet = spreadsheet.sheet1
    worksheet.update([headers], "A1")

    # Bold + freeze header row
    worksheet.format("1", {"textFormat": {"bold": True}})
    worksheet.freeze(rows=1)

    logger.info(f"Created sheet '{title}' → ID: {spreadsheet.id}")
    return spreadsheet.id


def append_survey_row(
    form_type: str,
    customer_name: str,
    surveyor_name: str,
    q_ids: list[str],
    answers: dict[str, str],
) -> bool:
    """
    Append one row to the corresponding Google Sheet.
    form_type: 'dealer' or 'craft'
    q_ids: ordered list of question IDs (D01, D02, ...)
    answers: {q_id: answer_text}
    Returns True if success, False if skipped/failed.
    """
    sheet_id = (
        settings.GSHEET_RAW_DEALER_ID if form_type == "dealer"
        else settings.GSHEET_RAW_CRAFT_ID
    )

    if not sheet_id:
        logger.debug(f"GSHEET_RAW_{form_type.upper()}_ID not set, skipping export")
        return False

    client = _get_client()
    if not client:
        return False

    try:
        spreadsheet = client.open_by_key(sheet_id)
        worksheet = spreadsheet.sheet1
        # Build row: [Timestamp, Customer, Surveyor, answer1, answer2, ...]
        vn_tz = timezone(timedelta(hours=7))
        now = datetime.now(vn_tz).strftime("%Y-%m-%d %H:%M:%S")
        row = [now, customer_name, surveyor_name]
        for qid in q_ids:
            row.append(answers.get(qid, ""))

        worksheet.append_row(row, value_input_option="USER_ENTERED")
        logger.info(f"Appended row to {form_type} sheet for '{customer_name}'")
        return True

    except Exception as e:
        logger.error(f"Failed to append to sheet: {e}")
        return False
