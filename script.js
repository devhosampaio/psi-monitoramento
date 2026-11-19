/* =========================================================
   PAINEL DE MONITORAMENTO — aplicação
   Frontend estático + backend Google Apps Script
   ========================================================= */

const $ = (id) => document.getElementById(id);
const BACKEND_URL = "https://script.google.com/macros/s/AKfycby4l-fSskbNZEltZ29AwK03H_l-cApaTTBj6YNp6iE8QuDquzwQJ9Wb_9B1dgBRqAxbYA/exec";
const POLL_DEFAULT = 30000;
const NA = "(não definido)";
const numberFormat = new Intl.NumberFormat("pt-BR");
const moneyFormat = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1
});
const COLORS = ["#2d6f91", "#2b9870", "#d49a43", "#c85e59", "#8872bd", "#3e9eaa", "#c46d9b", "#82a64a"];

const PAP_PROFILE = {
  title: "Painel de PAPs",
  key: "id",
  semantic: "status",
  fields: {
    id: { label: "ID", index: 0 },
    lote: { label: "Lote", index: 1 },
    cnpj: { label: "CNPJ da associação", index: 2 },
    assoc: { label: "Associação proponente", index: 3 },
    territorio: { label: "Território", index: 4, options: ["Chapada do Vale do Rio Itaim", "Entre Rios", "Serra da Capivara", "Vale do Canindé", "Vale do Rio Guaribas", "Vale do Rio Sambito", "Vale dos Rios Piauí e Itaueira"] },
    municipio: { label: "Município", index: 5 },
    genero: { label: "Gênero", index: 6, options: ["Não definido", "Maioria Mulheres", "Mulheres", "Quilombola", "Quilombola/Maioria Mulheres", "Quilombola/Mulheres"] },
    cadeiaCarta: { label: "Cadeia produtiva (Carta)", index: 7 },
    cadeiaPap: { label: "Cadeia produtiva (PAP)", index: 8 },
    agroprocessamento: { label: "Possui agroprocessamento", index: 9, options: ["Pendente", "Sim", "Não"] },
    titulacao: { label: "INTERPI: previsão/ano de titulação", index: 10, options: ["Não se aplica", "Titulado: 2024", "Titulado: 2025", "Previsão: 2026", "Previsão: 2027", "Previsão: 2028", "Previsão: 2029"] },
    situacaoFundiaria: { label: "Situação fundiária geral", index: 11 },
    familiasCarta: { label: "Famílias (Carta)", index: 12, type: "number" },
    mulheresCarta: { label: "Mulheres (Carta)", index: 13, type: "number" },
    jovensCarta: { label: "Jovens (Carta)", index: 14, type: "number" },
    familiasPap: { label: "Famílias (PAP)", index: 15, type: "number" },
    mulheresPap: { label: "Mulheres (PAP)", index: 16, type: "number" },
    jovensPap: { label: "Jovens (PAP)", index: 17, type: "number" },
    valorUnidade: { label: "Valor proposto (unidade)", index: 18, type: "money" },
    proposto: { label: "Valor proposto (total)", index: 19, type: "money" },
    aprovado: { label: "Valor aprovado (total)", index: 20, type: "money" },
    contrapartidaFinanceira: { label: "Contrapartida financeira", index: 21, type: "money" },
    contrapartidaMaoObra: { label: "Contrapartida: mão de obra", index: 22, type: "money" },
    contrapartidaBens: { label: "Contrapartida: bens e materiais", index: 23, type: "money" },
    contrapartidaDetalhe: { label: "Detalhamento da contrapartida", index: 24 },
    status: { label: "Status do PAP", index: 25, options: ["Nota técnica enviada", "Concluído", "Em análise", "Com pendências", "..."] },
    dataEnvio: { label: "Data de envio da análise", index: 26, type: "date" },
    equipe: { label: "Equipe de análise", index: 27, options: ["Não definido", "Equipe 1", "Equipe 2", "Equipe 3", "Equipe 4", "Equipe 5"] },
    analista: { label: "Analista", index: 28 },
    dataPendencia: { label: "Data de envio das notas com pendências", index: 29, type: "date" },
    dataRecebimento: { label: "Data de recebimento das pendências", index: 30, type: "date" },
    diasPendencia: { label: "Dias com pendências", index: 31, type: "number" },
    dataConclusao: { label: "Data de conclusão da análise", index: 32, type: "date" },
    diasAnalise: { label: "Dias da análise", index: 33, type: "number" },
    situacaoAnalise: { label: "Situação da análise", index: 34, options: ["Concluído", "Em análise", "Com pendência"] },
    parecer: { label: "Resultado do parecer", index: 35, options: ["Aprovado", "Reprovado", "Aprovado com ressalvas"] },
    parcelas: { label: "Quantidade de parcelas", index: 36, type: "number" },
    observacoes: { label: "Observações", index: 37 }
  },
  filters: ["territorio", "municipio", "lote", "cadeiaCarta", "genero", "agroprocessamento", "equipe", "analista", "status", "situacaoAnalise", "parecer", "dataEnvio", "dataPendencia", "dataRecebimento", "diasPendencia", "dataConclusao", "diasAnalise", "parcelas", "valorUnidade", "contrapartidaFinanceira", "contrapartidaMaoObra", "contrapartidaBens", "observacoes"],
  widgets: [
    { type: "kpi", title: "PAPs cadastrados", aggregate: "count" },
    { type: "kpi", title: "Sem classificação no status", aggregate: "count", where: { status: /^\.\.\.$/ } },
    { type: "kpi", title: "Em análise", aggregate: "count", where: { situacaoAnalise: /^Em análise$/i } },
    { type: "kpi", title: "Com pendências", aggregate: "count", where: { situacaoAnalise: /^Com pendência$/i } },
    { type: "kpi", title: "Análise concluída", aggregate: "count", where: { situacaoAnalise: /^Concluído$/i } },
    { type: "kpi", title: "Famílias (Carta)", aggregate: "sum", field: "familiasCarta" },
    { type: "kpi", title: "Famílias (PAP)", aggregate: "sum", field: "familiasPap" },
    { type: "kpi", title: "Mulheres (Carta)", aggregate: "sum", field: "mulheresCarta" },
    { type: "kpi", title: "Jovens (Carta)", aggregate: "sum", field: "jovensCarta" },
    { type: "kpi", title: "Valor proposto", aggregate: "sum", field: "proposto", format: "money" },
    { type: "kpi", title: "Valor aprovado", aggregate: "sum", field: "aprovado", format: "money" },
    { type: "kpi", title: "Contrapartida financeira", aggregate: "sum", field: "contrapartidaFinanceira", format: "money" },
    { type: "kpi", title: "Contrapartida: mão de obra", aggregate: "sum", field: "contrapartidaMaoObra", format: "money" },
    { type: "kpi", title: "Contrapartida: bens e materiais", aggregate: "sum", field: "contrapartidaBens", format: "money" },
    { type: "pipeline", title: "Status geral dos PAPs", by: "status", wide: true },
    { type: "bar", title: "Situação das análises", by: "situacaoAnalise", horizontal: true },
    { type: "doughnut", title: "Resultado dos pareceres", by: "parecer" },
    { type: "bar", title: "PAPs por território", by: "territorio", horizontal: true },
    { type: "bar", title: "PAPs por lote", by: "lote", sort: "label" },
    { type: "bar", title: "Situação da análise por equipe", by: "equipe", stack: "situacaoAnalise", horizontal: true },
    { type: "bar", title: "Cadeias produtivas (Carta)", by: "cadeiaCarta", horizontal: true, top: 12 },
    { type: "bar", title: "Gênero / público atendido", by: "genero", horizontal: true },
    { type: "bar", title: "Agroprocessamento", by: "agroprocessamento", horizontal: true },
    { type: "bar", title: "Previsão de titulação (INTERPI)", by: "titulacao", horizontal: true },
    { type: "bar", title: "PAPs por analista", by: "analista", horizontal: true, top: 15 },
    { type: "teamSummary", title: "Acompanhamento operacional por equipe", wide: true },
    { type: "analystSummary", title: "Distribuição por analista", wide: true },
    { type: "table", title: "Detalhamento dos PAPs", columns: ["id", "lote", "assoc", "territorio", "municipio", "cadeiaCarta", "equipe", "analista", "status", "situacaoAnalise", "parecer"], wide: true }
  ]
};

const state = {
  sources: [],
  settings: { pollMs: POLL_DEFAULT },
  inFlight: new Set(),
  results: new Map(),
  selectedSource: "overview",
  filters: {},
  query: "",
  timers: new Map(),
  charts: [],
  editingId: null
};

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
function clean(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return /^selecionar/i.test(text) ? "" : text;
}
function toNumber(value) {
  if (typeof value === "number") return value;
  const normalized = String(value ?? "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const result = Number.parseFloat(normalized);
  return Number.isFinite(result) ? result : 0;
}
function valuesOf(record, field) {
  const value = record[field];
  if (Array.isArray(value)) return value.length ? value : [NA];
  return value === "" || value == null ? [NA] : [String(value)];
}
function compare(a, b) {
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true });
}
function saveStorage() {
  // As fontes são administradas centralmente no backend (Code.gs).
}
function normalizeSpreadsheetId(input) {
  const value = input.trim();
  const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : value;
}
function makeId() {
  return `src_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function showNotice(message, type = "info") {
  const notice = $("notice");
  notice.hidden = !message;
  notice.className = `notice notice-${type}`;
  notice.textContent = message;
}
function setGlobalStatus(online, label) {
  $("globalDot").classList.toggle("online", online);
  $("globalStatus").textContent = label;
}
function semanticColor(value) {
  const text = String(value || "");
  if (/conclu|aprov|regular/i.test(text)) return "#2b9870";
  if (/an[aá]lise|andamento/i.test(text)) return "#d49a43";
  if (/pend|reprov|atras/i.test(text)) return "#c85e59";
  if (text === NA || /sem status/i.test(text)) return "#aab4bd";
  return "#477da0";
}

/* Perfis: o perfil PAP é específico; o automático adapta-se aos cabeçalhos. */
function buildAutomaticProfile(values) {
  const headers = (values[0] || []).map((header) => String(header).replace(/\s+/g, " ").trim());
  const body = values.slice(1);
  const fields = {};
  const categorical = [];
  const numeric = [];

  headers.forEach((header, index) => {
    if (!header) return;
    const column = body.map((row) => clean(row[index])).filter(Boolean);
    const numericRatio = column.length
      ? column.filter((item) => /^[\d.,\-R$ ]+$/.test(item)).length / column.length
      : 0;
    const isNumeric = numericRatio >= 0.8;
    const key = `c${index}`;
    fields[key] = { label: header, index, type: isNumeric ? "number" : "text" };
    const distinct = new Set(column).size;
    if (isNumeric) numeric.push(key);
    else if (distinct >= 2 && distinct <= 25) categorical.push(key);
  });

  const widgets = [{ type: "kpi", title: "Registros", aggregate: "count" }];
  numeric.slice(0, 3).forEach((field) => widgets.push({
    type: "kpi", title: `Soma · ${fields[field].label}`, aggregate: "sum", field
  }));
  categorical.slice(0, 4).forEach((field) => widgets.push({
    type: "bar", title: `Registros por ${fields[field].label}`, by: field, horizontal: true, top: 12
  }));
  widgets.push({ type: "table", title: "Registros", columns: Object.keys(fields).slice(0, 10), wide: true });

  return {
    title: "Painel da planilha", fields, filters: categorical.slice(0, 4),
    widgets, key: null, semantic: null
  };
}

function parseSheet(values, profile) {
  if (!Array.isArray(values) || values.length < 1) {
    return { records: [], missing: ["Cabeçalho não encontrado"] };
  }
  const headers = (values[0] || []).map((header) => String(header).replace(/\s+/g, " ").trim());
  const indexes = {};
  const missing = [];

  Object.entries(profile.fields).forEach(([key, definition]) => {
    indexes[key] = Number.isInteger(definition.index)
      ? definition.index
      : headers.findIndex((header) => definition.match?.test(header));
    if (indexes[key] < 0) missing.push(definition.label);
  });

  const records = [];
  let current = null;
  for (const row of values.slice(1)) {
    if (!row || !row.some((cell) => String(cell ?? "").trim())) continue;
    const startsRecord = profile.key
      ? indexes[profile.key] >= 0 && clean(row[indexes[profile.key]]) !== ""
      : true;

    if (startsRecord) {
      current = {};
      Object.entries(profile.fields).forEach(([key, definition]) => {
        current[key] = definition.type === "multi" ? [] : "";
      });
      records.push(current);
    } else if (!current) continue;

    Object.entries(profile.fields).forEach(([key, definition]) => {
      const index = indexes[key];
      if (index < 0) return;
      const value = clean(row[index]);
      if (!value) return;
      if (definition.type === "multi") {
        if (!current[key].includes(value)) current[key].push(value);
      } else if (current[key] === "") current[key] = value;
    });
  }

  records.forEach((record) => {
    Object.entries(profile.fields).forEach(([key, definition]) => {
      if (["number", "money"].includes(definition.type)) record[key] = toNumber(record[key]);
    });
  });
  return { records, missing };
}

/* Camada de acesso à fonte. A interface não depende diretamente da API. */
const SheetsSource = {
  jsonp(params) {
    return new Promise((resolve, reject) => {
      if (!BACKEND_URL || BACKEND_URL.includes("COLE_A_URL")) {
        reject(new Error("backend_not_configured"));
        return;
      }
      const callbackName = `__monitoramento_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => finish(new Error("timeout")), 25000);
      const cleanup = () => {
        window.clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      };
      const finish = (error, payload) => {
        cleanup();
        if (error) reject(error);
        else if (!payload || payload.ok !== true) reject(new Error(payload?.error || "backend_error"));
        else resolve(payload);
      };
      window[callbackName] = (payload) => finish(null, payload);
      const url = new URL(BACKEND_URL);
      Object.entries({ ...params, callback: callbackName }).forEach(([key, value]) => url.searchParams.set(key, value));
      script.onerror = () => finish(new Error("network"));
      script.src = url.toString();
      document.head.appendChild(script);
    });
  },
  async list() {
    const payload = await this.jsonp({ action: "sources" });
    return payload.sources || [];
  },
  async fetch(source) {
    const payload = await this.jsonp({ action: "read", id: source.id });
    return payload.values || [];
  }
};

function errorMessage(error) {
  const messages = {
    backend_not_configured: "O endereço do backend ainda não foi configurado no script.js.",
    timeout: "O backend demorou para responder. Os últimos dados foram mantidos.",
    forbidden: "O backend não tem permissão para ler esta planilha. Confira o acesso da conta que publicou o Apps Script.",
    not_found: "A fonte não está cadastrada no backend.",
    bad_range: "Aba ou intervalo inválido. Confira a configuração no Code.gs.",
    http: "O backend retornou um erro ao consultar esta fonte.",
    backend_error: "O backend não conseguiu consultar esta fonte.",
    network: "Falha de conexão. Verifique sua internet."
  };
  return messages[error.message] || "Não foi possível atualizar esta fonte.";
}

async function loadSource(source, { quiet = false } = {}) {
  if (state.inFlight.has(source.id)) return;
  state.inFlight.add(source.id);
  const previous = state.results.get(source.id) || {};
  try {
    const values = await SheetsSource.fetch(source);
    const profile = source.profile === "pap" ? PAP_PROFILE : buildAutomaticProfile(values);
    const parsed = parseSheet(values, profile);
    state.results.set(source.id, {
      ...previous, records: parsed.records, profile, missing: parsed.missing,
      updatedAt: Date.now(), error: null
    });
    if (!quiet) showNotice(`${source.name}: dados atualizados com sucesso.`, "info");
  } catch (error) {
    const normalized = error.message === "Failed to fetch" ? new Error("network") : error;
    state.results.set(source.id, { ...previous, error: normalized.message, profile: previous.profile });
    if (!quiet) showNotice(`${source.name}: ${errorMessage(normalized)}`, "warning");
  } finally {
    state.inFlight.delete(source.id);
  }
  renderAll();
}

function scheduleSource(source) {
  const existing = state.timers.get(source.id);
  if (existing) clearInterval(existing);
  const timer = setInterval(() => {
    if (!document.hidden) loadSource(source, { quiet: true });
  }, state.settings.pollMs);
  state.timers.set(source.id, timer);
}
function stopSource(id) {
  const timer = state.timers.get(id);
  if (timer) clearInterval(timer);
  state.timers.delete(id);
}
async function refreshAll() {
  if (!state.sources.length) {
    showNotice("Adicione uma planilha para iniciar o monitoramento.", "info");
    return;
  }
  $("refreshAll").disabled = true;
  $("refreshAll").textContent = "Atualizando…";
  await Promise.all(state.sources.map((source) => loadSource(source, { quiet: true })));
  $("refreshAll").disabled = false;
  $("refreshAll").innerHTML = "<span>↻</span> Atualizar";
  showNotice("Sincronização concluída. Confira o status de cada fonte.", "info");
}
function startMonitoring() {
  state.sources.forEach((source) => {
    loadSource(source, { quiet: true });
    scheduleSource(source);
  });
}

/* Agregações e renderização dos widgets individuais. */
function aggregateRows(rows, widget) {
  return widget.where
    ? rows.filter((row) => Object.entries(widget.where).every(([field, regex]) => regex.test(String(row[field] || ""))))
    : rows;
}
function groupRows(rows, widget) {
  const groups = new Map();
  const stacks = new Set();
  rows.forEach((record) => {
    valuesOf(record, widget.by).forEach((label) => {
      const stack = widget.stack ? valuesOf(record, widget.stack)[0] : "_";
      stacks.add(stack);
      const group = groups.get(label) || {};
      group[stack] = (group[stack] || 0) + (widget.aggregate === "sum" ? (record[widget.field] || 0) : 1);
      groups.set(label, group);
    });
  });
  let labels = [...groups.keys()];
  const total = (label) => Object.values(groups.get(label)).reduce((sum, value) => sum + value, 0);
  labels = widget.sort === "label" ? labels.sort(compare) : labels.sort((a, b) => total(b) - total(a));
  if (widget.top) labels = labels.slice(0, widget.top);
  const stackKeys = [...stacks].sort(compare);
  return {
    labels,
    datasets: stackKeys.map((key) => ({
      label: key === "_" ? (widget.aggregate === "sum" ? "Total" : "Registros") : key,
      data: labels.map((label) => groups.get(label)?.[key] || 0),
      stackKey: key
    }))
  };
}
function destroyCharts() {
  state.charts.forEach((chart) => chart.destroy());
  state.charts = [];
}
function renderMetric(title, value, detail = "") {
  return `<article class="metric-card"><span class="metric-label">${escapeHTML(title)}</span><strong>${escapeHTML(value)}</strong><small>${escapeHTML(detail)}</small></article>`;
}
function renderKpi(widget, rows, profile) {
  const filtered = aggregateRows(rows, widget);
  const value = widget.aggregate === "sum"
    ? filtered.reduce((sum, row) => sum + (row[widget.field] || 0), 0)
    : filtered.length;
  const formatted = widget.format === "money" || profile.fields[widget.field]?.type === "money"
    ? moneyFormat.format(value)
    : numberFormat.format(value);
  return renderMetric(widget.title, formatted, widget.aggregate === "sum" ? "Total acumulado" : "Registros");
}
function renderChart(widget, rows, profile, index) {
  const id = `chart_${index}`;
  const isDoughnut = widget.type === "doughnut";
  const wide = widget.wide ? " wide" : "";
  const height = isDoughnut ? " short" : "";
  return `<article class="widget-card${wide}"><h3>${escapeHTML(widget.title)}</h3><div class="chart-wrap${height}"><canvas id="${id}" aria-label="${escapeHTML(widget.title)}" role="img"></canvas></div></article>`;
}
function drawChart(widget, rows, profile, index) {
  const canvas = $(`chart_${index}`);
  if (!canvas || typeof Chart === "undefined") return;
  const grouped = groupRows(rows, widget);
  const css = getComputedStyle(document.documentElement);
  const muted = css.getPropertyValue("--muted").trim();
  const line = css.getPropertyValue("--line").trim();
  const isDoughnut = widget.type === "doughnut";
  const datasets = isDoughnut
    ? [{
      data: grouped.datasets[0]?.data || [],
      backgroundColor: grouped.labels.map((label, i) => profile.semantic === widget.by ? semanticColor(label) : COLORS[i % COLORS.length]),
      borderColor: "#fff", borderWidth: 2
    }]
    : grouped.datasets.map((dataset, i) => ({
      label: dataset.label,
      data: dataset.data,
      backgroundColor: widget.stack
        ? (widget.stack === profile.semantic ? semanticColor(dataset.stackKey) : COLORS[i % COLORS.length])
        : COLORS[index % COLORS.length],
      borderRadius: 5,
      maxBarThickness: 36
    }));
  const chart = new Chart(canvas, {
    type: isDoughnut ? "doughnut" : "bar",
    data: { labels: grouped.labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      indexAxis: widget.horizontal ? "y" : "x",
      cutout: isDoughnut ? "62%" : undefined,
      plugins: {
        legend: { display: isDoughnut || grouped.datasets.length > 1, position: "bottom", labels: { color: muted, boxWidth: 10, usePointStyle: true, font: { size: 10 } } }
      },
      scales: isDoughnut ? {} : {
        x: { stacked: !!widget.stack, ticks: { color: muted, font: { size: 10 } }, grid: { color: line } },
        y: { stacked: !!widget.stack, beginAtZero: true, ticks: { color: muted, precision: 0, font: { size: 10 } }, grid: { color: line } }
      }
    }
  });
  state.charts.push(chart);
}
function renderPipeline(widget, rows, profile) {
  const grouped = groupRows(rows, widget);
  const values = grouped.datasets[0]?.data || [];
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const items = grouped.labels.map((label, index) => ({
    label, value: values[index], color: profile.semantic === widget.by ? semanticColor(label) : COLORS[index % COLORS.length]
  }));
  return `<article class="widget-card wide"><h3>${escapeHTML(widget.title)}</h3>
    <div class="pipeline">${items.map((item) => `<span title="${escapeHTML(item.label)}: ${item.value}" style="width:${item.value / total * 100}%;background:${item.color}"></span>`).join("")}</div>
    <div class="legend">${items.map((item) => `<span><i style="background:${item.color}"></i>${escapeHTML(item.label)} · <b>${numberFormat.format(item.value)}</b> (${Math.round(item.value / total * 100)}%)</span>`).join("")}</div>
  </article>`;
}
function renderTable(widget, rows, profile) {
  const columns = widget.columns.filter((key) => profile.fields[key]);
  const body = rows.slice(0, 250);
  return `<article class="widget-card${widget.wide ? " wide" : ""}">
    <h3>${escapeHTML(widget.title)} · ${numberFormat.format(rows.length)} registros${rows.length > 250 ? " (exibindo 250)" : ""}</h3>
    <div class="table-wrap"><table><thead><tr>${columns.map((key) => `<th>${escapeHTML(profile.fields[key].label)}</th>`).join("")}</tr></thead>
    <tbody>${body.map((record) => `<tr>${columns.map((key) => {
    const value = record[key];
    if (key === profile.semantic) return `<td><span class="status-tag" style="background:${semanticColor(value || NA)}">${escapeHTML(value || "Sem status")}</span></td>`;
    if (Array.isArray(value)) return `<td>${escapeHTML(value.join(", "))}</td>`;
    if (profile.fields[key].type === "money") return `<td>${escapeHTML(moneyFormat.format(value || 0))}</td>`;
    return `<td>${escapeHTML(value)}</td>`;
  }).join("")}</tr>`).join("")}</tbody></table></div>
  </article>`;
}


function normalizedValue(value) {
  return clean(value).replace(/^Selecionar.*$/i, "") || NA;
}
function summarizeBy(rows, field) {
  const groups = new Map();
  rows.forEach((row) => {
    const label = normalizedValue(row[field]);
    groups.set(label, (groups.get(label) || 0) + 1);
  });
  return [...groups.entries()].sort((a, b) => b[1] - a[1]);
}
function renderTeamSummary(rows) {
  const teams = ["Equipe 1", "Equipe 2", "Equipe 3", "Equipe 4", "Equipe 5"];
  const rowsHtml = teams.map((team) => {
    const assigned = rows.filter((row) => row.equipe === team);
    const inAnalysis = assigned.filter((row) => row.situacaoAnalise === "Em análise").length;
    const completed = assigned.filter((row) => row.situacaoAnalise === "Concluído").length;
    const pending = assigned.filter((row) => row.situacaoAnalise === "Com pendência").length;
    const awaiting = assigned.filter((row) => !row.situacaoAnalise || row.situacaoAnalise === NA).length;
    return `<tr><td><strong>${team}</strong></td><td>${assigned.length}</td><td>${inAnalysis}</td><td>${completed}</td><td>${pending}</td><td>${awaiting}</td></tr>`;
  }).join("");
  return `<article class="widget-card wide"><h3>Acompanhamento operacional por equipe</h3><div class="table-wrap"><table><thead><tr><th>Equipe</th><th>PAPs atribuídos</th><th>Em análise</th><th>Concluídos</th><th>Com pendências</th><th>Sem situação</th></tr></thead><tbody>${rowsHtml}</tbody></table></div><p class="table-note">Contagens calculadas a partir dos campos Equipe de Análise e Situação da Análise.</p></article>`;
}
function renderAnalystSummary(rows) {
  const analysts = summarizeBy(rows.filter((row) => row.analista && row.analista !== NA), "analista");
  const rowsHtml = analysts.map(([name, total]) => {
    const assigned = rows.filter((row) => row.analista === name);
    const completed = assigned.filter((row) => row.situacaoAnalise === "Concluído").length;
    const pending = assigned.filter((row) => row.situacaoAnalise === "Com pendência").length;
    const analysis = assigned.filter((row) => row.situacaoAnalise === "Em análise").length;
    return `<tr><td>${escapeHTML(name)}</td><td>${total}</td><td>${analysis}</td><td>${completed}</td><td>${pending}</td></tr>`;
  }).join("");
  return `<article class="widget-card wide"><h3>Distribuição por analista</h3><div class="table-wrap"><table><thead><tr><th>Analista</th><th>PAPs atribuídos</th><th>Em análise</th><th>Concluídos</th><th>Com pendências</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="5">Sem atribuições identificadas.</td></tr>'}</tbody></table></div></article>`;
}
\nfunction applyFilters(rows, profile, sourceId) {
  const selected = state.filters[sourceId] || {};
  const query = state.query.trim().toLocaleLowerCase("pt-BR");
  return rows.filter((record) => {
    const matchesFilters = profile.filters.every((field) => {
      const chosen = selected[field];
      return !chosen || !chosen.size || valuesOf(record, field).some((value) => chosen.has(value));
    });
    const matchesQuery = !query || Object.values(record).flat().join(" ").toLocaleLowerCase("pt-BR").includes(query);
    return matchesFilters && matchesQuery;
  });
}
function renderFilterControls(sourceId, records, profile) {
  const selected = state.filters[sourceId] || {};
  $("filters").innerHTML = profile.filters.map((field) => {
    const options = [...new Set([...(profile.fields[field].options || []), ...records.flatMap((record) => valuesOf(record, field))])].sort(compare);
    const active = selected[field] || new Set();
    return `<select class="filter-select" data-filter="${escapeHTML(field)}" aria-label="Filtrar por ${escapeHTML(profile.fields[field].label)}">
      <option value="">${escapeHTML(profile.fields[field].label)} · todos</option>
      ${options.map((option) => `<option value="${escapeHTML(option)}" ${active.has(option) ? "selected" : ""}>${escapeHTML(option)}</option>`).join("")}
    </select>`;
  }).join("") + (profile.filters.length ? '<button class="button button-quiet" id="clearFilters">Limpar</button>' : "");
  renderActiveFilters(sourceId, profile);
}
function renderActiveFilters(sourceId, profile) {
  const selected = state.filters[sourceId] || {};
  const chips = [];
  Object.entries(selected).forEach(([field, values]) => {
    values.forEach((value) => chips.push(`<button class="filter-chip" data-remove-field="${escapeHTML(field)}" data-remove-value="${escapeHTML(value)}">${escapeHTML(profile.fields[field].label)}: ${escapeHTML(value)} ×</button>`));
  });
  $("activeFilters").innerHTML = chips.join("");
}

function renderIndividual(source) {
  const result = state.results.get(source.id) || {};
  const profile = result.profile || (source.profile === "pap" ? PAP_PROFILE : null);
  $("overviewSummary").hidden = true;
  $("dashboardSection").hidden = false;
  $("breadcrumbCurrent").textContent = source.name;
  $("pageEyebrow").textContent = "PAINEL INDIVIDUAL";
  $("pageTitle").textContent = source.name;
  $("pageDescription").textContent = "Indicadores, distribuição e detalhamento desta fonte de dados.";
  if (result.error && !result.records) {
    showNotice(`${source.name}: ${errorMessage(new Error(result.error))}`, "warning");
    $("metrics").innerHTML = "";
    $("widgets").innerHTML = '<div class="empty-state"><span class="empty-icon">⌁</span><strong>Não foi possível carregar os dados</strong><p>Confira a implantação do Apps Script, as permissões da planilha e o intervalo no Code.gs.</p></div>';
    $("filters").innerHTML = "";
    $("recordCount").textContent = "";
    return;
  }
  if (!profile || !result.records) {
    $("metrics").innerHTML = "";
    $("widgets").innerHTML = '<div class="empty-state"><span class="empty-icon">◷</span><strong>Carregando planilha</strong><p>Os dados serão exibidos assim que a primeira leitura terminar.</p></div>';
    return;
  }
  if (result.missing?.length) showNotice(`Colunas não encontradas: ${result.missing.join(", ")}. Confira se o intervalo começa na linha de cabeçalho.`, "warning");
  else showNotice("", "info");

  const filtered = applyFilters(result.records, profile, source.id);
  renderFilterControls(source.id, result.records, profile);
  $("recordCount").textContent = `Exibindo ${numberFormat.format(filtered.length)} de ${numberFormat.format(result.records.length)} registros`;
  const widgets = profile.widgets;
  $("metrics").innerHTML = widgets.filter((widget) => widget.type === "kpi")
    .map((widget) => renderKpi(widget, filtered, profile)).join("");
  destroyCharts();
  const chartWidgets = [];
  $("widgets").innerHTML = widgets.filter((widget) => widget.type !== "kpi").map((widget, index) => {
    if (widget.type === "bar" || widget.type === "doughnut") {
      const chartIndex = chartWidgets.length;
      chartWidgets.push({ widget, index: chartIndex });
      return renderChart(widget, filtered, profile, chartIndex);
    }
    if (widget.type === "pipeline") return renderPipeline(widget, filtered, profile);
    if (widget.type === "teamSummary") return renderTeamSummary(filtered);
    if (widget.type === "analystSummary") return renderAnalystSummary(filtered);
    if (widget.type === "table") return renderTable(widget, filtered, profile);
    return "";
  }).join("");
  chartWidgets.forEach(({ widget }, index) => drawChart(widget, filtered, profile, index));
}

function renderOverview() {
  $("overviewSummary").hidden = false;
  $("dashboardSection").hidden = true;
  $("breadcrumbCurrent").textContent = "Visão consolidada";
  $("pageEyebrow").textContent = "CENTRAL DE ACOMPANHAMENTO";
  $("pageTitle").textContent = "Visão consolidada";
  $("pageDescription").textContent = "Acompanhe os indicadores de todas as planilhas em um só lugar.";
  const connected = state.sources.filter((source) => {
    const result = state.results.get(source.id);
    return result?.updatedAt && !result.error;
  });
  const totalRecords = state.sources.reduce((sum, source) => sum + (state.results.get(source.id)?.records?.length || 0), 0);
  const latest = Math.max(0, ...state.sources.map((source) => state.results.get(source.id)?.updatedAt || 0));
  $("globalMetrics").innerHTML = [
    renderMetric("Fontes cadastradas", numberFormat.format(state.sources.length), "Planilhas monitoradas"),
    renderMetric("Fontes conectadas", numberFormat.format(connected.length), "Com leitura concluída"),
    renderMetric("Registros identificados", numberFormat.format(totalRecords), "Somatório das fontes"),
    renderMetric("Última atualização", latest ? new Date(latest).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—", latest ? new Date(latest).toLocaleDateString("pt-BR") : "Aguardando sincronização")
  ].join("");
  $("sourceCount").textContent = `${state.sources.length} ${state.sources.length === 1 ? "fonte" : "fontes"}`;
  if (!state.sources.length) {
    $("sourceCards").innerHTML = `<div class="empty-state"><span class="empty-icon">▤</span><strong>Adicione sua primeira planilha</strong><p>Conecte uma fonte do Google Sheets para começar o monitoramento.</p></div>`;
    return;
  }
  $("sourceCards").innerHTML = state.sources.map((source) => {
    const result = state.results.get(source.id) || {};
    const status = result.error ? "error" : result.updatedAt ? "online" : "";
    const label = result.error ? "Com erro" : result.updatedAt ? "Conectada" : "Aguardando";
    const count = result.records?.length ?? "—";
    const time = result.updatedAt ? new Date(result.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";
    return `<article class="source-card" data-open-source="${escapeHTML(source.id)}" tabindex="0" role="button" aria-label="Abrir ${escapeHTML(source.name)}">
      <div class="source-card-top"><span class="source-card-icon">▤</span></div>
      <h3>${escapeHTML(source.name)}</h3><p>${source.profile === "pap" ? "Perfil de controle PAPs" : "Detecção automática de colunas"}</p>
      <div class="source-card-bottom"><span class="state-label ${status}">${label}</span><span>${numberFormat.format(count === "—" ? 0 : count)} registros · ${time}</span></div>
    </article>`;
  }).join("");
}

function renderNavigation() {
  $("sourceNav").innerHTML = state.sources.length ? state.sources.map((source) => {
    const result = state.results.get(source.id) || {};
    return `<button class="nav-item source-nav-item ${state.selectedSource === source.id ? "is-active" : ""}" data-view="${escapeHTML(source.id)}">
      <span class="nav-icon">▤</span><span class="source-name">${escapeHTML(source.name)}</span><span class="source-state ${result.updatedAt && !result.error ? "online" : ""}"></span>
    </button>`;
  }).join("") : '<p class="nav-empty">Nenhuma fonte adicional.</p>';
  document.querySelectorAll('[data-view="overview"]').forEach((button) => button.classList.toggle("is-active", state.selectedSource === "overview"));
}
function renderAll() {
  renderNavigation();
  if (state.selectedSource === "overview") renderOverview();
  else {
    const source = state.sources.find((item) => item.id === state.selectedSource);
    if (!source) { state.selectedSource = "overview"; renderOverview(); }
    else renderIndividual(source);
  }
  const allLoaded = state.sources.length > 0 && state.sources.every((source) => state.results.get(source.id)?.updatedAt);
  setGlobalStatus(allLoaded, allLoaded ? `${state.sources.length} fonte(s) monitorada(s)` : "Verificando fontes");
  const latest = Math.max(0, ...state.sources.map((source) => state.results.get(source.id)?.updatedAt || 0));
  $("lastSync").textContent = latest ? `Última leitura: ${new Date(latest).toLocaleTimeString("pt-BR")}` : "Sem sincronização";
}

function handleSourceCardClick(event) {
  const card = event.target.closest("[data-open-source]");
  if (!card) return;
  state.selectedSource = card.dataset.openSource;
  state.query = "";
  $("searchInput").value = "";
  renderAll();
}

function openSettings() {
  showNotice("A sincronização é automática a cada 30 segundos. As planilhas são configuradas pelo administrador no backend.", "info");
}

function handleFilterChange(event) {
  const select = event.target.closest("[data-filter]");
  if (!select) return;
  const sourceId = state.selectedSource;
  const field = select.dataset.filter;
  const current = state.filters[sourceId] || (state.filters[sourceId] = {});
  current[field] = select.value ? new Set([select.value]) : new Set();
  const source = state.sources.find((item) => item.id === sourceId);
  if (source) renderIndividual(source);
}
function handleFilterRemoval(event) {
  const button = event.target.closest("[data-remove-field]");
  if (!button) return;
  const selected = state.filters[state.selectedSource] || {};
  selected[button.dataset.removeField]?.delete(button.dataset.removeValue);
  const source = state.sources.find((item) => item.id === state.selectedSource);
  if (source) renderIndividual(source);
}
function navigate(view) {
  state.selectedSource = view;
  state.query = "";
  $("searchInput").value = "";
  renderAll();
  $("sidebar").classList.remove("is-open");
}

function bindEvents() {
  $("openSettings").addEventListener("click", openSettings);
  $("refreshAll").addEventListener("click", refreshAll);
  $("sourceCards").addEventListener("click", handleSourceCardClick);
  $("sourceCards").addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-open-source]")) {
      event.preventDefault();
      state.selectedSource = event.target.dataset.openSource;
      renderAll();
    }
  });
  $("sourceNav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (button) navigate(button.dataset.view);
  });
  document.querySelector('[data-view="overview"]').addEventListener("click", () => navigate("overview"));
  $("filters").addEventListener("change", handleFilterChange);
  $("activeFilters").addEventListener("click", handleFilterRemoval);
  $("filters").addEventListener("click", (event) => {
    if (event.target.id === "clearFilters") {
      state.filters[state.selectedSource] = {};
      const source = state.sources.find((item) => item.id === state.selectedSource);
      if (source) renderIndividual(source);
    }
  });
  $("searchInput").addEventListener("input", (event) => {
    state.query = event.target.value;
    const source = state.sources.find((item) => item.id === state.selectedSource);
    if (source) renderIndividual(source);
  });
  $("mobileMenu").addEventListener("click", () => $("sidebar").classList.toggle("is-open"));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshAll();
  });
}

async function initialize() {
  state.settings.pollMs = POLL_DEFAULT;
  bindEvents();
  renderAll();
  if (!BACKEND_URL || BACKEND_URL.includes("COLE_A_URL")) {
    showNotice("Configure a URL do Web App do Google Apps Script na constante BACKEND_URL, no início do script.js.", "warning");
    $("globalStatus").textContent = "Backend não configurado";
    return;
  }
  try {
    state.sources = await SheetsSource.list();
    renderAll();
    if (state.sources.length) startMonitoring();
    else showNotice("Nenhuma planilha foi cadastrada pelo administrador no backend (Code.gs).", "warning");
  } catch (error) {
    showNotice(`Não foi possível conectar ao backend: ${errorMessage(error)}.`, "warning");
    $("globalStatus").textContent = "Falha no backend";
  }
}

document.addEventListener("DOMContentLoaded", initialize);
