// Transparency dashboard — the data-source registry (T1).
//
// The "clearly-defined API" behind Apuna's first solution: a typed manifest of
// EVERY data source the site actually has, with its origin, cadence, and a
// declared liveness `kind`. The dashboard at /stats renders this; GET
// /api/transparency serves it.
//
// HONESTY CONTRACT (load-bearing — see the CEO/sprint note):
//   • This is a METHOD demonstrator on Apuna's OWN data, not a client's plant.
//     The three pillars are explicit STAND-INS — Operational ≈ IoT telemetry,
//     Market ≈ ERP reference data, Knowledge ≈ Documentation — so a prospect
//     reads "this is how we make data honest and sourced", not "this is your factory".
//   • `kind` declares HOW a source's freshness is known; the live runtime status
//     (live / unavailable) is derived at fetch time in T3, never hard-coded here.
//   • Every `originUrl` is real and linkable. No invented sources, no dead links.

/** Dashboard pillar — Apuna-own-data label, with the client-pillar it stands in for. */
export type Pillar = "operational" | "market" | "knowledge";

/**
 * How a source's freshness is established. T3 turns `live`/`key-gated` into a
 * runtime-verified badge; `build-time` and `not-yet-wired` are static by nature.
 */
export type SourceKind = "live" | "key-gated" | "build-time" | "not-yet-wired";

export type T = { en: string; de: string };

export type DataSource = {
  id: string;
  pillar: Pillar;
  name: T;
  whatItIs: T;
  /** Human-readable origin (provider / system of record). */
  origin: string;
  /** Real, linkable URL for the origin — clickable provenance. */
  originUrl: string;
  /** Cadence / freshness in words. */
  cadence: T;
  kind: SourceKind;
};

export const PILLARS: Record<
  Pillar,
  { label: T; standsForEn: string; standsForDe: string }
> = {
  operational: {
    label: { en: "Operational signals", de: "Betriebssignale" },
    standsForEn: "stands in for IoT telemetry",
    standsForDe: "steht für IoT-Telemetrie",
  },
  market: {
    label: { en: "Market data", de: "Marktdaten" },
    standsForEn: "stands in for ERP reference data",
    standsForDe: "steht für ERP-Referenzdaten",
  },
  knowledge: {
    label: { en: "Knowledge", de: "Wissen" },
    standsForEn: "stands in for Documentation",
    standsForDe: "steht für Dokumentation",
  },
};

export const TRANSPARENCY_SOURCES: DataSource[] = [
  // ── Operational signals (≈ IoT telemetry) ──────────────────────────────
  {
    id: "bots-blocked",
    pillar: "operational",
    name: { en: "Bots blocked", de: "Blockierte Bots" },
    whatItIs: {
      en: "Count of automated/bot form submissions rejected at the edge.",
      de: "Anzahl automatisierter/Bot-Formulareinsendungen, die am Edge abgewiesen wurden.",
    },
    origin: "Cloudflare Workers KV (APPLICATIONS)",
    originUrl: "https://developers.cloudflare.com/kv/",
    cadence: { en: "Real-time · 60s edge cache", de: "Echtzeit · 60s Edge-Cache" },
    kind: "live",
  },
  {
    id: "legit-submissions",
    pillar: "operational",
    name: { en: "Legitimate submissions", de: "Echte Einsendungen" },
    whatItIs: {
      en: "Count of genuine contact/apply submissions that passed screening.",
      de: "Anzahl echter Kontakt-/Bewerbungseinsendungen, die die Prüfung bestanden haben.",
    },
    origin: "Cloudflare Workers KV (APPLICATIONS)",
    originUrl: "https://developers.cloudflare.com/kv/",
    cadence: { en: "Real-time · 60s edge cache", de: "Echtzeit · 60s Edge-Cache" },
    kind: "live",
  },
  {
    id: "cloudflare-analytics",
    pillar: "operational",
    name: { en: "Edge traffic analytics", de: "Edge-Traffic-Analytik" },
    whatItIs: {
      en: "Request volume and geography from the edge — pending an API token.",
      de: "Anfragevolumen und Geografie vom Edge — ausstehend (API-Token erforderlich).",
    },
    origin: "Cloudflare GraphQL Analytics API",
    originUrl: "https://developers.cloudflare.com/analytics/graphql-api/",
    cadence: { en: "Real-time (when wired)", de: "Echtzeit (sobald verbunden)" },
    kind: "not-yet-wired",
  },
  // ── Market data (≈ ERP reference data) ─────────────────────────────────
  {
    id: "commodity-prices",
    pillar: "market",
    name: { en: "Commodity prices", de: "Rohstoffpreise" },
    whatItIs: {
      en: "Monthly spot prices for ~14 commodities, powering the Commodity Intelligence tool.",
      de: "Monatliche Spotpreise für ~14 Rohstoffe, Grundlage des Commodity-Intelligence-Tools.",
    },
    origin: "World Bank Commodity Markets (Pink Sheet, CC BY 4.0)",
    originUrl: "https://www.worldbank.org/en/research/commodity-markets",
    cadence: { en: "Monthly snapshot", de: "Monatlicher Snapshot" },
    kind: "build-time",
  },
  {
    id: "eia-energy",
    pillar: "market",
    name: { en: "Daily energy prices", de: "Tägliche Energiepreise" },
    whatItIs: {
      en: "Daily Brent, WTI and Henry Hub spot prices — active when the EIA key is set.",
      de: "Tägliche Brent-, WTI- und Henry-Hub-Spotpreise — aktiv, sobald der EIA-Schlüssel gesetzt ist.",
    },
    origin: "U.S. EIA Open Data (public domain)",
    originUrl: "https://www.eia.gov/opendata/",
    cadence: { en: "Daily (when configured)", de: "Täglich (sofern konfiguriert)" },
    kind: "key-gated",
  },
  // ── Knowledge (≈ Documentation) ────────────────────────────────────────
  {
    id: "devlog",
    pillar: "knowledge",
    name: { en: "Devlog & blog", de: "Devlog & Blog" },
    whatItIs: {
      en: "The build-in-public development log and blog posts, authored first-party.",
      de: "Das öffentliche Entwicklungs-Logbuch und die Blogbeiträge, selbst verfasst.",
    },
    origin: "Apuna first-party content",
    originUrl: "/en/blog",
    cadence: { en: "Updated at deploy", de: "Aktualisiert beim Deploy" },
    kind: "build-time",
  },
  {
    id: "whitepaper",
    pillar: "knowledge",
    name: { en: "Whitepaper", de: "Whitepaper" },
    whatItIs: {
      en: "The method whitepaper — how Apuna builds AI you can audit.",
      de: "Das Methoden-Whitepaper — wie Apuna nachvollziehbare KI baut.",
    },
    origin: "Apuna first-party content",
    originUrl: "/en/whitepaper",
    cadence: { en: "Updated at deploy", de: "Aktualisiert beim Deploy" },
    kind: "build-time",
  },
  {
    id: "architecture",
    pillar: "knowledge",
    name: { en: "Architecture & pipeline", de: "Architektur & Pipeline" },
    whatItIs: {
      en: "The platform architecture and build-pipeline reference.",
      de: "Die Referenz zu Plattformarchitektur und Build-Pipeline.",
    },
    origin: "Apuna first-party content",
    originUrl: "/en/architecture",
    cadence: { en: "Updated at deploy", de: "Aktualisiert beim Deploy" },
    kind: "build-time",
  },
  {
    id: "forum",
    pillar: "knowledge",
    name: { en: "Community forum", de: "Community-Forum" },
    whatItIs: {
      en: "Threads and posts (human + badged AI) in the D1 forum — currently parked.",
      de: "Threads und Beiträge (Mensch + gekennzeichnete KI) im D1-Forum — derzeit pausiert.",
    },
    origin: "Cloudflare D1 (SQLite)",
    originUrl: "https://developers.cloudflare.com/d1/",
    cadence: { en: "Real-time (when live)", de: "Echtzeit (sobald aktiv)" },
    kind: "not-yet-wired",
  },
];
