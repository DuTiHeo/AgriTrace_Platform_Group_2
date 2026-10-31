import GeographicMap from "./GeographicMap_wb";
import "../../styles/plot_form_wb.css";
import {
  MapPinned,
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
  ReactNode,
} from "react";
import type { BoundaryPoint } from "../../features/owner/plot_wb";
import type { Farm } from "../../features/owner/farm_wb";
import { calculatePlotArea, getFarmPolygon, plotBoundaryError } from "../../utils/geometry_wb";

type PlotBoundaryEditorProps = {
  points: BoundaryPoint[];
  summary?: ReactNode;
  farm?: Farm | null;
  disabled?: boolean;
  onChange: (points: BoundaryPoint[]) => void;
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
  summary,
  points,
  farm,
  disabled = false,
  onChange,
}: PlotBoundaryEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState("");

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [addPointRequest, setAddPointRequest] = useState(0);
  const farmPolygon = getFarmPolygon(farm);
  const boundaryIssue = plotBoundaryError(points, farm);
  const commitPoints = (next: BoundaryPoint[], validate = true) => {
    if (disabled) return false;
    const issue = validate ? plotBoundaryError(next, farm) : "";
    setError(issue);
    if (issue) return false;
    onChange(next);
    return true;
  };
  const movePoint = (index: number, point: BoundaryPoint) =>
    commitPoints(points.map((current, i) => i === index ? point : current));
  const calculatedArea = useMemo(
    () => calculatePlotArea(points),
    [points],
  );

  const handleMapPoint = (point: BoundaryPoint) => {
    if (disabled) return;
    commitPoints([...points, point]);
  };

  const handleAutoAddPoint = (center: BoundaryPoint) => {
    if (disabled) return;
    const candidates = [center];
    if (farmPolygon.length) {
      const latitudes = farmPolygon.map(p => p.latitude);
      const longitudes = farmPolygon.map(p => p.longitude);
      const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes), maxLng = Math.max(...longitudes);
      const anchor = points.at(-1) ?? center;
      // Prefer a nearby vacant spot; test the whole resulting boundary, not just the point.
      for (const step of [0.02, 0.05, 0.1, 0.2]) {
        for (let direction = 0; direction < 8; direction++) {
          const angle = direction * Math.PI / 4;
          candidates.push({ latitude: anchor.latitude + Math.sin(angle) * (maxLat - minLat) * step,
            longitude: anchor.longitude + Math.cos(angle) * (maxLng - minLng) * step });
        }
      }
      for (let y = 1; y < 16; y++) for (let x = 1; x < 16; x++) {
        candidates.push({ latitude: minLat + (maxLat - minLat) * y / 16, longitude: minLng + (maxLng - minLng) * x / 16 });
      }
    }
    const point = candidates.map(p => ({ latitude: Number(p.latitude.toFixed(6)), longitude: Number(p.longitude.toFixed(6)) }))
      .find(p => !plotBoundaryError([...points, p], farm));
    if (point) commitPoints([...points, point]);
    else setError(plotBoundaryError(points, farm) || "Chưa tìm được chỗ đặt mốc mới hợp lệ. Hãy kéo chỉnh các mốc hiện có hoặc nhấp trực tiếp trong ranh giới nông trại.");
  };

  const handleAddCoordinate = () => {
    if (disabled) return;
    if (editingIndex === null && !latitude.trim() && !longitude.trim()) {
      setError("");
      setAddPointRequest(request => request + 1);
      return;
    }
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    if (
      !latitude.trim() || !longitude.trim() ||
      !Number.isFinite(parsedLatitude) ||
      !Number.isFinite(parsedLongitude)
    ) {
      setError("Vui lòng nhập đủ vĩ độ và kinh độ; hoặc để trống cả hai ô để thêm mốc tại tâm bản đồ.");
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

    const point = { latitude: parsedLatitude, longitude: parsedLongitude };
    const accepted = editingIndex === null
      ? commitPoints([...points, point])
      : movePoint(editingIndex, point);
    if (!accepted) return;
    setEditingIndex(null);

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

      if (commitPoints(importedPoints)) setEditingIndex(null);
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
              placeholder="20.999900"
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
              placeholder="105.842800"
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
            {editingIndex === null ? "Thêm điểm" : `Cập nhật GPS ${editingIndex + 1}`}
          </button>
          {editingIndex !== null && <button type="button" className="btn btn-secondary" onClick={() => { setEditingIndex(null); setLatitude(""); setLongitude(""); }}>Hủy sửa mốc</button>}
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
            onClick={() => { commitPoints(points.slice(0, -1), false); setEditingIndex(null); }}
          >
            <Undo2 size={17} />
          </button>

          <button
            className="icon-action-button danger"
            type="button"
            disabled={disabled || points.length === 0}
            aria-label="Xóa toàn bộ ranh giới"
            onClick={() => { commitPoints([], false); setEditingIndex(null); }}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      {(error || boundaryIssue) && (
        <div className="boundary-error" role="alert">{error || boundaryIssue}</div>
      )}

      <GeographicMap
        label="Bản đồ thiết lập ranh giới vùng trồng"
        points={points}
        regions={farmPolygon.length ? [{ id: farm!.id, kind: "farm", label: `Ranh giới ${farm!.name}`, points: farmPolygon.map((point, i) => ({ ...point, label: `NT ${i + 1}` })) }] : []}
        onAddPoint={disabled ? undefined : handleMapPoint}
        onAutoAddPoint={disabled ? undefined : handleAutoAddPoint}
        onMovePoint={disabled ? undefined : movePoint}
        addPointRequest={addPointRequest}
      />

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

      <div className={summary ? "boundary-summary-grid" : undefined}>
        <div className="boundary-point-list">
          {points.length === 0 && <p className="boundary-points-empty">Chưa có điểm tọa độ.</p>}
          {points.map((point, index) => (
            <div
              className="boundary-point-row"
              key={`${point.latitude}-${point.longitude}-${index}`}
            >
              <span>GPS {index + 1}</span>

              <code>
                {point.latitude.toFixed(6)},{" "}
                {point.longitude.toFixed(6)}
              </code>

              {!disabled && (
                <button
                  type="button"
                  aria-label={`Xóa điểm ${index + 1}`}
                  onClick={() =>
                    { setEditingIndex(null); commitPoints(
                      points.filter(
                        (_, pointIndex) =>
                          pointIndex !== index,
                      ), false,
                    ); }
                  }
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        {summary}
      </div>
    </div>
  );
}

export default PlotBoundaryEditor;
