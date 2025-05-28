# 🔄 Auto GitHub Repo Sync Monitor

This project monitors the synchronization status between **remote GitHub repositories** and **local git directories** by combining **Google Apps Script** and a **Python script**.

This setup is especially helpful if you manage many repositories—either as an owner or collaborator—and occasionally make small changes via the GitHub web interface. When you're ready, you can easily check and sync them locally, one by one, even on a lazy afternoon.


## 📁 Project Structure

### 🔷 Google Apps Script

**Purpose**: Populate a Google Sheet with GitHub and local repository paths.

* Retrieves a GitHub token securely from **Google Secret Manager**.
* Calls the **GitHub API** to list remote repositories.
* Writes repository URLs to **Column C** of the sheet.
* Users can manually input the corresponding **local repository directories** in **Column D**.

> Files:
>
> * `code.gs`
> * `utils.gs`
> * `config.gs`
> * `triggers.gs`


### 🐍 Python Script

**Purpose**: Compares the local git repositories with their remote counterparts and determines sync status.

* Reads **remote repository URLs (Col C)** and **local repository paths (Col D)** from the Google Sheet using the **Google Sheets API**.
* Uses Git to determine whether the local repository is:

  * ✅ Up to date
  * 🔄 Not up to date
  * ❌ Not a Git directory
  * ⚠️ Encountered Git error
* Writes the result back to Google Sheets (**Col E**).

> Files:
>
> * `github-compare.py`
> * `vault.json` – stores service account credentials and spreadsheet ID.


## 🧪 Setup

### 📌 Prerequisites

* A **GitHub token**. You can create one [here](https://github.com/settings/tokens).
* A Google Cloud Project with:

  * **Google Sheets API** enabled, to be used by Python.
  * **Secret Manager API** enabled, to store the Github token.
  * A **Google Sheet** set up with columns:

  ```text
  A | B | C (Remote URL) | D (Local Path) | E (Status)
  ```
* A **Service Account** with access to Google Sheets API. Share the Spreadsheet (as editor) with this service account.

### 🔹 For Apps Script

1. Deploy the script via **Google Apps Script Editor**.
2. Grant permissions to read from Secret Manager and write to Sheets.
3. Configure the script to fetch GitHub repo list using the stored token.
4. `appsscript.json`

    ```json
    {
      "oauthScopes": [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/script.external_request",
        "https://www.googleapis.com/auth/cloud-platform"
      ]
    }
    ```

### 🔸 For Python

1. Install required libraries:

   ```bash
   pip install google-api-python-client google-auth
   ```

2. Copy vault.example.json to vault.json and replace the placeholder values with your actual credentials.

   ```json
   {
     "credentialFilePath": "path/to/your/service-account.json",
     "spreadsheetId": "your-google-sheet-id"
   }
   ```

3. Run the script:

   ```bash
   python github-compare.py
   ```


### 🔹 Task Scheduler / Cron

Make the task run periodically. If you are using Windows, add entry to Task Scheduler:

  * Program/script, use `pythonw` instead of `python` to make it run in background
      ```text
      "path\to\binary\pythonw.exe"
      ```
  * Add arguments
      ```text
      github-compare.py
      ```
  * Start in, don't enclosed with quotes, even if the path contains spaces
      ```text
      path\to\the\python\file
      ```


## 🧠 How It Works

1. Use `Custom Menu → Fetch repos` in the Google Sheet to populate it with your GitHub repositories (Col C).
2. You manually add matching local repository paths to Col D.
3. Python script:

   * Fetches the Sheet data.
   * Compares each local directory with its remote.
   * Writes the comparison result to Col E.


## 📓 Example Sheet

| Type      | Owner | Remote Repo (Col C)                                                    | Local Path (Col D)  | Status (Col E)    |
| --------- | ----- | ---------------------------------------------------------------------- | ------------------- | ----------------- |
| public    | user1 | [https://github.com/user1/my-app](  https://github.com/user1/my-app)   | /Users/you/my-app   | ✅ Up to date     |
| private   | user1 | [https://github.com/user1/api-core](https://github.com/user1/api-core) | /Users/you/api-core | 🔄 Not up to date |


## ✅ Benefits

* Keep your local and remote repositories in sync.
* Quickly spot outdated local repositories.
* Leverage the power of **Apps Script + Git + Python** for workflow automation.
