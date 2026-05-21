import { ApiProperty } from "@nestjs/swagger";

export class FileAssetResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() originalName: string;
  @ApiProperty() mimeType: string;
  @ApiProperty() sizeBytes: string;
  @ApiProperty() sha256: string;
  @ApiProperty({ enum: ["stored", "processing", "indexed", "error"] })
  status: string;
  @ApiProperty({ required: false, nullable: true })
  processingError?: string | null;
  @ApiProperty() createdAt: Date;
}
