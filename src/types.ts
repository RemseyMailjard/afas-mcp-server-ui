export interface Customer {
  id: string;
  name: string;
  segment: string;
  /** Jaarlijkse contractwaarde in € */
  annualRevenue: number;
  /** Aantal gelicenseerde AFAS-gebruikers */
  employeeCount: number;
  /** Looptijd klantrelatie in maanden */
  accountAge: number;
  /** Klanttevredenheid 0–100 */
  engagementScore: number;
  /** Openstaande supporttickets */
  supportTickets: number;
  /** Net Promoter Score */
  nps: number;
}

export interface SegmentSummary {
  name: string;
  count: number;
  color: string;
}

export const SEGMENT_COLORS: Record<string, string> = {
  Enterprise:        "#004C8A",  // AFAS blauw
  MKB:               "#0d9488",  // teal
  Overheid:          "#7c3aed",  // paars
  "Zorg & Onderwijs": "#d97706", // amber
};

export const SEGMENTS = ["Enterprise", "MKB", "Overheid", "Zorg & Onderwijs"] as const;
export type SegmentName = (typeof SEGMENTS)[number];

export const METRIC_LABELS: Record<string, string> = {
  annualRevenue:   "Contractwaarde (€)",
  employeeCount:   "Gebruikers",
  accountAge:      "Klantduur (mnd)",
  engagementScore: "Tevredenheid",
  supportTickets:  "Supporttickets",
  nps:             "NPS",
};

export const METRICS = [
  "annualRevenue",
  "employeeCount",
  "accountAge",
  "engagementScore",
  "supportTickets",
  "nps",
] as const;
export type MetricName = (typeof METRICS)[number];
