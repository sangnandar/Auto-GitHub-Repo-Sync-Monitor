# 🔄 Auto GitHub Repo Sync Monitor

This project monitors the synchronization status between **remote GitHub repositories** and **local git directories** by combining **Apps Script** and **Python**.

This setup is especially helpful if you manage many repositories—either as an owner or collaborator—and occasionally make small changes via the GitHub web interface. On a lazy afternoon, while winding down, you can update your local repos with ease.


## 📁 Project Structure

### 🔷 Google Apps Script

**Purpose**: Populate a Google Sheet with GitHub and local repository paths.

* Retrieves a GitHub token securely from **Google Secret Manager**.
* Calls the **GitHub API** to list remote repositories.
* Writes repository URLs to **Column D** of the sheet.
* Users manually input the corresponding **local repository directories** in **Column E**.

> Files:
>
> * `code.gs`
> * `utils.gs`
> * `config.gs`
> * `triggers.gs`


### 🐍 Python Script

**Purpose**: Compares the local git repositories with their remote counterparts and determines sync status.

* Reads **remote repository URLs (Col D)** and **local repository paths (Col E)** from the Google Sheet using the **Google Sheets API**.
* Uses Git to determine whether the local repository is:

  * ✅ Up to date
  * 🔄 Not up to date
  * ❌ Not a Git directory
  * ⚠️ Encountered Git error
* Writes the result back to Google Sheets (**Col F**).

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
  A | B | C (Readme Title) | D (Remote URL) | E (Local Path) | F (Status)
  ```
* A **Service Account** with access to Google Sheets API. Share the Spreadsheet (as editor) with this service account.

### 🔹 For Apps Script

1. Deploy the script via **Google Apps Script Editor**.
2. Grant permissions to read from Secret Manager and write to Sheets.
3. Configure the script to fetch GitHub repo list using the stored token.
4. `appsscript.json`

    ```js
    {
      "oauthScopes": [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/script.external_request",
        "https://www.googleapis.com/auth/cloud-platform" // to read Secret Manager
      ]
    }
    ```
    > Google Drive access is optional. It's needed for debugging purpose with function `logToFile()`.

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

  * **Program/script**, use `pythonw` instead of `python` to make it run in background
      ```text
      "path\to\binary\pythonw.exe"
      ```
  * **Add arguments**
      ```text
      github-compare.py
      ```
  * **Start in**, don't enclosed with quotes, even if the path contains spaces
      ```text
      path\to\the\python\file
      ```


## 🧠 How It Works

1. Use `Custom Menu → Fetch repos` in the Google Sheet to populate it with your GitHub repositories (Col D).
2. You manually add matching local repository paths to Col E.
3. Python script:
   * Fetches the Sheet data.
   * Compares each local directory with its remote.
   * Writes the comparison result to Col F.
4. Set it and forget it. Set task scheduler/cron to run periodically in background.


## 📓 Example Sheet

| Type      | Owner | Readme Title | Remote Repo (Col D)                                                    | Local Path (Col E)  | Status (Col F)    |
| --------- | ----- | ------------ | ---------------------------------------------------------------------- | ------------------- | ----------------- |
| public    | user1 | My App       | [https://github.com/user1/my-app](  https://github.com/user1/my-app)   | /Users/you/my-app   | ✅ Up to date     |
| private   | user1 | API Core     | [https://github.com/user1/api-core](https://github.com/user1/api-core) | /Users/you/api-core | 🔄 Not up to date |


## ✅ Benefits

* Keep your local and remote repositories in sync.
* Quickly spot outdated local repositories.
* Leverage the power of **Apps Script + Git + Python** for workflow automation.
