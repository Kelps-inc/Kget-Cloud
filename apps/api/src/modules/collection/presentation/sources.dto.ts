import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, IsUrl } from "class-validator";

export class CreateSourceDto {
  @ApiProperty({ example: "Receita Federal XML feed" })
  @IsString()
  name: string;

  @ApiProperty({ enum: ["url", "agent_url", "local_folder"], example: "url" })
  @IsIn(["url", "agent_url", "local_folder"])
  type: "url" | "agent_url" | "local_folder";

  @ApiProperty({ example: "https://example.com/report.pdf" })
  @IsUrl({ require_tld: false })
  url: string;

  @ApiPropertyOptional({ example: "0 8 * * *" })
  @IsOptional()
  @IsString()
  scheduleCron?: string;
}

export class UpdateSourceDto {
  @ApiPropertyOptional({ example: "Updated source name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "https://example.com/report.pdf" })
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @ApiPropertyOptional({ example: "0 8 * * *" })
  @IsOptional()
  @IsString()
  scheduleCron?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
