/*******************************************************
 **        GLOBAL VARIABLES AND CONFIGURATIONS        **
 *******************************************************/

var UI; // return null if called from script editor
try {
  UI = SpreadsheetApp.getUi();
} catch (e) {
  Logger.log('You are using script editor.');
}
const SS = SpreadsheetApp.getActiveSpreadsheet();

// === START: Configuration for Spreadsheets ===
// === END: Configuration for Spreadsheets ===

// === START: Configuration for Sheets ===

// Sheet: 'Repos'
const SHEETNAME_REPOS = 'Repos';

// Sheet: <add more sheets...>

const SHEETCONFIG = readOnlyObject({

  [SHEETNAME_REPOS]: {
    headerRows: 1,
    variableNames: {
      type                  : { col: 'A',  type: 'string' },
      owner                 : { col: 'B',  type: 'string' },
      title                 : { col: 'C',  type: 'string' },
      remoteRepo            : { col: 'D',  type: 'string' },
      localRepo             : { col: 'E',  type: 'string' },
      status                : { col: 'F',  type: 'string' }
    }
  }

  // <add more sheets...>
});

// === END: Configuration for Sheets ===
