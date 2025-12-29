export interface ActiveTask {
  taskId: string;
  title: string;
  branch?: string;
  frameworkPath: string;
  startedAt: string;
  sessionId?: string;
}

export interface CockpitEvent {
  id: string;
  taskId: string;
  taskIdSource: 'active-task-file' | 'git-branch' | 'session-fallback';
  tool: 'Edit' | 'Write' | 'TodoWrite';
  input: Record<string, unknown>;
  response?: string;
  sessionId: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  events: CockpitEvent[];
}
