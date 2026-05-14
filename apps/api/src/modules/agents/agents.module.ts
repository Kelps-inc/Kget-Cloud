import { Module } from "@nestjs/common";
import { CollectionModule } from "@modules/collection/collection.module";
import { AgentsController } from "./presentation/agents.controller";
import { AgentRuntimeController } from "./presentation/agent-runtime.controller";
import { AgentAuthGuard } from "./infrastructure/agent-auth.guard";

@Module({
  imports: [CollectionModule],
  providers: [AgentAuthGuard],
  controllers: [AgentsController, AgentRuntimeController],
})
export class AgentsModule {}
