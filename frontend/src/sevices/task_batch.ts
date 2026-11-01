/** Keep successful mutations visible when another member's request fails. */
export async function settleTaskRequests<T>(ids: string[], request: (id: string) => Promise<T>) {
  const uniqueIds = [...new Set(ids)];
  const results = await Promise.allSettled(uniqueIds.map(request));
  const succeeded: { id: string; value: T }[] = [];
  const failed: { id: string; message: string }[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') succeeded.push({ id: uniqueIds[index], value: result.value });
    else failed.push({ id: uniqueIds[index], message: result.reason instanceof Error ? result.reason.message : String(result.reason) });
  });
  return { succeeded, failed };
}

export class PartialAssignmentError extends Error {
  constructor(public succeededWorkerIds: string[], message: string) { super(message); }
}
