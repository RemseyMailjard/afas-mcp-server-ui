# Voorbeeld Prompts – AFAS MCP Server

> Gebruik deze prompts in een MCP-client (Claude Desktop, Cursor, VS Code Copilot).
> De server biedt drie tools: **`get-customer-data`**, **`get-verlof-saldo`** en **`get-verlofkaart`**.

---

## 1. AFAS Klantoverzicht (`get-customer-data`)

### Algemeen overzicht
```
Haal alle klantdata op en geef me een samenvatting per segment.
```

```
Gebruik get-customer-data en laat zien welke segmenten de hoogste gemiddelde contractwaarde hebben.
```

### Gefilterd op segment
```
Toon me alleen de Enterprise klanten. Wat is hun gemiddelde NPS en tevredenheidscore?
```

```
Geef een overzicht van alle MKB klanten, gesorteerd op contractwaarde.
```

```
Haal de Overheid klanten op. Welke hebben meer dan 20 openstaande supporttickets?
```

```
Toon alle Zorg & Onderwijs klanten. Hoe lang zijn ze gemiddeld al klant bij AFAS?
```

### Analyse & vergelijking
```
Vergelijk het NPS-gemiddelde van Enterprise vs MKB klanten. Gebruik get-customer-data.
```

```
Welke klanten hebben een hoge contractwaarde (>€150.000) maar een lage tevredenheid (<60)? Dit zijn churn-risico's.
```

```
Toon de correlatie tussen het aantal gebruikers en de contractwaarde. Gebruik de scatter plot (X: Gebruikers, Y: Contractwaarde).
```

```
Welke Overheid klanten zijn al meer dan 8 jaar klant? Zijn zij tevreden (tevredenheid >75)?
```

### Management rapportage
```
Maak een management samenvatting van het AFAS klantenbestand. Gebruik get-customer-data voor alle segmenten en beschrijf de belangrijkste inzichten per segment.
```

```
Geef een top 10 van klanten met de hoogste contractwaarde en toon hun tevredenheidsscore en NPS.
```

---

## 2. AFAS Verlofsaldo (`get-verlof-saldo`)

### Algemeen overzicht
```
Haal het verlofsaldo op voor alle medewerkers en geef me een overzicht per afdeling.
```

```
Gebruik get-verlof-saldo en toon me de verlofsaldo rapportage voor boekjaar 2025.
```

### Per afdeling
```
Toon het verlofsaldo van de IT-afdeling. Wie heeft de meeste vakantie-uren openstaan?
```

```
Geef een overzicht van het verlofsaldo voor de Sales afdeling. Zijn er medewerkers die risico lopen uren te verliezen?
```

```
Haal de verlofdata op voor HR en Operations. Vergelijk het gemiddelde vakantiesaldo van beide afdelingen.
```

### Risico & planning
```
Welke medewerkers hebben meer dan 120 vakantie-uren openstaan? Dit zijn risico's voor einde boekjaar.
```

```
Toon alle medewerkers waarbij uren verlopen aan het einde van het jaar. Gebruik get-verlof-saldo.
```

```
Gebruik de AFAS verlof tool en geef me een top 5 van medewerkers met het hoogste totale verlofsaldo (alle soorten gecombineerd).
```

### ADV & bijzonder verlof
```
Haal het verlofsaldo op en filter op ADV-uren. Welke afdeling heeft het hoogste gemiddelde ADV-saldo?
```

```
Zijn er medewerkers met een negatief verlofsaldo? Toon deze via get-verlof-saldo.
```

---

## 3. AFAS Verlofkaart per medewerker (`get-verlofkaart`)

> Dataset: 12 medewerkers van **DHB Bank N.V.** met uiteenlopende situaties.

### Persoonlijke verlofkaart opvragen
```
Toon de verlofkaart van Metin Ozay (016). Welke verlofpotten heeft hij openstaan en wat verloopt er dit jaar?
```

```
Haal de verlofkaart op voor personeelsnummer 023. Hoeveel uren loopt Emma Bakker risico te verliezen einde jaar?
```

```
Geef me de verlofkaart van Lisa Smit (041) en vergelijk haar saldo met dat van Tim Hendriks (098).
```

### Risico-analyse per medewerker
```
Gebruik get-verlofkaart voor Tim Hendriks (098). Hij heeft een zeer hoog saldo – hoeveel uren verlopen er dit jaar en wat is zijn advies?
```

```
Haal de verlofkaart op van Roos Mulder (062). Zij heeft meerdere verlopende potten in 2026. Geef een concreet opnameadvies.
```

```
Toon de verlofkaart van Emma Bakker (023). Ze is al sinds 2001 in dienst. Analyseer haar historische saldo-opbouw en urgente actiepunten.
```

### Specifieke verlofsoorten
```
Haal de verlofkaart op van Anna Visser (055) en kijk hoeveel Care Leave ze heeft opgenomen. Is er nog ruimte?
```

```
Toon de verlofkaart van Daan Peters (113). Hoeveel Bijzonder Verlof Studie heeft hij nog beschikbaar voor de rest van 2026?
```

```
Geef de verlofkaart van Pieter de Boer (034). Hij heeft overtime2holiday ontvangen – is dit tijdig opgenomen?
```

### ATV & correcties
```
Haal de verlofkaart op van Joost Janssen (087). Hij is recent in dienst. Welke verlofpotten zijn al actief en hoe ziet zijn ATV-saldo eruit?
```

```
Toon de verlofkaart van Vera Jansen (077). Ze is teruggekeerd van zwangerschapsverlof – hoe hoog is haar opgebouwd saldo?
```

### Vergelijking & team-overzicht
```
Vraag de verlofkaarten op van Sophie de Vries (042) en Lars van den Berg (071). Wie heeft procentueel het meeste verlof al opgenomen dit jaar?
```

```
Geef een overzicht van alle DHB Bank medewerkers met een verlopend saldo in 2026. Gebruik get-verlofkaart voor elk personeelsnummer: 016, 023, 062, 098.
```

---

## 4. Gecombineerde prompts (alle tools)

```
Gebruik eerst get-customer-data voor het Enterprise segment en daarna get-verlof-saldo voor de Sales afdeling. Maak een management dashboard samenvatting van beide rapporten.
```

```
Ik wil een kwartaalrapportage. Haal de klantdata op (alle segmenten) én het verlofsaldo (alle afdelingen) en presenteer de belangrijkste KPI's.
```

```
Haal de verlofkaart op van Metin Ozay (016) én het klantoverzicht voor de Overheid klanten. Presenteer beide naast elkaar als een HR + Sales briefing.
```

```
Geef een volledig DHB Bank rapport: gebruik get-verlof-saldo voor alle afdelingen, en haal daarna de verlofkaarten op van de drie medewerkers met het hoogste risico (016, 023, 098). Sluit af met aanbevelingen.
```

---

## 5. Configuratie

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "customer-segmentation": {
      "command": "node",
      "args": [
        "c:/Users/PC/Desktop/Demo MCP-server/customer-segmentation-server/dist/index.js",
        "--stdio"
      ]
    }
  }
}
```

### Via HTTP (lokaal)
- MCP endpoint:        `http://localhost:3001/mcp`
- Test UI (klanten):   `http://localhost:3002/test`
- Test UI (verlof):    `http://localhost:3002/test-verlof`
- Test UI (verlofkaart): `http://localhost:3002/test-kaart`

---

## 6. Beschikbare tools & parameters

| Tool | Parameter | Waarden |
|------|-----------|----------|
| `get-customer-data` | `segment` (optioneel) | `All`, `Enterprise`, `MKB`, `Overheid`, `Zorg & Onderwijs` |
| `get-verlof-saldo` | `afdeling` (optioneel) | `All`, `Sales`, `IT`, `Finance`, `HR`, `Operations`, `Marketing` |
| `get-verlofkaart` | `personeelsnummer` (optioneel) | `016`, `023`, `034`, `041`, `042`, `055`, `062`, `071`, `077`, `087`, `098`, `113` |

### DHB Bank medewerkers (verlofkaart)

| Nr | Naam | Situatie |
|----|------|----------|
| 016 | Metin Ozay | Exacte AFAS-data, historisch saldo, 2 expiring potten |
| 023 | Emma Bakker | ⚠ Risico – senior 2001, 10 potten, 112u verloopt |
| 034 | Pieter de Boer | Manager, ATV volledig opgenomen, overtime2holiday |
| 041 | Lisa Smit | ✓ Modelmedewerker, netjes bijgehouden |
| 042 | Sophie de Vries | Parttime 0.8 FTE, clean |
| 055 | Anna Visser | Parttime 0.6 FTE, care leave opgenomen |
| 062 | Roos Mulder | ⚠ Risico – 3 verlopende potten in 2026 |
| 071 | Lars van den Berg | Fulltime, standaard opbouw |
| 077 | Vera Jansen | Na zwangerschapsverlof, extra care leave recht |
| 087 | Joost Janssen | Recent in dienst (2024), lage beginstand |
| 098 | Tim Hendriks | ⚠ Kritiek – 682u saldo, nauwelijks opgenomen |
| 113 | Daan Peters | Parttime 0.5 FTE, bijzonder studieverlof |
