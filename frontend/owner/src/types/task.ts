export type TaskStatus =
  | "in_progress"
  | "completed"
  | "cancelled";

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