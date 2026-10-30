// Used only to select the signed-in user's events; API authorization remains on the server.
export function sessionUserId(token: string): string | null {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload: unknown = JSON.parse(globalThis.atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    if (!payload || typeof payload !== 'object' || !('sub' in payload)) return null;
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch { return null; }
}
