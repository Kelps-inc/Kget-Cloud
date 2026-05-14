import { Entity } from "@shared/domain/entity";

export interface OrganizationProps {
  name: string;
  plan: string;
  createdAt: Date;
}

export class OrganizationEntity extends Entity<OrganizationProps> {
  get name() {
    return this.props.name;
  }
  get plan() {
    return this.props.plan;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
