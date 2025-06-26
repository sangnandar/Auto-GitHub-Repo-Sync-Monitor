import os
import subprocess
import sys
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

with open('vault.json', 'r') as f:
  vault = json.load(f)

# === Configuration ===
SERVICE_ACCOUNT_FILE = vault.get('credentialFilePath')
SPREADSHEET_ID = vault.get('spreadsheetId')
SHEET_NAME = 'Repos'
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']  # write access

# === Git comparison ===
def check_repo_status(local_path):
    if not os.path.isdir(local_path):
        return "❌ Not a directory"

    if not os.path.isdir(os.path.join(local_path, ".git")):
        return "❌ Not a Git repository"

    # Setup to hide Git windows on Windows
    startupinfo = None
    if sys.platform == "win32":
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW

    cwd = os.getcwd()
    try:
        os.chdir(local_path)

        subprocess.run(
            ["git", "fetch"],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            startupinfo=startupinfo
        )

        branch = subprocess.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            text=True,
            startupinfo=startupinfo
        ).strip()

        local_commit = subprocess.check_output(
            ["git", "rev-parse", branch],
            text=True,
            startupinfo=startupinfo
        ).strip()

        remote_commit = subprocess.check_output(
            ["git", "rev-parse", f"origin/{branch}"],
            text=True,
            startupinfo=startupinfo
        ).strip()

        if local_commit == remote_commit:
            return "✅ Up to date"
        else:
            return "🔄 Not up to date"

    except subprocess.CalledProcessError:
        return "⚠️ Git error"
    finally:
        os.chdir(cwd)

# === Google Sheets logic ===
def process_and_update_sheet():
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('sheets', 'v4', credentials=creds)

    sheet = service.spreadsheets()
    range_name = f'{SHEET_NAME}!A2:E' # exclude header row
    result = sheet.values().get(
        spreadsheetId=SPREADSHEET_ID, range=range_name).execute()
    values = result.get('values', [])

    if not values or len(values) == 0:
        print('No data found.')
        return

    repo_rows = values
    status_results = []

    for idx, row in enumerate(repo_rows):
        if len(row) < 5: # Ensure there are at least 5 columns
            print("⚠️ Skipping incomplete row:", row)
            status_results.append(["⚠️ Incomplete row"])
            continue

        local_repo = row[4]
        status = check_repo_status(local_repo)
        status_results.append([status])  # wrap in list for 1 column

    # Write back to column F starting from F2
    update_range = f'{SHEET_NAME}!F2:F{len(status_results) + 1}'
    body = {'values': status_results}

    sheet.values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=update_range,
        valueInputOption='RAW',
        body=body
    ).execute()

# === Run it ===
if __name__ == '__main__':
    process_and_update_sheet()
