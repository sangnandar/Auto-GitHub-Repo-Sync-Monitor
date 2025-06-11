function fetchGitHubRepos()
{
  const sheet = SS.getSheetByName(SHEETNAME_REPOS);
  if (!sheet) {
    showAlert(`Sheet "${SHEETNAME_REPOS}" not found.`);
    return;
  }
  if (SpreadsheetApp.getActiveSheet().getSheetName() !== SHEETNAME_REPOS) {
    showAlert(`This menu only work in sheet "${SHEETNAME_REPOS}".`);
    return;
  }

  const sheetLayout = new SheetLayout(sheet);
  const [headerRowCount, dataMap] = [sheetLayout.getHeaderRowCount(), sheetLayout.getDataMap()];
  const lastRow = sheet.getLastRow();

  const { owner, remoteRepo } = zeroBased(dataMap);
  const data = sheet.getDataRange().getValues().slice(headerRowCount); // exclude header
  const existingRepos = new Set(data.map(rowData => rowData[owner] + '-' + rowData[remoteRepo])); // owner-url as key

  const token = getSecret("GITHUB_TOKEN");
  const apiUrl = "https://api.github.com/user/repos?affiliation=owner,collaborator&per_page=100";

  let page = 1;
  let allRepos = [];

  while(true) {
    const response = UrlFetchApp.fetch(apiUrl + '&page=' + page, {
      method: 'GET',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      showAlert('GitHub API error: ' + response.getContentText());
      break;
    }

    const repos = JSON.parse(response.getContentText());
    if (!repos.length) break;

    allRepos = allRepos.concat(repos);
    page++;

    if (repos.length < 100) break; // stop if less than 100 repos fetched (last page)
  }

  let newRows = [];

  const sorter = [
    { type: 'string', field: 'visibility',  order: 'asc' },
    { type: 'date',   field: 'created_at',  order: 'asc' },
    { type: 'string', field: 'owner.login', order: 'asc' }
  ];
  allRepos.sort(sortBy(sorter));

  allRepos.forEach(repo => {
    const type = repo.private ? 'private' : 'public';
    const owner = repo.owner.login;
    const remoteRepo = repo.html_url;
    const key = owner + '-' + remoteRepo;

    if (!existingRepos.has(key)) {
      newRows.push([type, owner, remoteRepo]);
      existingRepos.add(key);
    }
  });

  if (newRows.length) {
    sheet.getRange(lastRow + 1, 1, newRows.length, 3).setValues(newRows)
      .setShowHyperlink(false); // remvove hyperlinks
  } else {
    showAlert('No new repos.');
  }
}

function removeHyperlinks()
{
  const sheet = SS.getSheetByName(SHEETNAME_REPOS);
  if (!sheet) {
    showAlert(`Sheet "${SHEETNAME_REPOS}" not found.`);
    return;
  }
  if (SpreadsheetApp.getActiveSheet().getSheetName() !== SHEETNAME_REPOS) {
    showAlert(`This menu only work in sheet "${SHEETNAME_REPOS}".`);
    return;
  }

  const lastRow = sheet.getLastRow();
  const sheetLayout = new SheetLayout(sheet);
  const [headerRowCount, dataMap] = [sheetLayout.getHeaderRowCount(), sheetLayout.getDataMap()];
  const { url } = dataMap;

  if (lastRow === headerRowCount) return; // sheet contains no data

  const range = sheet.getRange(headerRowCount + 1, url, lastRow - headerRowCount, 1);
  range.setShowHyperlink(false); // remove hyperlinks
}
