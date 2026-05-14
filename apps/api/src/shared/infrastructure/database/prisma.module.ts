import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { HealthController } from "../health/health.controller";

@Global()
@Module({
  providers: [PrismaService],
  controllers: [HealthController],
  exports: [PrismaService],
})
export class PrismaModule {}
