import { Entity } from "@shared/domain/entity";

export type FileStatus = "stored" | "processing" | "indexed" | "error";

export interface FileAssetProps {
  organizationId: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: bigint;
  sha256: string;
  status: FileStatus;
  extractedTextPath: string | null;
  createdAt: Date;
}

export class FileAssetEntity extends Entity<FileAssetProps> {
  get organizationId() {
    return this.props.organizationId;
  }
  get originalName() {
    return this.props.originalName;
  }
  get storageKey() {
    return this.props.storageKey;
  }
  get mimeType() {
    return this.props.mimeType;
  }
  get sizeBytes() {
    return this.props.sizeBytes;
  }
  get sha256() {
    return this.props.sha256;
  }
  get status() {
    return this.props.status;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
