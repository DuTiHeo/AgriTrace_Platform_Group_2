import { Plus, Trash2, Undo2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { useFarmContext } from "../../contexts/FarmContext_wb";
import { plotService } from "../../sevices/plotService_wb";
import { conflictingFarm, plotBoundaryError } from "../../utils/geometry_wb";
import { parseBoundaryFile } from "../../utils/parseBoundaryFile_wb";
import "../../styles/plot_form_wb.css";
import GeographicMap from "./GeographicMap_wb";
import type { MapRegion } from "./GeographicMap_wb";

type Props = Omit<ComponentProps<typeof GeographicMap>, "pointsKind"> & { farmId?: string; onReplacePoints?: (points: NonNullable<ComponentProps<typeof GeographicMap>["points"]>) => void };

export default function FarmBoundaryMap({ farmId, regions = [], points = [], onAddPoint, onAutoAddPoint, onMovePoint, onReplacePoints, ...props }: Props) {
  const { farms, farmError, loadingFarms } = useFarmContext();
  const [plots, setPlots] = useState<Awaited<ReturnType<typeof plotService.getMapBoundaries>>>([]);
  const [plotStatus, setPlotStatus] = useState<"loading" | "ready" | "error">("loading");
  const [addPointRequest, setAddPointRequest] = useState(0);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    let request = 0;
    const refresh = async () => {
      const current = ++request;
      try {
        const data = await plotService.getMapBoundaries();
        if (current !== request) return;
        setPlots(data);
        setPlotStatus("ready");
      } catch {
        if (current === request) setPlotStatus("error");
      }
    };
    void refresh();
    window.addEventListener("plots-updated", refresh);
    return () => {
      request++;
      window.removeEventListener("plots-updated", refresh);
    };
  }, []);

  const farmNames = new Map(farms.map(farm => [farm.id, farm.name]));
  const references: MapRegion[] = [];
  for (const farm of farms) {
    if (farm.id === farmId || !farm.boundary?.isValid) continue;
    references.push({
      id: farm.id,
      label: farm.name,
      kind: "farm",
      reference: true,
      points: farm.boundary.points.map(point => ({ latitude: point.x, longitude: point.y })),
    });
  }
  for (const plot of plots) {
    if (plot.boundary.length < 3) continue;
    const farmName = farmNames.get(plot.farmId);
    references.push({
      id: plot.id,
      label: farmName ? `${plot.name} · ${farmName}` : plot.name,
      reference: true,
      points: plot.boundary,
    });
  }

  const acceptPoints = (next: typeof points) => {
    if (loadingFarms || farmError || (farmId && plotStatus !== "ready")) {
      setEditError("Cần tải đầy đủ ranh giới tham chiếu trước khi đặt mốc GPS.");
      return false;
    }
    const conflict = conflictingFarm(next, farms, farmId);
    if (conflict) {
      setEditError(`Ranh giới không được chạm hoặc lấn vào nông trại ${conflict.name}.`);
      return false;
    }
    const ownPlots = plots.filter(plot => plot.farmId === farmId && plot.boundary.length >= 3);
    const draft = { boundary: {
      method: "map" as const, projection: "WGS84", area: 0, perimeter: 0, isValid: true,
      points: next.map((point, index) => ({ id: String(index), x: point.latitude, y: point.longitude, note: "" })),
    } };
    const outside = ownPlots.find(plot => plotBoundaryError(plot.boundary, draft, true));
    if (outside) {
      setEditError(`Ranh giới nông trại phải bao trọn vùng trồng ${outside.name}.`);
      return false;
    }
    setEditError("");
    return true;
  };

  return <div className="farm-boundary-map">
    {onAutoAddPoint && onReplacePoints && <div className="boundary-coordinate-inputs">
      <label><span>Vĩ độ</span><input type="number" step="any" placeholder="20.999900" value={latitude} onChange={event => setLatitude(event.target.value)} /></label>
      <label><span>Kinh độ</span><input type="number" step="any" placeholder="105.842800" value={longitude} onChange={event => setLongitude(event.target.value)} /></label>
      <button className="btn btn-secondary" type="button" onClick={() => {
        if (!latitude.trim() && !longitude.trim()) {
          setAddPointRequest(count => count + 1);
          return;
        }
        const point = { latitude: Number(latitude), longitude: Number(longitude) };
        if (!latitude.trim() || !longitude.trim() || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) {
          setEditError("Nhập vĩ độ và kinh độ GPS hợp lệ.");
          return;
        }
        if (acceptPoints([...points, point])) {
          onAutoAddPoint(point);
          setLatitude("");
          setLongitude("");
        }
      }}><Plus size={17} />Thêm điểm</button>
      <button className="btn btn-secondary" type="button" onClick={() => fileInput.current?.click()}><Upload size={17} />Nhập tệp</button>
      <input ref={fileInput} hidden type="file" accept=".csv,.txt,.json" onChange={async event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (!file) return;
        try {
          const imported = parseBoundaryFile(await file.text());
          if (imported.length < 3 || imported.some(point => Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180)) {
            throw new Error("Tệp cần ít nhất 3 điểm GPS hợp lệ.");
          }
          if (acceptPoints(imported)) onReplacePoints(imported);
        } catch (error) {
          setEditError(error instanceof Error ? error.message : "Không thể đọc tệp tọa độ.");
        }
      }} />
      <button className="btn btn-secondary" type="button" title="Bỏ điểm cuối" aria-label="Bỏ điểm cuối" disabled={!points.length} onClick={() => { setEditError(""); onReplacePoints(points.slice(0, -1)); }}><Undo2 size={17} /></button>
      <button className="btn btn-secondary" type="button" title="Xóa tất cả điểm" aria-label="Xóa tất cả điểm" disabled={!points.length} onClick={() => { setEditError(""); onReplacePoints([]); }}><Trash2 size={17} /></button>
    </div>}
    <GeographicMap {...props} points={points} pointsKind="farm" regions={[...references, ...regions]}
      onAddPoint={onAddPoint && (point => {
        if (acceptPoints([...points, point])) onAddPoint(point);
      })}
      addPointRequest={onAutoAddPoint ? addPointRequest : props.addPointRequest}
      onAutoAddPoint={onAutoAddPoint && (point => {
        if (acceptPoints([...points, point])) onAutoAddPoint(point);
      })}
      onMovePoint={onMovePoint && ((index, point) =>
        acceptPoints(points.map((current, i) => i === index ? point : current)) && onMovePoint(index, point)
      )}
    />
    {editError && <p className="form-error" role="alert">{editError}</p>}
    {(farmError || plotStatus === "error") ? (
      <p className="geographic-map-status" role="status">Không tải được đầy đủ ranh giới tham chiếu.</p>
    ) : (loadingFarms || plotStatus === "loading") && (
      <p className="geographic-map-status" role="status">Đang tải ranh giới tham chiếu…</p>
    )}
  </div>;
}
