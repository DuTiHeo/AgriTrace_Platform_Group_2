import type { CreatePlotInput, Plot, UpdatePlotInput } from "../types/plot";
import { getPlotRelationships } from "./relationshipService";
import { httpClient } from "./httpClient";

type PlotDto = {
  plot_id: string;
  org_id: string;
  code: string;
  area: number | null;
  seasons_count?: number;
  tasks_count?: number;
  farming_logs_count?: number;
  status: Plot["status"];
  current_season_id: string | null;
  current_crop_name: string | null;
  boundary_geojson?: {
    type?: string;
    coordinates?: number[][][];
  } | null;
  created_at: string | null;
  updated_at?: string | null;
};

function mapPlotBoundary(geojson?: PlotDto["boundary_geojson"]): Plot["boundary"] {
  const ring = geojson?.type === "Polygon" ? geojson.coordinates?.[0] ?? [] : [];
  const points = ring.length > 1 ? ring.slice(0, -1) : ring;
  return points.map(([longitude, latitude]) => ({ latitude, longitude }));
}

function toPlotGeoJson(boundary: Plot["boundary"]) {
  if (boundary.length < 3) {
    throw new Error("Ranh giới vùng trồng phải có ít nhất 3 điểm.");
  }
  const ring = boundary.map((point) => [point.longitude, point.latitude]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
  return { type: "Polygon", coordinates: [ring] };
}

function mapPlot(dto: PlotDto): Plot {
  const boundary = mapPlotBoundary(dto.boundary_geojson);
  return {
    id: dto.plot_id,
    farmId: dto.org_id,
    code: dto.code,
    name: dto.code,
    cropType: dto.current_crop_name ?? "",
    area: dto.area ?? 0,
    address: "",
    description: "",
    boundary,
    boundaryStatus: boundary.length >= 3 ? "valid" : "invalid",
    status: dto.status,
    currentSeasonId: dto.current_season_id,
    currentSeasonName: null,
    currentSeasonStatus: dto.current_season_id ? "active" : "none",
    linkedData: { seasons: dto.seasons_count ?? 0, tasks: dto.tasks_count ?? 0, cultivationLogs: dto.farming_logs_count ?? 0 },
    createdAt: dto.created_at ?? "",
    updatedAt: dto.updated_at ?? dto.created_at ?? "",
  };
}

async function getPlotDetail(id: string) {
  return httpClient.get<PlotDto>(`/plots/${id}`);
}

export const plotService = {
  async getAll(farmId?: string): Promise<Plot[]> {
    const query = farmId && farmId !== "all"
      ? `?org_id=${encodeURIComponent(farmId)}`
      : "";
    const summaries = await httpClient.get<PlotDto[]>(`/plots${query}`);
    const links = await getPlotRelationships(farmId);
    return Promise.all(summaries.map(async (summary) => {
      const plot = mapPlot(await getPlotDetail(summary.plot_id));
      plot.linkedData = links.get(plot.id) ?? { seasons: 0, tasks: 0, cultivationLogs: 0 };
      return plot;
    }));
  },

  async getById(id: string): Promise<Plot | null> {
    try {
      const plot = mapPlot(await getPlotDetail(id));
      const links = await getPlotRelationships(plot.farmId);
      plot.linkedData = links.get(id) ?? { seasons: 0, tasks: 0, cultivationLogs: 0 };
      return plot;
    } catch (error) {
      if (error instanceof Error && "status" in error && error.status === 404) return null;
      throw error;
    }
  },

  async create(input: CreatePlotInput): Promise<Plot> {
    if (input.area <= 0) throw new Error("Diện tích vùng trồng phải lớn hơn 0.");
    const created = await httpClient.post<PlotDto>("/plots", {
      org_id: input.farmId,
      code: input.code.trim().toUpperCase(),
      area: input.area,
      boundary_geojson: toPlotGeoJson(input.boundary),
    });
    window.dispatchEvent(new Event("plots-updated"));
    return mapPlot(created);
  },

  async update(id: string, input: UpdatePlotInput): Promise<Plot> {
    const payload: Record<string, unknown> = {};
    if (input.code !== undefined) payload.code = input.code.trim().toUpperCase();
    if (input.area !== undefined) payload.area = input.area;
    if (input.status !== undefined) payload.status = input.status;
    if (input.boundary !== undefined) payload.boundary_geojson = toPlotGeoJson(input.boundary);
    const updated = await httpClient.patch<PlotDto>(`/plots/${id}`, payload);
    window.dispatchEvent(new Event("plots-updated"));
    return mapPlot(updated);
  },

  async setStatus(id: string, status: Plot["status"]): Promise<Plot> {
    return this.update(id, { status });
  },

  async canDelete(id: string): Promise<boolean> {
    const seasons = await httpClient.get<Array<{ status: string }>>(`/seasons?plot_id=${encodeURIComponent(id)}`);
    return !seasons.some((season) => ["growing", "ready_to_harvest"].includes(season.status));
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete<void>(`/plots/${id}?soft=true`);
    window.dispatchEvent(new Event("plots-updated"));
  },
};
