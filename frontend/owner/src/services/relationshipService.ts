import { httpClient } from "./httpClient";

// Join existing collection responses in the browser; no extra backend fields.
export async function getPlotRelationships(farmId?: string) {
  const query = farmId && farmId !== "all" ? `?org_id=${encodeURIComponent(farmId)}` : "";
  const [seasons, tasks, logs] = await Promise.all([
    httpClient.get<Array<{ season_id: string; plot_id: string }>>(`/seasons${query}`),
    httpClient.get<Array<{ plot_id: string }>>(`/tasks?include_cancelled=true${query ? `&${query.slice(1)}` : ""}`),
    httpClient.get<Array<{ season_id: string }>>(`/farming-logs${query}`),
  ]);
  const result = new Map<string, { seasons: number; tasks: number; cultivationLogs: number }>();
  const entry = (id: string) => {
    if (!result.has(id)) result.set(id, { seasons: 0, tasks: 0, cultivationLogs: 0 });
    return result.get(id)!;
  };
  const plotsBySeason = new Map(seasons.map((season) => [season.season_id, season.plot_id]));
  seasons.forEach((season) => entry(season.plot_id).seasons++);
  tasks.forEach((task) => entry(task.plot_id).tasks++);
  logs.forEach((log) => {
    const plotId = plotsBySeason.get(log.season_id);
    if (plotId) entry(plotId).cultivationLogs++;
  });
  return result;
}
