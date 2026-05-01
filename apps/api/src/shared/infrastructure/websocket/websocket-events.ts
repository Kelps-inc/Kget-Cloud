export const WS_EVENTS = {
  JOB_STARTED: 'job.started',
  JOB_PROGRESS: 'job.progress',
  JOB_COMPLETED: 'job.completed',
  JOB_FAILED: 'job.failed',
  FILE_STORED: 'file.stored',
  FILE_EXTRACTING: 'file.extracting',
  FILE_INDEXED: 'file.indexed',
  FILE_FAILED: 'file.failed',
  AGENT_ONLINE: 'agent.online',
  AGENT_OFFLINE: 'agent.offline',
} as const;
