import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../styles/geographic_map_wb.css";

type Point = { latitude: number; longitude: number; label?: string };
type Region = { id: string; label: string; points: Point[]; href?: string; kind?: "farm" };
type Props = {
  points?: Point[];
  pointsKind?: "farm" | "plot";
  regions?: Region[];
  onAddPoint?: (point: Point) => void;
  onAutoAddPoint?: (point: Point) => void;
  onMovePoint?: (index: number, point: Point) => boolean;
  addPointRequest?: number;
  label: string;
};

// Approximate campus centre, 207 Giải Phóng, Hà Nội.
const NEU: L.LatLngTuple = [20.9999, 105.8428];
const validPoint = (point: Point) => Number.isFinite(point.latitude)
  && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90
  && Math.abs(point.longitude) <= 180;

export default function GeographicMap({ points = [], pointsKind = "plot", regions = [], onAddPoint, onAutoAddPoint, onMovePoint, addPointRequest = 0, label }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.FeatureGroup | null>(null);
  const addPointRef = useRef(onAddPoint);
  const autoAddRef = useRef(onAutoAddPoint);
  const movePointRef = useRef(onMovePoint);
  const focusedRegionRef = useRef("");
  const statusRef = useRef<HTMLParagraphElement>(null);
  const handledRequestRef = useRef(0);

  useEffect(() => { addPointRef.current = onAddPoint; autoAddRef.current = onAutoAddPoint; movePointRef.current = onMovePoint; }, [onAddPoint, onAutoAddPoint, onMovePoint]);

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { doubleClickZoom: false }).setView(NEU, 16);
    mapRef.current = map;
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    tiles.on("tileerror", () => {
      if (statusRef.current) statusRef.current.textContent = "Không tải được bản đồ nền. Kiểm tra kết nối mạng; tọa độ và ranh giới vẫn được giữ nguyên.";
    });
    layersRef.current = L.featureGroup().addTo(map);
    L.circleMarker(NEU, { radius: 7 }).addTo(map).bindTooltip("Đại học Kinh tế Quốc dân (NEU)");
    map.on("click", (event: L.LeafletMouseEvent) => {
      addPointRef.current?.({ latitude: Number(event.latlng.lat.toFixed(6)), longitude: Number(event.latlng.lng.toFixed(6)) });
    });
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(container.current);
    return () => { resize.disconnect(); map.remove(); mapRef.current = null; layersRef.current = null; focusedRegionRef.current = ""; };
  }, []);

  useEffect(() => {
    if (!addPointRequest || handledRequestRef.current === addPointRequest) return;
    const center = mapRef.current?.getCenter();
    if (!center) return;
    handledRequestRef.current = addPointRequest;
    (autoAddRef.current ?? addPointRef.current)?.({ latitude: Number(center.lat.toFixed(6)), longitude: Number(center.lng.toFixed(6)) });
  }, [addPointRequest]);

  useEffect(() => {
    const group = layersRef.current;
    if (!group) return;
    group.clearLayers();
    const tokens = getComputedStyle(container.current!);
    const primary = tokens.getPropertyValue("--agri-primary").trim() || "currentColor";
    const farmColor = tokens.getPropertyValue("--agri-info-text").trim() || primary;
    const draw = (items: Point[], text?: string, href?: string, editable = false, farm = false) => {
      const color = farm ? farmColor : primary;
      const validItems = items.map((point, index) => ({ point, index })).filter(item => validPoint(item.point));
      const coordinates: L.LatLngTuple[] = validItems.map(({point}) => [point.latitude, point.longitude]);
      if (!coordinates.length) return;
      const shape = coordinates.length >= 3
        ? L.polygon(coordinates, { color, fillOpacity: farm ? 0.06 : 0.25, weight: farm ? 3 : 2, dashArray: farm ? "10 6" : undefined, interactive: !editable })
        : L.polyline(coordinates, { color, interactive: !editable });
      shape.addTo(group);
      if (text) {
        const content = document.createElement(href ? "a" : "span");
        content.textContent = text;
        if (content instanceof HTMLAnchorElement && href) content.href = href;
        shape.bindPopup(content);
        const tooltip = document.createElement("span");
        tooltip.textContent = text;
        shape.bindTooltip(tooltip);
      }
      coordinates.forEach((coordinate, position) => {
        const { point, index } = validItems[position];
        const name = point.label || `GPS ${index + 1}`;
        const icon = document.createElement("span");
        icon.className = `gps-marker-dot ${farm ? "gps-marker-farm" : ""}`;
        icon.textContent = String(index + 1);
        const marker = L.marker(coordinate, {
          icon: L.divIcon({ className: `gps-marker ${editable ? "gps-marker-editable" : ""}`, html: icon, iconSize: [32, 32], iconAnchor: [16, 16] }),
          draggable: editable,
          autoPan: true,
          title: editable ? `${name}: kéo để chỉnh vị trí` : name,
          keyboard: true,
          bubblingMouseEvents: false,
        }).addTo(group);
        if (editable) {
          marker.on("drag", () => {
            const location = marker.getLatLng();
            coordinates[position] = [location.lat, location.lng];
            shape.setLatLngs(coordinates);
          });
          marker.on("dragend", () => {
            const location = marker.getLatLng();
            const accepted = movePointRef.current?.(index, { latitude: Number(location.lat.toFixed(6)), longitude: Number(location.lng.toFixed(6)) });
            if (!accepted) {
              marker.setLatLng(coordinate);
              coordinates[position] = coordinate;
              shape.setLatLngs(coordinates);
            }
          });
        }
      });
    };
    regions.forEach(region => draw(region.points, region.label, region.href, false, region.kind === "farm"));
    draw(points, undefined, undefined, !!onMovePoint, pointsKind === "farm");
    const region = regions[0];
    if (region && (onMovePoint || region.kind === "farm") && focusedRegionRef.current !== region.id && region.points.some(validPoint)) {
      mapRef.current?.fitBounds(L.latLngBounds([...region.points, ...points].filter(validPoint).map(p => [p.latitude, p.longitude] as L.LatLngTuple)), { padding: [45, 45], maxZoom: 18 });
      focusedRegionRef.current = region.id;
    }
  }, [points, pointsKind, regions, onMovePoint]);

  return <div className="geographic-map">
    {(points.length > 0 || regions.length > 0) && <div className="geographic-map-legend" aria-label="Chú giải bản đồ">
      {(regions.some(region => region.kind === "farm") || (pointsKind === "farm" && points.length > 0)) && <span><i className="map-key-farm" />Ranh giới nông trại</span>}
      {(regions.some(region => region.kind !== "farm") || (pointsKind === "plot" && points.length > 0)) && <span><i className="map-key-plot" />Ranh giới vùng trồng</span>}
    </div>}
    <div className="geographic-map-canvas" ref={container} role="region" aria-label={label} />
    <p className="geographic-map-status" ref={statusRef} role="status" />
  </div>;
}
