# AFAS MCP Server – HR & Klantdata Demo

Een demo MCP App die AFAS HR- en klantdata visualiseert via drie interactieve tools. De server biedt een klantoverzicht met segmentatie, verlofsaldo-rapportages per afdeling en een gedetailleerde verlofkaart per medewerker.

## Tools

| Tool | Omschrijving |
|---|---|
| `get-customer-data` | AFAS klantoverzicht als bubble chart, filteren op segment |
| `get-verlof-saldo` | Verlofsaldo-rapportage per medewerker, filteren op afdeling |
| `get-verlofkaart` | Gedetailleerde verlofkaart per medewerker met alle verlofpotten en boekingen |

## MCP Client configuratie

Voeg het volgende toe aan je MCP client configuratie (stdio transport):

```json
{
  "mcpServers": {
    "afas-mcp-server": {
      "command": "node",
      "args": ["dist/index.js", "--stdio"]
    }
  }
}
```

### HTTP transport (lokaal)

```json
{
  "mcpServers": {
    "afas-mcp-server": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## Functies

### Klantoverzicht (`get-customer-data`)
- **Bubble chart**: interactieve Chart.js visualisatie met instelbare X/Y-assen
- **Segmenten**: klanten gegroepeerd in Enterprise, MKB, Overheid, Zorg & Onderwijs, Startup
- **Assen**: kies uit contractwaarde, gebruikers, accountleeftijd, tevredenheid, supporttickets, NPS
- **Legenda**: klik op segmentpills om groepen aan/uit te zetten
- **Detailpanel**: hover of klik op een klant voor naam, segment, contractwaarde en NPS

### Verlofsaldo rapportage (`get-verlof-saldo`)
- Overzicht van alle medewerkers met saldi per verlofsoort (Vakantie, ADV, Bijzonder verlof, Zorgverlof, Compensatie-uren)
- Filteren op afdeling: Sales, IT, Finance, HR, Operations, Marketing
- Afdelingsoverzicht met totalen en gemiddeld saldo

### Verlofkaart (`get-verlofkaart`)
- Gedetailleerde verlofkaart per medewerker (opzoeken op personeelsnummer)
- Alle verlofpotten met beginsaldo, opgenomen uren, correcties en huidig saldo
- Individuele boekingen per verlofpot met begin-/einddatum
- Signalering van verlofpotten die dit kalenderjaar verlopen

## Opstarten

1. Installeer dependencies:

   ```bash
   npm install
   ```

2. Bouw en start de server:

   ```bash
   npm run start:http   # Streamable HTTP transport
   # OF
   npm run start:stdio  # stdio transport
   ```

3. Open in een MCP Apps-compatibele client of gebruik de meegeleverde `basic-host`.

## Architectuur

### Server (`server.ts`)

Registreert drie tools met bijbehorende UI-resources:

- **`get-customer-data`** – geeft 250 gegenereerde klantrecords terug, optioneel gefilterd op segment
- **`get-verlof-saldo`** – geeft medewerkerdata met verlofsaldi terug, optioneel gefilterd op afdeling
- **`get-verlofkaart`** – geeft de volledige verlofkaart voor één medewerker terug op basis van personeelsnummer

Elke tool is gekoppeld aan een HTML UI-resource via `_meta.ui.resourceUri`.

### Apps (`src/`)

| Bestand | Omschrijving |
|---|---|
| `mcp-app.ts` | Klantoverzicht – bubble chart met Chart.js |
| `afas-verlof.ts` | Verlofsaldo rapportage – tabel + afdelingsoverzicht |
| `verlofkaart.ts` | Verlofkaart per medewerker – potten, boekingen en saldi |

### Data generators (`src/`)

| Bestand | Omschrijving |
|---|---|
| `data-generator.ts` | Genereert 250 AFAS-klanten met segmentdata |
| `data-generator-verlof.ts` | Genereert medewerkers met verlofsaldi per afdeling |
| `data-generator-verlofkaart.ts` | Genereert gedetailleerde verlofkaartdata per medewerker |

## Voorbeeld prompts

Zie [VOORBEELD-PROMPTS.md](VOORBEELD-PROMPTS.md) voor kant-en-klare prompts voor alle drie de tools.

## Tech stack

- **MCP SDK** – `@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps`
- **Frontend** – Vite + TypeScript (bundled als single-file HTML)
- **Visualisatie** – Chart.js
- **Backend** – Node.js + Express (HTTP) of stdio transport
- **Validatie** – Zod
