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
