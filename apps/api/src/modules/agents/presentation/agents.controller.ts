import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@shared/presentation/http/guards/jwt-auth.guard";
import { CurrentUser } from "@shared/presentation/http/decorators/current-user.decorator";
import { AuthenticatedUser } from "@modules/identity/infrastructure/jwt.strategy";
import { PrismaService } from "@shared/infrastructure/database/prisma.service";
import { CreateAgentDto } from "./agents.dto";
import * as crypto from "crypto";

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
    return { ...agent, token };
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.agent.findMany({
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
      },
    });
  }
}
