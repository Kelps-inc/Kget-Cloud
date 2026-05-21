import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { RegisterUserUseCase } from "./application/register-user.use-case";
import { LoginUserUseCase } from "./application/login-user.use-case";
import { JwtStrategy } from "./infrastructure/jwt.strategy";
import { AuthController } from "./presentation/auth.controller";

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be configured in production");
  }
  return secret ?? "change-me-in-development";
}

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtSecret(),
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as never },
    }),
  ],
  providers: [RegisterUserUseCase, LoginUserUseCase, JwtStrategy],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class IdentityModule {}
