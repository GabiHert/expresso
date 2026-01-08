export const UNASSIGNED_TASK_ID = '_unassigned';

// Task color types for visual differentiation
export type TaskColor =
  | 'charts.red'
  | 'charts.orange'
  | 'charts.yellow'
  | 'charts.green'
  | 'charts.blue'
  | 'charts.purple';

export const TASK_COLORS: TaskColor[] = [
  'charts.red',
  'charts.orange',
  'charts.yellow',
  'charts.green',
  'charts.blue',
  'charts.purple',
];

/**
 * Type guard to validate if a value is a valid TaskColor
 */
export function isValidTaskColor(value: unknown): value is TaskColor {
  return typeof value === 'string' && TASK_COLORS.includes(value as TaskColor);
}

export function isUnassignedSession(session: CockpitSession): boolean {
  return session.taskId === UNASSIGNED_TASK_ID;
}

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
  taskIdSource: 'env-var' | 'active-task-file' | 'git-branch' | 'session-fallback';
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
  color?: TaskColor;
}

export interface CockpitSession {
  id: string;
  taskId: string;
  label: string;
  createdAt: string;
  lastActive: string;
  status: 'active' | 'closed';
  terminalName: string;
  terminalId?: string;
}

export interface SessionRegistry {
  sessions: CockpitSession[];
}

export interface TaskSwitchSignal {
  timestamp: string;
  previousTaskId: string;
  newTaskId: string;
  type: 'task-switch';
}
