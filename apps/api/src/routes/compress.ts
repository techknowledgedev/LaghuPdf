import type { FastifyPluginAsync } from "fastify";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { callCompress } from "../services/python-worker.js";
import {
  getTempDir,
  deleteTempFile,
  registerOutputFile,
} from "../services/file-cleanup.js";

export const compressRoute: FastifyPluginAsync = async (app) => {
  app.post("/compress", async (req, reply) => {
    const parts = req.parts();
    const tempDir = getTempDir();

    let inputPath: string | null = null;
    const outputPath = path.join(tempDir, `${uuidv4()}_compressed.pdf`);

    let preset = "/ebook";
    let colorDpi = 150;
    let grayDpi = 150;
    let monoDpi = 300;
    let jpegQuality = 75;
    let originalSize = 0;

    try {
      for await (const part of parts) {
        if (part.type === "file" && part.fieldname === "file") {
          inputPath = path.join(tempDir, `${uuidv4()}_input.pdf`);
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) chunks.push(chunk as Buffer);
          const buf = Buffer.concat(chunks);
          originalSize = buf.byteLength;
          await fs.writeFile(inputPath, buf);
        } else if (part.type === "field") {
          const v = (part as unknown as { value: string }).value;
          if (part.fieldname === "preset") preset = v;
          else if (part.fieldname === "colorDpi") colorDpi = Number(v);
          else if (part.fieldname === "grayDpi") grayDpi = Number(v);
          else if (part.fieldname === "monoDpi") monoDpi = Number(v);
          else if (part.fieldname === "jpegQuality") jpegQuality = Number(v);
        }
      }

      if (!inputPath) {
        reply.status(400).send({ error: "No file provided" });
        return;
      }

      // Validate that input is a PDF (magic bytes)
      const header = Buffer.alloc(5);
      const fh = await fs.open(inputPath, "r");
      await fh.read(header, 0, 5, 0);
      await fh.close();
      if (!header.toString("ascii").startsWith("%PDF")) {
        await deleteTempFile(inputPath);
        reply.status(400).send({ error: "Invalid PDF file" });
        return;
      }

      // Send to Python worker for Ghostscript compression
      await callCompress({
        inputPath,
        outputPath,
        preset,
        colorDpi,
        grayDpi,
        monoDpi,
        jpegQuality,
      });

      // Clean up input immediately
      await deleteTempFile(inputPath);

      // Get output size
      const stat = await fs.stat(outputPath);
      const compressedSize = stat.size;

      // Register output file for TTL deletion
      registerOutputFile(outputPath);

      const jobId = uuidv4();
      const savingsPercent =
        originalSize > 0
          ? Math.round(((originalSize - compressedSize) / originalSize) * 1000) / 10
          : 0;

      reply.send({
        jobId,
        downloadUrl: `/api/download/${path.basename(outputPath)}`,
        originalSize,
        compressedSize,
        savingsPercent,
      });
    } catch (err) {
      // Clean up on error
      if (inputPath) await deleteTempFile(inputPath);
      await deleteTempFile(outputPath);
      req.log.error(err);
      reply.status(500).send({ error: "Compression failed. Is Ghostscript installed?" });
    }
  });

  // Download endpoint
  app.get<{ Params: { filename: string } }>(
    "/download/:filename",
    async (req, reply) => {
      // Security: only allow UUIDs with _compressed.pdf or _converted suffix
      const { filename } = req.params;
      if (!/^[0-9a-f-]+_(compressed|converted)\.(pdf|png|jpg|jpeg|webp|zip)$/i.test(filename)) {
        reply.status(400).send({ error: "Invalid filename" });
        return;
      }
      const filePath = path.join(getTempDir(), filename);
      try {
        await fs.access(filePath);
        const ext = path.extname(filename).toLowerCase();
        const mimeMap: Record<string, string> = {
          ".pdf": "application/pdf",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".webp": "image/webp",
          ".zip": "application/zip",
        };
        reply
          .header("Content-Type", mimeMap[ext] ?? "application/octet-stream")
          .header("Content-Disposition", `attachment; filename="${filename}"`)
          .send(await fs.readFile(filePath));
      } catch {
        reply.status(404).send({ error: "File not found or expired" });
      }
    }
  );
};
