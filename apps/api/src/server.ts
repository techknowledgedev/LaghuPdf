import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { healthRoute } from "./routes/health.js";
import { compressRoute } from "./routes/compress.js";
import { convertRoute } from "./routes/convert.js";
import { FileCleanupService } from "./services/file-cleanup.js";

const PORT = Number(process.env.API_PORT ?? 3001);
const HOST = process.env.API_HOST ?? "0.0.0.0";
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE ?? 104_857_600); // 100 MB
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 10);
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);

async function start() {
  const app = Fastify({ logger: { level: "info" } });

  // ─── Plugins ────────────────────────────────────────────────────────────────

  await app.register(cors, {
    origin: process.env.NODE_ENV === "production"
      ? [process.env.WEB_ORIGIN ?? "http://localhost:3000"]
      : true,
    methods: ["GET", "POST", "DELETE"],
  });

  await app.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 20,
    },
  });

  if (RATE_LIMIT_MAX > 0) {
    await app.register(rateLimit, {
      max: RATE_LIMIT_MAX,
      timeWindow: RATE_LIMIT_WINDOW,
      errorResponseBuilder: (_req, context) => ({
        statusCode: 429,
        error: "Too Many Requests",
        message: `Rate limit: ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW / 1000}s. Retry after ${context.after}.`,
      }),
    });
  }

  // ─── Routes ─────────────────────────────────────────────────────────────────

  await app.register(healthRoute, { prefix: "/api" });
  await app.register(compressRoute, { prefix: "/api" });
  await app.register(convertRoute, { prefix: "/api" });

  // ─── Global error handler ───────────────────────────────────────────────────

  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error);
    if (error.statusCode === 413) {
      reply.status(413).send({ error: "File too large" });
      return;
    }
    reply.status(error.statusCode ?? 500).send({ error: error.message });
  });

  // ─── Start ──────────────────────────────────────────────────────────────────

  // Start file cleanup service
  FileCleanupService.start();

  await app.listen({ port: PORT, host: HOST });
  console.log(`PdfTwist API running at http://${HOST}:${PORT}`);
}

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
