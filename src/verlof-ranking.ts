/**
 * @file AFAS Verlof Ranking Dashboard – MCP App UI
 * Visualiseert medewerker-verlofsaldi als ranking-barchart,
 * afdeling-vergelijking en risico-signalering.
 */
import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import "./global.css";
import "./verlof-ranking.css";
import type { AfasEmployee, AfasVerlofSummary } from "./types-verlof.js";

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const appEl          = document.getElementById("app")!;
const kpiSection     = document.getElementById("kpi-section")!;
const rankingChartEl = document.getElementById("ranking-chart")!;
const afdChartEl     = document.getElementById("afd-chart")!;
const riskListEl     = document.getElementById("risk-list")!;
const podiumEl       = document.getElementById("podium")!;
const loadingEl      = document.getElementById("loading")!;
const errorEl        = document.getElementById("error-state")!;
const rapportPeriode = document.getElementById("rapport-periode")!;
const filterAfdeling = document.getElementById("filter-afdeling") as HTMLSelectElement;
const filterSoort    = document.getElementById("filter-soort") as HTMLSelectElement;
const soortLabel     = document.getElementById("soort-label")!;

// ─── Kleur helpers ────────────────────────────────────────────────────────────
const AFDELING_KLEUREN: Record<string, string> = {
  Sales: "#0ea5e9", IT: "#6366f1", Finance: "#10b981",
  HR: "#f59e0b", Operations: "#ef4444", Marketing: "#8b5cf6",
};

// ─── State ────────────────────────────────────────────────────────────────────
interface State {
  employees: AfasEmployee[];
  summaries: AfasVerlofSummary[];
  afdFilter: string;
  soortFilter: string;
}
const state: State = {
  employees:  [],
  summaries:  [],
  afdFilter:  "",
  soortFilter: "Vakantie",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSaldo(e: AfasEmployee, soort: string): number {
  return e.saldi.find((s) => s.soort === soort)?.saldo ?? 0;
}
function getVerloopt(e: AfasEmployee, soort: string): number {
  return e.saldi.find((s) => s.soort === soort)?.verloopt ?? 0;
}
function getTotaalVerloopt(e: AfasEmployee): number {
  return e.saldi.reduce((sum, s) => sum + s.verloopt, 0);
}

function filteredEmployees(): AfasEmployee[] {
  return state.employees.filter(
    (e) => !state.afdFilter || e.afdeling === state.afdFilter,
  );
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────
function renderKPIs(): void {
  const emps = filteredEmployees();
  const soort = state.soortFilter;
  const saldi = emps.map((e) => getSaldo(e, soort));
  const totaal = saldi.reduce((s, x) => s + x, 0);
  const max    = saldi.length ? Math.max(...saldi) : 0;
  const maxEmp = emps.find((e) => getSaldo(e, soort) === max);
  const totaalRisico = emps.reduce((sum, e) => sum + getTotaalVerloopt(e), 0);
  const risicoPct = totaal > 0 ? Math.round((totaalRisico / totaal) * 100) : 0;

  kpiSection.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-icon">👥</div>
      <div class="kpi-body">
        <div class="kpi-value">${emps.length}</div>
        <div class="kpi-label">Medewerkers</div>
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon">📅</div>
      <div class="kpi-body">
        <div class="kpi-value">${totaal.toLocaleString("nl-NL")}</div>
        <div class="kpi-label">Totaal ${soort.toLowerCase()}-uren open</div>
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon">🏆</div>
      <div class="kpi-body">
        <div class="kpi-value">${max} u</div>
        <div class="kpi-label">Meeste uren: ${maxEmp?.naam ?? "–"}</div>
      </div>
    </div>
    <div class="kpi-card kpi-warn">
      <div class="kpi-icon">⚠️</div>
      <div class="kpi-body">
        <div class="kpi-value">${totaalRisico}</div>
        <div class="kpi-label">Uren verloopt einde jaar (${risicoPct}%)</div>
      </div>
    </div>
  `;
}

// ─── Ranking bar chart ────────────────────────────────────────────────────────
function renderRankingChart(): void {
  const emps  = filteredEmployees();
  const soort = state.soortFilter;
  if (!emps.length) { rankingChartEl.innerHTML = `<p class="empty-msg">Geen medewerkers gevonden</p>`; return; }

  // Sort descending by saldo
  const sorted = [...emps].sort((a, b) => getSaldo(b, soort) - getSaldo(a, soort));
  const max    = getSaldo(sorted[0], soort) || 1;

  soortLabel.textContent = `${soort}-uren resterend`;

  rankingChartEl.innerHTML = sorted.map((e, i) => {
    const saldo     = getSaldo(e, soort);
    const verloopt  = getVerloopt(e, soort);
    const pct       = Math.round((saldo / max) * 100);
    const kleur     = AFDELING_KLEUREN[e.afdeling] ?? "#888";
    const riskBar   = verloopt > 0
      ? `<div class="bar-risk" style="width:${Math.round((verloopt / max) * 100)}%" title="Verloopt: ${verloopt} u"></div>`
      : "";
    const rankClass = i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : "";
    const medal     = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `<span class="rank-num">${i + 1}</span>`;

    return `
    <div class="rank-row ${rankClass}">
      <div class="rank-medal">${medal}</div>
      <div class="rank-info">
        <div class="rank-naam">${e.naam}</div>
        <div class="rank-meta">
          <span class="afd-dot" style="background:${kleur}"></span>${e.afdeling} · ${e.functie}
        </div>
      </div>
      <div class="rank-bar-wrap">
        <div class="rank-bar-track">
          <div class="rank-bar-fill" style="width:${pct}%; background:${kleur}"></div>
          ${riskBar}
        </div>
      </div>
      <div class="rank-saldo ${saldo > 160 ? "saldo-hoog" : saldo < 40 ? "saldo-laag" : ""}">${saldo} u</div>
      ${verloopt > 0 ? `<div class="rank-verloopt">⚠ ${verloopt} u</div>` : `<div class="rank-verloopt"></div>`}
    </div>`;
  }).join("");
}

// ─── Afdeling vergelijking ────────────────────────────────────────────────────
function renderAfdChart(): void {
  const summaries = state.summaries;
  if (!summaries.length) { afdChartEl.innerHTML = ""; return; }

  // Filter to visible afdeling if set
  const relevant = state.afdFilter
    ? summaries.filter((s) => s.afdeling === state.afdFilter)
    : [...summaries].sort((a, b) => b.gemSaldo - a.gemSaldo);

  const max = Math.max(...relevant.map((s) => s.gemSaldo), 1);

  afdChartEl.innerHTML = relevant.map((s) => {
    const pct  = Math.round((s.gemSaldo / max) * 100);
    const kleur = AFDELING_KLEUREN[s.afdeling] ?? "#888";
    const isSelected = state.afdFilter === s.afdeling;
    return `
    <div class="afd-row ${isSelected ? "afd-row-active" : ""}">
      <span class="afd-name" style="color:${kleur}">${s.afdeling}</span>
      <div class="afd-track">
        <div class="afd-fill" style="width:${pct}%; background:${kleur}66; border-left:3px solid ${kleur}"></div>
      </div>
      <div class="afd-stats">
        <span class="afd-gem">${s.gemSaldo} u gem.</span>
        <span class="afd-tot">${s.totaalVakantieUren.toLocaleString("nl-NL")} totaal</span>
        <span class="afd-mdw">${s.aantalMedewerkers} mdw</span>
      </div>
    </div>`;
  }).join("");
}

// ─── Risico-signalering ───────────────────────────────────────────────────────
function renderRiskList(): void {
  const emps = filteredEmployees();
  const risico = emps
    .filter((e) => getTotaalVerloopt(e) > 0)
    .sort((a, b) => getTotaalVerloopt(b) - getTotaalVerloopt(a));

  if (!risico.length) {
    riskListEl.innerHTML = `<div class="risk-empty">✅ Geen vervallende uren gevonden</div>`;
    return;
  }

  riskListEl.innerHTML = risico.map((e) => {
    const totRisico = getTotaalVerloopt(e);
    const kleur = AFDELING_KLEUREN[e.afdeling] ?? "#888";
    const risicoSaldi = e.saldi.filter((s) => s.verloopt > 0);
    const details = risicoSaldi.map((s) => `<span class="risk-detail">${s.soort}: ${s.verloopt} u</span>`).join("");

    // Urgency level
    const urgency = totRisico >= 40 ? "risk-high" : totRisico >= 16 ? "risk-mid" : "risk-low";

    return `
    <div class="risk-row ${urgency}">
      <div class="risk-dot" style="background:${kleur}"></div>
      <div class="risk-body">
        <div class="risk-naam">${e.naam} <span class="risk-afd" style="color:${kleur}">${e.afdeling}</span></div>
        <div class="risk-details">${details}</div>
      </div>
      <div class="risk-total">${totRisico} u</div>
    </div>`;
  }).join("");
}

// ─── Podium ───────────────────────────────────────────────────────────────────
function renderPodium(): void {
  const emps  = filteredEmployees();
  const soort = state.soortFilter;
  const sorted = [...emps].sort((a, b) => getSaldo(b, soort) - getSaldo(a, soort));
  const top3   = sorted.slice(0, 3);

  if (top3.length < 1) { podiumEl.innerHTML = ""; return; }

  const medals = ["🥇", "🥈", "🥉"];
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3; // 2nd, 1st, 3rd visual order
  const podiumPos   = top3.length >= 3 ? [2, 1, 3] : [1, 2, 3];

  const cards = podiumOrder.map((e, vi) => {
    const pos   = podiumPos[vi];
    const saldo = getSaldo(e, soort);
    const kleur = AFDELING_KLEUREN[e.afdeling] ?? "#888";
    const allSaldi = e.saldi.map((s) =>
      `<div class="pod-saldo-row"><span class="pod-soort">${s.soort}</span><span class="pod-sval">${s.saldo} u</span></div>`
    ).join("");
    const initials = e.naam.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

    return `
    <div class="pod-card pod-pos-${pos}">
      <div class="pod-rank">${medals[pos - 1]}</div>
      <div class="pod-avatar" style="background:${kleur}22; border-color:${kleur}; color:${kleur}">${initials}</div>
      <div class="pod-naam">${e.naam}</div>
      <div class="pod-functie">${e.functie}</div>
      <div class="pod-afd" style="color:${kleur}">${e.afdeling}</div>
      <div class="pod-main-saldo" style="color:${kleur}">${saldo} uur</div>
      <div class="pod-saldi-grid">${allSaldi}</div>
    </div>`;
  });

  podiumEl.innerHTML = cards.join("");
}

// ─── Full render ──────────────────────────────────────────────────────────────
function render(): void {
  renderKPIs();
  renderRankingChart();
  renderAfdChart();
  renderRiskList();
  renderPodium();
}

// ─── Event listeners ──────────────────────────────────────────────────────────
filterAfdeling.addEventListener("change", () => {
  state.afdFilter = filterAfdeling.value;
  render();
});
filterSoort.addEventListener("change", () => {
  state.soortFilter = filterSoort.value;
  renderRankingChart();
  renderKPIs();
  renderPodium();
});

// ─── App + MCP ────────────────────────────────────────────────────────────────
const app = new App({ name: "AFAS Verlof Ranking", version: "1.0.0" });

async function fetchData(): Promise<void> {
  loadingEl.style.display = "flex";
  appEl.classList.remove("loaded");
  try {
    const result = await app.callServerTool({
      name: "get-verlof-saldo",
      arguments: {},
    });
    const text = result.content!
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("");
    const data = JSON.parse(text) as {
      employees: AfasEmployee[];
      summaries: AfasVerlofSummary[];
      jaar:      number;
    };
    state.employees = data.employees;
    state.summaries = data.summaries;
    rapportPeriode.textContent = `Boekjaar ${data.jaar}`;
    loadingEl.style.display = "none";
    appEl.classList.add("loaded");
    render();
  } catch (err) {
    loadingEl.style.display = "none";
    errorEl.style.display   = "flex";
    errorEl.textContent     = `Fout bij ophalen data: ${(err as Error).message}`;
  }
}

function handleHostContext(ctx: McpUiHostContext): void {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
}

app.onerror = console.error;
app.onhostcontextchanged = handleHostContext;
app.ontoolresult = async () => { await fetchData(); };

applyDocumentTheme(
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (!app.getHostContext()?.theme) applyDocumentTheme(e.matches ? "dark" : "light");
});

app.connect().then(() => fetchData()).catch(console.error);
