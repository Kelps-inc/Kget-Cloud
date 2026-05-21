import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "@shared/infrastructure/database/prisma.service";
import { CollectionService } from "@modules/collection/application/collection.service";
import { AgentAuthGuard } from "../infrastructure/agent-auth.guard";
import { CurrentAgent } from "./current-agent.decorator";
import { AuthenticatedAgent } from "../infrastructure/agent-auth.guard";
import {
  CompleteJobDto,
  FailJobDto,
  HeartbeatDto,
  JobLogDto,
} from "./agents.dto";

function serializeJob(job: any) {
  return { ...job, bytesDownloaded: job.bytesDownloaded?.toString() ?? null };
}

@ApiTags("agent-runtime")
@Controller("agent")
@UseGuards(AgentAuthGuard)
@ApiBearerAuth()
export class AgentRuntimeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collection: CollectionService,
  ) {}

  @Post("heartbeat")
  async heartbeat(
    @Body() dto: HeartbeatDto,
    @CurrentAgent() agent: AuthenticatedAgent,
  ) {
    return this.prisma.agent.update({
      where: { id: agent.id },
      data: {
        status: "online",
        lastSeenAt: new Date(),
        version: dto.version,
        machineName: dto.machineName,
        os: dto.os,
      },
      select: { id: true, status: true, lastSeenAt: true },
    });
  }

  @Get("jobs/pending")
  async pending(@CurrentAgent() agent: AuthenticatedAgent) {
    const jobs = await this.prisma.downloadJob.findMany({
      where: {
        organizationId: agent.organizationId,
        status: "queued",
        OR: [{ agentId: agent.id }, { agentId: null }],
        source: { is: { type: { not: "url" }, enabled: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
      include: { source: true },
    });

    return jobs.map(serializeJob);
  }

  @Post("jobs/:id/claim")
  async claim(
    @Param("id") id: string,
    @CurrentAgent() agent: AuthenticatedAgent,
  ) {
    await this.prisma.downloadJob.findFirstOrThrow({
      where: {
        id,
        organizationId: agent.organizationId,
        status: "queued",
        OR: [{ agentId: agent.id }, { agentId: null }],
      },
    });
    const job = await this.prisma.downloadJob.update({
      where: { id },
      data: { status: "running", agentId: agent.id, startedAt: new Date() },
      include: { source: true },
    });
    await this.collection.log(
      agent.organizationId,
      id,
      "info",
      `Claimed by ${agent.name}`,
    );
    return serializeJob(job);
  }

  @Post("jobs/:id/progress")
  async progress(
    @Param("id") id: string,
    @Body() body: { progress?: number },
    @CurrentAgent() agent: AuthenticatedAgent,
  ) {
    await this.prisma.downloadJob.findFirstOrThrow({
      where: { id, organizationId: agent.organizationId },
    });
    await this.collection.log(
      agent.organizationId,
      id,
      "info",
      `Progress ${Math.round(body.progress ?? 0)}%`,
      {
        progress: body.progress ?? 0,
      },
    );
    return { ok: true };
  }

  @Post("jobs/:id/logs")
  async logs(
    @Param("id") id: string,
    @Body() dto: JobLogDto,
    @CurrentAgent() agent: AuthenticatedAgent,
  ) {
    await this.prisma.downloadJob.findFirstOrThrow({
      where: { id, organizationId: agent.organizationId },
    });
    await this.collection.log(agent.organizationId, id, dto.level, dto.message);
    return { ok: true };
  }

  @Post("jobs/:id/complete")
  async complete(
    @Param("id") id: string,
    @Body() dto: CompleteJobDto,
    @CurrentAgent() agent: AuthenticatedAgent,
  ) {
    return this.collection.completeAgentJob(agent.organizationId, id, {
      originalName: dto.originalName,
      mimeType: dto.mimeType,
      buffer: Buffer.from(dto.base64, "base64"),
      sha256: dto.sha256,
      sizeBytes: dto.sizeBytes,
    });
  }

  @Post("jobs/:id/fail")
  async fail(
    @Param("id") id: string,
    @Body() dto: FailJobDto,
    @CurrentAgent() agent: AuthenticatedAgent,
  ) {
    await this.prisma.downloadJob.findFirstOrThrow({
      where: { id, organizationId: agent.organizationId },
    });
    await this.prisma.downloadJob.update({
      where: { id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: dto.errorMessage,
      },
    });
    await this.collection.log(
      agent.organizationId,
      id,
      "error",
      dto.errorMessage,
    );
    return { failed: true };
  }
}
