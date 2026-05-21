import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
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
import { CreateAgentDto, UpdateAgentDto } from "./agents.dto";
import * as crypto from "crypto";

const DEFAULT_AGENT_OFFLINE_AFTER_MS = 90_000;

function agentOfflineAfterMs() {
  return Number(
    process.env.AGENT_OFFLINE_AFTER_MS ?? DEFAULT_AGENT_OFFLINE_AFTER_MS,
  );
}

function serializeAgent(agent: any) {
  const { tokenHash: _tokenHash, ...safeAgent } = agent;
  return {
    ...safeAgent,
    maxFileBytes: agent.maxFileBytes?.toString() ?? null,
    downloadJobs: agent.downloadJobs?.map((j: any) => ({
      ...j,
      bytesDownloaded: j.bytesDownloaded?.toString() ?? null,
    })),
  };
}

@ApiTags("agents")
@Controller("agents")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(
    @Body() dto: CreateAgentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const token = `kga_${crypto.randomBytes(32).toString("hex")}`;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const agent = await this.prisma.agent.create({
      data: { organizationId: user.organizationId, name: dto.name, tokenHash },
    });
    return serializeAgent({ ...agent, token });
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    await this.prisma.agent.updateMany({
      where: {
        organizationId: user.organizationId,
        status: "online",
        lastSeenAt: { lt: new Date(Date.now() - agentOfflineAfterMs()) },
      },
      data: { status: "offline" },
    });

    const agents = await this.prisma.agent.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        lastSeenAt: true,
        version: true,
        machineName: true,
        os: true,
        createdAt: true,
        maxFileBytes: true,
        allowLocalFiles: true,
        allowedLocalRoots: true,
        _count: { select: { downloadJobs: true, sources: true } },
      },
    });

    return agents.map(serializeAgent);
  }

  @Get(":id")
  async getOne(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const agent = await this.prisma.agent.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        downloadJobs: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { source: { select: { id: true, name: true } } },
        },
        sources: {
          select: { id: true, name: true, type: true, enabled: true },
        },
        _count: { select: { downloadJobs: true, sources: true } },
      },
    });

    if (!agent) throw new NotFoundException("Agent not found");
    return serializeAgent(agent);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateAgentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.prisma.agent.findFirstOrThrow({
      where: { id, organizationId: user.organizationId },
    });

    const agent = await this.prisma.agent.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.maxFileBytes !== undefined && {
          maxFileBytes: BigInt(dto.maxFileBytes),
        }),
        ...(dto.allowLocalFiles !== undefined && {
          allowLocalFiles: dto.allowLocalFiles,
        }),
        ...(dto.allowedLocalRoots !== undefined && {
          allowedLocalRoots: dto.allowedLocalRoots,
        }),
      },
    });

    return serializeAgent(agent);
  }

  @Delete(":id")
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.prisma.agent.findFirstOrThrow({
      where: { id, organizationId: user.organizationId },
    });

    await this.prisma.agent.delete({ where: { id } });
    return { deleted: true };
  }
}
