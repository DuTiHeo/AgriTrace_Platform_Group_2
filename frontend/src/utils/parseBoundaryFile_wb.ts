export function parseBoundaryFile(content: string) {
  try {
    const parsed = JSON.parse(content) as Array<{
      latitude?: number;
      longitude?: number;
      lat?: number;
      lng?: number;
    }>;

    if (Array.isArray(parsed)) {
      const jsonPoints = parsed
        .map((item) => ({
          latitude: Number(item.latitude ?? item.lat),
          longitude: Number(item.longitude ?? item.lng),
        }))
        .filter(
          (point) =>
            Number.isFinite(point.latitude) &&
            Number.isFinite(point.longitude),
        );

      if (jsonPoints.length >= 3) {
        return jsonPoints;
      }
    }
  } catch {
    // Tiếp tục thử đọc theo định dạng CSV.
  }

  const csvPoints = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const values = line
        .split(/[,;\t]/)
        .map((value) => value.trim());

      return {
        latitude: Number(values[0]),
        longitude: Number(values[1]),
      };
    })
    .filter(
      (point) =>
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude),
    );

  if (csvPoints.length < 3) {
    throw new Error(
      "Tệp ranh giới phải có ít nhất 3 tọa độ hợp lệ.",
    );
  }

  return csvPoints;
}
