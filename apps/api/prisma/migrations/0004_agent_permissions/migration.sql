ALTER TABLE "agents"
  ADD COLUMN "max_file_bytes"      BIGINT   NOT NULL DEFAULT 52428800,
  ADD COLUMN "allow_local_files"   BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN "allowed_local_roots" TEXT[]   NOT NULL DEFAULT '{}';
