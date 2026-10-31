import type { ErrorReport } from "../features/owner/support_wb";
import { httpClient } from "./httpClient_wb";
export const supportService = {
  async getAll(farmId: string): Promise<ErrorReport[]> {
    const result: ErrorReport[] = [];
    for (let offset = 0; ; offset += 100) {
      const params = new URLSearchParams({ limit: "100", offset: String(offset) });
      if (farmId !== "all") params.set("org_id", farmId);
      const page = await httpClient.get<ErrorReport[]>(`/error-reports?${params}`, { cacheTtl: 0 });
      result.push(...page);
      if (page.length < 100) return result;
    }
  },
  getById: (id: string) => httpClient.get<ErrorReport>(`/error-reports/${encodeURIComponent(id)}`, { cacheTtl: 0 }),
  async create(farmId: string, input: { error_type: string; description: string; screenshot_url: string | null }) {
    const report = await httpClient.post<ErrorReport>(`/error-reports?org_id=${encodeURIComponent(farmId)}`, input);
    window.dispatchEvent(new Event("notifications-updated"));
    return report;
  },
  delete: (id: string) => httpClient.delete<void>(`/error-reports/${encodeURIComponent(id)}`),
};
