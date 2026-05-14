import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedAgent } from "../infrastructure/agent-auth.guard";

export const CurrentAgent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedAgent => {
    return ctx.switchToHttp().getRequest<{ agent: AuthenticatedAgent }>().agent;
  },
);
