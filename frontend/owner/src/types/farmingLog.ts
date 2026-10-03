export type FarmingLogGps = {
  latitude: number;
  longitude: number;
};

export type FarmingLogPhoto = {
  id: string;
  url: string;
  caption: string;
};

export type FarmingLogNote = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "owner" | "leader";
  content: string;
  resolved: boolean;
  createdAt: string;
  resolvedAt: string | null;
};

export type FarmingLog = {
  id: string;
  farmId: string;
  seasonId: string;
  plotId: string;
  teamId: string | null;
  workerId: string;
  workerName: string;
  activityType: string;
  content: string;
  gps: FarmingLogGps;
  loggedAt: string;
  photos: FarmingLogPhoto[];
  notes: FarmingLogNote[];
};

