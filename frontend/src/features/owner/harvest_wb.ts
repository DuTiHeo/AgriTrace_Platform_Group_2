export type HarvestBatchStatus = "pending" | "ready" | "cancelled";

export type HarvestContribution = {
  seasonId: string;
  quantityKg: number;
};

export type HarvestBatch = {
  id: string;
  code: string;
  farmId: string;
  harvestDate: string;
  quantityKg: number;
  status: HarvestBatchStatus;
  contributions: HarvestContribution[];
  traceUrl: string | null;
  qrGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateHarvestBatchInput = {
  farmId: string;
  harvestDate: string;
  contributions: HarvestContribution[];
};

export type UpdateHarvestBatchInput = {
  code?: string;
  quantityKg?: number;
  traceUrl?: string | null;
  harvestDate?: string;
  status?: Exclude<HarvestBatchStatus, "cancelled">;
};

export const harvestStatusLabels: Record<HarvestBatchStatus, string> = {
  pending: "Chờ tạo tem",
  ready: "Sẵn sàng truy xuất",
  cancelled: "Đã hủy",
};

