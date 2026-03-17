"""
D2Com Survey — One-time setup: Create Google Sheets for raw responses.

Creates 2 sheets in the ADG-Survey folder on Google Drive:
  - D2Com_Dealer_Responses
  - D2Com_Craft_Responses

Usage: python -m backend.scripts.setup_sheets <FOLDER_ID>

After running, copy the printed Sheet IDs into .env:
  GSHEET_RAW_DEALER_ID=...
  GSHEET_RAW_CRAFT_ID=...
"""
import sys

from backend.services.sheets_service import _get_client, create_sheet_in_folder
from backend.db.seed import DEALER_QUESTIONS, CRAFT_QUESTIONS


def main():
    if len(sys.argv) < 2:
        print("Usage: python -m backend.scripts.setup_sheets <GDRIVE_FOLDER_ID>")
        print("")
        print("  GDRIVE_FOLDER_ID: ID of the 'ADG-Survey' folder on Google Drive.")
        print("  (Open folder in browser → copy the last part of the URL)")
        print("  Example: https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNo → 1aBcDeFgHiJkLmNo")
        sys.exit(1)

    folder_id = sys.argv[1]
    client = _get_client()
    if not client:
        print("ERROR: Cannot authenticate. Check GDRIVE_SERVICE_ACCOUNT_FILE in .env")
        sys.exit(1)

    # Build headers: [Timestamp, Customer, Surveyor, Q01, Q02, ...]
    dealer_headers = ["Timestamp", "Customer", "Surveyor"] + [q["q_id"] for q in DEALER_QUESTIONS]
    craft_headers = ["Timestamp", "Customer", "Surveyor"] + [q["q_id"] for q in CRAFT_QUESTIONS]

    print("Creating Dealer sheet...")
    dealer_id = create_sheet_in_folder(client, "D2Com_Dealer_Responses", folder_id, dealer_headers)

    print("Creating Craft sheet...")
    craft_id = create_sheet_in_folder(client, "D2Com_Craft_Responses", folder_id, craft_headers)

    print("")
    print("=" * 60)
    print("  DONE! Copy these into your .env:")
    print("=" * 60)
    print(f"  GSHEET_RAW_DEALER_ID={dealer_id}")
    print(f"  GSHEET_RAW_CRAFT_ID={craft_id}")
    print("=" * 60)


if __name__ == "__main__":
    main()
