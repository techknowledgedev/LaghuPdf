import type { FastifyPluginAsync } from "fastify";

// Placeholder: PDF-to-Image server route (fallback if client-side not sufficient)
// Phase 1 uses client-side PDF.js rendering; this route supports high-DPI server rendering.

export const convertRoute: FastifyPluginAsync = async (app) => {
  app.get("/convert/status", async (_req, reply) => {
    reply.send({ status: "available", modes: ["pdf-to-images"] });
  });
};
