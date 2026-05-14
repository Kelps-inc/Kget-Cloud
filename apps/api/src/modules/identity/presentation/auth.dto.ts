import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "Davi Moreira" })
  @IsString()
  name: string;

  @ApiProperty({ example: "davi@empresa.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "senha123", minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: "davi@empresa.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "senha123" })
  @IsString()
  password: string;
}
