import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RegisterUserUseCase } from "../application/register-user.use-case";
import { LoginUserUseCase } from "../application/login-user.use-case";
import { RegisterDto, LoginDto } from "./auth.dto";
import { JwtAuthGuard } from "@shared/presentation/http/guards/jwt-auth.guard";
import { CurrentUser } from "@shared/presentation/http/decorators/current-user.decorator";
import { AuthenticatedUser } from "../infrastructure/jwt.strategy";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
  ) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.registerUser.execute(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.loginUser.execute(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
