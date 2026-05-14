import { Module } from "@nestjs/common";
import { OrganizationsController } from "./presentation/organizations.controller";

@Module({
  controllers: [OrganizationsController],
})
export class OrganizationsModule {}
