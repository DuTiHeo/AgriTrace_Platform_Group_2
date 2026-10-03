import { getPersonnelByTeam } from "./personnelService";
import { plotService } from "./plotService";
import { getTeamById } from "./teamService";
import { httpClient } from "./httpClient";
import type { CreateTaskInput, Task } from "../types/task";

type TaskDto = {
  task_id: string;
  team_id: string;
  team_name?: string | null;
  worker_id: string;
  worker_name?: string | null;
  worker_phone?: string | null;
  plot_id: string;
  plot_code?: string | null;
  org_id: string | null;
  content: string;
  start_at: string | null;
  due_at: string | null;
  status: Task["status"];
  created_at: string | null;
  updated_at: string | null;
};

function mapTask(dto: TaskDto): Task {
  const createdAt = dto.created_at ?? "";
  return {
    id: dto.task_id,
    farmId: dto.org_id ?? "",
    seasonId: null,
    plotId: dto.plot_id,
    teamId: dto.team_id,
    assigneeId: dto.worker_id,
    assigneeName: dto.worker_name ?? "",
    assigneeRole: null,
    assignedById: "",
    assignedByName: "Chưa ghi nhận",
    assignedByRole: null,
    content: dto.content,
    startAt: dto.start_at ?? "",
    dueAt: dto.due_at ?? "",
    status: dto.status,
    submittedAt: null,
    confirmedAt: null,
    confirmedById: null,
    createdAt,
    updatedAt: dto.updated_at ?? createdAt,
  };
}

function toApiDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Thời gian nhiệm vụ không hợp lệ.");
  return date.toISOString();
}

export const taskService = {
  async getAll(farmId?: string): Promise<Task[]> {
    const params = new URLSearchParams({ include_cancelled: "true" });
    if (farmId && farmId !== "all") params.set("org_id", farmId);
    const tasks = await httpClient.get<TaskDto[]>(`/tasks?${params}`);
    return tasks.map(mapTask);
  },

  async getById(id: string): Promise<Task> {
    const task = await httpClient.get<TaskDto>(`/tasks/${id}`);
    return mapTask(task);
  },

  async create(input: CreateTaskInput): Promise<Task> {
    const plotId = input.plotId;
    const [plot, team, members] = await Promise.all([
      plotService.getById(plotId), getTeamById(input.teamId), getPersonnelByTeam(input.teamId),
    ]);
    if (!plot || plot.farmId !== input.farmId || plot.status !== "active") throw new Error("Vùng trồng không hoạt động trong nông trại đã chọn.");
    if (!team || team.farmId !== input.farmId) throw new Error("Tổ không thuộc nông trại đã chọn.");
    const assignee = members.find((person) =>
      person.id === input.assigneeId
      && person.status === "active"
      && (person.role === "worker" || person.role === "leader"),
    );
    if (!assignee) throw new Error("Người nhận không còn hoạt động trong tổ.");
    if (!input.content.trim()) throw new Error("Vui lòng nhập nội dung công việc.");

    const created = await httpClient.post<TaskDto>("/tasks", {
      team_id: input.teamId,
      worker_id: input.assigneeId,
      plot_id: plotId,
      content: input.content.trim(),
      start_at: toApiDateTime(input.startAt),
      due_at: toApiDateTime(input.dueAt),
    });
    window.dispatchEvent(new Event("tasks-updated"));
    return mapTask(created);
  },

  async update(id: string, input: Partial<CreateTaskInput>): Promise<Task> {
    const payload: Record<string, unknown> = {};
    if (input.teamId !== undefined) payload.team_id = input.teamId;
    if (input.assigneeId !== undefined) payload.worker_id = input.assigneeId;
    if (input.plotId !== undefined) payload.plot_id = input.plotId;
    if (input.content !== undefined) payload.content = input.content.trim();
    if (input.startAt !== undefined) payload.start_at = toApiDateTime(input.startAt);
    if (input.dueAt !== undefined) payload.due_at = toApiDateTime(input.dueAt);
    const updated = await httpClient.patch<TaskDto>(`/tasks/${id}`, payload);
    window.dispatchEvent(new Event("tasks-updated"));
    return mapTask(updated);
  },

  async submitCompletion(taskId: string, _actorId: string): Promise<Task> {
    void _actorId;
    await httpClient.patch(`/tasks/${taskId}/status`, { status: "completed" });
    window.dispatchEvent(new Event("tasks-updated"));
    return this.getById(taskId);
  },

  async cancel(taskId: string, _actorId: string): Promise<Task> {
    void _actorId;
    const task = await httpClient.delete<TaskDto>(`/tasks/${taskId}`);
    window.dispatchEvent(new Event("tasks-updated"));
    return mapTask(task);
  },
};
