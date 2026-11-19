/**
 * MODELO DO BACKEND — PSI MONITORAMENTO
 * Este arquivo é uma referência para o projeto Google Apps Script.
 * Preencha os IDs reais somente no projeto privado do Apps Script.
 *
 * ATENÇÃO: se o Web App estiver publicado como "Qualquer pessoa",
 * todos os dados cadastrados em SOURCES poderão ser lidos publicamente.
 */
const SOURCES = [
  {
    id: "paps",
    name: "PAPs",
    spreadsheetId: "COLE_AQUI_O_ID_REAL_DA_PLANILHA",
    range: "Principal!A2:AL",
    profile: "pap"
  }
  // Adicione novas fontes copiando o modelo:
  // {
  //   id: "cisternas",
  //   name: "Cisternas",
  //   spreadsheetId: "ID_REAL_DA_PLANILHA",
  //   range: "Principal!A1:Z",
  //   profile: "auto"
  // }
];

function doGet(e) {
  const params = (e && e.parameter) || {};
  const callback = String(params.callback || "");
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) {
    return ContentService.createTextOutput("Invalid callback")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  let response;
  try {
    if (params.action === "sources") {
      response = {
        ok: true,
        sources: SOURCES.map(({ id, name, range, profile }) => ({ id, name, range, profile }))
      };
    } else if (params.action === "read") {
      response = readSource_(String(params.id || ""));
    } else {
      response = { ok: false, error: "invalid_action" };
    }
  } catch (error) {
    response = { ok: false, error: classifyError_(error) };
  }

  return ContentService.createTextOutput(callback + "(" + JSON.stringify(response) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function readSource_(sourceId) {
  const source = SOURCES.find(item => item.id === sourceId);
  if (!source) return { ok: false, error: "not_found" };

  const bang = source.range.lastIndexOf("!");
  if (bang < 1 || bang === source.range.length - 1) {
    return { ok: false, error: "bad_range" };
  }

  const sheetName = source.range.slice(0, bang).replace(/^'|'$/g, "").replace(/''/g, "'");
  const a1Range = source.range.slice(bang + 1);
  const spreadsheet = SpreadsheetApp.openById(source.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return { ok: false, error: "bad_range" };

  const openEnded = a1Range.match(/^([A-Z]+)(\d+):([A-Z]+)$/i);
  let range;
  if (openEnded) {
    const startColumn = columnToNumber_(openEnded[1]);
    const startRow = Number(openEnded[2]);
    const endColumn = columnToNumber_(openEnded[3]);
    const lastRow = sheet.getLastRow();
    if (lastRow < startRow) {
      return { ok: true, values: [], updatedAt: new Date().toISOString() };
    }
    range = sheet.getRange(startRow, startColumn, lastRow - startRow + 1, endColumn - startColumn + 1);
  } else {
    range = sheet.getRange(a1Range);
  }

  return { ok: true, values: range.getDisplayValues(), updatedAt: new Date().toISOString() };
}

function columnToNumber_(letters) {
  return letters.toUpperCase().split("")
    .reduce((number, letter) => number * 26 + letter.charCodeAt(0) - 64, 0);
}

function classifyError_(error) {
  const message = String(error && error.message || error || "");
  if (/permission|access denied|not have permission/i.test(message)) return "forbidden";
  if (/not found|does not exist/i.test(message)) return "not_found";
  if (/range|A1 notation|coordinates/i.test(message)) return "bad_range";
  return "backend_error";
}

/** Execute manualmente no editor para testar a leitura da primeira fonte. */
function testBackend() {
  const first = SOURCES[0];
  if (!first) throw new Error("Cadastre ao menos uma fonte em SOURCES.");
  const result = readSource_(first.id);
  Logger.log(JSON.stringify({
    ok: result.ok,
    rows: result.values ? result.values.length : 0,
    error: result.error
  }));
}