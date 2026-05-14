import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { RegisterUserUseCase } from "./application/register-user.use-case";
import { LoginUserUseCase } from "./application/login-user.use-case";
import { JwtStrategy } from "./infrastructure/jwt.strategy";
import { AuthController } from "./presentation/auth.controller";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "change-me-in-production",
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
    }),
  ],
  providers: [RegisterUserUseCase, LoginUserUseCase, JwtStrategy],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class IdentityModule {}
