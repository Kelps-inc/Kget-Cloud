/**
 * Test factories — create realistic domain objects for unit tests
 * without hitting the database.
 */

export function makeOrganization(overrides = {}) {
  return {
    id: 'org_test_' + Math.random().toString(36).slice(2),
    name: 'Test Org',
    plan: 'starter',
    createdAt: new Date(),
    ...overrides,
  };
}

export function makeUser(organizationId: string, overrides = {}) {
  return {
    id: 'usr_test_' + Math.random().toString(36).slice(2),
    organizationId,
    name: 'Test User',
    email: `test_${Date.now()}@example.com`,
    passwordHash: '$2a$10$hashedpassword',
    role: 'owner',
    createdAt: new Date(),
    ...overrides,
  };
}

export function makeSource(organizationId: string, overrides = {}) {
  return {
    id: 'src_test_' + Math.random().toString(36).slice(2),
    organizationId,
    agentId: null,
    type: 'url',
    name: 'Test Source',
    configJson: { url: 'https://example.com/file.pdf' },
    scheduleCron: null,
    enabled: true,
    createdAt: new Date(),
    ...overrides,
  };
}

export function makeDownloadJob(organizationId: string, sourceId: string, overrides = {}) {
  return {
    id: 'job_test_' + Math.random().toString(36).slice(2),
    organizationId,
    sourceId,
    agentId: null,
    status: 'queued',
    startedAt: null,
    finishedAt: null,
    errorMessage: null,
    bytesDownloaded: null,
    durationMs: null,
    createdAt: new Date(),
    ...overrides,
  };
}

export function makeFileAsset(organizationId: string, overrides = {}) {
  return {
    id: 'file_test_' + Math.random().toString(36).slice(2),
    organizationId,
    sourceId: null,
    jobId: null,
    originalName: 'document.pdf',
    storageKey: `uploads/${organizationId}/document.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: BigInt(1024 * 100),
    sha256: 'abc123def456',
    status: 'stored',
    extractedTextPath: null,
    createdAt: new Date(),
    ...overrides,
  };
}
