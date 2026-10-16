import type { CreateSeasonInput, CropVariety, Season, SeasonStatus, SeasonTeamAssignment, UpdateSeasonInput } from "../types/season";
import { httpClient } from "./httpClient";

export function calculateExpectedHarvestDate(
  sowingDate: string,
  growthDays: number,
) {
  if (!sowingDate || growthDays <= 0) {
    return "";
  }

  const date = new Date(`${sowingDate}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setDate(date.getDate() + growthDays);

  return date.toISOString().slice(0, 10);
}

function validateDates(
  sowingDate: string,
  expectedHarvestDate: string,
) {
  if (!sowingDate || !expectedHarvestDate) {
    throw new Error(
      "Vui lòng nhập đầy đủ ngày gieo và ngày thu hoạch dự kiến.",
    );
  }

  if (expectedHarvestDate <= sowingDate) {
    throw new Error(
      "Ngày thu hoạch dự kiến phải sau ngày gieo trồng.",
    );
  }
}

type CropDto = {
  crop_id: string;
  name: string;
  growth_days: number;
  planting_guide?: string | null;
};

type SeasonDto = {
  season_id: string;
  plot_id: string;
  plot_code: string;
  crop_id: string;
  crop_name: string;
  planting_date: string;
  expected_harvest_date: string | null;
  actual_harvest_date: string | null;
  status: string;
  org_id: string;
  assigned_team_names?: string[];
  teams?: Array<{
    team_id: string;
    team_name: string;
    start_date: string | null;
    end_date: string | null;
  }>;
  tasks_count?: number;
  farming_logs_count?: number;
  harvest_batches_count?: number;
  planting_guide?: string | null;
  reminders?: Season["reminders"];
  created_at: string | null;
  updated_at?: string | null;
};

function mapSeasonStatus(status: string): SeasonStatus {
  if (status === "ready_to_harvest") return "ready";
  if (status === "completed") return "completed";
  return "active";
}

function toApiSeasonStatus(status: SeasonStatus) {
  if (status === "active") return "growing";
  if (status === "ready") return "ready_to_harvest";
  if (status === "completed") return "completed";
  throw new Error(`Backend không hỗ trợ trạng thái mùa vụ '${status}'.`);
}

function mapSeason(dto: SeasonDto): Season {
  const year = dto.planting_date.slice(0, 4);
  return {
    id: dto.season_id,
    farmId: dto.org_id,
    plotId: dto.plot_id,
    code: `MV-${dto.plot_code}-${year}`,
    name: `${dto.crop_name} · ${dto.plot_code}`,
    cropType: dto.crop_name,
    varietyId: dto.crop_id,
    varietyName: dto.crop_name,
    sowingDate: dto.planting_date,
    expectedHarvestDate: dto.expected_harvest_date ?? "",
    actualHarvestDate: dto.actual_harvest_date,
    status: mapSeasonStatus(dto.status),
    notes: "",
    linkedData: {
      tasks: null,
      cultivationLogs: dto.farming_logs_count ?? 0,
      harvestLots: dto.harvest_batches_count ?? 0,
    },
    teamAssignments: (dto.teams ?? []).map((team) => ({ seasonId: dto.season_id, teamId: team.team_id, startDate: team.start_date, endDate: team.end_date })),
    reminders: dto.reminders ?? [],
    plantingGuide: dto.planting_guide ?? "",
    createdAt: dto.created_at ?? "",
    updatedAt: dto.updated_at ?? dto.created_at ?? "",
  };
}

async function getSeasonDetail(id: string) {
  const [season, batches] = await Promise.all([
    httpClient.get<SeasonDto>(`/seasons/${id}`),
    httpClient.get<Array<{ status?: string }>>(`/batch-seasons/by-season/${id}`),
  ]);
  season.harvest_batches_count = batches.filter((batch) => batch.status !== "cancelled").length;
  return season;
}

export const seasonService = {
  async getCropVarieties(): Promise<CropVariety[]> {
    const crops = await httpClient.get<CropDto[]>("/crops");
    return crops.map((crop) => ({
      id: crop.crop_id,
      cropType: crop.name,
      name: crop.name,
      code: crop.name,
      growthDays: crop.growth_days,
    }));
  },

  async getAll(farmId?: string): Promise<Season[]> {
    const query = farmId && farmId !== "all"
      ? `?org_id=${encodeURIComponent(farmId)}`
      : "";
    const seasons = await httpClient.get<SeasonDto[]>(`/seasons${query}`);
    return Promise.all(seasons.map(async (season) => mapSeason(await getSeasonDetail(season.season_id))));
  },

  async getById(id: string): Promise<Season | null> {
    try {
      return mapSeason(await getSeasonDetail(id));
    } catch (error) {
      if (error instanceof Error && "status" in error && error.status === 404) return null;
      throw error;
    }
  },

  async getTeamAssignments(seasonId: string): Promise<SeasonTeamAssignment[]> {
    const season = await getSeasonDetail(seasonId);
    return (season.teams ?? []).map((team) => ({
      seasonId,
      teamId: team.team_id,
      startDate: team.start_date,
      endDate: team.end_date,
    }));
  },

  async getSupportedTeamIds(seasonId: string): Promise<string[]> {
    return (await this.getTeamAssignments(seasonId)).map((assignment) => assignment.teamId);
  },

  async addTaskLink(_seasonId: string): Promise<void> {
    void _seasonId;
    window.dispatchEvent(new Event("seasons-updated"));
  },

  async adjustHarvestLinks(_seasonId: string, _change: 1 | -1): Promise<void> {
    void _seasonId;
    void _change;
    window.dispatchEvent(new Event("seasons-updated"));
  },

  async assignTeam(seasonId: string, teamId: string): Promise<SeasonTeamAssignment> {
    const detail = await httpClient.post<SeasonDto>(`/seasons/${seasonId}/teams`, {
      team_id: teamId,
    });
    const team = detail.teams?.find((item) => item.team_id === teamId);
    if (!team) throw new Error("API không trả lại thông tin tổ vừa gán.");
    window.dispatchEvent(new Event("season-teams-updated"));
    window.dispatchEvent(new Event("seasons-updated"));
    return {
      seasonId,
      teamId,
      startDate: team.start_date,
      endDate: team.end_date,
    };
  },

  async removeTeam(seasonId: string, teamId: string): Promise<void> {
    await httpClient.delete<void>(`/seasons/${seasonId}/teams/${teamId}`);
    window.dispatchEvent(new Event("season-teams-updated"));
    window.dispatchEvent(new Event("seasons-updated"));
  },

  async create(input: CreateSeasonInput): Promise<Season> {
    validateDates(input.sowingDate, input.expectedHarvestDate);
    const created = await httpClient.post<SeasonDto>("/seasons", {
      plot_id: input.plotId,
      crop_id: input.varietyId,
      planting_date: input.sowingDate,
      expected_harvest_date: input.expectedHarvestDate,
      assigned_team_ids: [],
    });
    window.dispatchEvent(new Event("seasons-updated"));
    window.dispatchEvent(new Event("plots-updated"));
    return mapSeason(created);
  },

  async update(id: string, input: UpdateSeasonInput): Promise<Season> {
    const payload: Record<string, unknown> = {};
    if (input.expectedHarvestDate !== undefined) payload.expected_harvest_date = input.expectedHarvestDate;
    if (input.actualHarvestDate !== undefined) payload.actual_harvest_date = input.actualHarvestDate;
    if (input.status !== undefined) payload.status = toApiSeasonStatus(input.status);
    const updated = await httpClient.patch<SeasonDto>(`/seasons/${id}`, payload);
    window.dispatchEvent(new Event("seasons-updated"));
    window.dispatchEvent(new Event("plots-updated"));
    return mapSeason(updated);
  },

  async changeStatus(
    id: string,
    nextStatus: SeasonStatus,
    actualHarvestDate?: string,
  ): Promise<Season> {
    if (nextStatus === "completed" && !actualHarvestDate) {
      throw new Error("Vui lòng nhập ngày thu hoạch thực tế.");
    }
    return this.update(id, {
      status: nextStatus,
      actualHarvestDate,
    });
  },

  async canDelete(id: string): Promise<boolean> {
    const [season, batches] = await Promise.all([
      getSeasonDetail(id),
      httpClient.get<Array<{ batch_id: string }>>(`/batch-seasons/by-season/${id}`),
    ]);
    return season.status === "completed"
      && (season.farming_logs_count ?? 0) === 0
      && batches.length === 0;
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete<void>(`/seasons/${id}`);
    window.dispatchEvent(new Event("seasons-updated"));
    window.dispatchEvent(new Event("plots-updated"));
  },
};
