// ─── AFAS Verlof (Leave) Types ────────────────────────────────────────────────

export type VerlofSoort =
  | "Vakantie"
  | "ADV"
  | "Bijzonder verlof"
  | "Zorgverlof"
  | "Compensatie-uren";

export interface VerlofSaldo {
  soort: VerlofSoort;
  /** Uren opgebouwd dit jaar */
  opgebouwd: number;
  /** Uren opgenomen dit jaar */
  opgenomen: number;
  /** Resterend saldo (opgebouwd - opgenomen + vorig jaar) */
  saldo: number;
  /** Uren verlopen einde jaar */
  verloopt: number;
}

export interface AfasEmployee {
  personeelsnummer: string;
  naam: string;
  afdeling: Afdeling;
  functie: string;
  contractUren: number; // uur per week
  inDienst: string;     // YYYY-MM-DD
  saldi: VerlofSaldo[];
}

export type Afdeling =
  | "Sales"
  | "IT"
  | "Finance"
  | "HR"
  | "Operations"
  | "Marketing";

export interface AfasVerlofSummary {
  afdeling: Afdeling;
  aantalMedewerkers: number;
  totaalVakantieUren: number;
  totaalADVUren: number;
  gemSaldo: number;
  kleurCode: string;
}

export const AFDELINGEN: Afdeling[] = [
  "Sales", "IT", "Finance", "HR", "Operations", "Marketing",
];

export const AFDELING_KLEUREN: Record<Afdeling, string> = {
  Sales:      "#0ea5e9",
  IT:         "#6366f1",
  Finance:    "#10b981",
  HR:         "#f59e0b",
  Operations: "#ef4444",
  Marketing:  "#8b5cf6",
};

export const VERLOF_SOORTEN: VerlofSoort[] = [
  "Vakantie",
  "ADV",
  "Bijzonder verlof",
  "Zorgverlof",
  "Compensatie-uren",
];
