import { httpClient } from "./httpClient";
import type { CreateHarvestBatchInput, HarvestBatch, HarvestContribution, UpdateHarvestBatchInput } from "../types/harvest";

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
  }>;
};

type BatchSeasonDto = {
  batch_id: string;
  season_id: string;
  contributed_quantity: number | null;
};

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

async function getHarvestDetail(id: string) {
  return httpClient.get<HarvestBatchDto>(`/harvest-batches/${id}`);
}

export const harvestService = {
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
    const created = await httpClient.post<HarvestBatchDto>("/harvest-batches", {
      org_id: input.farmId,
      harvest_date: input.harvestDate,
      initial_seasons: input.contributions.map((contribution) => ({
        season_id: contribution.seasonId,
        contributed_quantity: contribution.quantityKg,
      })),
    });
    window.dispatchEvent(new Event("harvest-batches-updated"));
    window.dispatchEvent(new Event("seasons-updated"));
    return mapHarvestBatch(created);
  },

  async update(id: string, input: UpdateHarvestBatchInput): Promise<HarvestBatch> {
    const payload: Record<string, unknown> = {};
    if (input.harvestDate !== undefined) payload.harvest_date = input.harvestDate;
    if (input.status !== undefined) payload.status = input.status;
    const updated = await httpClient.patch<HarvestBatchDto>(`/harvest-batches/${id}`, payload);
    window.dispatchEvent(new Event("harvest-batches-updated"));
    return mapHarvestBatch(updated);
  },

  async generateTraceCode(id: string): Promise<HarvestBatch> {
    const updated = await httpClient.post<HarvestBatchDto>(`/harvest-batches/${id}/generate-qr`);
    window.dispatchEvent(new Event("harvest-batches-updated"));
    return mapHarvestBatch(updated);
  },

  async cancel(id: string): Promise<HarvestBatch> {
    const cancelled = await httpClient.delete<HarvestBatchDto>(`/harvest-batches/${id}`);
    window.dispatchEvent(new Event("harvest-batches-updated"));
    return mapHarvestBatch(cancelled);
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
    await httpClient.post<BatchSeasonDto>("/batch-seasons", {
      batch_id: batchId,
      season_id: contribution.seasonId,
      contributed_quantity: contribution.quantityKg,
    });
    window.dispatchEvent(new Event("harvest-batches-updated"));
    return mapHarvestBatch(await getHarvestDetail(batchId));
  },

  async updateContribution(
    batchId: string,
    contribution: HarvestContribution,
  ): Promise<HarvestBatch> {
    await httpClient.patch<BatchSeasonDto>(
      `/batch-seasons/${batchId}/${contribution.seasonId}`,
      { contributed_quantity: contribution.quantityKg },
    );
    window.dispatchEvent(new Event("harvest-batches-updated"));
    return mapHarvestBatch(await getHarvestDetail(batchId));
  },

  async removeContribution(batchId: string, seasonId: string): Promise<HarvestBatch> {
    await httpClient.delete<BatchSeasonDto>(`/batch-seasons/${batchId}/${seasonId}`);
    window.dispatchEvent(new Event("harvest-batches-updated"));
    return mapHarvestBatch(await getHarvestDetail(batchId));
  },
};
