export type PlotStatus = "active" | "inactive";

export type PlotBoundaryStatus =
  | "valid"
  | "checking"
  | "invalid";

export type PlotSeasonStatus =
  | "none"
  | "planned"
  | "active"
  | "completed";

export type BoundaryPoint = {
  latitude: number;
  longitude: number;
};

export type PlotLinkedData = {
  seasons: number;
  tasks: number;
  cultivationLogs: number;
};

export type Plot = {
  id: string;
  farmId: string;
  code: string;
  name: string;
  cropType: string;
  area: number;
  address: string;
  description: string;
  boundary: BoundaryPoint[];
  boundaryStatus: PlotBoundaryStatus;
  status: PlotStatus;
  currentSeasonId: string | null;
  currentSeasonName: string | null;
  currentSeasonStatus: PlotSeasonStatus;
  linkedData: PlotLinkedData;
  createdAt: string;
  updatedAt: string;
};

export type CreatePlotInput = {
  farmId: string;
  code: string;
  area: number;
  boundary: BoundaryPoint[];
};

export type UpdatePlotInput = Partial<
  Omit<
    Plot,
    | "id"
    | "farmId"
    | "linkedData"
    | "createdAt"
    | "updatedAt"
  >
>;