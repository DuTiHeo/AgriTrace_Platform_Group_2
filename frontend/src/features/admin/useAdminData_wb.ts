import { useEffect, useState } from "react";
import { webApi } from "../../sevices/webApi_wb";

export function useAdminData<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ data?: T; error?: string; version: number }>();
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      data => {
        if (!controller.signal.aborted) setResult({ data, version });
      },
      error => {
        if (!controller.signal.aborted) setResult({ error: error.message, version });
      },
    );
    return () => controller.abort();
  }, [load, version]);

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

