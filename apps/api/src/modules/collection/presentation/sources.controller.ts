import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@shared/presentation/http/guards/jwt-auth.guard";
import { CurrentUser } from "@shared/presentation/http/decorators/current-user.decorator";
import { AuthenticatedUser } from "@modules/identity/infrastructure/jwt.strategy";
import { PrismaService } from "@shared/infrastructure/database/prisma.service";
import { CollectionService } from "../application/collection.service";
import { CreateSourceDto, UpdateSourceDto } from "./sources.dto";

function serializeJob(job: any) {
  return {
    ...job,
    bytesDownloaded: job.bytesDownloaded?.toString() ?? null,
    fileAsset: job.fileAsset
      ? { ...job.fileAsset, sizeBytes: job.fileAsset.sizeBytes.toString() }
      : undefined,
  };
}

@ApiTags("sources")
@Controller("sources")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SourcesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collection: CollectionService,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateSourceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const sourceCount = await this.prisma.source.count({
      where: { organizationId: user.organizationId, enabled: true },
    });
    if (sourceCount >= 20)
      throw new BadRequestException(
        "Demo limit reached: disable a source before adding another one",
      );

    return this.prisma.source.create({
      data: {
        organizationId: user.organizationId,
        type: dto.type,
        name: dto.name,
        configJson: { url: dto.url },
        scheduleCron: dto.scheduleCron ?? null,
      },
    });
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const sources = await this.prisma.source.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        fileAssets: { orderBy: { createdAt: "desc" }, take: 1 },
        downloadJobs: { orderBy: { createdAt: "desc" }, take: 3 },
        _count: { select: { fileAssets: true, downloadJobs: true } },
      },
    });

    return sources.map((source) => ({
      ...source,
      latestFile: source.fileAssets[0]
        ? {
            ...source.fileAssets[0],
            sizeBytes: source.fileAssets[0].sizeBytes.toString(),
          }
        : null,
      recentJobs: source.downloadJobs.map(serializeJob),
      fileAssets: undefined,
      downloadJobs: undefined,
    }));
  }

  @Get("report")
  async report(@CurrentUser() user: AuthenticatedUser) {
    const [sources, jobs, files] = await Promise.all([
      this.prisma.source.findMany({
        where: { organizationId: user.organizationId },
      }),
      this.prisma.downloadJob.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          source: true,
          fileAsset: true,
          logs: { orderBy: { createdAt: "asc" } },
        },
      }),
      this.prisma.fileAsset.findMany({
        where: { organizationId: user.organizationId, sourceId: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { source: true, _count: { select: { documentChunks: true } } },
      }),
    ]);

    const completed = jobs.filter((job) => job.status === "completed").length;
    const failed = jobs.filter((job) => job.status === "failed").length;
    const changed = jobs.filter((job) => job.fileAsset).length;

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        monitoredSources: sources.length,
        enabledSources: sources.filter((source) => source.enabled).length,
        recentJobs: jobs.length,
        completedJobs: completed,
        failedJobs: failed,
        changesDetected: changed,
      },
      findings: jobs.slice(0, 8).map((job) => ({
        jobId: job.id,
        sourceId: job.sourceId,
        sourceName: job.source.name,
        status: job.status,
        changed: Boolean(job.fileAsset),
        evidenceFileId: job.fileAsset?.id ?? null,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        finishedAt: job.finishedAt,
        logs: job.logs.map((log) => ({
          level: log.level,
          message: log.message,
          createdAt: log.createdAt,
        })),
      })),
      latestEvidence: files.map((file) => ({
        id: file.id,
        sourceName: file.source?.name ?? "Unknown source",
        originalName: file.originalName,
        sha256: file.sha256,
        status: file.status,
        chunks: file._count.documentChunks,
        createdAt: file.createdAt,
      })),
    };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateSourceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.prisma.source.findFirstOrThrow({
      where: { id, organizationId: user.organizationId },
    });
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.scheduleCron !== undefined)
      data.scheduleCron = dto.scheduleCron || null;
    if (dto.url !== undefined) data.configJson = { url: dto.url };
    return this.prisma.source.update({ where: { id }, data });
  }

  @Post(":id/run")
  async run(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return serializeJob(
      await this.collection.createRun(user.organizationId, id),
    );
  }

  @Delete(":id")
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.prisma.source.findFirstOrThrow({
      where: { id, organizationId: user.organizationId },
    });
    await this.prisma.source.update({
      where: { id },
      data: { enabled: false },
    });
    return { deleted: false, disabled: true };
  }
}
