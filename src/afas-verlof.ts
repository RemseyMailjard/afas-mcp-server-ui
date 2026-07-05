/**
 * @file AFAS Verlofsaldo Rapportage – MCP App UI
 */
import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import "./global.css";
import "./afas-verlof.css";
import type { AfasEmployee, AfasVerlofSummary, Afdeling } from "./types-verlof.js";
import type { } from "./types-verlof.js";

// ─── DOM refs ──────────────────────────────────────────────────────────────────
const appEl            = document.getElementById("app")!;
const kpiSection       = document.getElementById("kpi-section")!;
const afdChartEl       = document.getElementById("afd-chart")!;
const tbody            = document.getElementById("verlof-tbody")!;
const rowCountEl       = document.getElementById("row-count")!;
const filterAfdeling   = document.getElementById("filter-afdeling") as HTMLSelectElement;
const filterSoort      = document.getElementById("filter-soort") as HTMLSelectElement;
const loadingEl        = document.getElementById("loading")!;
const errorEl          = document.getElementById("error-state")!;
const rapportPeriode   = document.getElementById("rapport-periode")!;

// ─── State ─────────────────────────────────────────────────────────────────────
interface State {
  employees: AfasEmployee[];
  summaries: AfasVerlofSummary[];
  afdFilter: string;
  soortFilter: string;
  sortKey: string;
  sortAsc: boolean;
}
const state: State = {
  employees:  [],
  summaries:  [],
  afdFilter:  "",
  soortFilter: "",
  sortKey:    "naam",
  sortAsc:    true,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtUren(h: number): string {
  return `${h} u`;
}
function fmtDagen(h: number, contract: number): string {
  const dagUren = contract / 5;
  return `${(h / dagUren).toFixed(1)} d`;
}

// ─── KPI cards ────────────────────────────────────────────────────────────────
function renderKPIs(): void {
  const employees = filteredEmployees();
  const allSaldi = employees.flatMap((e) => e.saldi);
  const vakSaldi = allSaldi.filter((s) => s.soort === "Vakantie");

  const totaalMdw       = employees.length;
  const totaalVakUren   = vakSaldi.reduce((s, x) => s + x.saldo, 0);
  const totaalVerloopt  = allSaldi.reduce((s, x) => s + x.verloopt, 0);
  const gemVakDagen     = employees.length
    ? Math.round(vakSaldi.reduce((s, x) => s + x.saldo, 0) / employees.length / 8)
    : 0;
  const hoogSaldo       = vakSaldi.length
    ? Math.max(...vakSaldi.map((s) => s.saldo))
    : 0;

  kpiSection.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Medewerkers</div>
      <div class="kpi-value">${totaalMdw}</div>
      <div class="kpi-sub">in selectie</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Totaal vakantie-uren</div>
      <div class="kpi-value">${totaalVakUren.toLocaleString("nl-NL")}</div>
      <div class="kpi-sub">resterend</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Gem. vakantiedagen</div>
      <div class="kpi-value">${gemVakDagen}</div>
      <div class="kpi-sub">dagen per medewerker</div>
    </div>
    <div class="kpi-card kpi-warn">
      <div class="kpi-label">Verlopen einde jaar</div>
      <div class="kpi-value">${totaalVerloopt.toLocaleString("nl-NL")}</div>
      <div class="kpi-sub">uren vervallen</div>
    </div>
    <div class="kpi-card kpi-info">
      <div class="kpi-label">Hoogste vakantiesaldo</div>
      <div class="kpi-value">${hoogSaldo}</div>
      <div class="kpi-sub">uren (1 medewerker)</div>
    </div>
  `;
}

// ─── Afdeling bar chart ────────────────────────────────────────────────────────
function renderAfdChart(): void {
  const afdFilter = state.afdFilter;
  const relevant  = state.summaries.filter(
    (s) => !afdFilter || s.afdeling === afdFilter,
  );
  if (!relevant.length) { afdChartEl.innerHTML = ""; return; }

  const max = Math.max(...relevant.map((s) => s.gemSaldo), 1);

  afdChartEl.innerHTML = relevant
    .map((s) => {
      const pct   = Math.round((s.gemSaldo / max) * 100);
      const warn  = s.gemSaldo > 120 ? " bar-warn" : "";
      return `
      <div class="bar-row">
        <span class="bar-label">${s.afdeling}</span>
        <div class="bar-track">
          <div class="bar-fill${warn}" style="width:${pct}%; background:${s.kleurCode}"></div>
        </div>
        <span class="bar-value">${s.gemSaldo} u</span>
        <span class="bar-sub">${s.aantalMedewerkers} mdw</span>
      </div>`;
    })
    .join("");
}

// ─── Filtered rows ─────────────────────────────────────────────────────────────
interface FlatRow {
  personeelsnummer: string;
  naam: string;
  afdeling: Afdeling;
  functie: string;
  contractUren: number;
  soort: string;
  opgebouwd: number;
  opgenomen: number;
  saldo: number;
  verloopt: number;
}

function filteredEmployees(): AfasEmployee[] {
  return state.employees.filter(
    (e) => !state.afdFilter || e.afdeling === state.afdFilter,
  );
}

function flatRows(): FlatRow[] {
  return filteredEmployees().flatMap((e) =>
    e.saldi
      .filter((s) => !state.soortFilter || s.soort === state.soortFilter)
      .map((s) => ({
        personeelsnummer: e.personeelsnummer,
        naam:             e.naam,
        afdeling:         e.afdeling,
        functie:          e.functie,
        contractUren:     e.contractUren,
        soort:            s.soort,
        opgebouwd:        s.opgebouwd,
        opgenomen:        s.opgenomen,
        saldo:            s.saldo,
        verloopt:         s.verloopt,
      })),
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
function sortRows(rows: FlatRow[]): FlatRow[] {
  const key = state.sortKey as keyof FlatRow;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "nl");
    return state.sortAsc ? cmp : -cmp;
  });
}

const AFDELING_KLEUR_MAP: Record<string, string> = {
  Sales: "#0ea5e9", IT: "#6366f1", Finance: "#10b981",
  HR: "#f59e0b", Operations: "#ef4444", Marketing: "#8b5cf6",
};

function renderTable(): void {
  const rows = sortRows(flatRows());
  rowCountEl.textContent = `(${rows.length} regels)`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-row">Geen gegevens gevonden</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((r) => {
      const saldoClass = r.saldo < 0 ? "saldo-neg" : r.saldo > 120 ? "saldo-hoog" : "saldo-ok";
      const verlooptCell = r.verloopt > 0
        ? `<td class="num-col warn-cell">${fmtUren(r.verloopt)}</td>`
        : `<td class="num-col">–</td>`;
      const afdKleur = AFDELING_KLEUR_MAP[r.afdeling] ?? "#888";
      return `
      <tr>
        <td class="mono">${r.personeelsnummer}</td>
        <td class="naam-cell">${r.naam}</td>
        <td><span class="afd-badge" style="background:${afdKleur}1a;color:${afdKleur};border-color:${afdKleur}40">${r.afdeling}</span></td>
        <td class="functie-cell">${r.functie}</td>
        <td class="num-col">${r.contractUren} u/w</td>
        <td><span class="soort-badge soort-${r.soort.replace(/[^a-zA-Z]/g, "")}">${r.soort}</span></td>
        <td class="num-col">${fmtUren(r.opgebouwd)}</td>
        <td class="num-col">${fmtUren(r.opgenomen)}</td>
        <td class="num-col ${saldoClass}"><strong>${fmtUren(r.saldo)}</strong><br><small>${fmtDagen(r.saldo, r.contractUren)}</small></td>
        ${verlooptCell}
      </tr>`;
    })
    .join("");
}

// ─── Full render ──────────────────────────────────────────────────────────────
function render(): void {
  renderKPIs();
  renderAfdChart();
  renderTable();
}

// ─── Table header sort ────────────────────────────────────────────────────────
document.getElementById("verlof-table")!.addEventListener("click", (e) => {
  const th = (e.target as HTMLElement).closest("th[data-sort]") as HTMLElement | null;
  if (!th) return;
  const key = th.dataset.sort!;
  if (state.sortKey === key) {
    state.sortAsc = !state.sortAsc;
  } else {
    state.sortKey = key;
    state.sortAsc = true;
  }
  // Update header arrows
  document.querySelectorAll("th[data-sort]").forEach((el) => {
    (el as HTMLElement).dataset.dir = "";
  });
  th.dataset.dir = state.sortAsc ? "asc" : "desc";
  renderTable();
});

// ─── Filters ──────────────────────────────────────────────────────────────────
filterAfdeling.addEventListener("change", () => {
  state.afdFilter = filterAfdeling.value;
  render();
});
filterSoort.addEventListener("change", () => {
  state.soortFilter = filterSoort.value;
  renderTable();
  renderKPIs();
});

// ─── App + MCP ────────────────────────────────────────────────────────────────
const app = new App({ name: "AFAS Verlofsaldo", version: "1.0.0" });

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

// Host context (theme, styles)
function handleHostContext(ctx: McpUiHostContext): void {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
}

app.onerror = console.error;
app.onhostcontextchanged = handleHostContext;
app.ontoolresult = async () => { await fetchData(); };

// Initial theme
applyDocumentTheme(
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (!app.getHostContext()?.theme) applyDocumentTheme(e.matches ? "dark" : "light");
});

app.connect().then(() => fetchData()).catch(console.error);
