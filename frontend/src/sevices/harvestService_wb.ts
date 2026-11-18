import { httpClient } from "./httpClient_wb";
import type { CreateHarvestBatchInput, HarvestBatch, HarvestContribution, UpdateHarvestBatchInput } from "../features/owner/harvest_wb";

type HarvestBatchDto = {
  batch_id: string;
  batch_code: string | null;
  org_id: string;
  quantity: number | null;
  harvest_date: string | null;
  status: HarvestBatch["status"];
  qr_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  seasons?: Array<{
    season_id: string;
    contributed_quantity: number | null;
    crop_id?: string | null;
    crop_name?: string | null;
    plot_id?: string | null;
    plot_code?: string | null;
    planting_date?: string | null;
    actual_harvest_date?: string | null;
    season_status?: string | null;
    status?: string;
  }>;
};

type BatchSeasonDto = {
  batch_id: string;
  season_id: string;
  contributed_quantity: number | null;
};

type SeasonDto = {
  season_id: string;
  plot_id: string;
  org_id: string;
  crop_id: string;
  status: string;
  actual_harvest_date: string | null;
};

type SeasonBatchDto = {
  batch_id: string;
  batch_status: HarvestBatch["status"];
  status: string;
  harvest_date: string | null;
};

export class HarvestSeasonSyncError extends Error {
  readonly batch: HarvestBatch;
  readonly seasonIds: string[];

  constructor(batch: HarvestBatch, seasonIds: string[], cause: unknown) {
    const savedAction = batch.status === "cancelled" ? "đã được hủy" : "đã được lưu";
    super(`Lô ${batch.code} ${savedAction}, nhưng chưa cập nhật được trạng thái mùa vụ. ${cause instanceof Error ? cause.message : "Vui lòng thử lại."}`);
    this.name = "HarvestSeasonSyncError";
    this.batch = batch;
    this.seasonIds = seasonIds;
  }
}

function mapHarvestBatch(batch: HarvestBatchDto): HarvestBatch {
  const updatedAt = batch.updated_at ?? batch.created_at ?? "";
  return {
    id: batch.batch_id,
    code: batch.batch_code ?? "",
    farmId: batch.org_id,
    harvestDate: batch.harvest_date ?? "",
    quantityKg: batch.quantity ?? 0,
    status: batch.status,
    contributions: (batch.seasons ?? []).map((season) => ({
      seasonId: season.season_id,
      quantityKg: season.contributed_quantity ?? 0,
    })),
    traceUrl: batch.qr_url,
    qrGeneratedAt: batch.qr_url ? updatedAt : null,
    createdAt: batch.created_at ?? "",
    updatedAt,
  };
}

async function getHarvestDetail(id: string, fresh = false) {
  return httpClient.get<HarvestBatchDto>(`/harvest-batches/${encodeURIComponent(id)}`, fresh ? { cacheTtl: 0 } : {});
}

function notifyHarvestChanged() {
  window.dispatchEvent(new Event("harvest-batches-updated"));
  window.dispatchEvent(new Event("seasons-updated"));
  window.dispatchEvent(new Event("plots-updated"));
}

function batchSeasonIds(batch: HarvestBatchDto) {
  return (batch.seasons ?? []).filter(season => season.status !== "cancelled").map(season => season.season_id);
}

function getSeason(id: string) {
  return httpClient.get<SeasonDto>(`/seasons/${encodeURIComponent(id)}`, { cacheTtl: 0 });
}

async function effectiveBatches(seasonId: string) {
  const links = await httpClient.get<SeasonBatchDto[]>(
    `/batch-seasons/by-season/${encodeURIComponent(seasonId)}?include_cancelled=true`, { cacheTtl: 0 },
  );
  return links.filter(link => link.status === "active" && ["pending", "ready"].includes(link.batch_status));
}

async function assertCanReopen(season: SeasonDto) {
  const seasons = await httpClient.get<SeasonDto[]>(`/seasons?plot_id=${encodeURIComponent(season.plot_id)}`, { cacheTtl: 0 });
  if (seasons.some(other => other.season_id !== season.season_id && ["growing", "ready_to_harvest"].includes(other.status))) {
    throw new Error("Không thể mở lại mùa vụ cũ vì vùng trồng đã có mùa vụ mới đang hoạt động. Vui lòng xử lý mùa vụ mới trước khi thu hồi lô cuối cùng.");
  }
}

async function checkReleaseSeasons(batchId: string, seasonIds: string[]) {
  for (const id of new Set(seasonIds)) {
    const [season, batches] = await Promise.all([getSeason(id), effectiveBatches(id)]);
    if (!batches.some(batch => batch.batch_id !== batchId)) await assertCanReopen(season);
  }
}

function localDate(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
}

async function synchronizeSeason(seasonId: string) {
  const [season, batches] = await Promise.all([getSeason(seasonId), effectiveBatches(seasonId)]);
  if (batches.length) {
    if (!["ready_to_harvest", "completed"].includes(season.status)) {
      throw new Error("Mùa vụ chưa sẵn sàng thu hoạch, không thể đánh dấu hoàn thành.");
    }
    const dates = await Promise.all(batches.map(async batch => {
      if (batch.harvest_date) return batch.harvest_date;
      const detail = await getHarvestDetail(batch.batch_id, true);
      return detail.created_at ? localDate(detail.created_at) : localDate(new Date().toISOString());
    }));
    const actualHarvestDate = dates.sort().at(-1)!;
    if (season.status !== "completed" || season.actual_harvest_date !== actualHarvestDate) {
      await httpClient.patch(`/seasons/${encodeURIComponent(seasonId)}`, {
        status: "completed", actual_harvest_date: actualHarvestDate,
      });
    }
  } else if (season.status === "completed" || (season.status === "ready_to_harvest" && season.actual_harvest_date !== null)) {
    await assertCanReopen(season);
    await httpClient.patch(`/seasons/${encodeURIComponent(seasonId)}`, {
      status: "ready_to_harvest", actual_harvest_date: null,
    });
  }
}

async function finishHarvestChange(batch: HarvestBatchDto, seasonIds: string[]) {
  const affected = [...new Set(seasonIds)];
  try {
    // Wait for each update before exposing retry; never leave PATCHes running behind it.
    for (const id of affected) await synchronizeSeason(id);
    return mapHarvestBatch(batch);
  } catch (cause) {
    throw new HarvestSeasonSyncError(mapHarvestBatch(batch), affected, cause);
  } finally {
    // A saved lot must refresh views even if the following season request fails.
    notifyHarvestChanged();
  }
}

async function finishContributionChange(fallback: HarvestBatchDto, seasonIds: string[]) {
  let batch: HarvestBatchDto;
  try {
    batch = await getHarvestDetail(fallback.batch_id, true);
  } catch (cause) {
    notifyHarvestChanged();
    throw new HarvestSeasonSyncError(mapHarvestBatch(fallback), seasonIds, cause);
  }
  return finishHarvestChange(batch, seasonIds);
}

async function validateNewHarvest(input: CreateHarvestBatchInput) {
  const ids = input.contributions.map(contribution => contribution.seasonId);
  if (!ids.length || new Set(ids).size !== ids.length || input.contributions.some(item => !Number.isFinite(item.quantityKg) || item.quantityKg <= 0)) {
    throw new Error("Chọn các mùa vụ khác nhau và nhập sản lượng lớn hơn 0.");
  }
  const date = new Date(`${input.harvestDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.harvestDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.harvestDate) {
    throw new Error("Ngày thu hoạch không hợp lệ.");
  }
  const seasons = await Promise.all(ids.map(getSeason));
  if (seasons.some(season => season.org_id !== input.farmId || !["ready_to_harvest", "completed"].includes(season.status))) {
    throw new Error("Mùa vụ phải thuộc nông trại đã chọn và sẵn sàng thu hoạch hoặc đã hoàn thành.");
  }
  if (new Set(seasons.map(season => season.crop_id)).size !== 1) {
    throw new Error("Các mùa vụ trong cùng lô thu hoạch phải cùng giống cây trồng.");
  }
}

export const harvestService = {
  async getOverview(farmId: string, day: string): Promise<Array<Pick<HarvestBatch, "id" | "status" | "harvestDate" | "quantityKg">>> {
    const params = new URLSearchParams({ date_from: day, date_to: day });
    if (farmId !== "all") params.set("org_id", farmId);
    const batches = await httpClient.get<HarvestBatchDto[]>(`/harvest-batches?${params}`);
    return batches.map((batch) => ({
      id: batch.batch_id, status: batch.status,
      harvestDate: batch.harvest_date ?? "", quantityKg: batch.quantity ?? 0,
    }));
  },

  async getAll(farmId?: string): Promise<HarvestBatch[]> {
    const params = new URLSearchParams({ include_cancelled: "true" });
    if (farmId && farmId !== "all") params.set("org_id", farmId);
    const batches = await httpClient.get<HarvestBatchDto[]>(`/harvest-batches?${params}`);
    return Promise.all(batches.map(async (batch) => mapHarvestBatch(await getHarvestDetail(batch.batch_id))));
  },

  async getById(id: string): Promise<HarvestBatch | null> {
    try {
      return mapHarvestBatch(await getHarvestDetail(id));
    } catch (error) {
      if (error instanceof Error && "status" in error && error.status === 404) return null;
      throw error;
    }
  },

  async getByCode(code: string): Promise<HarvestBatch | null> {
    const params = new URLSearchParams({ keyword: code.trim(), include_cancelled: "true" });
    const batches = await httpClient.get<HarvestBatchDto[]>(`/harvest-batches?${params}`);
    const match = batches.find((batch) => batch.batch_code?.toLocaleUpperCase("vi") === code.trim().toLocaleUpperCase("vi"));
    return match ? mapHarvestBatch(await getHarvestDetail(match.batch_id)) : null;
  },

  async create(input: CreateHarvestBatchInput): Promise<HarvestBatch> {
    await validateNewHarvest(input);
    const created = await httpClient.post<HarvestBatchDto>("/harvest-batches", {
      org_id: input.farmId,
      harvest_date: input.harvestDate,
      initial_seasons: input.contributions.map((contribution) => ({
        season_id: contribution.seasonId,
        contributed_quantity: contribution.quantityKg,
      })),
    });
    return finishHarvestChange(created, input.contributions.map(item => item.seasonId));
  },

  async update(id: string, input: UpdateHarvestBatchInput): Promise<HarvestBatch> {
    const payload: Record<string, unknown> = {};
    if (input.code !== undefined) payload.batch_code = input.code.trim();
    if (input.quantityKg !== undefined) payload.quantity = input.quantityKg;
    if (input.traceUrl !== undefined) payload.qr_url = input.traceUrl?.trim() || null;
    if (input.harvestDate !== undefined) payload.harvest_date = input.harvestDate;
    if (input.status !== undefined) payload.status = input.status;
    const updated = await httpClient.patch<HarvestBatchDto>(`/harvest-batches/${id}`, payload);
    if (input.harvestDate !== undefined || input.status !== undefined) {
      return finishHarvestChange(updated, batchSeasonIds(updated));
    }
    notifyHarvestChanged();
    return mapHarvestBatch(updated);
  },

  async generateTraceCode(id: string): Promise<HarvestBatch> {
    const updated = await httpClient.post<HarvestBatchDto>(`/harvest-batches/${id}/generate-qr`);
    notifyHarvestChanged();
    return mapHarvestBatch(updated);
  },

  async cancel(id: string): Promise<HarvestBatch> {
    const before = await getHarvestDetail(id, true);
    const seasonIds = batchSeasonIds(before);
    if (before.status !== "cancelled") await checkReleaseSeasons(id, seasonIds);
    const cancelled = await httpClient.delete<HarvestBatchDto>(`/harvest-batches/${id}`);
    return finishHarvestChange(cancelled, seasonIds);
  },

  async syncSeasonStatuses(id: string, seasonIds?: string[]): Promise<HarvestBatch> {
    const batch = await getHarvestDetail(id, true);
    return finishHarvestChange(batch, seasonIds ?? batchSeasonIds(batch));
  },

  async getContributions(batchId: string): Promise<HarvestContribution[]> {
    const links = await httpClient.get<BatchSeasonDto[]>(`/batch-seasons/by-batch/${batchId}`);
    return links.map((link) => ({
      seasonId: link.season_id,
      quantityKg: link.contributed_quantity ?? 0,
    }));
  },

  async addContribution(
    batchId: string,
    contribution: HarvestContribution,
  ): Promise<HarvestBatch> {
    const before = await getHarvestDetail(batchId, true);
    await httpClient.post<BatchSeasonDto>("/batch-seasons", {
      batch_id: batchId,
      season_id: contribution.seasonId,
      contributed_quantity: contribution.quantityKg,
    });
    return finishContributionChange({
      ...before,
      quantity: (before.quantity ?? 0) + contribution.quantityKg,
      seasons: [...(before.seasons ?? []), { season_id: contribution.seasonId, contributed_quantity: contribution.quantityKg }],
    }, [contribution.seasonId]);
  },

  async updateContribution(
    batchId: string,
    contribution: HarvestContribution,
  ): Promise<HarvestBatch> {
    await httpClient.patch<BatchSeasonDto>(
      `/batch-seasons/${batchId}/${contribution.seasonId}`,
      { contributed_quantity: contribution.quantityKg },
    );
    notifyHarvestChanged();
    return mapHarvestBatch(await getHarvestDetail(batchId));
  },

  async removeContribution(batchId: string, seasonId: string): Promise<HarvestBatch> {
    const before = await getHarvestDetail(batchId, true);
    if (before.status !== "cancelled") await checkReleaseSeasons(batchId, [seasonId]);
    await httpClient.delete<BatchSeasonDto>(`/batch-seasons/${batchId}/${seasonId}`);
    const removed = before.seasons?.find(season => season.season_id === seasonId);
    return finishContributionChange({
      ...before,
      quantity: (before.quantity ?? 0) - (removed?.contributed_quantity ?? 0),
      seasons: before.seasons?.filter(season => season.season_id !== seasonId),
    }, [seasonId]);
  },
};
