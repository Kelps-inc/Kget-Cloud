import { Injectable } from "@nestjs/common";
import { StorageProvider } from "./storage-provider.interface";
import * as fs from "fs/promises";
import * as path from "path";

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly baseDir = process.env.STORAGE_LOCAL_DIR ?? "./uploads";

  async upload(
    key: string,
    buffer: Buffer,
    _mimeType: string,
  ): Promise<string> {
    const fullPath = path.join(this.baseDir, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return key;
  }

  async getUrl(key: string): Promise<string> {
    return `/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.baseDir, key);
    await fs.unlink(fullPath).catch(() => undefined);
  }

  async readBuffer(key: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, key);
    return fs.readFile(fullPath);
  }
}
