// ─── AFAS Verlofkaart types ────────────────────────────────────────────────────

export interface VerlofBoeking {
  begin: string;    // "20-04-2026 09:00"
  eind: string;     // "24-04-2026 17:15"
  uren: number;
  reden?: string;
}

export interface VerlofPot {
  soort: string;          // "Statutory Leave 2026"
  verlooptOp: string;     // "30-06-2027" | "n.v.t."
  meegenomen: number;     // restant vorige periode
  recht: number;          // nieuw recht dit jaar
  extraRecht: number;
  beginsaldo: number;     // meegenomen + recht + extra
  opgenomen: number;
  correcties: number;
  saldo: number;          // huidig saldo (uren)
  saldoDagen: number;
  isExpiring: boolean;    // verloopt dit kalenderjaar
  boekingen: VerlofBoeking[];
}

export interface VerlofMedewerker {
  personeelsnummer: string; // "016"
  naam: string;
  werkgever: string;
  inDienst: string;         // "22-09-1995"
  fte: number;              // 1.00
  urenPerWeek: number;      // 37.50
  dagNorm: number;          // uren per dag: 7.50
  jaar: number;
  potten: VerlofPot[];
}

export interface VerlofkaartResponse {
  medewerkers: Pick<VerlofMedewerker, "personeelsnummer" | "naam" | "werkgever">[];
  kaart: VerlofMedewerker | null;
}
