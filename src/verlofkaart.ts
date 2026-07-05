/**
 * @file AFAS Verlofkaart – interactieve MCP App UI
 * Gebaseerd op de statische Beginstand-verlof-2026-Metin.html
 */
import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import "./global.css";
import "./verlofkaart.css";
import type { VerlofMedewerker, VerlofkaartResponse } from "./types-verlofkaart.js";

// ─── DOM refs ──────────────────────────────────────────────────────────────────
const appEl         = document.getElementById("app")!;
const mdwSelect     = document.getElementById("mdw-select") as HTMLSelectElement;
const unitToggle    = document.getElementById("unit-toggle")!;
const empNaam       = document.getElementById("emp-naam")!;
const empDienst     = document.getElementById("emp-dienst")!;
const empFte        = document.getElementById("emp-fte")!;
const empWerkgever  = document.getElementById("emp-werkgever")!;
const empNorm       = document.getElementById("emp-norm")!;
const vkPeriode     = document.getElementById("vk-periode")!;
const kpiStrip      = document.getElementById("kpi-strip")!;
const tbody         = document.getElementById("vk-tbody")!;
const tfoot         = document.getElementById("vk-tfoot")!;
const boekingenPanel = document.getElementById("boekingen-panel")!;
const bpTitle       = document.getElementById("bp-title")!;
const bpTbody       = document.getElementById("bp-tbody")!;
const bpClose       = document.getElementById("bp-close")!;
const toelichtingEl = document.getElementById("toelichting")!;
const toelList      = document.getElementById("toel-list")!;
const footerDate    = document.getElementById("footer-date")!;
const loadingEl     = document.getElementById("loading")!;
const errorEl       = document.getElementById("error-state")!;

// ─── State ────────────────────────────────────────────────────────────────────
interface State {
  kaart: VerlofMedewerker | null;
  unit: "uren" | "dagen";   // toggle weergave
  activePot: string | null; // geselecteerde pot voor boekingen panel
}
const state: State = { kaart: null, unit: "uren", activePot: null };

// ─── Format helpers ───────────────────────────────────────────────────────────
function fmt(uren: number, dagNorm: number): string {
  if (state.unit === "dagen") {
    return (uren / dagNorm).toFixed(2).replace(".", ",");
  }
  return uren.toFixed(2).replace(".", ",");
}

function fmtLabel(): string { return state.unit === "uren" ? "u" : "d"; }

// ─── KPI strip ────────────────────────────────────────────────────────────────
function renderKPI(kaart: VerlofMedewerker): void {
  const totSaldo    = kaart.potten.reduce((s, p) => s + p.saldo, 0);
  const totDagen    = kaart.potten.reduce((s, p) => s + p.saldoDagen, 0);
  const expiring    = kaart.potten.filter((p) => p.isExpiring && p.saldo > 0);
  const expUren     = expiring.reduce((s, p) => s + p.saldo, 0);
  const opgenomen   = kaart.potten.reduce((s, p) => s + p.opgenomen, 0);

  kpiStrip.innerHTML = `
    <div class="kpi">
      <div class="kpi-val">${totSaldo.toFixed(2).replace(".", ",")} u</div>
      <div class="kpi-lbl">Huidig saldo</div>
      <div class="kpi-sub">${totDagen.toFixed(2).replace(".", ",")} dagen</div>
    </div>
    <div class="kpi">
      <div class="kpi-val">${opgenomen.toFixed(2).replace(".", ",")} u</div>
      <div class="kpi-lbl">Opgenomen</div>
      <div class="kpi-sub">dit jaar</div>
    </div>
    <div class="kpi kpi-warn${expUren === 0 ? " kpi-ok" : ""}">
      <div class="kpi-val">${expUren.toFixed(2).replace(".", ",")} u</div>
      <div class="kpi-lbl">Verloopt dit jaar</div>
      <div class="kpi-sub">${expiring.length} potje${expiring.length !== 1 ? "s" : ""}</div>
    </div>
    <div class="kpi">
      <div class="kpi-val">${kaart.potten.length}</div>
      <div class="kpi-lbl">Verlofsoorten</div>
      <div class="kpi-sub">actief</div>
    </div>
  `;
}

// ─── Tabel ────────────────────────────────────────────────────────────────────
function renderTable(kaart: VerlofMedewerker): void {
  const dag = kaart.dagNorm;
  const lbl = fmtLabel();

  tbody.innerHTML = kaart.potten.map((p) => {
    const expiringRow  = p.isExpiring && p.saldo > 0 ? " row-expiring" : "";
    const saldoClass   = p.saldo <= 0 ? "saldo-zero" : p.isExpiring ? "saldo-warn" : "saldo-pos";
    const hasBoeking   = p.boekingen.length > 0;
    const flagHtml     = p.isExpiring && p.saldo > 0
      ? `<span class="flag-expiring">Verloopt ${p.verlooptOp.substring(6)}</span>` : "";
    const expandBtn    = hasBoeking
      ? `<button class="expand-btn" data-soort="${p.soort}" title="Toon verlofboekingen">▶</button>` : "";

    return `
    <tr class="vk-row${expiringRow}" data-soort="${p.soort}">
      <td class="col-soort">
        ${expandBtn}
        <span class="pot-naam">${p.soort}</span>${flagHtml}
      </td>
      <td class="col-num">${fmt(p.meegenomen, dag)} ${lbl}</td>
      <td class="col-num">${fmt(p.recht, dag)} ${lbl}</td>
      <td class="col-num">${fmt(p.beginsaldo, dag)} ${lbl}</td>
      <td class="col-num">${fmt(p.opgenomen, dag)} ${lbl}</td>
      <td class="col-num">${fmt(p.correcties, dag)} ${lbl}</td>
      <td class="col-num col-saldo ${saldoClass}">
        <strong>${fmt(p.saldo, dag)} ${lbl}</strong>
      </td>
      <td class="col-verloop">${p.verlooptOp}</td>
    </tr>`;
  }).join("");

  // Totaalregel
  const totMeeg  = kaart.potten.reduce((s, p) => s + p.meegenomen, 0);
  const totRecht = kaart.potten.reduce((s, p) => s + p.recht, 0);
  const totBeg   = kaart.potten.reduce((s, p) => s + p.beginsaldo, 0);
  const totOpg   = kaart.potten.reduce((s, p) => s + p.opgenomen, 0);
  const totCor   = kaart.potten.reduce((s, p) => s + p.correcties, 0);
  const totSaldo = kaart.potten.reduce((s, p) => s + p.saldo, 0);
  const totDagen = kaart.potten.reduce((s, p) => s + p.saldoDagen, 0);

  tfoot.innerHTML = `
    <tr>
      <td><strong>Totaal</strong></td>
      <td class="col-num">${fmt(totMeeg, dag)} ${lbl}</td>
      <td class="col-num">${fmt(totRecht, dag)} ${lbl}</td>
      <td class="col-num">${fmt(totBeg, dag)} ${lbl}</td>
      <td class="col-num">${fmt(totOpg, dag)} ${lbl}</td>
      <td class="col-num">${fmt(totCor, dag)} ${lbl}</td>
      <td class="col-num col-saldo"><strong>${fmt(totSaldo, dag)} ${lbl}</strong>
        <span class="tot-dagen">${totDagen.toFixed(2).replace(".", ",")} d</span>
      </td>
      <td></td>
    </tr>`;

  // Click-handlers voor expand buttons
  tbody.querySelectorAll(".expand-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const soort = (btn as HTMLElement).dataset.soort!;
      openBoekingen(kaart, soort);
    });
  });
}

// ─── Boekingen panel ──────────────────────────────────────────────────────────
function openBoekingen(kaart: VerlofMedewerker, soort: string): void {
  const pot = kaart.potten.find((p) => p.soort === soort);
  if (!pot || pot.boekingen.length === 0) return;

  state.activePot = soort;
  bpTitle.textContent = soort;
  bpTbody.innerHTML = pot.boekingen.map((b) => `
    <tr>
      <td>${b.begin}</td>
      <td>${b.eind}</td>
      <td class="col-num">${b.uren.toFixed(2).replace(".", ",")} u</td>
      <td class="col-num">${(b.uren / kaart.dagNorm).toFixed(2).replace(".", ",")} d</td>
    </tr>
  `).join("");

  // Highlight row
  tbody.querySelectorAll(".vk-row").forEach((r) => r.classList.remove("row-active"));
  tbody.querySelector(`[data-soort="${soort}"]`)?.classList.add("row-active");

  boekingenPanel.style.display = "block";
}

bpClose.addEventListener("click", () => {
  boekingenPanel.style.display = "none";
  tbody.querySelectorAll(".vk-row").forEach((r) => r.classList.remove("row-active"));
  state.activePot = null;
});

// ─── Toelichting ──────────────────────────────────────────────────────────────
function renderToelichting(kaart: VerlofMedewerker): void {
  const expiring = kaart.potten.filter((p) => p.isExpiring && p.saldo > 0);
  if (expiring.length === 0) {
    toelichtingEl.style.display = "none";
    return;
  }
  toelichtingEl.style.display = "block";
  toelList.innerHTML = expiring.map((p) => `
    <li>
      <strong>${p.soort}</strong> (${p.saldo.toFixed(2).replace(".", ",")} uur /
      ${p.saldoDagen.toFixed(2).replace(".", ",")} dagen) verloopt op
      <strong>${p.verlooptOp}</strong> — zorg dat dit tijdig wordt opgenomen.
    </li>
  `).join("");
}

// ─── Employee info bar ────────────────────────────────────────────────────────
function renderEmpBar(kaart: VerlofMedewerker): void {
  empNaam.textContent      = `${kaart.naam} (${kaart.personeelsnummer})`;
  empDienst.textContent    = kaart.inDienst;
  empFte.textContent       = `${kaart.fte.toFixed(2)} FTE · ${kaart.urenPerWeek.toFixed(2)} u/wk`;
  empWerkgever.textContent = kaart.werkgever;
  empNorm.textContent      = `1 dag = ${kaart.dagNorm.toFixed(2)} uur`;
  vkPeriode.textContent    = `Jaar ${kaart.jaar}`;
}

// ─── Full render ──────────────────────────────────────────────────────────────
function render(): void {
  if (!state.kaart) return;
  renderEmpBar(state.kaart);
  renderKPI(state.kaart);
  renderTable(state.kaart);
  renderToelichting(state.kaart);
  boekingenPanel.style.display = "none";
}

// ─── Medewerker selector ──────────────────────────────────────────────────────
mdwSelect.addEventListener("change", async () => {
  await loadMedewerker(mdwSelect.value);
});

async function loadMedewerker(personeelsnummer: string): Promise<void> {
  try {
    const result = await app.callServerTool({
      name: "get-verlofkaart",
      arguments: { personeelsnummer },
    });
    const text = result.content!
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text).join("");
    const data = JSON.parse(text) as VerlofkaartResponse;
    state.kaart = data.kaart;
    render();
  } catch (err) {
    console.error(err);
  }
}

// ─── Unit toggle ──────────────────────────────────────────────────────────────
unitToggle.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest(".toggle-btn") as HTMLElement | null;
  if (!btn) return;
  const unit = btn.dataset.unit as "uren" | "dagen";
  if (unit === state.unit) return;
  state.unit = unit;
  unitToggle.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  if (state.kaart) renderTable(state.kaart);
});

// ─── MCP App ──────────────────────────────────────────────────────────────────
const app = new App({ name: "AFAS Verlofkaart", version: "1.0.0" });

async function fetchData(): Promise<void> {
  loadingEl.style.display = "flex";
  appEl.classList.remove("loaded");
  try {
    const result = await app.callServerTool({
      name: "get-verlofkaart",
      arguments: {},
    });
    const text = result.content!
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text).join("");
    const data = JSON.parse(text) as VerlofkaartResponse;

    // Populate selector
    mdwSelect.innerHTML = data.medewerkers.map((m) =>
      `<option value="${m.personeelsnummer}">${m.naam} (${m.personeelsnummer})</option>`
    ).join("");

    state.kaart = data.kaart;
    footerDate.textContent = `Verstrekt op ${new Date().toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
    loadingEl.style.display = "none";
    appEl.classList.add("loaded");
    render();
  } catch (err) {
    loadingEl.style.display = "none";
    errorEl.style.display = "flex";
    errorEl.textContent = `Fout: ${(err as Error).message}`;
  }
}

app.onerror = console.error;
app.onhostcontextchanged = (ctx: McpUiHostContext) => {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
};
app.ontoolresult = async () => { await fetchData(); };

applyDocumentTheme(
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
);

app.connect().then(() => fetchData()).catch(console.error);
