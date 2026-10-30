export type SeasonStatus =
  | "planned"
  | "active"
  | "ready"
  | "completed"
  | "cancelled";

export type CropVariety = {
  id: string;
  cropType: string;
  name: string;
  code: string;
  growthDays: number;
};

export type SeasonLinkedData = {
  tasks: number | null;
  cultivationLogs: number;
  harvestLots: number;
};

export type SeasonTeamAssignment = {
  seasonId: string;
  teamId: string;
  startDate: string | null;
  endDate: string | null;
};

export type Season = {
  teamAssignments?: SeasonTeamAssignment[];
  plantingGuide?: string;
  reminders?: Array<{ reminder_id: string; milestone_type: string; remind_date: string; channel: string; status: string }>;

  id: string;
  farmId: string;
  plotId: string;
  code: string;
  name: string;
  cropType: string;
  varietyId: string;
  varietyName: string;
  sowingDate: string;
  expectedHarvestDate: string;
  actualHarvestDate: string | null;
  status: SeasonStatus;
  notes: string;
  linkedData: SeasonLinkedData;
  createdAt: string;
  updatedAt: string;
};

export type CreateSeasonInput = {
  farmId: string;
  plotId: string;
  name: string;
  cropType: string;
  varietyId: string;
  varietyName: string;
  sowingDate: string;
  expectedHarvestDate: string;
  notes: string;
};

export type UpdateSeasonInput = Partial<
  Omit<
    Season,
    | "id"
    | "farmId"
    | "plotId"
    | "code"
    | "linkedData"
    | "createdAt"
    | "updatedAt"
  >
>;