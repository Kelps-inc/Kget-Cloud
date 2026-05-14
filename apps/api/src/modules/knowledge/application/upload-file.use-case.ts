import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/database/prisma.service";
import { LocalStorageProvider } from "@shared/infrastructure/storage/local-storage.provider";
import { ProcessFileUseCase } from "./process-file.use-case";
import * as crypto from "crypto";

export interface UploadFileInput {
  organizationId: string;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

@Injectable()
export class UploadFileUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageProvider,
    private readonly processFile: ProcessFileUseCase,
  ) {}

  async execute(input: UploadFileInput) {
    const sha256 = crypto
      .createHash("sha256")
      .update(input.buffer)
      .digest("hex");
    const ext = input.originalName.split(".").pop() ?? "bin";
    const storageKey = `${input.organizationId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    await this.storage.upload(storageKey, input.buffer, input.mimeType);

    const asset = await this.prisma.fileAsset.create({
      data: {
        organizationId: input.organizationId,
        originalName: input.originalName,
        storageKey,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.buffer.length),
        sha256,
        status: "stored",
      },
    });

    // Fire-and-forget: process in background so the upload response is immediate
    setImmediate(() => this.processFile.execute(asset.id));

    return {
      id: asset.id,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes.toString(),
      sha256: asset.sha256,
      status: asset.status,
      createdAt: asset.createdAt,
    };
  }
}
