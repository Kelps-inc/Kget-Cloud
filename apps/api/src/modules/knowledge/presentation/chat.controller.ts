import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@shared/presentation/http/guards/jwt-auth.guard";
import { CurrentUser } from "@shared/presentation/http/decorators/current-user.decorator";
import { AuthenticatedUser } from "@modules/identity/infrastructure/jwt.strategy";
import { PrismaService } from "@shared/infrastructure/database/prisma.service";
import { RagChatUseCase } from "../application/rag-chat.use-case";
import { CreateMessageDto } from "./chat.dto";

@ApiTags("chat")
@Controller("chat")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(
    private readonly ragChat: RagChatUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Post("sessions")
  async createSession(@CurrentUser() user: AuthenticatedUser) {
    const session = await this.prisma.chatSession.create({
      data: { organizationId: user.organizationId, title: "New Chat" },
    });
    return session;
  }

  @Get("sessions")
  async listSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.chatSession.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });
  }

  @Get("sessions/:id")
  async getSession(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const session = await this.prisma.chatSession.findFirstOrThrow({
      where: { id, organizationId: user.organizationId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    return session;
  }

  @Post("sessions/:id/messages")
  async sendMessage(
    @Param("id") sessionId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Verify session belongs to org
    await this.prisma.chatSession.findFirstOrThrow({
      where: { id: sessionId, organizationId: user.organizationId },
    });
    return this.ragChat.execute({
      sessionId,
      organizationId: user.organizationId,
      content: dto.content,
    });
  }
}
