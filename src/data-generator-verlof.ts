import type {
  AfasEmployee,
  AfasVerlofSummary,
  Afdeling,
  VerlofSaldo,
  VerlofSoort,
} from "./types-verlof.js";
import { AFDELING_KLEUREN, AFDELINGEN } from "./types-verlof.js";

// ─── Dutch name pools ─────────────────────────────────────────────────────────
const VOORNAMEN = [
  "Emma", "Liam", "Sophie", "Noah", "Julia", "Lars", "Anna", "Tim",
  "Lisa", "Bas", "Eva", "Sander", "Nora", "Joost", "Roos", "Pieter",
  "Iris", "Rick", "Vera", "Maarten", "Fleur", "Kevin", "Mia", "Daan",
  "Elise", "Ruben", "Anouk", "Thomas", "Fenna", "Jeroen",
];

const ACHTERNAMEN = [
  "de Vries", "Jansen", "van den Berg", "van Dijk", "Bakker",
  "Janssen", "Visser", "Smit", "Meijer", "de Boer",
  "Mulder", "de Groot", "Bos", "Vos", "Peters",
  "Hendriks", "van Leeuwen", "Dekker", "Brouwer", "de Wit",
];

// ─── Functietitels per afdeling ───────────────────────────────────────────────
const FUNCTIES: Record<Afdeling, string[]> = {
  Sales:      ["Account Manager", "Sales Engineer", "Sales Director", "Inside Sales"],
  IT:         ["Software Developer", "DevOps Engineer", "IT Manager", "Scrum Master", "Architect"],
  Finance:    ["Accountant", "Financial Controller", "Payroll Specialist", "CFO"],
  HR:         ["HR Adviseur", "Recruiter", "HR Manager", "L&D Specialist"],
  Operations: ["Logistiek Medewerker", "Operations Manager", "Planner", "Teamleider"],
  Marketing:  ["Marketing Specialist", "Content Marketeer", "Brand Manager", "SEO Specialist"],
};

// Medewerkers per afdeling
const AFDELING_VERDELING: Record<Afdeling, number> = {
  Sales:      8,
  IT:         10,
  Finance:    5,
  HR:         4,
  Operations: 7,
  Marketing:  6,
};

// Verlof recht per soort (uren per jaar, op basis van 40-urige werkweek)
const VERLOF_RECHT: Record<VerlofSoort, { min: number; max: number }> = {
  "Vakantie":          { min: 160, max: 200 }, // 4–5 weken
  "ADV":               { min: 40,  max: 96  }, // 1–2,5 weken
  "Bijzonder verlof":  { min: 16,  max: 40  }, // 2–5 dagen
  "Zorgverlof":        { min: 40,  max: 80  }, // 1–2 weken
  "Compensatie-uren":  { min: 0,   max: 80  }, // wisselend
};

let _seed = 42;
function rng(): number {
  _seed = (_seed * 1664525 + 1013904223) & 0xffffffff;
  return ((_seed >>> 0) / 0xffffffff);
}
function randInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function generateVerlofSaldi(contractUren: number): VerlofSaldo[] {
  const factor = contractUren / 40; // schaal op contracturen
  const soorten: VerlofSoort[] = ["Vakantie", "ADV", "Bijzonder verlof", "Zorgverlof"];

  // 50% kans op compensatie-uren
  if (rng() > 0.5) soorten.push("Compensatie-uren");

  return soorten.map((soort): VerlofSaldo => {
    const recht = VERLOF_RECHT[soort];
    const opgebouwd = Math.round(randInt(recht.min, recht.max) * factor);
    const maxOpgenomen = Math.round(opgebouwd * (soort === "Vakantie" ? 0.85 : 0.6));
    const opgenomen = randInt(0, maxOpgenomen);
    const vorigjaarRest = soort === "Vakantie" ? randInt(0, 40) : 0;
    const saldo = opgebouwd - opgenomen + vorigjaarRest;
    // Vakantie verloopt aan einde jaar, anderen minder snel
    const verlooptPct = soort === "Vakantie" ? 0.3 : 0.1;
    const verloopt = Math.round(saldo * verlooptPct * (rng() > 0.6 ? 1 : 0));

    return { soort, opgebouwd, opgenomen, saldo, verloopt };
  });
}

function generateInDienst(): string {
  const year  = randInt(2010, 2024);
  const month = randInt(1, 12);
  const day   = randInt(1, 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function generateAfasEmployees(): AfasEmployee[] {
  _seed = 99; // vaste seed voor consistente demo-data
  const usedNamen = new Set<string>();
  const employees: AfasEmployee[] = [];
  let persNr = 1001;

  for (const afdeling of AFDELINGEN) {
    const count = AFDELING_VERDELING[afdeling];
    const functies = FUNCTIES[afdeling];

    for (let i = 0; i < count; i++) {
      let naam: string;
      let attempts = 0;
      do {
        naam = `${pick(VOORNAMEN)} ${pick(ACHTERNAMEN)}`;
        attempts++;
      } while (usedNamen.has(naam) && attempts < 50);
      usedNamen.add(naam);

      const contractUren = pick([24, 32, 36, 40]);
      employees.push({
        personeelsnummer: `P${persNr++}`,
        naam,
        afdeling,
        functie: pick(functies),
        contractUren,
        inDienst: generateInDienst(),
        saldi: generateVerlofSaldi(contractUren),
      });
    }
  }

  return employees;
}

export function generateVerlofSummaries(
  employees: AfasEmployee[],
): AfasVerlofSummary[] {
  return AFDELINGEN.map((afd) => {
    const groep = employees.filter((e) => e.afdeling === afd);
    const vakSaldi = groep.flatMap((e) =>
      e.saldi.filter((s) => s.soort === "Vakantie").map((s) => s.saldo),
    );
    const advSaldi = groep.flatMap((e) =>
      e.saldi.filter((s) => s.soort === "ADV").map((s) => s.saldo),
    );
    const gemSaldo =
      vakSaldi.length > 0
        ? Math.round(vakSaldi.reduce((a, b) => a + b, 0) / vakSaldi.length)
        : 0;

    return {
      afdeling: afd,
      aantalMedewerkers: groep.length,
      totaalVakantieUren: vakSaldi.reduce((a, b) => a + b, 0),
      totaalADVUren: advSaldi.reduce((a, b) => a + b, 0),
      gemSaldo,
      kleurCode: AFDELING_KLEUREN[afd],
    };
  });
}
