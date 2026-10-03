import type { BoundaryPoint } from "../types/plot";

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
