import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import {
  generateCustomers,
  generateSegmentSummaries,
} from "./src/data-generator.js";
import { SEGMENTS, type Customer, type SegmentSummary } from "./src/types.js";
import {
  generateAfasEmployees,
  generateVerlofSummaries,
} from "./src/data-generator-verlof.js";
import {
  AFDELINGEN,
  type AfasEmployee,
  type AfasVerlofSummary,
} from "./src/types-verlof.js";
import { getVerlofkaart } from "./src/data-generator-verlofkaart.js";
import type { VerlofkaartResponse } from "./src/types-verlofkaart.js";

// Works both from source (server.ts) and compiled (dist/server.js)
const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

// Schemas - types are derived from these using z.infer
const GetCustomerDataInputSchema = z.object({
  segment: z
    .enum(["All", ...SEGMENTS])
    .optional()
    .describe("Filter by segment (default: All)"),
});

const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  segment: z.string(),
  annualRevenue: z.number(),
  employeeCount: z.number(),
  accountAge: z.number(),
  engagementScore: z.number(),
  supportTickets: z.number(),
  nps: z.number(),
});

const SegmentSummarySchema = z.object({
  name: z.string(),
  count: z.number(),
  color: z.string(),
});

const GetCustomerDataOutputSchema = z.object({
  customers: z.array(CustomerSchema),
  segments: z.array(SegmentSummarySchema),
});

// Cache generated data for session consistency
let cachedCustomers: Customer[] | null = null;
let cachedSegments: SegmentSummary[] | null = null;

function getCustomerData(segmentFilter?: string): {
  customers: Customer[];
  segments: SegmentSummary[];
} {
  // Generate data on first call
  if (!cachedCustomers) {
    cachedCustomers = generateCustomers(250);
    cachedSegments = generateSegmentSummaries(cachedCustomers);
  }

  // Filter by segment if specified
  let customers = cachedCustomers;
  if (segmentFilter && segmentFilter !== "All") {
    customers = cachedCustomers.filter((c) => c.segment === segmentFilter);
  }

  return {
    customers,
    segments: cachedSegments!,
  };
}

// ─── AFAS Verlof cache ────────────────────────────────────────────────────────
let cachedVerlofEmployees: AfasEmployee[] | null = null;
let cachedVerlofSummaries: AfasVerlofSummary[] | null = null;

function getVerlofData(afdelingFilter?: string): {
  employees: AfasEmployee[];
  summaries: AfasVerlofSummary[];
  jaar: number;
} {
  if (!cachedVerlofEmployees) {
    cachedVerlofEmployees = generateAfasEmployees();
    cachedVerlofSummaries = generateVerlofSummaries(cachedVerlofEmployees);
  }
  let employees = cachedVerlofEmployees;
  if (afdelingFilter && afdelingFilter !== "All") {
    employees = cachedVerlofEmployees.filter((e) => e.afdeling === afdelingFilter);
  }
  return { employees, summaries: cachedVerlofSummaries!, jaar: 2025 };
}

/**
 * Creates a new MCP server instance with tools and resources registered.
 * Each HTTP session needs its own server instance because McpServer only supports one transport.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "Customer Segmentation Server",
    version: "1.0.0",
  });

  // Register the get-customer-data tool and its associated UI resource
  {
    const resourceUri = "ui://customer-segmentation/mcp-app.html";

    registerAppTool(
      server,
      "get-customer-data",
      {
        title: "AFAS Klantoverzicht",
        description:
          "Geeft een overzicht van AFAS-klanten met segmentinformatie voor visualisatie. Optioneel filteren op segment.",
        inputSchema: GetCustomerDataInputSchema.shape,
        outputSchema: GetCustomerDataOutputSchema.shape,
        _meta: { ui: { resourceUri } },
      },
      async ({ segment }): Promise<CallToolResult> => {
        const data = getCustomerData(segment);

        return {
          content: [{ type: "text", text: JSON.stringify(data) }],
          structuredContent: data,
        };
      },
    );

    registerAppResource(
      server,
      resourceUri,
      resourceUri,
      {
        mimeType: RESOURCE_MIME_TYPE,
        description: "AFAS Klantoverzicht UI",
      },
      async (): Promise<ReadResourceResult> => {
        const html = await fs.readFile(
          path.join(DIST_DIR, "mcp-app.html"),
          "utf-8",
        );

        return {
          contents: [
            {
              uri: resourceUri,
              mimeType: RESOURCE_MIME_TYPE,
              text: html,
            },
          ],
        };
      },
    );
  }

  // ─── AFAS Verlofsaldo tool + resource ───────────────────────────────────────
  {
    const verlofResourceUri = "ui://customer-segmentation/afas-verlof.html";

    registerAppTool(
      server,
      "get-verlof-saldo",
      {
        title: "AFAS Verlofsaldo Rapportage",
        description:
          "Toont het verlofsaldo per medewerker vanuit AFAS HR. Optioneel filteren op afdeling.",
        inputSchema: {
          afdeling: z
            .enum(["All", ...AFDELINGEN])
            .optional()
            .describe("Filter op afdeling (standaard: alle afdelingen)"),
        },
        _meta: { ui: { resourceUri: verlofResourceUri } },
      },
      async ({ afdeling }): Promise<CallToolResult> => {
        const data = getVerlofData(afdeling);
        return {
          content: [{ type: "text", text: JSON.stringify(data) }],
          structuredContent: data,
        };
      },
    );

    registerAppResource(
      server,
      verlofResourceUri,
      verlofResourceUri,
      {
        mimeType: RESOURCE_MIME_TYPE,
        description: "AFAS Verlofsaldo Rapportage UI",
      },
      async (): Promise<ReadResourceResult> => {
        const html = await fs.readFile(
          path.join(DIST_DIR, "afas-verlof.html"),
          "utf-8",
        );
        return {
          contents: [
            {
              uri: verlofResourceUri,
              mimeType: RESOURCE_MIME_TYPE,
              text: html,
            },
          ],
        };
      },
    );
  }

  // ─── AFAS Verlofkaart (per medewerker) ─────────────────────────────────────
  {
    const kaartResourceUri = "ui://customer-segmentation/verlofkaart.html";

    registerAppTool(
      server,
      "get-verlofkaart",
      {
        title: "AFAS Verlofkaart",
        description:
          "Toont de interactieve verlofkaart per medewerker: alle verlofpotten, saldi, boekingen en vervaldatums. Optioneel filteren op personeelsnummer.",
        inputSchema: {
          personeelsnummer: z
            .string()
            .optional()
            .describe("Personeelsnummer van de medewerker (bijv. '016'). Standaard: eerste medewerker."),
        },
        _meta: { ui: { resourceUri: kaartResourceUri } },
      },
      async ({ personeelsnummer }): Promise<CallToolResult> => {
        const data: VerlofkaartResponse = getVerlofkaart(personeelsnummer);
        return {
          content: [{ type: "text", text: JSON.stringify(data) }],
          structuredContent: data as unknown as Record<string, unknown>,
        };
      },
    );

    registerAppResource(
      server,
      kaartResourceUri,
      kaartResourceUri,
      {
        mimeType: RESOURCE_MIME_TYPE,
        description: "AFAS Verlofkaart UI",
      },
      async (): Promise<ReadResourceResult> => {
        const html = await fs.readFile(
          path.join(DIST_DIR, "verlofkaart.html"),
          "utf-8",
        );
        return {
          contents: [{ uri: kaartResourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }],
        };
      },
    );
  }

  return server;
}
