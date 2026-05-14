import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "@shared/infrastructure/database/prisma.service";
import { UseCase } from "@shared/application/use-case";
import { AuthOutput } from "./register-user.use-case";

export interface LoginUserInput {
  email: string;
  password: string;
}

@Injectable()
export class LoginUserUseCase implements UseCase<LoginUserInput, AuthOutput> {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async execute(input: LoginUserInput): Promise<AuthOutput> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

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
