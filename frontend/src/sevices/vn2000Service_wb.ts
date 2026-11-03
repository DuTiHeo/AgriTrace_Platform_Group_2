import { httpClient } from './httpClient_wb';
export type VN2000Point = { x: number; y: number };
export type VN2000Input = { points: VN2000Point[]; central_meridian: string | number; zone_width: 3 | 6 };
export type ConvertedBoundary = { boundary_geojson: { type: 'Polygon'; coordinates: number[][][] }; wgs84_vertices: number[][]; central_meridian: number; zone_width: number };

export function parseVN2000Coordinates(text: string): VN2000Point[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const points: VN2000Point[] = [];
  for (const [index, line] of lines.entries()) {
    const columns = line.split(/[,;\t ]+/);
    if (index === 0 && /^(x|bắc|northing)$/i.test(columns[0])) continue;
    const [x, y] = columns.map(Number);
    if (columns.length < 2 || !Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`Tọa độ dòng ${index + 1} chưa hợp lệ. Mỗi dòng nhập X, Y.`);
    points.push({ x, y });
  }
  if (points.length < 3) throw new Error('Cần ít nhất 3 điểm tọa độ VN-2000.');
  return points;
}

export async function convertVN2000(scope: 'organizations' | 'plots', input: VN2000Input, signal?: AbortSignal) {
  if (input.points.length < 3 || input.points.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y)))
    throw new Error('Cần ít nhất 3 điểm tọa độ hợp lệ.');
  const result = await httpClient.post<ConvertedBoundary>(`/${scope}/convert-vn2000`, input, { signal });
  const ring = result.boundary_geojson?.coordinates?.[0];
  if (result.boundary_geojson?.type !== 'Polygon' || !ring || ring.length < 4 || ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1] || ring.some(point => point.length < 2 || !Number.isFinite(point[0]) || !Number.isFinite(point[1]) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90))
    throw new Error('API trả về ranh giới WGS84 không hợp lệ.');
  return { ...result, points: ring.slice(0, -1).map(([longitude, latitude]) => ({ latitude, longitude })) };
}
