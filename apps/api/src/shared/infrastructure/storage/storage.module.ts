import { Global, Module } from "@nestjs/common";
import { LocalStorageProvider } from "./local-storage.provider";
import { STORAGE_PROVIDER } from "./storage-provider.interface";

@Global()
@Module({
  providers: [
    { provide: STORAGE_PROVIDER, useClass: LocalStorageProvider },
    LocalStorageProvider,
  ],
  exports: [STORAGE_PROVIDER, LocalStorageProvider],
})
export class StorageModule {}
