/**
 * Add a custom menu to the active spreadsheet.
 *
 * @param {GoogleAppsScript.Events.SheetsOnOpen} e - event object.
 * @returns {void}
 */
function onOpen()
{
  UI
    .createMenu('Custom Menu')
      .addItem('Fetch repos', 'fetchGitHubRepos')
      .addItem('Remove hyperlinks', 'removeHyperlinks')
    .addToUi();
}
