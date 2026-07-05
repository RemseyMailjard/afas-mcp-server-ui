import type { Customer, SegmentSummary, SegmentName } from "./types.js";
import { SEGMENT_COLORS, SEGMENTS } from "./types.js";

// ─── Nederlandse bedrijfsnamen per segment ────────────────────────────────────

const ENTERPRISE_NAMEN = [
  "Philips Nederland", "ING Groep", "ASML Holding", "Heineken International",
  "Shell Nederland", "Unilever Benelux", "AkzoNobel", "NN Group",
  "Wolters Kluwer", "Randstad Holding", "PostNL", "Aegon Nederland",
  "ABN AMRO", "Rabobank", "DSM-Firmenich", "Stellantis Nederland",
  "TomTom", "Boskalis Westminster", "Vopak", "Fugro",
];

const MKB_NAMEN = [
  "Bakker Logistiek", "Van der Valk Hotels", "Jumbo Supermarkten",
  "De Heus Voeders", "Verstegen Spices", "Boels Verhuur",
  "Ctac Business Solutions", "Sligro Food Group", "Beter Bed Holding",
  "Accell Group", "OCI Global", "Aalberts Industries",
  "Brunel International", "ICT Group", "Nedap",
  "Detron ICT", "Centric IT Solutions", "PinkRoccade",
  "UNIT4 Business Software", "Visma Software",
];

const OVERHEID_NAMEN = [
  "Gemeente Amsterdam", "Gemeente Rotterdam", "Gemeente Utrecht",
  "Gemeente Den Haag", "Provincie Noord-Holland", "Provincie Zuid-Holland",
  "Rijkswaterstaat", "Belastingdienst", "UWV", "SVB",
  "Gemeente Eindhoven", "Gemeente Groningen", "Waterschap Rivierenland",
  "Gemeente Tilburg", "Gemeente Almere", "RDW",
  "CJIB", "DUO", "Gemeente Breda", "Gemeente Nijmegen",
];

const ZORG_NAMEN = [
  "Amsterdam UMC", "Erasmus MC", "UMCG Groningen",
  "Radboud UMC", "UMC Utrecht", "Zuyderland Medisch Centrum",
  "Isala Klinieken", "ROC van Amsterdam", "Hogeschool Utrecht",
  "Universiteit Leiden", "TU Delft", "Hogeschool Rotterdam",
  "Avans Hogeschool", "Inholland", "Windesheim",
  "GGD Amsterdam", "Arkin GGZ", "Pluryn", "Pluriplus",
  "Stichting Koraal",
];

const NAMEN_PER_SEGMENT: Record<SegmentName, string[]> = {
  Enterprise:          ENTERPRISE_NAMEN,
  MKB:                 MKB_NAMEN,
  Overheid:            OVERHEID_NAMEN,
  "Zorg & Onderwijs":  ZORG_NAMEN,
};

// Cluster centers for each segment
interface ClusterCenter {
  annualRevenue: { min: number; max: number };
  employeeCount: { min: number; max: number };
  accountAge: { min: number; max: number };
  engagementScore: { min: number; max: number };
  supportTickets: { min: number; max: number };
  nps: { min: number; max: number };
}

const CLUSTER_CENTERS: Record<SegmentName, ClusterCenter> = {
  // Grote ondernemingen: hoge contractwaarde, veel gebruikers, lang klant
  Enterprise: {
    annualRevenue:   { min: 80_000,  max: 400_000 },  // €80K–€400K/jaar
    employeeCount:   { min: 200,     max: 2_000  },   // gebruikers
    accountAge:      { min: 60,      max: 144    },   // 5–12 jaar klant
    engagementScore: { min: 72,      max: 95     },   // hoge tevredenheid
    supportTickets:  { min: 3,       max: 15     },
    nps:             { min: 35,      max: 75     },
  },
  // Midden- en kleinbedrijf: gemiddelde waarden
  MKB: {
    annualRevenue:   { min: 15_000,  max: 80_000 },
    employeeCount:   { min: 20,      max: 200    },
    accountAge:      { min: 24,      max: 84     },
    engagementScore: { min: 58,      max: 82     },
    supportTickets:  { min: 5,       max: 25     },
    nps:             { min: 15,      max: 55     },
  },
  // Overheidsinstellingen: stabiele contracten, gemiddeld gebruik
  Overheid: {
    annualRevenue:   { min: 30_000,  max: 150_000 },
    employeeCount:   { min: 50,      max: 800     },
    accountAge:      { min: 48,      max: 120     },
    engagementScore: { min: 55,      max: 78      },
    supportTickets:  { min: 8,       max: 30      },
    nps:             { min: 20,      max: 60      },
  },
  // Zorg & Onderwijs: kleinere contracten, hoge betrokkenheid
  "Zorg & Onderwijs": {
    annualRevenue:   { min: 10_000,  max: 60_000 },
    employeeCount:   { min: 15,      max: 300    },
    accountAge:      { min: 12,      max: 72     },
    engagementScore: { min: 62,      max: 88     },
    supportTickets:  { min: 4,       max: 20     },
    nps:             { min: 25,      max: 65     },
  },
};

// Verdeling AFAS klantenbestand Nederland
const SEGMENT_WEIGHTS: Record<SegmentName, number> = {
  Enterprise:          0.15,
  MKB:                 0.40,
  Overheid:            0.20,
  "Zorg & Onderwijs":  0.25,
};

// Box-Muller transform for Gaussian random numbers
function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

// Generate a value within range with Gaussian distribution centered in range
function generateClusteredValue(min: number, max: number): number {
  const mean = (min + max) / 2;
  const stdDev = (max - min) / 4; // 95% of values within range
  const value = gaussianRandom(mean, stdDev);
  return Math.max(min * 0.8, Math.min(max * 1.2, value)); // Allow slight overflow
}

// Generate unique company name per segment
function generateCompanyName(segment: SegmentName, usedNames: Set<string>): string {
  const pool = NAMEN_PER_SEGMENT[segment];
  // Try pool first
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  for (const name of shuffled) {
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
  // Fallback: append a number
  let i = 2;
  while (true) {
    const name = `${pool[0]} ${i}`;
    if (!usedNames.has(name)) { usedNames.add(name); return name; }
    i++;
  }
}

// Select segment based on weights
function selectSegment(): SegmentName {
  const rand = Math.random();
  let cumulative = 0;
  for (const segment of SEGMENTS) {
    cumulative += SEGMENT_WEIGHTS[segment];
    if (rand < cumulative) {
      return segment;
    }
  }
  return "MKB";
}

// Generate a single customer
function generateCustomer(id: number, usedNames: Set<string>): Customer {
  const segment = selectSegment();
  const center = CLUSTER_CENTERS[segment];

  return {
    id: `cust-${id.toString().padStart(4, "0")}`,
    name: generateCompanyName(segment, usedNames),
    segment,
    annualRevenue: Math.round(
      generateClusteredValue(
        center.annualRevenue.min,
        center.annualRevenue.max,
      ),
    ),
    employeeCount: Math.round(
      generateClusteredValue(
        center.employeeCount.min,
        center.employeeCount.max,
      ),
    ),
    accountAge: Math.round(
      generateClusteredValue(center.accountAge.min, center.accountAge.max),
    ),
    engagementScore: Math.round(
      generateClusteredValue(
        center.engagementScore.min,
        center.engagementScore.max,
      ),
    ),
    supportTickets: Math.round(
      generateClusteredValue(
        center.supportTickets.min,
        center.supportTickets.max,
      ),
    ),
    nps: Math.round(generateClusteredValue(center.nps.min, center.nps.max)),
  };
}

// Generate all customers
export function generateCustomers(count: number = 250): Customer[] {
  const usedNames = new Set<string>();
  const customers: Customer[] = [];

  for (let i = 0; i < count; i++) {
    customers.push(generateCustomer(i + 1, usedNames));
  }

  return customers;
}

// Generate segment summaries from customers
export function generateSegmentSummaries(
  customers: Customer[],
): SegmentSummary[] {
  const counts = new Map<string, number>();

  for (const customer of customers) {
    counts.set(customer.segment, (counts.get(customer.segment) || 0) + 1);
  }

  return SEGMENTS.map((segment) => ({
    name: segment,
    count: counts.get(segment) || 0,
    color: SEGMENT_COLORS[segment],
  }));
}
