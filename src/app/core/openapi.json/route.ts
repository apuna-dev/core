import { CORE_SERVICES, CORE_VERSION, type CoreService } from "@/lib/core-bus";

// apuna.dev/core/openapi.json — the machine-readable contract for the bus,
// generated from the service registry so the spec can never drift from the code.

function pathItem(s: CoreService): Record<string, unknown> {
  const op: Record<string, unknown> = {
    operationId: s.id,
    summary: s.summary,
    description: s.description + (s.cost ? " (Rate limit: 10 req/min/IP.)" : " (Rate limit: 60 req/min/IP.)"),
    tags: [s.cost ? "compute" : "data"],
    responses: {
      "200": { description: "Success envelope", content: { "application/json": { schema: { $ref: "#/components/schemas/CoreOk" } } } },
      "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/CoreError" } } } },
      "429": { description: "Rate limited", content: { "application/json": { schema: { $ref: "#/components/schemas/CoreError" } } } },
      "502": { description: "Upstream error", content: { "application/json": { schema: { $ref: "#/components/schemas/CoreError" } } } },
    },
  };
  if (s.params?.length) {
    op.parameters = s.params.map((p) => ({
      name: p.name,
      in: "query",
      required: p.required,
      description: p.description,
      schema: { type: "string", ...(p.example ? { example: p.example } : {}) },
    }));
  }
  if (s.method === "POST" && s.requestExample) {
    op.requestBody = {
      required: true,
      content: { "application/json": { schema: { type: "object" }, example: s.requestExample } },
    };
  }
  return { [s.method.toLowerCase()]: op };
}

export function GET(): Response {
  const paths: Record<string, unknown> = {};
  for (const s of CORE_SERVICES) paths[`/core/v1/${s.id}`] = pathItem(s);

  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Apuna Core API bus",
      version: CORE_VERSION,
      description:
        "A unified, self-describing surface over Apuna's free, key-less endpoints plus a thin Open-Meteo weather proxy. " +
        "Every response uses one envelope: { ok, service, data | error, meta }. Public, per-IP rate limited.",
      contact: { name: "Apuna", url: "https://apuna.dev" },
    },
    servers: [{ url: "https://apuna.dev" }],
    tags: [
      { name: "data", description: "Free read-only data endpoints" },
      { name: "compute", description: "Cost-bearing endpoints (free models via Requesty) — rate-gated harder" },
    ],
    paths,
    components: {
      schemas: {
        CoreOk: {
          type: "object",
          required: ["ok", "service", "data", "meta"],
          properties: {
            ok: { type: "boolean", const: true },
            service: { type: "string" },
            data: { description: "Service-specific payload" },
            meta: { type: "object", properties: { via: { type: "string" }, upstream: { type: "string" } } },
          },
        },
        CoreError: {
          type: "object",
          required: ["ok", "service", "error", "meta"],
          properties: {
            ok: { type: "boolean", const: false },
            service: { type: "string" },
            error: {
              type: "object",
              required: ["code", "message"],
              properties: { code: { type: "string" }, message: { type: "string" } },
            },
            meta: { type: "object" },
          },
        },
      },
    },
  };

  return Response.json(spec, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
