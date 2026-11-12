export type FarmStatus = "active" | "incomplete" | "suspended";

export type BoundaryMethod = "vn2000" | "map";

export type FarmOwner = {
  name: string;
  phone: string;
  email: string;
};

export type BoundaryPoint = {
  id: string;
  x: number;
  y: number;
  note: string;
};

export type FarmBoundary = {
  method: BoundaryMethod;
  projection: string;
  points: BoundaryPoint[];
  area: number;
  perimeter: number;
  isValid: boolean;
};

export type FarmLinkedData = {
  plotCount: number;
  activeSeasonCount: number;
  harvestBatchCount: number;
};

export type Farm = {
  id: string;
  code: string;
  name: string;
  address: string;
  province: string;
  district: string;
  estimatedArea: number;
  owner: FarmOwner;
  status: FarmStatus;
  establishedAt: string;
  imageUrl?: string;
  boundary: FarmBoundary | null;
  linkedData: FarmLinkedData;
  createdAt: string;
  updatedAt: string;
};

export type FarmFormData = {
  name: string;
  address: string;
  province: string;
  district: string;
  estimatedArea: number;
  status: FarmStatus;
  boundary: FarmBoundary | null;
};

export const farmStatusLabels: Record<FarmStatus, string> = {
  active: "Đang hoạt động",
  incomplete: "Cần hoàn thiện",
  suspended: "Tạm ngưng",
};