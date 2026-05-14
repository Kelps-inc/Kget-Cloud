import { ConflictException, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "@shared/infrastructure/database/prisma.service";
import { UseCase } from "@shared/application/use-case";

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export interface AuthOutput {
  access_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    organizationId: string;
  };
}

@Injectable()
export class RegisterUserUseCase implements UseCase<
  RegisterUserInput,
  AuthOutput
> {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async execute(input: RegisterUserInput): Promise<AuthOutput> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) throw new ConflictException("Email already registered");

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await this.prisma.$transaction(
      async (tx: typeof this.prisma) => {
        const org = await tx.organization.create({
          data: { name: `${input.name}'s Workspace` },
        });
        return tx.user.create({
          data: {
            organizationId: org.id,
            name: input.name,
            email: input.email,
            passwordHash,
            role: "owner",
          },
        });
      },
    );

    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }
}
