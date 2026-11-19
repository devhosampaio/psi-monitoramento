/* PSI MONITORAMENTO — painel PAP agregado */
const $ = id => document.getElementById(id);
const BACKEND_URL = "https://script.google.com/macros/s/AKfycby4l-fSskbNZEltZ29AwK03H_l-cApaTTBj6YNp6iE8QuDquzwQJ9Wb_9B1dgBRqAxbYA/exec";
const POLL_DEFAULT = 30000;
const COLORS = ["#245b78","#27845d","#c88932","#c65a55","#8872bd","#3e9eaa","#c46d9b","#82a64a","#6c8192"];
const numberFormat = new Intl.NumberFormat("pt-BR");
const moneyFormat = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",notation:"compact",maximumFractionDigits:1});
const state = { sources: [], summaries: new Map(), timers: new Map(), charts: [], selectedSource: "overview", inFlight: new Set() };

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function showNotice(message,type="info") {
  const el=$("notice"); el.hidden=!message; el.className="notice notice-"+type; el.textContent=message;
}
function setStatus(ok,label) {
  $("globalDot").classList.toggle("online",ok); $("globalStatus").textContent=label;
}
function jsonp(params) {
  return new Promise((resolve,reject)=>{
    const cb="__psi_"+Date.now()+"_"+Math.random().toString(36).slice(2);
    const script=document.createElement("script");
    const timeout=setTimeout(()=>finish(new Error("timeout")),25000);
    function finish(error,payload) {
      clearTimeout(timeout); delete window[cb]; script.remove();
      if(error) reject(error); else if(!payload || payload.ok!==true) reject(new Error(payload?.error||"backend_error"));
      else resolve(payload);
    }
    window[cb]=payload=>finish(null,payload);
    const url=new URL(BACKEND_URL);
    Object.entries({...params,callback:cb}).forEach(([k,v])=>url.searchParams.set(k,v));
    script.onerror=()=>finish(new Error("network")); script.src=url.toString(); document.head.appendChild(script);
  });
}
function errorText(error) {
  return ({
    timeout:"O backend demorou para responder.",
    forbidden:"O Apps Script não tem permissão para ler a planilha.",
    not_found:"A fonte não foi encontrada no backend.",
    bad_range:"Aba ou intervalo inválido no Apps Script.",
    network:"Falha de conexão. Verifique sua internet."
  })[error.message] || "Não foi possível consultar o backend. Confirme se a nova versão do Apps Script foi implantada.";
}
async function loadSource(source,quiet=false) {
  if(state.inFlight.has(source.id)) return;
  state.inFlight.add(source.id);
  try {
    const payload=await jsonp({action:"read",id:source.id});
    if(!payload.summary) throw new Error("old_backend");
    state.summaries.set(source.id,{summary:payload.summary,updatedAt:payload.updatedAt||new Date().toISOString(),error:null});
    if(!quiet) showNotice("Indicadores PAP atualizados.","info");
  } catch(error) {
    state.summaries.set(source.id,{...(state.summaries.get(source.id)||{}),error:error.message});
    if(!quiet) showNotice(error.message==="old_backend"?"O Apps Script ainda está na versão antiga. Atualize o código Code.gs e publique uma nova versão.":errorText(error),"warning");
  } finally {
    state.inFlight.delete(source.id); renderAll();
  }
}
function schedule(source) {
  clearInterval(state.timers.get(source.id));
  state.timers.set(source.id,setInterval(()=>{if(!document.hidden)loadSource(source,true)},POLL_DEFAULT));
}
function metric(title,value,detail="") {
  return `<article class="metric-card"><span class="metric-label">${escapeHTML(title)}</span><strong>${escapeHTML(value)}</strong><small>${escapeHTML(detail)}</small></article>`;
}
function distributionCard(title,items,index) {
  const values=items||[];
  const canvasId="chart_"+index;
  return `<article class="widget-card"><h3>${escapeHTML(title)}</h3><div class="chart-wrap"><canvas id="${canvasId}" role="img" aria-label="${escapeHTML(title)}"></canvas></div></article>`;
}
function renderDistributionTable(title,items) {
  const rows=(items||[]).slice(0,30);
  return `<article class="widget-card"><h3>${escapeHTML(title)}</h3><div class="table-wrap"><table><thead><tr><th>Categoria</th><th>Quantidade</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${escapeHTML(x.label)}</td><td>${numberFormat.format(x.value)}</td></tr>`).join("")}</tbody></table></div></article>`;
}
function drawDistribution(canvasId,items,index) {
  const canvas=$(canvasId); if(!canvas||typeof Chart==="undefined")return;
  const values=(items||[]).filter(x=>x.value>0);
  const chart=new Chart(canvas,{type:"bar",data:{labels:values.map(x=>x.label),datasets:[{data:values.map(x=>x.value),backgroundColor:values.map((_,i)=>COLORS[i%COLORS.length]),borderRadius:5,maxBarThickness:32}]},options:{
    indexAxis:"y",responsive:true,maintainAspectRatio:false,animation:false,
    plugins:{legend:{display:false}},
    scales:{x:{beginAtZero:true,ticks:{precision:0,color:"#748190"},grid:{color:"#e5eaf0"}},y:{ticks:{color:"#596675",font:{size:10}},grid:{display:false}}}
  }});
  state.charts.push(chart);
}
function renderTeamTable(teams) {
  return `<article class="widget-card wide"><h3>Desempenho por equipe</h3><div class="table-wrap"><table><thead><tr><th>Equipe</th><th>PAPs atribuídos</th><th>Em análise (PAP)</th><th>Com pendências (PAP)</th><th>Concluídos (PAP)</th><th>Análise em andamento</th><th>Análise concluída</th><th>Pareceres preenchidos</th></tr></thead><tbody>${(teams||[]).map(t=>`<tr><td><strong>${escapeHTML(t.team)}</strong></td><td>${numberFormat.format(t.total||0)}</td><td>${numberFormat.format(t.papInAnalysis||0)}</td><td>${numberFormat.format(t.papPending||0)}</td><td>${numberFormat.format(t.papCompleted||0)}</td><td>${numberFormat.format(t.analysisInProgress||0)}</td><td>${numberFormat.format(t.analysisCompleted||0)}</td><td>${numberFormat.format(t.verdicts||0)}</td></tr>`).join("")}</tbody></table></div><p class="table-note">A tabela considera apenas registros atribuídos às cinco equipes. Nenhum nome de associação, analista ou dado individual é enviado ao navegador.</p></article>`;
}
function renderPap(source) {
  const result=state.summaries.get(source.id)||{};
  $("overviewSummary").hidden=true; $("dashboardSection").hidden=false;
  $("breadcrumbCurrent").textContent=source.name; $("pageEyebrow").textContent="ACOMPANHAMENTO DE PROJETOS"; $("pageTitle").textContent="Painel de PAPs";
  $("pageDescription").textContent="Visão consolidada do cadastro, andamento das análises, pareceres, territórios, lotes e equipes.";
  if(result.error && !result.summary) {
    $("metrics").innerHTML=""; $("widgets").innerHTML=`<div class="empty-state"><span class="empty-icon">!</span><strong>Não foi possível carregar os indicadores</strong><p>${escapeHTML(errorText({message:result.error}))}</p></div>`;
    $("recordCount").textContent=""; return;
  }
  if(!result.summary) {
    $("metrics").innerHTML=""; $("widgets").innerHTML='<div class="empty-state"><span class="empty-icon">◷</span><strong>Carregando indicadores</strong><p>Os dados agregados serão exibidos assim que a leitura terminar.</p></div>'; return;
  }
  const s=result.summary,m=s.metrics||{},d=s.distributions||{};
  const cards=[
    metric("Total de PAPs",numberFormat.format(s.total||0),"Registros identificados"),
    metric("Valor proposto",moneyFormat.format(m.proposed||0),"Valor total proposto"),
    metric("Valor aprovado",moneyFormat.format(m.approved||0),"Valor total aprovado"),
    metric("PAPs sem equipe definida",numberFormat.format(m.withoutTeam||0),"Aguardando atribuição"),
    metric("Famílias — Carta",numberFormat.format(m.papFamiliesCarta||0),"Quantidade informada na Carta"),
    metric("Famílias — PAP",numberFormat.format(m.papFamilies||0),"Quantidade informada no PAP"),
    metric("Mulheres — Carta / PAP",numberFormat.format(m.womenCarta||0)+" / "+numberFormat.format(m.womenPap||0),"Quantidades separadas"),
    metric("Jovens — Carta / PAP",numberFormat.format(m.youthCarta||0)+" / "+numberFormat.format(m.youthPap||0),"Quantidades separadas"),
    metric("Análises em andamento",numberFormat.format(m.analysisInProgress||0),"Situação da análise"),
    metric("Análises com pendência",numberFormat.format(m.analysisPending||0),"Situação da análise"),
    metric("Análises concluídas",numberFormat.format(m.analysisCompleted||0),"Situação da análise"),
    metric("Pendências ativas",numberFormat.format(m.pendingActive||0),"Notas enviadas sem recebimento registrado"),
    metric("Aprovados",numberFormat.format(m.verdictApproved||0),"Resultado do parecer"),
    metric("Aprovados com ressalvas",numberFormat.format(m.verdictWithReservations||0),"Resultado do parecer"),
    metric("Reprovados",numberFormat.format(m.verdictRejected||0),"Resultado do parecer"),
    metric("Sem situação de análise",numberFormat.format(m.withoutAnalysisStatus||0),"Campo ainda não preenchido"),
    metric("Sem resultado de parecer",numberFormat.format(m.withoutVerdict||0),"Campo ainda não preenchido"),
    metric("Média de dias de análise",numberFormat.format(m.averageAnalysisDays||0),"Entre envio e conclusão"),
    metric("Média de dias com pendências",numberFormat.format(m.averagePendingDays||0),"Conforme alerta da planilha")
  ];
  $("metrics").innerHTML=cards.join("");
  const charts=[
    ["Status do PAP",d.status],["Situação da análise",d.analysis],["Resultado do parecer",d.verdict],
    ["PAPs por território",d.territory],["PAPs por lote",d.lot],["PAPs por equipe",d.team],
    ["Cadeias produtivas",d.chain]
  ];
  destroyCharts();
  $("widgets").innerHTML=charts.map((x,i)=>distributionCard(x[0],x[1],i)).join("")+
    renderTeamTable(s.teams)+renderDistributionTable("Distribuição por território",d.territory)+renderDistributionTable("Distribuição por lote",d.lot);
  charts.forEach((x,i)=>drawDistribution("chart_"+i,x[1],i));
  $("recordCount").textContent=numberFormat.format(s.total||0)+" PAPs consolidados";
  $("filters").innerHTML=""; $("activeFilters").innerHTML="";
  showNotice(result.error?"Última leitura mantida. A atualização mais recente falhou.":"","info");
}
function destroyCharts(){state.charts.forEach(c=>c.destroy());state.charts=[];}
function renderOverview() {
  $("overviewSummary").hidden=false; $("dashboardSection").hidden=true;
  $("breadcrumbCurrent").textContent="Visão consolidada"; $("pageEyebrow").textContent="CENTRAL DE ACOMPANHAMENTO";
  $("pageTitle").textContent="Visão consolidada"; $("pageDescription").textContent="Acompanhe os indicadores das fontes monitoradas.";
  const loaded=state.sources.filter(s=>state.summaries.get(s.id)?.summary);
  const total=loaded.reduce((n,s)=>n+(state.summaries.get(s.id).summary.total||0),0);
  const latest=loaded.map(s=>new Date(state.summaries.get(s.id).updatedAt||0).getTime()).reduce((a,b)=>Math.max(a,b),0);
  $("globalMetrics").innerHTML=[
    metric("Fontes cadastradas",numberFormat.format(state.sources.length),"Planilhas monitoradas"),
    metric("Fontes conectadas",numberFormat.format(loaded.length),"Com leitura concluída"),
    metric("PAPs identificados",numberFormat.format(total),"Registros consolidados"),
    metric("Última atualização",latest?new Date(latest).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"—",latest?new Date(latest).toLocaleDateString("pt-BR"):"Aguardando")
  ].join("");
  $("sourceCount").textContent=state.sources.length+" fontes";
  $("sourceCards").innerHTML=state.sources.map(s=>{
    const r=state.summaries.get(s.id)||{},status=r.error?"error":r.summary?"online":"";
    const label=r.error?"Com erro":r.summary?"Conectada":"Aguardando";
    return `<article class="source-card" data-open-source="${escapeHTML(s.id)}" tabindex="0" role="button"><div class="source-card-top"><span class="source-card-icon">▤</span></div><h3>${escapeHTML(s.name)}</h3><p>Painel de indicadores agregados</p><div class="source-card-bottom"><span class="state-label ${status}">${label}</span><span>${numberFormat.format(r.summary?.total||0)} PAPs</span></div></article>`;
  }).join("")||'<div class="empty-state"><strong>Nenhuma fonte cadastrada</strong></div>';
}
function renderNavigation() {
  $("sourceNav").innerHTML=state.sources.map(s=>`<button class="nav-item source-nav-item ${state.selectedSource===s.id?"is-active":""}" data-view="${escapeHTML(s.id)}"><span class="nav-icon">▤</span><span class="source-name">${escapeHTML(s.name)}</span></button>`).join("")||'<p class="nav-empty">Nenhuma fonte adicional.</p>';
  document.querySelector('[data-view="overview"]').classList.toggle("is-active",state.selectedSource==="overview");
}
function renderAll() {
  renderNavigation();
  if(state.selectedSource==="overview")renderOverview();
  else {const source=state.sources.find(s=>s.id===state.selectedSource); if(source)renderPap(source);else state.selectedSource="overview";}
  const ready=state.sources.length>0&&state.sources.every(s=>state.summaries.get(s.id)?.summary&&!state.summaries.get(s.id)?.error);
  setStatus(ready,ready?state.sources.length+" fonte(s) monitorada(s)":"Verificando fontes");
  const times=state.sources.map(s=>new Date(state.summaries.get(s.id)?.updatedAt||0).getTime()).filter(Boolean);
  $("lastSync").textContent=times.length?"Última leitura: "+new Date(Math.max(...times)).toLocaleTimeString("pt-BR"):"Sem sincronização";
}
async function refreshAll() {
  $("refreshAll").disabled=true; $("refreshAll").textContent="Atualizando…";
  await Promise.all(state.sources.map(s=>loadSource(s,true)));
  $("refreshAll").disabled=false; $("refreshAll").innerHTML="<span>↻</span> Atualizar";
}
function navigate(view){state.selectedSource=view;renderAll();$("sidebar").classList.remove("is-open");}
function bindEvents(){
  $("refreshAll").addEventListener("click",refreshAll);
  $("sourceNav").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b)navigate(b.dataset.view);});
  document.querySelector('[data-view="overview"]').addEventListener("click",()=>navigate("overview"));
  $("sourceCards").addEventListener("click",e=>{const c=e.target.closest("[data-open-source]");if(c)navigate(c.dataset.openSource);});
  $("sourceCards").addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-open-source]")){e.preventDefault();navigate(e.target.dataset.openSource);}});
  $("mobileMenu").addEventListener("click",()=>$("sidebar").classList.toggle("is-open"));
  $("openSettings").addEventListener("click",()=>showNotice("A sincronização é automática a cada 30 segundos. As fontes são configuradas no backend Google Apps Script.","info"));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshAll();});
}
async function initialize(){
  bindEvents();renderAll();
  try {
    const payload=await jsonp({action:"sources"}); state.sources=payload.sources||[];
    renderAll(); state.sources.forEach(s=>{loadSource(s,true);schedule(s);});
    if(!state.sources.length)showNotice("Nenhuma fonte foi cadastrada no Apps Script.","warning");
  } catch(error){showNotice("Não foi possível conectar ao backend: "+errorText(error),"warning");setStatus(false,"Falha no backend");}
}
document.addEventListener("DOMContentLoaded",initialize);