/*******************************************************
 **       UTILITY AND HELPER CLASSES/FUNCTIONS        **
 *******************************************************/

class SheetLayout
{
  /**
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to wrap.
   */
  constructor(sheet)
  {
    this.sheet = sheet;
    this.sheetName = sheet.getName();

    // Using memoization to avoid redundant computation
    this._headerRowCount = null;
    this._dataConfig = null;
    this._dataMap = null;
  }

  /**
   * Get the number of header rows configured for the sheet.
   * 
   * @returns {number} Number of header rows.
   */
  getHeaderRowCount()
  {
    if (this._headerRowCount !== null) return this._headerRowCount;

    const config = SHEETCONFIG[this.sheetName];
    this._headerRowCount = config?.headerRows ?? 0; // default is 0
    return this._headerRowCount;
  }

  /**
   * Get the data configuration object for the sheet.
   * 
   * @returns {Object<string, { col: string, type: string }>} Variable-name definitions.
   */
  getDataConfig()
  {
    if (this._dataConfig !== null) return this._dataConfig;

    const config = SHEETCONFIG[this.sheetName];
    this._dataConfig = config?.variableNames ?? {};
    return this._dataConfig;
  }

  /**
   * Get a map of variable-names to column-indexes.
   * 
   * @returns {Object<string, number>} Variable-name to column-index.
   */
  getDataMap()
  {
    if (this._dataMap !== null) return this._dataMap;

    const dataConfig = this.getDataConfig();
    this._dataMap = Object.fromEntries(
      Object.entries(dataConfig).map(
        ([key, { col }]) => [
          key,
          col.toUpperCase()
            .split('') // Split into an array of characters
            .reduce((total, char) => 
              total * 26 + (char.charCodeAt(0) - 64) // Base-26 math
            , 0)
        ]
      )
    );
    return this._dataMap;
  }
}

/**
 * Deep freezes an object, making it read-only (including nested objects).
 * 
 * @param {object} obj - The object to freeze.
 * @returns {object} The deeply frozen object.
 */
function readOnlyObject(obj)
{
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = obj[prop];
    if (typeof value === 'object' && value !== null) {
      readOnlyObject(value); // recursively freeze nested objects
    }
  });

  return Object.freeze(obj);
}

/**
 * @param {string} message 
 * @returns {void}
 */
function showAlert(message)
{
  if (UI) {
    UI.alert(message);
  } else {
    Logger.log(message);
  }
}

/**
 * Gets a secret from Google Secret Manager.
 * 
 * @param {string} secretName - The name of the secret
 * @returns {string} The secret value
 */
function getSecret(secretName)
{
  const projectId = 'serbaguna';
  const version = 'latest';
  const url = `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secretName}/versions/${version}:access`;

  const response = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ScriptApp.getOAuthToken()}`
    },
    muteHttpExceptions: true
  });

  const payload = JSON.parse(response.getContentText());
  const decoded = Utilities.base64Decode(payload.payload.data);
  return Utilities.newBlob(decoded).getDataAsString();
}

/**
 * Converts a 1-based column-index to a 0-based array-index.
 *
 * @param {Object<string, number>} obj - sheet's column, 1-based object.
 * @returns {Object<string, number>} array index, 0-based object.
 */
function zeroBased(obj)
{
  const result = {};
  for (const key in obj) {
    result[key] = obj[key] - 1;
  }
  return result;
}

/**
 * Returns a comparator function for Array.prototype.sort based on multiple fields,
 * supporting nested paths and safe fallback casting.
 * 
 * Sorter example:
 * ```js
 * const sorter = [
 *   { type: 'string', field: 'visibility',  order: 'asc' },
 *   { type: 'date',   field: 'created_at',  order: 'asc' },
 *   { type: 'string', field: 'owner.login', order: 'asc' }
 * ];
 * ```
 *
 * @param {Array<{
 *   type: 'string' | 'date' | 'number',
 *   field: string,             // dot-notated path (e.g., "owner.login")
 *   order: 'asc' | 'desc'
 * }>} sortConfig - Sorting rules.
 * 
 * @returns {(a: object, b: object) => number} Comparator function for .sort()
 * 
 * @example
 *    allRepos.sort(sortBy(sorter));
 */
function sortBy(sortConfig)
{
  return function(a, b)
  {
    for (const { type, field, order } of sortConfig) {
      const aRaw = getNested(a, field);
      const bRaw = getNested(b, field);

      let aVal, bVal;

      switch (type) {
        case 'string':
          aVal = String(aRaw ?? '');
          bVal = String(bRaw ?? '');
          break;
        case 'date':
          aVal = new Date(aRaw ?? 0);
          bVal = new Date(bRaw ?? 0);
          break;
        case 'number':
          aVal = Number(aRaw ?? 0);
          bVal = Number(bRaw ?? 0);
          break;
        default:
          aVal = bVal = null;
      }

      let comparison = 0;

      switch (type) {
        case 'string':
          comparison = aVal.localeCompare(bVal);
          break;
        case 'date':
        case 'number':
          comparison = aVal - bVal;
          break;
        default:
          comparison = 0;
      }

      if (comparison !== 0) {
        return order === 'asc' ? comparison : -comparison;
      }
    }

    return 0;
  };
}

/**
 * Safely retrieves a nested property from an object using a dot-delimited path.
 *
 * @param {object} obj - The object to traverse.
 * @param {string} path - Dot-separated path string (e.g., "owner.login").
 * @returns {*} The value at the given path, or undefined if any part of the path is missing.
 *
 * @example
 *    getNested(obj, "a.b.c"); // returns obj.a.b.c if it exists, otherwise undefined
 *
 * @note This function does NOT support array index access (e.g., "items[0].value").
 */
function getNested(obj, path)
{
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

/**
 * Writes an object to a `log.json` or `log.txt` in the same folder folder of the Apps Script project.
 *
 * @param {any} obj - The object to log. It will be serialized as JSON or plain text.
 * @param {boolean} json - If true, logs the object as pretty-printed JSON (`log.jsonc`);
 *                         otherwise logs as plain text (`log.txt`).
 * @returns {void}
 *
 * @remarks
 * There's no MimeType.JSON enum
 * @see https://developers.google.com/apps-script/reference/base/mime-type
 */
function logToFile(obj, json = true)
{
  const file = DriveApp.getFileById(ScriptApp.getScriptId());
  const folder = file.getParents().hasNext() ? file.getParents().next() : DriveApp.getRootFolder();

  const content = json ? JSON.stringify(obj, null, 2) : String(obj);
  const ext = json ? 'jsonc' : 'txt';
  const mimeType = json ? 'application/json' : MimeType.PLAIN_TEXT;

  const existingFiles = folder.getFilesByName(`log.${ext}`);
  while (existingFiles.hasNext()) {
    existingFiles.next().setTrashed(true);
  }

  folder.createFile(`log.${ext}`, content, mimeType);
}

/**
 * Writes an object to a `log.json` or `log.txt` in the same folder folder of the Apps Script project.
 *
 * @param {*} obj - The object to log. It will be serialized as JSON or plain text.
 * @param {boolean} json - If true, logs the object as pretty-printed JSON (`log.jsonc`);
 *                         otherwise logs as plain text (`log.txt`).
 * @returns {void}
 *
 * @remarks
 * There's no MimeType.JSON enum
 * @see https://developers.google.com/apps-script/reference/base/mime-type
 */
function logToFile(obj, json = true)
{
  const folder = (() => {
    const scriptFile = DriveApp.getFileById(ScriptApp.getScriptId());
    const scriptParents = scriptFile.getParents();

    // It's a standalone script
    if (scriptParents.hasNext()) {
      return scriptParents.next();
    }

    // It's a container-bound script
    const container =
      SpreadsheetApp.getActiveSpreadsheet?.() ||
      DocumentApp.getActiveDocument?.() ||
      SlidesApp.getActivePresentation?.() ||
      FormApp.getActiveForm?.();

    if (container) {
      try {
        const containerFile = DriveApp.getFileById(container.getId());
        const containerParents = containerFile.getParents();
        return containerParents.hasNext() ? containerParents.next() : DriveApp.getRootFolder();
      } catch (e) {
        // container exists but is not accessible in Drive
        // e.g. permissions issue, script running with different user context (add-ons, triggers)
      }
    }

    // Final fallback
    return DriveApp.getRootFolder();
  })();

  const content = json ? JSON.stringify(obj, null, 2) : String(obj);
  const ext = json ? 'jsonc' : 'txt';
  const mimeType = json ? 'application/json' : MimeType.PLAIN_TEXT;

  const existingFiles = folder.getFilesByName(`log.${ext}`);
  while (existingFiles.hasNext()) {
    existingFiles.next().setTrashed(true);
  }

  folder.createFile(`log.${ext}`, content, mimeType);
}

/**
 * Retrieves the title (first H1 heading) from the README of a GitHub repository.
 *
 * @param {string} owner - The GitHub username or organization name that owns the repository.
 * @param {string} repo - The name of the repository.
 * @param {string} token - A GitHub personal access token for authenticated API access.
 * @returns {string} The first H1 heading from the README file, or an error message if the request fails.
 */
function getRepoReadmeTitle(owner, repo, token)
{
  const url = `https://api.github.com/repos/${owner}/${repo}/readme`;
  const response = UrlFetchApp.fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'GoogleAppsScript' // GitHub API requires User-Agent
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    return 'GitHub API error: ' + response.getContentText();
  }

  const json = JSON.parse(response.getContentText());
  const decoded = Utilities.newBlob(Utilities.base64Decode(json.content)).getDataAsString();

  // Extract the first markdown H1 heading
  const match = decoded.match(/^# (.+)/m);

  return match ? match[1] : '(No title found)';
}
