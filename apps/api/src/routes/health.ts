import type { FastifyPluginAsync } from "fastify";
import { workerHealth } from "../services/python-worker.js";

export const healthRoute: FastifyPluginAsync = async (app) => {
  app.get("/health", async (_req, reply) => {
    const workerOk = await workerHealth();
    reply.status(workerOk ? 200 : 503).send({
      status: workerOk ? "ok" : "degraded",
      services: {
        api: "ok",
        pythonWorker: workerOk ? "ok" : "unavailable",
      },
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    });
  });
};
