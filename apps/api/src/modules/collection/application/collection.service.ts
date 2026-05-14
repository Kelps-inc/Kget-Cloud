import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/database/prisma.service";
import { LocalStorageProvider } from "@shared/infrastructure/storage/local-storage.provider";
import { ProcessFileUseCase } from "@modules/knowledge/application/process-file.use-case";
import { Prisma } from "@prisma/client";
import * as crypto from "crypto";

const SERVER_RUN_TYPES = new Set(["url"]);

function inferMimeType(contentType: string | null, fileName: string): string {
  if (contentType) return contentType.split(";")[0].trim();
  if (fileName.endsWith(".pdf")) return "application/pdf";
  if (fileName.endsWith(".html") || fileName.endsWith(".htm"))
    return "text/html";
  if (fileName.endsWith(".csv")) return "text/csv";
  if (fileName.endsWith(".xml")) return "application/xml";
  return "text/plain";
}

function fileNameFromUrl(url: string): string {
  const parsed = new URL(url);
  const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
  return lastSegment || `${parsed.hostname}.txt`;
}

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageProvider,
    private readonly processFile: ProcessFileUseCase,
  ) {}

  async createRun(
    organizationId: string,
    sourceId: string,
    agentId?: string | null,
  ) {
    const source = await this.prisma.source.findFirst({
      where: { id: sourceId, organizationId },
    });
    if (!source) throw new NotFoundException("Source not found");
    if (!source.enabled) throw new BadRequestException("Source is disabled");

    const job = await this.prisma.downloadJob.create({
      data: {
        organizationId,
        sourceId,
        agentId: agentId ?? source.agentId,
        status: source.type === "url" ? "running" : "queued",
        startedAt: source.type === "url" ? new Date() : undefined,
      },
    });

    await this.log(organizationId, job.id, "info", "Collection job created");

    if (SERVER_RUN_TYPES.has(source.type)) {
      await this.runServerUrlJob(job.id);
      return this.getJob(organizationId, job.id);
    }

    return job;
  }

  async runServerUrlJob(jobId: string): Promise<void> {
    const startedAt = Date.now();
    const job = await this.prisma.downloadJob.findUniqueOrThrow({
      where: { id: jobId },
      include: { source: true },
    });
    const url = (job.source.configJson as { url?: string }).url;
    if (!url) throw new BadRequestException("Source URL is missing");

    try {
      await this.log(job.organizationId, job.id, "info", `Downloading ${url}`);
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`HTTP ${response.status} ${response.statusText}`);

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

      const previous = await this.prisma.fileAsset.findFirst({
        where: { organizationId: job.organizationId, sourceId: job.sourceId },
        orderBy: { createdAt: "desc" },
      });

      if (previous?.sha256 === sha256) {
        await this.prisma.downloadJob.update({
          where: { id: job.id },
          data: {
            status: "completed",
            finishedAt: new Date(),
            bytesDownloaded: BigInt(buffer.length),
            durationMs: Date.now() - startedAt,
          },
        });
        await this.log(
          job.organizationId,
          job.id,
          "info",
          "No change detected; latest file hash is unchanged",
        );
        return;
      }

      const originalName = fileNameFromUrl(url);
      const mimeType = inferMimeType(
        response.headers.get("content-type"),
        originalName,
      );
      const ext = originalName.includes(".")
        ? originalName.split(".").pop()
        : "bin";
      const storageKey = `${job.organizationId}/sources/${job.sourceId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      await this.storage.upload(storageKey, buffer, mimeType);
      const asset = await this.prisma.fileAsset.create({
        data: {
          organizationId: job.organizationId,
          sourceId: job.sourceId,
          jobId: job.id,
          originalName,
          storageKey,
          mimeType,
          sizeBytes: BigInt(buffer.length),
          sha256,
          status: "stored",
        },
      });

      await this.prisma.downloadJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          finishedAt: new Date(),
          bytesDownloaded: BigInt(buffer.length),
          durationMs: Date.now() - startedAt,
        },
      });
      await this.log(
        job.organizationId,
        job.id,
        "info",
        previous
          ? "Change detected; new version stored"
          : "First version stored",
      );

      setImmediate(() => this.processFile.execute(asset.id));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown collection error";
      this.logger.error(`Collection job ${job.id} failed`, error);
      await this.prisma.downloadJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          finishedAt: new Date(),
          errorMessage: message,
          durationMs: Date.now() - startedAt,
        },
      });
      await this.log(job.organizationId, job.id, "error", message);
    }
  }

  async completeAgentJob(
    organizationId: string,
    jobId: string,
    input: { originalName: string; mimeType: string; buffer: Buffer },
  ) {
    const job = await this.prisma.downloadJob.findFirst({
      where: { id: jobId, organizationId },
    });
    if (!job) throw new NotFoundException("Job not found");

    const sha256 = crypto
      .createHash("sha256")
      .update(input.buffer)
      .digest("hex");
    const previous = await this.prisma.fileAsset.findFirst({
      where: { organizationId, sourceId: job.sourceId },
      orderBy: { createdAt: "desc" },
    });

    let assetId: string | undefined;
    if (previous?.sha256 !== sha256) {
      const ext = input.originalName.includes(".")
        ? input.originalName.split(".").pop()
        : "bin";
      const storageKey = `${organizationId}/sources/${job.sourceId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      await this.storage.upload(storageKey, input.buffer, input.mimeType);
      const asset = await this.prisma.fileAsset.create({
        data: {
          organizationId,
          sourceId: job.sourceId,
          jobId: job.id,
          originalName: input.originalName,
          storageKey,
          mimeType: input.mimeType,
          sizeBytes: BigInt(input.buffer.length),
          sha256,
          status: "stored",
        },
      });
      assetId = asset.id;
      setImmediate(() => this.processFile.execute(asset.id));
    }

    await this.prisma.downloadJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        finishedAt: new Date(),
        bytesDownloaded: BigInt(input.buffer.length),
      },
    });
    await this.log(
      organizationId,
      job.id,
      "info",
      assetId
        ? "Agent uploaded a new version"
        : "Agent completed with no change",
    );
    return { completed: true, fileId: assetId ?? previous?.id ?? null };
  }

  async getJob(organizationId: string, jobId: string) {
    return this.prisma.downloadJob.findFirstOrThrow({
      where: { id: jobId, organizationId },
      include: {
        source: true,
        fileAsset: true,
        logs: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  async log(
    organizationId: string,
    jobId: string,
    level: string,
    message: string,
    metadataJson?: Prisma.InputJsonValue,
  ) {
    return this.prisma.jobLog.create({
      data: { organizationId, jobId, level, message, metadataJson },
    });
  }
}
