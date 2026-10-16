import "../../styles/farm-form.css";
import {
  FileUp,
  Map,
  MapPinPlus,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  ChangeEvent,
  MouseEvent,
} from "react";
import type {
  BoundaryMethod,
  BoundaryPoint,
  FarmBoundary,
} from "../../types/farm";

type FarmBoundaryEditorProps = {
  boundary: FarmBoundary | null;
  onChange: (boundary: FarmBoundary) => void;
};

const createEmptyBoundary = (
  method: BoundaryMethod,
): FarmBoundary => ({
  method,
  projection:
    method === "vn2000"
      ? "VN-2000 · Kinh tuyến trục 108°30'"
      : "GPS · WGS84",
  points: [],
  area: 0,
  perimeter: 0,
  isValid: false,
});

const calculateGeometry = (
  points: BoundaryPoint[],
  method: BoundaryMethod,
) => {
  if (points.length < 3) {
    return {
      area: 0,
      perimeter: 0,
      isValid: false,
    };
  }

  const averageLatitude =
    points.reduce((total, point) => total + point.x, 0) /
    points.length;

  const metricPoints = points.map((point) => {
    if (method === "vn2000") {
      return {
        x: point.y,
        y: point.x,
      };
    }

    return {
      x:
        point.y *
        111320 *
        Math.cos((averageLatitude * Math.PI) / 180),
      y: point.x * 110540,
    };
  });

  let twiceArea = 0;
  let perimeter = 0;

  metricPoints.forEach((point, index) => {
    const nextPoint =
      metricPoints[(index + 1) % metricPoints.length];

    twiceArea +=
      point.x * nextPoint.y - nextPoint.x * point.y;

    perimeter += Math.hypot(
      nextPoint.x - point.x,
      nextPoint.y - point.y,
    );
  });

  const area = Math.abs(twiceArea) / 2 / 10000;

  return {
    area: Number(area.toFixed(2)),
    perimeter: Math.round(perimeter),
    isValid: area > 0,
  };
};

function FarmBoundaryEditor({
  boundary,
  onChange,
}: FarmBoundaryEditorProps) {
  const activeBoundary =
    boundary ?? createEmptyBoundary("map");

  const [pointX, setPointX] = useState("");
  const [pointY, setPointY] = useState("");
  const [pointNote, setPointNote] = useState("");

  const updatePoints = (points: BoundaryPoint[]) => {
    const geometry = calculateGeometry(
      points,
      activeBoundary.method,
    );

    onChange({
      ...activeBoundary,
      points,
      ...geometry,
    });
  };

  const changeMethod = (method: BoundaryMethod) => {
    onChange(createEmptyBoundary(method));
    setPointX("");
    setPointY("");
    setPointNote("");
  };

  const addCoordinatePoint = () => {
    const x = Number(pointX);
    const y = Number(pointY);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    const nextPoint: BoundaryPoint = {
      id: `M${activeBoundary.points.length + 1}`,
      x,
      y,
      note:
        pointNote.trim() ||
        `Mốc ranh giới ${activeBoundary.points.length + 1}`,
    };

    updatePoints([...activeBoundary.points, nextPoint]);
    setPointX("");
    setPointY("");
    setPointNote("");
  };

  const removePoint = (pointId: string) => {
    const remainingPoints = activeBoundary.points
      .filter((point) => point.id !== pointId)
      .map((point, index) => ({
        ...point,
        id: `M${index + 1}`,
      }));

    updatePoints(remainingPoints);
  };

  const handleFileUpload = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const text = await file.text();
    if (file.name.toLowerCase().endsWith(".kml")) {
      const coordinatesMatch = text.match(
        /<coordinates>([\s\S]*?)<\/coordinates>/i,
      );

      if (coordinatesMatch) {
        const coordinatePairs = coordinatesMatch[1]
          .trim()
          .split(/\s+/);

        const importedPoints = coordinatePairs
          .map((pair, index) => {
            const [longitude, latitude] = pair
              .split(",")
              .map(Number);

            return {
              id: `M${index + 1}`,
              x: latitude,
              y: longitude,
              note: `Điểm GPS ${index + 1}`,
            };
          })
          .filter(
            (point) =>
              Number.isFinite(point.x) &&
              Number.isFinite(point.y),
          );

        onChange({
          ...createEmptyBoundary("map"),
          points: importedPoints,
          ...calculateGeometry(importedPoints, "map"),
        });

        event.target.value = "";
        return;
      }
    }

    const importedPoints = text
      .split(/\r?\n/)
      .map((line, index) => {
        const values = line
          .trim()
          .split(/[,;\t]+/)
          .map((value) => value.trim());

        return {
          id: `M${index + 1}`,
          x: Number(values[0]),
          y: Number(values[1]),
          note: values[2] || `Mốc ranh giới ${index + 1}`,
        };
      })
      .filter(
        (point) =>
          Number.isFinite(point.x) &&
          Number.isFinite(point.y),
      )
      .map((point, index) => ({
        ...point,
        id: `M${index + 1}`,
      }));

    updatePoints(importedPoints);
    event.target.value = "";
  };

  const handleMapClick = (
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    if (activeBoundary.method !== "map") {
      return;
    }

    const bounds =
      event.currentTarget.getBoundingClientRect();

    const horizontalRatio =
      (event.clientX - bounds.left) / bounds.width;

    const verticalRatio =
      (event.clientY - bounds.top) / bounds.height;

    const latitude =
      12.62 + (1 - verticalRatio) * 0.12;

    const longitude =
      107.98 + horizontalRatio * 0.14;

    const nextPoint: BoundaryPoint = {
      id: `M${activeBoundary.points.length + 1}`,
      x: Number(latitude.toFixed(6)),
      y: Number(longitude.toFixed(6)),
      note: `Điểm GPS ${activeBoundary.points.length + 1}`,
    };

    updatePoints([...activeBoundary.points, nextPoint]);
  };

  const mapPolygonPoints = useMemo(() => {
    if (activeBoundary.method !== "map") {
      return "";
    }

    return activeBoundary.points
      .map((point) => {
        const x = ((point.y - 107.98) / 0.14) * 100;
        const y =
          100 - ((point.x - 12.62) / 0.12) * 100;

        return `${x},${y}`;
      })
      .join(" ");
  }, [activeBoundary]);

  return (
    <div className="boundary-editor">
      <div className="boundary-methods">
        <button
          className={
            activeBoundary.method === "vn2000"
              ? "boundary-method active"
              : "boundary-method"
          }
          type="button"
          onClick={() => changeMethod("vn2000")}
        >
          <MapPinPlus size={21} />
          <span>
            <strong>Nhập tọa độ VN-2000</strong>
            <small>Nhập hoặc tải bảng tọa độ địa chính</small>
          </span>
        </button>

        <button
          className={
            activeBoundary.method === "map"
              ? "boundary-method active"
              : "boundary-method"
          }
          type="button"
          onClick={() => changeMethod("map")}
        >
          <Map size={21} />
          <span>
            <strong>Vẽ trực tiếp trên bản đồ</strong>
            <small>Chấm các điểm để tạo ranh giới</small>
          </span>
        </button>
      </div>

      {activeBoundary.method === "vn2000" ? (
        <>
          <p role="status">Tọa độ VN-2000 cần được chuyển sang WGS84 trước khi lưu. Hãy dùng GPS hoặc nhập GeoJSON WGS84 để lưu lên hệ thống.</p>
          <div className="boundary-toolbar">
            <label>
              <span>Hệ tọa độ</span>

              <select
                value={activeBoundary.projection}
                onChange={(event) =>
                  onChange({
                    ...activeBoundary,
                    projection: event.target.value,
                  })
                }
              >
                <option>
                  VN-2000 · Kinh tuyến trục 108°30'
                </option>
                <option>
                  VN-2000 · Kinh tuyến trục 107°45'
                </option>
                <option>
                  VN-2000 · Kinh tuyến trục 108°00'
                </option>
                <option>
                  VN-2000 · Kinh tuyến trục 105°45'
                </option>
              </select>
            </label>

            <label className="file-upload-button">
              <FileUp size={17} />
              Tải tệp TXT, CSV hoặc KML
              <input
                type="file"
                accept=".txt,.csv,.kml"
                onChange={(event) =>
                  void handleFileUpload(event)
                }
              />
            </label>
          </div>

          <div className="coordinate-form">
            <label>
              <span>Tọa độ X (Bắc)</span>
              <input
                className="input"
                type="number"
                step="any"
                value={pointX}
                onChange={(event) =>
                  setPointX(event.target.value)
                }
              />
            </label>

            <label>
              <span>Tọa độ Y (Đông)</span>
              <input
                className="input"
                type="number"
                step="any"
                value={pointY}
                onChange={(event) =>
                  setPointY(event.target.value)
                }
              />
            </label>

            <label>
              <span>Mô tả mốc</span>
              <input
                className="input"
                value={pointNote}
                onChange={(event) =>
                  setPointNote(event.target.value)
                }
              />
            </label>

            <button
              className="btn btn-secondary"
              type="button"
              onClick={addCoordinatePoint}
            >
              <Plus size={17} />
              Thêm điểm
            </button>
          </div>
        </>
      ) : (
        <button
          className="boundary-map"
          type="button"
          onClick={handleMapClick}
        >
          <span className="boundary-map-help">
            Nhấp lên bản đồ để thêm các điểm ranh giới
          </span>

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="map-grid"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 10 0 L 0 0 0 10"
                  fill="none"
                  stroke="#cbd8ce"
                  strokeWidth="0.35"
                />
              </pattern>
            </defs>

            <rect
              width="100"
              height="100"
              fill="url(#map-grid)"
            />

            {activeBoundary.points.length >= 3 && (
              <polygon
                points={mapPolygonPoints}
                fill="rgba(22, 148, 71, 0.2)"
                stroke="#087333"
                strokeWidth="1"
              />
            )}

            {activeBoundary.points.map((point) => {
              const x =
                ((point.y - 107.98) / 0.14) * 100;

              const y =
                100 -
                ((point.x - 12.62) / 0.12) * 100;

              return (
                <circle
                  key={point.id}
                  cx={x}
                  cy={y}
                  r="1.7"
                  fill="#075d2a"
                  stroke="#ffffff"
                  strokeWidth="0.7"
                />
              );
            })}
          </svg>
        </button>
      )}

      {activeBoundary.points.length > 0 && (
        <div className="boundary-points">
          <div className="table-wrapper">
            <table className="coordinate-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>
                    {activeBoundary.method === "vn2000"
                      ? "Tọa độ X"
                      : "Vĩ độ"}
                  </th>
                  <th>
                    {activeBoundary.method === "vn2000"
                      ? "Tọa độ Y"
                      : "Kinh độ"}
                  </th>
                  <th>Mô tả</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {activeBoundary.points.map((point) => (
                  <tr key={point.id}>
                    <td>{point.id}</td>
                    <td>{point.x}</td>
                    <td>{point.y}</td>
                    <td>{point.note}</td>
                    <td>
                      <button
                        type="button"
                        aria-label={`Xóa ${point.id}`}
                        onClick={() => removePoint(point.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div
        className={
          activeBoundary.isValid
            ? "boundary-result valid"
            : "boundary-result"
        }
      >
        <strong>
          {activeBoundary.isValid
            ? "Ranh giới hợp lệ"
            : "Cần ít nhất 3 điểm để tạo ranh giới"}
        </strong>

        <span>
          {activeBoundary.isValid
            ? `${activeBoundary.area.toLocaleString(
                "vi-VN",
              )} ha · Chu vi ${activeBoundary.perimeter.toLocaleString(
                "vi-VN",
              )} m`
            : `${activeBoundary.points.length} điểm đã nhập`}
        </span>
      </div>
    </div>
  );
}

export default FarmBoundaryEditor;
