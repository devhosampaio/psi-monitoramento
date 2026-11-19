/**
 * BACKEND — PSI MONITORAMENTO
 * PAPs: o navegador recebe somente indicadores agregados.
 * Nunca retornar linhas individuais da aba Principal neste endpoint público.
 */
const SOURCES = [
  {
    id: "paps",
    name: "PAPs",
    spreadsheetId: "COLE_AQUI_O_ID_REAL_DA_PLANILHA",
    range: "Principal!A2:AL",
    profile: "pap"
  }
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
      response = { ok: true, sources: SOURCES.map(s => ({
        id: s.id, name: s.name, range: s.range, profile: s.profile
      })) };
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
  const source = SOURCES.find(s => s.id === sourceId);
  if (!source) return { ok: false, error: "not_found" };
  const bang = source.range.lastIndexOf("!");
  if (bang < 1) return { ok: false, error: "bad_range" };
  const sheetName = source.range.slice(0, bang).replace(/^'|'$/g, "").replace(/''/g, "'");
  const a1 = source.range.slice(bang + 1);
  const sheet = SpreadsheetApp.openById(source.spreadsheetId).getSheetByName(sheetName);
  if (!sheet) return { ok: false, error: "bad_range" };
  const match = a1.match(/^([A-Z]+)(\d+):([A-Z]+)$/i);
  let values;
  if (match) {
    const startCol = columnToNumber_(match[1]);
    const startRow = Number(match[2]);
    const endCol = columnToNumber_(match[3]);
    const lastRow = sheet.getLastRow();
    values = lastRow < startRow ? [] :
      sheet.getRange(startRow, startCol, lastRow - startRow + 1, endCol - startCol + 1).getDisplayValues();
  } else {
    values = sheet.getRange(a1).getDisplayValues();
  }
  if (source.profile === "pap") {
    return { ok: true, summary: summarizePaps_(values), updatedAt: new Date().toISOString() };
  }
  // Outras fontes só devem usar este retorno se não contiverem dados pessoais.
  return { ok: true, values: values, updatedAt: new Date().toISOString() };
}

function summarizePaps_(values) {
  if (!values || values.length < 2) return emptyPapSummary_();
  const headers = values[0].map(h => String(h || "").replace(/\s+/g, " ").trim());
  const idx = {};
  headers.forEach((h, i) => idx[h] = i);
  const col = {
    id: "ID", lot: "Lote", territory: "Território", municipality: "Município",
    cartaChain: "Carta: Cadeia Produtiva", papChain: "PAP: Cadeia Produtiva",
    cartaFamilies: "Carta: Qtd Famílias", cartaWomen: "Carta: Qtd Mulheres",
    cartaYouth: "Carta: Qtd Jovens", papFamilies: "PAP: Qtd Famílias",
    papWomen: "PAP: Qtd Mulheres", papYouth: "PAP: Qtd Jovens",
    proposed: "Valor Proposto (Total)", approved: "Valor Aprovado (Total)",
    status: "Status do PAP", team: "Equipe de Análise",
    sent: "Data de Envio da Análise", pendingSent: "Data de Envio das Notas com Pendências",
    pendingReceived: "Data de Recebimento das Pendências",
    pendingDays: "Alerta de Dias com Pendências",
    completed: "Data de Conclusão da Análise", analysisDays: "Alerta de Dias da Análise",
    analysis: "Situação da Análise", verdict: "Resultado do Parecer",
    installments: "Qtd. de Parcelas do PAP"
  };
  Object.keys(col).forEach(k => col[k] = idx[col[k]] == null ? -1 : idx[col[k]]);
  const rows = values.slice(1).filter(r => {
    const id = col.id >= 0 ? String(r[col.id] || "").trim() : "";
    return id && id.toUpperCase() !== "TOTAL";
  });
  const sum = key => rows.reduce((n, r) => n + number_(cell_(r, col[key])), 0);
  const group = key => {
    const out = {};
    rows.forEach(r => {
      let v = clean_(cell_(r, col[key]));
      if (!v) v = "Não informado";
      out[v] = (out[v] || 0) + 1;
    });
    return sortGroups_(out);
  };
  const teams = ["Equipe 1", "Equipe 2", "Equipe 3", "Equipe 4", "Equipe 5"].map(team => {
    const subset = rows.filter(r => clean_(cell_(r, col.team)) === team);
    const count = key => subset.filter(r => clean_(cell_(r, col[key])) !== "" &&
      !/^selecionar|^\.\.\.$|^não definido$/i.test(clean_(cell_(r, col[key])))).length;
    return {
      team: team,
      total: subset.length,
      papInAnalysis: subset.filter(r => /em análise/i.test(clean_(cell_(r, col.status)))).length,
      papPending: subset.filter(r => /pendên/i.test(clean_(cell_(r, col.status)))).length,
      papCompleted: subset.filter(r => /conclu/i.test(clean_(cell_(r, col.status)))).length,
      analysisInProgress: subset.filter(r => /^em análise$/i.test(clean_(cell_(r, col.analysis)))).length,
      analysisPending: subset.filter(r => /^com pendência$/i.test(clean_(cell_(r, col.analysis)))).length,
      analysisCompleted: subset.filter(r => /^concluído$/i.test(clean_(cell_(r, col.analysis)))).length,
      verdicts: count("verdict")
    };
  });
  const pendingActive = rows.filter(r =>
    clean_(cell_(r, col.pendingSent)) && !clean_(cell_(r, col.pendingReceived))).length;
  const valid = key => rows.filter(r => {
    const v = clean_(cell_(r, col[key]));
    return v && !/^selecionar|^\.\.\.$|^não definido$/i.test(v);
  });
  return {
    total: rows.length,
    metrics: {
      papFamiliesCarta: sum("cartaFamilies"), papFamilies: sum("papFamilies"),
      womenCarta: sum("cartaWomen"), womenPap: sum("papWomen"),
      youthCarta: sum("cartaYouth"), youthPap: sum("papYouth"),
      proposed: sum("proposed"), approved: sum("approved"),
      analysisPending: rows.filter(r => /^com pendência$/i.test(clean_(cell_(r, col.analysis)))).length,
      analysisInProgress: rows.filter(r => /^em análise$/i.test(clean_(cell_(r, col.analysis)))).length,
      analysisCompleted: rows.filter(r => /^concluído$/i.test(clean_(cell_(r, col.analysis)))).length,
      verdictApproved: rows.filter(r => /^aprovado$/i.test(clean_(cell_(r, col.verdict)))).length,
      verdictRejected: rows.filter(r => /^reprovado$/i.test(clean_(cell_(r, col.verdict)))).length,
      verdictWithReservations: rows.filter(r => /ressalvas/i.test(clean_(cell_(r, col.verdict)))).length,
      pendingActive: pendingActive,
      withoutTeam: rows.filter(r => /^não definido$/i.test(clean_(cell_(r, col.team)))).length,
      withoutAnalysisStatus: rows.filter(r => /^selecionar/i.test(clean_(cell_(r, col.analysis)))).length,
      withoutVerdict: rows.filter(r => /^selecionar/i.test(clean_(cell_(r, col.verdict)))).length,
      averageAnalysisDays: average_(valid("analysisDays").map(r => number_(cell_(r, col.analysisDays))).filter(n => n > 0)),
      averagePendingDays: average_(valid("pendingDays").map(r => number_(cell_(r, col.pendingDays))).filter(n => n > 0))
    },
    distributions: {
      status: group("status"), analysis: group("analysis"), verdict: group("verdict"),
      territory: group("territory"), lot: group("lot"), team: group("team"),
      chain: group("papChain").length ? group("papChain") : group("cartaChain")
    },
    teams: teams,
    updatedAt: new Date().toISOString()
  };
}

function emptyPapSummary_() {
  return { total: 0, metrics: {}, distributions: {}, teams: [] };
}
function cell_(row, index) { return index < 0 ? "" : row[index]; }
function clean_(value) {
  const s = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  return /^selecionar/i.test(s) ? "" : s;
}
function number_(value) {
  if (typeof value === "number") return value;
  const s = String(value == null ? "" : value).replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const n = Number(s);
  return isFinite(n) ? n : 0;
}
function average_(values) {
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10 : 0;
}
function sortGroups_(object) {
  return Object.keys(object).sort((a, b) => object[b] - object[a] || a.localeCompare(b, "pt-BR"))
    .map(label => ({ label: label, value: object[label] }));
}
function columnToNumber_(letters) {
  return letters.toUpperCase().split("").reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
}
function classifyError_(error) {
  const message = String(error && error.message || error || "");
  if (/permission|access denied|not have permission/i.test(message)) return "forbidden";
  if (/not found|does not exist/i.test(message)) return "not_found";
  if (/range|A1 notation|coordinates/i.test(message)) return "bad_range";
  return "backend_error";
}
function testBackend() {
  const result = readSource_(SOURCES[0].id);
  Logger.log(JSON.stringify({ ok: result.ok, total: result.summary && result.summary.total, error: result.error }));
}