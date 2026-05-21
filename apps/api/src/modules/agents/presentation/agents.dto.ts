import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateAgentDto {
  @ApiProperty({ example: "Office collector" })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;
}

export class HeartbeatDto {
  @ApiPropertyOptional({ example: "0.1.0" })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ example: "Davi-MacBook-Pro" })
  @IsOptional()
  @IsString()
  machineName?: string;

  @ApiPropertyOptional({ example: "macOS" })
  @IsOptional()
  @IsString()
  os?: string;
}

export class CompleteJobDto {
  @ApiProperty({ example: "manual.pdf" })
  @IsString()
  originalName: string;

  @ApiProperty({ example: "application/pdf" })
  @IsString()
  mimeType: string;

  @ApiProperty({ example: "base64-file-content" })
  @IsString()
  base64: string;

  @ApiPropertyOptional({
    example: "f2ca1bb6c7e907d06dafe4687e579fce...",
  })
  @IsOptional()
  @IsString()
  sha256?: string;

  @ApiPropertyOptional({ example: 1048576 })
  @IsOptional()
  @IsNumber()
  sizeBytes?: number;
}

export class FailJobDto {
  @ApiProperty({ example: "Download timed out" })
  @IsString()
  errorMessage: string;
}

export class UpdateAgentDto {
  @ApiPropertyOptional({ example: "Office collector" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 52428800 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1024 * 1024 * 1024)
  maxFileBytes?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  allowLocalFiles?: boolean;

  @ApiPropertyOptional({ example: ["/home/user/docs"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedLocalRoots?: string[];
}

export class JobLogDto {
  @ApiProperty({ example: "info" })
  @IsString()
  level: string;

  @ApiProperty({ example: "Started download" })
  @IsString()
  message: string;
}
