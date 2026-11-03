export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "incomplete";

export type TaskAssigneeRole = "leader" | "worker";

export type TaskActorRole = "owner" | "leader" | "admin";

export type Task = {
  id: string;
  farmId: string;
  seasonId: string | null;
  plotId: string;
  teamId: string;
  assigneeId: string;
  assigneeName: string;
  assigneeRole: TaskAssigneeRole | null;
  assignedById: string;
  assignedByName: string;
  assignedByRole: TaskActorRole | null;
  content: string;
  instructions?: string;
  tools?: string;
  assignmentId?: string;
  startAt: string;
  dueAt: string;
  status: TaskStatus;
  submittedAt: string | null;
  confirmedAt: string | null;
  confirmedById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskInput = {
  farmId: string;
  plotId: string;
  teamId: string;
  assigneeId: string;
  content: string;
  startAt: string;
  dueAt: string;
};

export type TaskGroup = Task & { members: Task[] };
export function assignmentStatus(tasks: Task[]): TaskStatus {
  const active = tasks.filter(task => task.status !== 'cancelled');
  if (!active.length) return 'cancelled';
  if (active.some(task => task.status === 'completed')) return 'completed';
  if (active.some(task => task.status === 'incomplete')) return 'incomplete';
  if (active.some(task => task.status === 'in_progress' || task.status === 'completed')) return 'in_progress';
  return 'pending';
}
export function groupTaskAssignments(tasks: Task[]): TaskGroup[] {
  const groups = new Map<string, TaskGroup>();
  for (const task of tasks) {
    const key = task.assignmentId ? JSON.stringify([task.assignmentId, task.farmId, task.plotId, task.teamId, task.content, task.instructions, task.tools, task.startAt, task.dueAt]) : task.id;
    const existing = groups.get(key);
    if (existing) {
      existing.members.push(task);
      existing.status = assignmentStatus(existing.members);
    } else groups.set(key, { ...task, members: [task] });
  }
  return [...groups.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
