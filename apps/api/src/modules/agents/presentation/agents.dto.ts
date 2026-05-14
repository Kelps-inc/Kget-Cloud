import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CreateAgentDto {
  @ApiProperty({ example: "Office collector" })
  @IsString()
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
}

export class FailJobDto {
  @ApiProperty({ example: "Download timed out" })
  @IsString()
  errorMessage: string;
}

export class JobLogDto {
  @ApiProperty({ example: "info" })
  @IsString()
  level: string;

  @ApiProperty({ example: "Started download" })
  @IsString()
  message: string;
}
