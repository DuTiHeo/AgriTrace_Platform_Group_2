import type { BoundaryPoint } from "../features/owner/plot_wb";
import type { Farm } from "../features/owner/farm_wb";

const EPSILON = 1e-10;
const cross = (a: BoundaryPoint, b: BoundaryPoint, c: BoundaryPoint) =>
  (b.longitude - a.longitude) * (c.latitude - a.latitude)
  - (b.latitude - a.latitude) * (c.longitude - a.longitude);
const onSegment = (p: BoundaryPoint, a: BoundaryPoint, b: BoundaryPoint) =>
  Math.abs(cross(a, b, p)) < EPSILON
  && p.longitude >= Math.min(a.longitude, b.longitude) - EPSILON
  && p.longitude <= Math.max(a.longitude, b.longitude) + EPSILON
  && p.latitude >= Math.min(a.latitude, b.latitude) - EPSILON
  && p.latitude <= Math.max(a.latitude, b.latitude) + EPSILON;

export function isValidGps(p: BoundaryPoint) {
  return Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
    && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180;
}

export function getFarmPolygon(farm?: Farm | null): BoundaryPoint[] {
  if (farm?.boundary?.method !== "map") return [];
  const points = farm.boundary.points.map(p => ({ latitude: p.x, longitude: p.y }));
  if (points.length > 1 && points[0].latitude === points.at(-1)!.latitude
    && points[0].longitude === points.at(-1)!.longitude) points.pop();
  return points.length >= 3 && points.every(isValidGps) && polygonArea(points) > 1e-16 ? points : [];
}

function polygonArea(points: BoundaryPoint[]) {
  if (points.length < 3) return 0;
  const origin = points[0];
  return Math.abs(points.reduce((total, p, i) => total + cross(origin, p, points[(i + 1) % points.length]), 0)) / 2;
}

export function pointInPolygon(p: BoundaryPoint, polygon: BoundaryPoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i];
    if (onSegment(p, a, b)) return true;
    if ((a.latitude > p.latitude) !== (b.latitude > p.latitude)
      && p.longitude < (b.longitude - a.longitude) * (p.latitude - a.latitude)
        / (b.latitude - a.latitude) + a.longitude) inside = !inside;
  }
  return inside;
}

// Split each edge at every boundary intersection, then check each interval.
// Checking vertices alone misses edges crossing the notch of a concave farm.
function segmentInside(a: BoundaryPoint, b: BoundaryPoint, polygon: BoundaryPoint[]) {
  const cuts = [0, 1];
  const dx = b.longitude - a.longitude, dy = b.latitude - a.latitude;
  for (let i = 0; i < polygon.length; i++) {
    const c = polygon[i], d = polygon[(i + 1) % polygon.length];
    const ex = d.longitude - c.longitude, ey = d.latitude - c.latitude;
    const denominator = dx * ey - dy * ex;
    if (Math.abs(denominator) < 1e-16) {
      if (Math.abs(cross(a, b, c)) < EPSILON) {
        const length = dx * dx + dy * dy;
        if (length) for (const p of [c, d]) {
          const t = ((p.longitude - a.longitude) * dx + (p.latitude - a.latitude) * dy) / length;
          if (t > 0 && t < 1) cuts.push(t);
        }
      }
      continue;
    }
    const cx = c.longitude - a.longitude, cy = c.latitude - a.latitude;
    const t = (cx * ey - cy * ex) / denominator;
    const u = (cx * dy - cy * dx) / denominator;
    if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
  }
  cuts.sort((x, y) => x - y);
  return cuts.slice(1).every((t, i) => {
    const midpoint = (cuts[i] + t) / 2;
    return pointInPolygon({ latitude: a.latitude + midpoint * dy, longitude: a.longitude + midpoint * dx }, polygon);
  });
}

export function plotBoundaryError(points: BoundaryPoint[], farm?: Farm | null, complete = false) {
  const polygon = getFarmPolygon(farm);
  if (!polygon.length) return "Nông trại chưa có ranh giới GPS WGS84 hợp lệ. Hãy thiết lập ranh giới nông trại trước khi tạo vùng trồng.";
  if (!points.every(isValidGps)) return "Tọa độ GPS không hợp lệ.";
  if (points.some(p => !pointInPolygon(p, polygon))) return "Không được tạo vùng trồng bên ngoài ranh giới của nông trại đã chọn.";
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (Math.hypot(points[i].latitude - points[j].latitude, points[i].longitude - points[j].longitude) < 1e-8)
        return "Các mốc GPS không được trùng vị trí.";
    }
  }
  const edgeCount = points.length >= 3 ? points.length : Math.max(0, points.length - 1);
  for (let i = 0; i < edgeCount; i++) {
    if (!segmentInside(points[i], points[(i + 1) % points.length], polygon))
      return "Cạnh vùng trồng vượt ra ngoài ranh giới nông trại. Hãy điều chỉnh các mốc GPS.";
  }
  for (let i = 0; i < edgeCount; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    for (let j = i + 2; j < edgeCount; j++) {
      if (i === 0 && j === points.length - 1) continue;
      const c = points[j], d = points[(j + 1) % points.length];
      if ((cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0)
        || onSegment(a, c, d) || onSegment(b, c, d) || onSegment(c, a, b) || onSegment(d, a, b))
        return "Các cạnh ranh giới không được tự cắt nhau. Hãy đổi vị trí mốc GPS.";
    }
  }
  if (complete && (points.length < 3 || polygonArea(points) <= 1e-16))
    return "Ranh giới phải có ít nhất 3 điểm tạo thành diện tích lớn hơn 0.";
  return "";
}

export function calculatePlotArea(points: BoundaryPoint[]) {
  if (points.length < 3) return 0;

  const averageLatitude =
    points.reduce((total, point) => total + point.latitude, 0) / points.length;
  const latitudeScale = 110540;
  const longitudeScale =
    111320 * Math.cos((averageLatitude * Math.PI) / 180);
  let doubledArea = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const currentX = current.longitude * longitudeScale;
    const currentY = current.latitude * latitudeScale;
    const nextX = next.longitude * longitudeScale;
    const nextY = next.latitude * latitudeScale;
    doubledArea += currentX * nextY - nextX * currentY;
  }

  return Number((Math.abs(doubledArea) / 2 / 10000).toFixed(2));
}
