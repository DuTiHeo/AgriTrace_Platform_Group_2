import { useCallback, useEffect, useRef, useState } from "react";
import { useWebPolling } from "../../hooks/use_web_polling_wb";
import { webApi } from "../../sevices/webApi_wb";

export function useAdminData<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ data?: T; error?: string; version: number }>();
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async (background: boolean) => {
    if (background && request.current) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const data = await load(controller.signal);
      if (!controller.signal.aborted) setResult({ data, version });
    } catch (error) {
      if (!background && !controller.signal.aborted) {
        setResult({ error: error instanceof Error ? error.message : "Không thể tải dữ liệu.", version });
      }
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, [load, version]);

  useEffect(() => {
    void refresh(false);
    return () => request.current?.abort();
  }, [refresh]);
  useWebPolling(refresh, result?.version === version);

  return {
    data: result?.data,
    error: result?.version === version ? result.error : undefined,
    pending: result?.version !== version,
    reload: () => setVersion(current => current + 1),
  };
}

export async function readPages<T>(read: (limit: number, offset: number) => Promise<T[]>) {
  const limit = 100;
  const result: T[] = [];
  for (let offset = 0; ; offset += limit) {
    const items = await read(limit, offset);
    result.push(...items);
    if (items.length < limit) return result;
  }
}

export function listReports(signal: AbortSignal) {
  return readPages((limit, offset) => webApi.errorReports.listErrorReports({ query: { limit, offset }, signal }));
}

