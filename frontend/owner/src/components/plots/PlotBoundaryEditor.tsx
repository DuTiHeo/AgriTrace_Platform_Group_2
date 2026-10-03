import "../../styles/plot-form.css";
import {
  MapPinned,
  MousePointer2,
  Plus,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChangeEvent,
  MouseEvent,
} from "react";
import type { BoundaryPoint } from "../../types/plot";
import { calculatePlotArea } from "../../utils/geometry";

type PlotBoundaryEditorProps = {
  points: BoundaryPoint[];
  disabled?: boolean;
  onChange: (points: BoundaryPoint[]) => void;
};

const MAP_BOUNDS = {
  minLatitude: 12.68,
  maxLatitude: 12.74,
  minLongitude: 108.06,
  maxLongitude: 108.12,
};

function parseBoundaryFile(content: string) {
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

function PlotBoundaryEditor({
  points,
  disabled = false,
  onChange,
}: PlotBoundaryEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState("");

  const calculatedArea = useMemo(
    () => calculatePlotArea(points),
    [points],
  );

  const polygonPoints = useMemo(
    () =>
      points
        .map((point) => {
          const x =
            ((point.longitude -
              MAP_BOUNDS.minLongitude) /
              (MAP_BOUNDS.maxLongitude -
                MAP_BOUNDS.minLongitude)) *
            100;

          const y =
            ((MAP_BOUNDS.maxLatitude -
              point.latitude) /
              (MAP_BOUNDS.maxLatitude -
                MAP_BOUNDS.minLatitude)) *
            100;

          return `${x},${y}`;
        })
        .join(" "),
    [points],
  );

  const handleMapClick = (
    event: MouseEvent<HTMLDivElement>,
  ) => {
    if (disabled) {
      return;
    }

    const rectangle =
      event.currentTarget.getBoundingClientRect();

    const horizontalRate =
      (event.clientX - rectangle.left) / rectangle.width;

    const verticalRate =
      (event.clientY - rectangle.top) / rectangle.height;

    const newPoint: BoundaryPoint = {
      latitude: Number(
        (
          MAP_BOUNDS.maxLatitude -
          verticalRate *
            (MAP_BOUNDS.maxLatitude -
              MAP_BOUNDS.minLatitude)
        ).toFixed(6),
      ),
      longitude: Number(
        (
          MAP_BOUNDS.minLongitude +
          horizontalRate *
            (MAP_BOUNDS.maxLongitude -
              MAP_BOUNDS.minLongitude)
        ).toFixed(6),
      ),
    };

    setError("");
    onChange([...points, newPoint]);
  };

  const handleAddCoordinate = () => {
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    if (
      !Number.isFinite(parsedLatitude) ||
      !Number.isFinite(parsedLongitude)
    ) {
      setError("Vui lòng nhập tọa độ hợp lệ.");
      return;
    }

    if (
      parsedLatitude < -90 ||
      parsedLatitude > 90 ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      setError("Tọa độ nằm ngoài phạm vi cho phép.");
      return;
    }

    setError("");
    onChange([
      ...points,
      {
        latitude: parsedLatitude,
        longitude: parsedLongitude,
      },
    ]);

    setLatitude("");
    setLongitude("");
  };

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const importedPoints = parseBoundaryFile(content);

      setError("");
      onChange(importedPoints);
    } catch (fileError) {
      setError(
        fileError instanceof Error
          ? fileError.message
          : "Không thể đọc tệp ranh giới.",
      );
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="boundary-editor">
      <div className="boundary-toolbar">
        <div className="boundary-coordinate-inputs">
          <label>
            <span>Vĩ độ</span>
            <input
              type="number"
              step="0.000001"
              value={latitude}
              disabled={disabled}
              placeholder="12.710800"
              onChange={(event) =>
                setLatitude(event.target.value)
              }
            />
          </label>

          <label>
            <span>Kinh độ</span>
            <input
              type="number"
              step="0.000001"
              value={longitude}
              disabled={disabled}
              placeholder="108.091800"
              onChange={(event) =>
                setLongitude(event.target.value)
              }
            />
          </label>

          <button
            className="btn btn-secondary"
            type="button"
            disabled={disabled}
            onClick={handleAddCoordinate}
          >
            <Plus size={17} />
            Thêm điểm
          </button>
        </div>

        <div className="boundary-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.txt"
            hidden
            onChange={handleFileChange}
          />

          <button
            className="btn btn-secondary"
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={17} />
            Nhập tệp
          </button>

          <button
            className="icon-action-button"
            type="button"
            disabled={disabled || points.length === 0}
            aria-label="Hoàn tác điểm cuối"
            onClick={() => onChange(points.slice(0, -1))}
          >
            <Undo2 size={17} />
          </button>

          <button
            className="icon-action-button danger"
            type="button"
            disabled={disabled || points.length === 0}
            aria-label="Xóa toàn bộ ranh giới"
            onClick={() => onChange([])}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      {error && (
        <div className="boundary-error">{error}</div>
      )}

      <div
        className={`boundary-map ${
          disabled ? "disabled" : ""
        }`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Bản đồ thiết lập ranh giới vùng trồng"
        onClick={handleMapClick}
      >
        <div className="boundary-map-grid" />

        {points.length === 0 && (
          <div className="boundary-map-empty">
            <MousePointer2 size={25} />
            <strong>Nhấp trên bản đồ để tạo ranh giới</strong>
            <span>
              Tạo tối thiểu 3 điểm để hình thành vùng trồng.
            </span>
          </div>
        )}

        <svg
          className="boundary-polygon"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {points.length >= 3 && (
            <polygon points={polygonPoints} />
          )}

          {points.length >= 2 && points.length < 3 && (
            <polyline points={polygonPoints} />
          )}

          {points.map((point, index) => {
            const [x, y] = polygonPoints.split(" ")[index].split(",");

            return (
              <circle
                key={`${point.latitude}-${point.longitude}-${index}`}
                cx={x}
                cy={y}
                r="1.25"
              />
            );
          })}
        </svg>
      </div>

      <div className="boundary-footer">
        <div>
          <MapPinned size={17} />
          <span>
            {points.length} điểm tọa độ
          </span>
        </div>

        <strong>
          Diện tích tính toán:{" "}
          {calculatedArea.toLocaleString("vi-VN")} ha
        </strong>
      </div>

      {points.length > 0 && (
        <div className="boundary-point-list">
          {points.map((point, index) => (
            <div
              className="boundary-point-row"
              key={`${point.latitude}-${point.longitude}-${index}`}
            >
              <span>Điểm {index + 1}</span>

              <code>
                {point.latitude.toFixed(6)},{" "}
                {point.longitude.toFixed(6)}
              </code>

              {!disabled && (
                <button
                  type="button"
                  aria-label={`Xóa điểm ${index + 1}`}
                  onClick={() =>
                    onChange(
                      points.filter(
                        (_, pointIndex) =>
                          pointIndex !== index,
                      ),
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlotBoundaryEditor;
