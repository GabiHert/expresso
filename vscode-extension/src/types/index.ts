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

export interface CockpitEvent {
  id: string;
  taskId: string;
  taskIdSource: 'env-var' | 'git-branch' | 'session-fallback';
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

// Expresso tag types
export * from './expresso';
