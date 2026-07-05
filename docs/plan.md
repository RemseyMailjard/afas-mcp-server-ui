# UITBREIDINGSPLAN – AFAS MCP-server met UI

> **Sessie-context** – Dit document beschrijft alle geplande uitbreidingen op de
> bestaande AFAS MCP-server. Het is bedoeld als handoff naar een volgende sessie.
> Lees eerst het "Projectoverzicht" door voordat je begint, zodat je de huidige
> staat precies begrijpt.

---

## Projectoverzicht

**Locatie:** `c:\Users\PC\Desktop\Demo MCP-server\customer-segmentation-server`

**Type:** MCP App Server (Model Context Protocol) met interactieve UI's die
renderen als embedded iframes in MCP-clients (Claude Desktop, VS Code Copilot).

**Tech-stack:**
- Node.js 22, TypeScript, Vite + `vite-plugin-singlefile`
- `@modelcontextprotocol/ext-apps` v1.7.4 (MCP UI SDK)
- Chart.js voor grafieken in bestaande apps
- Vanilla TypeScript (geen React/Vue) voor UI's
- Express + CORS voor de HTTP MCP-server (poort 3001)
- Test-harness op poort 3002 (`test-server.cjs`, CommonJS)

---

## Bestaande tools (stand 5 juli 2026)

| Tool | HTML-app | Beschrijving |
|------|----------|--------------|
| `get-customer-data` | `dist/mcp-app.html` | AFAS klantoverzicht scatter chart |
| `get-verlof-saldo` | `dist/afas-verlof.html` | Verlofsaldo per afdeling |
| `get-verlofkaart` | `dist/verlofkaart.html` | Verlofkaart per medewerker (12 DHB Bank mdw) |

### Bronbestanden in `src/`
```
types.ts                      # Customer types (Enterprise/MKB/Overheid/Zorg&Onderwijs)
types-verlof.ts               # VerlofSaldo, AfasEmployee, Afdeling
types-verlofkaart.ts          # VerlofPot, VerlofMedewerker, VerlofBoeking
data-generator.ts             # 250 AFAS-klanten (NL namen)
data-generator-verlof.ts      # 40 medewerkers met verlofpotten
data-generator-verlofkaart.ts # 12 DHB Bank medewerkers (exacte AFAS verlofkaart data)
mcp-app.ts + mcp-app.css      # UI: Klantoverzicht
afas-verlof.ts + afas-verlof.css  # UI: Verlofsaldo
verlofkaart.ts + verlofkaart.css  # UI: Verlofkaart
global.css                    # Gedeelde CSS vars (MCP host theming)
```

### Build-commando (altijd via cmd, niet PowerShell)
```
cmd /c "cd /d c:\Users\PC\Desktop\Demo MCP-server\customer-segmentation-server && npm run build"
```

### Patroon: nieuw tool toevoegen in `server.ts`
```typescript
// In createServer(), na bestaande blokken:
{
  const resourceUri = "ui://customer-segmentation/<naam>.html";
  registerAppTool(server, "get-<naam>", {
    title: "...", description: "...",
    inputSchema: { param: z.string().optional() },
    _meta: { ui: { resourceUri } },
  }, async ({ param }): Promise<CallToolResult> => {
    const data = getData(param);
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: data as unknown as Record<string, unknown>
    };
  });
  registerAppResource(server, resourceUri, resourceUri,
    { mimeType: RESOURCE_MIME_TYPE, description: "..." },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(DIST_DIR, "<naam>.html"), "utf-8");
      return { contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }] };
    }
  );
}
```

### Patroon: nieuwe UI (`src/<naam>.ts`)
```typescript
import { App, applyDocumentTheme, applyHostStyleVariables, type McpUiHostContext }
  from "@modelcontextprotocol/ext-apps";
import "./global.css";
import "./<naam>.css";

const app = new App({ name: "AFAS <Naam>", version: "1.0.0" });

async function fetchData(): Promise<void> {
  const result = await app.callServerTool({ name: "get-<naam>", arguments: {} });
  const data = JSON.parse(result.content![0].text);
  render(data);
}

app.onerror = console.error;
app.onhostcontextchanged = (ctx: McpUiHostContext) => {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
};
app.ontoolresult = async () => { await fetchData(); };
applyDocumentTheme(
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
);
app.connect().then(() => fetchData()).catch(console.error);
```

### Patroon: nieuw HTML entry point (`<naam>.html`)
```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="color-scheme" content="light dark">
  <title>AFAS – <Naam></title>
</head>
<body>
  <div id="app">...</div>
  <script type="module" src="./src/<naam>.ts"></script>
</body>
</html>
```

### Patroon: toevoegen aan `package.json` build-script
```
cross-env INPUT=<naam>.html vite build &&
```
(toevoegen vóór de `tsc -p tsconfig.server.json` stap)

### Patroon: toevoegen aan `test-server.cjs`
```javascript
// In staticFiles object:
'/<naam>': path.join(DIST_DIR, '<naam>.html'),

// In routing:
} else if (url === '/test-<naam>') {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(makeHarness('/<naam>', 'get-<naam>', 'AFAS <Naam>'));
}

// In server.listen log:
console.log('  <Naam>: http://localhost:' + TEST_PORT + '/test-<naam>');
```

---

## Geplande uitbreidingen (aanbevolen volgorde)

---

### Feature 1 – Model Context Updates *(bestaande apps aanpassen)*

**Bestanden:** `src/afas-verlof.ts`, `src/verlofkaart.ts`
**Gebaseerd op:** `transcript-server` patroon

Voeg toe in `src/afas-verlof.ts` na `render()`:
```typescript
const exp = state.employees.flatMap(e =>
  e.saldi.filter(s => s.isExpiring && s.saldo > 0)
);
app.updateModelContext({
  content: [{ type: "text", text:
    `AFAS Verlofsaldo actief. ${state.employees.length} medewerkers. ` +
    `Verlopen dit jaar: ${exp.length} potjes.`
  }]
}).catch(() => {});
```

Voeg toe in `src/verlofkaart.ts` na `render()`:
```typescript
if (state.kaart) {
  const exp = state.kaart.potten.filter(p => p.isExpiring && p.saldo > 0);
  const tot = state.kaart.potten.reduce((s, p) => s + p.saldo, 0);
  app.updateModelContext({
    content: [{ type: "text", text:
      `Verlofkaart ${state.kaart.naam}. Saldo: ${tot.toFixed(2)}u. ` +
      (exp.length
        ? `WAARSCHUWING: ${exp.map(p =>
            `${p.soort} (${p.saldo.toFixed(2)}u, vervalt ${p.verlooptOp})`
          ).join("; ")}.`
        : "Geen verlopen saldi.")
    }]
  }).catch(() => {});
}
```

---

### Feature 2 – Verlof Heatmap

**Nieuwe bestanden:** `verlof-heatmap.html`, `src/verlof-heatmap.ts`, `src/verlof-heatmap.css`
**Tool:** `get-verlof-heatmap`
**Test-URL:** `http://localhost:3002/test-heatmap`
**Gebaseerd op:** `cohort-heatmap-server` patroon

**Data-type:**
```typescript
interface HeatmapData {
  weken: number[];             // [1..52]
  afdelingen: string[];        // ["Sales","IT","Finance","HR","Operations","Marketing"]
  cellen: {
    week: number;
    afdeling: string;
    uren: number;              // verlofuren geboekt in die week
    capaciteit: number;        // totale werkuren die afdeling die week
    pct: number;               // uren/capaciteit * 100
  }[];
  jaar: number;
}
```

**Data-generatie** (inline functie `generateHeatmapData()` in `server.ts`):
- Gebruik boekingen van 12 DHB Bank medewerkers uit `data-generator-verlofkaart.ts`
- Converteer begin/eind datums naar weeknummers
- Vul ontbrekende weken aan met lage gesimuleerde waarden
- Capaciteit = (FTE per afdeling) × 37.5u × (werkdagen in die week / 5)

**UI-kenmerken:**
- CSS Grid: 52 kolommen (weken) × 6 rijen (afdelingen)
- Kleurschaal: `#d4edda` (0%) → `#fff3cd` (25–40%) → `#f8d7da` (>50%)
- Hover tooltip: week, afdeling, uren, % capaciteit
- Filter dropdown: Q1 / Q2 / Q3 / Q4 / volledig jaar
- AFAS groen topbar (`#7AB800`)

---

### Feature 3 – FTE Budget Allocator

**Nieuwe bestanden:** `fte-budget.html`, `src/fte-budget.ts`, `src/fte-budget.css`
**Tools:** `get-fte-budget` + app-only `save-fte-plan`
**Test-URL:** `http://localhost:3002/test-fte`
**Gebaseerd op:** `budget-allocator-server` patroon

**Data-type:**
```typescript
interface FteBudgetData {
  afdelingen: {
    naam: string;
    kleur: string;
    huidigeFte: number;
    doelFte: number;
    minFte: number;
    maxFte: number;
    kostenPerFte: number;   // jaarlijks bruto (€)
    budget: number;         // goedgekeurd jaarbudget (€)
  }[];
  totaalBudget: number;
  jaar: number;
}
```

**DHB Bank startwaarden:**
```
Sales:       8.0 FTE, doel 10.0, €85.000/FTE, budget €765.000
IT:         10.0 FTE, doel 12.0, €95.000/FTE, budget €1.050.000
Finance:     5.0 FTE, doel  5.0, €90.000/FTE, budget €450.000
HR:          4.0 FTE, doel  4.0, €78.000/FTE, budget €320.000
Operations:  7.0 FTE, doel  8.0, €72.000/FTE, budget €525.000
Marketing:   6.0 FTE, doel  6.0, €82.000/FTE, budget €510.000
Totaal: €3.620.000
```

**UI-kenmerken:**
- Slider per afdeling (min–max FTE, stap 0.5)
- Realtime loonkosten per rij (FTE × kostenPerFte)
- KPI-strip: Totaal FTE | Totale kosten | Budget-verschil (groen/rood)
- Horizontale bar chart: huidige vs. geplande FTE
- App-only tool `save-fte-plan` met `_meta: { ui: { visibility: ["app"] } }`

---

### Feature 4 – Verzuim Dashboard (live polling)

**Nieuwe bestanden:** `verzuim-dashboard.html`, `src/verzuim-dashboard.ts`, `src/verzuim-dashboard.css`
**Tools:** `get-verzuim-overzicht` (model-visible) + `poll-verzuim-status` (app-only)
**Test-URL:** `http://localhost:3002/test-verzuim`
**Gebaseerd op:** `system-monitor-server` patroon

**Data-type:**
```typescript
interface VerzuimStatus {
  timestamp: string;
  datum: string;
  afwezig: {
    personeelsnummer: string;
    naam: string;
    afdeling: string;
    reden: "Vakantie" | "Ziek" | "ADV" | "Bijzonder" | "Onbekend";
    vanaf: string;
    tot: string;
  }[];
  aanwezig: number;
  totaalMedewerkers: number;
  pctAfwezig: number;
  perAfdeling: { afdeling: string; afwezig: number; totaal: number; pct: number }[];
  trend7Dagen: { datum: string; pct: number }[];
}
```

**Polling patroon in UI (`src/verzuim-dashboard.ts`):**
```typescript
let pollInterval: number | null = null;

async function poll(): Promise<void> {
  const result = await app.callServerTool({ name: "poll-verzuim-status", arguments: {} });
  const status = JSON.parse(result.content![0].text) as VerzuimStatus;
  updateDashboard(status);
  if (status.pctAfwezig > 15) {
    app.updateModelContext({ content: [{ type: "text", text:
      `ALERT: Verzuim ${status.pctAfwezig.toFixed(0)}% – boven grens van 15%.`
    }]}).catch(() => {});
  }
}

function startPolling(): void {
  poll();
  pollInterval = window.setInterval(poll, 5000);
}

app.onteardown = async () => {
  if (pollInterval) clearInterval(pollInterval);
  return {};
};
```

**Server-side data:** gebruik `Date.now()` modulo als seed voor kleine variaties.
Sommige medewerkers altijd afwezig (op basis van verlofkaart-boekingen), anderen wisselen.

**UI-kenmerken:**
- Pulserende live-indicator (groene/rode dot in header)
- KPI row: Aanwezig | Afwezig | % Verzuim | Afdeling met hoogste verzuim
- Tabel: afwezige medewerkers (naam, afdeling, reden, periode)
- Chart.js sparkline: trend 7 dagen
- Toggle: auto-refresh 5s / 30s / uit

---

### Feature 5 – Org Chart

**Nieuwe bestanden:** `org-chart.html`, `src/org-chart.ts`, `src/org-chart.css`
**Tool:** `get-org-chart`
**Test-URL:** `http://localhost:3002/test-orgchart`
**Gebaseerd op:** `wiki-explorer-server` (vereenvoudigd, SVG zonder D3)

**Data-type:**
```typescript
interface OrgNode {
  personeelsnummer: string;
  naam: string;
  functie: string;
  afdeling: string;
  afdelingKleur: string;
  parentNummer: string | null;   // null = directeur
  contractUren: number;
  fte: number;
}
interface OrgChartData {
  nodes: OrgNode[];
  werkgever: string;
}
```

**DHB Bank hiërarchie (hard-coded in `server.ts`):**
```
Directeur DHB Bank
├── Head Operations  → Metin Ozay (016)
├── Head IT          → Tim Hendriks (098)
│   └── Developer    → Lars van den Berg (071)
├── Head Sales       → Pieter de Boer (034)
│   └── Account Mgr  → Roos Mulder (062)
├── Head Finance     → [fictief]
├── Head HR          → Anna Visser (055)
│   └── HR Adviseur  → Vera Jansen (077)
└── Head Marketing   → Lisa Smit (041)
    ├── Specialist   → Joost Janssen (087)
    ├── Parttime     → Sophie de Vries (042)
    └── Parttime     → Daan Peters (113)
```

**UI-kenmerken:**
- SVG-gebaseerde boom (geen externe library)
- Klikbare nodes → `app.callServerTool("get-verlofkaart", { personeelsnummer })`
- Kleur per afdeling (overeenkomt met `AFDELING_KLEUREN` in `types-verlof.ts`)
- Hover tooltip: functie, FTE, contracturen
- Pan + zoom via SVG viewBox aanpassing

---

### Feature 6 – Workforce Scenario Modeler

**Nieuwe bestanden:** `scenario-modeler.html`, `src/scenario-modeler.ts`, `src/scenario-modeler.css`
**Tool:** `get-workforce-scenario`
**Test-URL:** `http://localhost:3002/test-scenario`
**Gebaseerd op:** `scenario-modeler-server` patroon

**Data-type:**
```typescript
interface ScenarioData {
  huidig: {
    totaleFte: number;
    totaleLoonkosten: number;
    totaalVerlofUren: number;
  };
  scenario: {
    groeiPct: number;
    extraFte: number;
    extraLoonkosten: number;
    extraVerlofUren: number;
    totaalKosten: number;
    breakEvenMaanden: number;
  };
  projectie12m: { maand: string; kosten: number; fte: number }[];
}
```

**UI-kenmerken:**
- 4 sliders: Groei % (0–50) | Gem. loonkosten (€50k–€120k) | Verlofrecht (20–30 d) | Parttime % (0–50)
- KPI-cards: Extra FTE | Extra kosten/jaar | Break-even maanden
- Chart.js lijndiagram: 12-maands projectie kosten
- "Stuur naar Claude" knop → `app.sendMessage()` met samenvatting

---

### Feature 7 – Per-tool autorisatie (mock structuur)

**Gebaseerd op:** `lazy-auth-server` patroon
**Wijzigingen:** `main.ts` + nieuw mock-tool `get-salarisstrook` in `server.ts`

In `main.ts`, vóór de bestaande MCP handler:
```typescript
const PROTECTED_TOOLS = new Set(["get-salarisstrook"]);

app.all("/mcp", async (req, res) => {
  const msgs = Array.isArray(req.body) ? req.body : [req.body];
  const needsAuth = msgs.some((m: any) =>
    m?.method === "tools/call" && PROTECTED_TOOLS.has(m.params?.name)
  );
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (needsAuth && token !== "demo-token-dhb-2026") {
    return res.status(401)
      .set("WWW-Authenticate", `Bearer realm="DHB Bank HR"`)
      .json({ error: "unauthorized", error_description: "DHB Bank HR autorisatie vereist." });
  }
  // ... bestaande server/transport code
});
```

Nieuw mock-tool `get-salarisstrook`: gestileerde HTML-tabel met demo-salarisdata
(geen echte PDF.js nodig; gewone DOM-rendering volstaat voor demo).

---

## Finaal overzicht test-URLs

| App | Tool | URL |
|-----|------|-----|
| Klantoverzicht | `get-customer-data` | `http://localhost:3002/test` |
| Verlofsaldo | `get-verlof-saldo` | `http://localhost:3002/test-verlof` |
| Verlofkaart | `get-verlofkaart` | `http://localhost:3002/test-kaart` |
| Verlof Heatmap | `get-verlof-heatmap` | `http://localhost:3002/test-heatmap` |
| FTE Budget | `get-fte-budget` | `http://localhost:3002/test-fte` |
| Verzuim Dashboard | `get-verzuim-overzicht` | `http://localhost:3002/test-verzuim` |
| Org Chart | `get-org-chart` | `http://localhost:3002/test-orgchart` |
| Scenario Modeler | `get-workforce-scenario` | `http://localhost:3002/test-scenario` |

---

## Bekende aandachtspunten

- `structuredContent` vereist `as unknown as Record<string, unknown>` cast (TypeScript strict)
- `package.json` heeft `"type": "module"` → hulpscripts hebben `.cjs` extensie
- Gebruik altijd `cmd /c "..."` voor npm-commando's (PowerShell blokkeert `.ps1`)
- Elke HTML-app = 1 entry in Vite build-script + 1 route in `test-server.cjs`
- `app.connect()` altijd ná handlers registreren
- AFAS kleuren: groen `#7AB800` (verlofkaart-stijl), blauw `#004C8A` (klantoverzicht-stijl)
- `makeHarness(appPath, toolName, title)` in `test-server.cjs` genereert automatisch de postMessage host-harness
