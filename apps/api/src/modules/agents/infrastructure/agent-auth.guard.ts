import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/database/prisma.service";
import * as crypto from "crypto";

export interface AuthenticatedAgent {
  id: string;
  organizationId: string;
  name: string;
}

@Injectable()
export class AgentAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{
        headers: Record<string, string>;
        agent?: AuthenticatedAgent;
      }>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;

    if (!token) throw new UnauthorizedException("Agent token required");

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const agent = await this.prisma.agent.findUnique({ where: { tokenHash } });
    if (!agent) throw new UnauthorizedException("Invalid agent token");

    request.agent = {
      id: agent.id,
      organizationId: agent.organizationId,
      name: agent.name,
    };
    return true;
  }
}
