import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@shared/presentation/http/guards/jwt-auth.guard";
import { CurrentUser } from "@shared/presentation/http/decorators/current-user.decorator";
import { AuthenticatedUser } from "@modules/identity/infrastructure/jwt.strategy";
import { PrismaService } from "@shared/infrastructure/database/prisma.service";
import { UploadFileUseCase } from "../application/upload-file.use-case";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/html",
  "text/plain",
  "text/csv",
  "application/xml",
  "text/xml",
]);

function inferMimeType(originalName: string, reportedMimeType: string) {
  if (ALLOWED_MIME_TYPES.has(reportedMimeType)) return reportedMimeType;
  const lowerName = originalName.toLowerCase();
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".html") || lowerName.endsWith(".htm"))
    return "text/html";
  if (lowerName.endsWith(".csv")) return "text/csv";
  if (lowerName.endsWith(".xml")) return "application/xml";
  if (lowerName.endsWith(".txt") || lowerName.endsWith(".md"))
    return "text/plain";
  return "text/plain";
}

@ApiTags("files")
@Controller("files")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(
    private readonly uploadFile: UploadFileUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Post("upload")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new Error("No file provided");
    const mimeType = inferMimeType(file.originalname, file.mimetype);
    return this.uploadFile.execute({
      organizationId: user.organizationId,
      originalName: file.originalname,
      mimeType,
      buffer: file.buffer,
    });
  }

  @Get()
  async listFiles(@CurrentUser() user: AuthenticatedUser) {
    const files = await this.prisma.fileAsset.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        status: true,
        processingError: true,
        createdAt: true,
        _count: { select: { documentChunks: true } },
      },
    });
    return files.map((f: (typeof files)[number]) => ({
      ...f,
      sizeBytes: f.sizeBytes.toString(),
      chunkCount: f._count.documentChunks,
    }));
  }

  @Get(":id")
  async getFile(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const file = await this.prisma.fileAsset.findFirstOrThrow({
      where: { id, organizationId: user.organizationId },
      include: { _count: { select: { documentChunks: true } } },
    });
    return {
      ...file,
      sizeBytes: file.sizeBytes.toString(),
      chunkCount: file._count.documentChunks,
    };
  }

  @Delete(":id")
  async deleteFile(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.prisma.fileAsset.findFirstOrThrow({
      where: { id, organizationId: user.organizationId },
    });
    await this.prisma.fileAsset.delete({ where: { id } });
    return { deleted: true };
  }
}
