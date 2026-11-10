import type { Farm, FarmBoundary, FarmFormData, FarmOwner, FarmStatus } from "../features/owner/farm_wb";
import { accountService } from "./accountService_wb";
import { ApiError, httpClient } from "./httpClient_wb";
import { conflictingFarm, getFarmPolygon, plotBoundaryError } from "../utils/geometry_wb";
import { plotService } from "./plotService_wb";
import { convertVN2000 } from "./vn2000Service_wb";

type OrganizationDto = {
    org_id: string;
    name: string;
    address: string | null;
    status: FarmStatus;
    owner_id: string | null;
    created_at: string | null;
    updated_at?: string | null;
    boundary_geojson?: {
      type?: string;
      coordinates?: number[][][];
    } | null;
    harvest_batches_count?: number;
    plots_count?: number;
    active_seasons_count?: number;
  };

function toFarmBoundary(geometry?: OrganizationDto["boundary_geojson"]): FarmBoundary | null {
    if (!geometry || geometry.type !== "Polygon") return null;
    const ring = geometry.coordinates?.[0] ?? [];
    const coordinates = ring.length > 1 ? ring.slice(0, -1) : ring;
    const points = coordinates.map(([longitude, latitude], index) => ({
      id: `M${index + 1}`,
      x: latitude,
      y: longitude,
      note: `Điểm GPS ${index + 1}`,
    }));

    if (points.length < 3) return null;

    const averageLatitude =
      points.reduce((total, point) => total + point.x, 0) / points.length;
    const metricPoints = points.map((point) => ({
      x: point.y * 111320 * Math.cos((averageLatitude * Math.PI) / 180),
      y: point.x * 110540,
    }));
    let twiceArea = 0;
    let perimeter = 0;
    metricPoints.forEach((point, index) => {
      const next = metricPoints[(index + 1) % metricPoints.length];
      twiceArea += point.x * next.y - next.x * point.y;
      perimeter += Math.hypot(next.x - point.x, next.y - point.y);
    });

    return {
      method: "map",
      projection: "GPS · WGS84",
      points,
      area: Number((Math.abs(twiceArea) / 20000).toFixed(2)),
      perimeter: Math.round(perimeter),
      isValid: true,
    };
  }

function boundaryPayload(boundary: FarmBoundary | null) {
    if (!boundary) return { boundary_geojson: null };
    if (!boundary.isValid || boundary.points.length < 3) {
      throw new Error("Ranh giới cần tối thiểu 3 điểm hợp lệ.");
    }

    if (boundary.method === "vn2000") {
      return {
        boundary_vn2000: {
          points: boundary.points.map(({ x, y }) => ({ x, y })),
          central_meridian: boundary.projection.replace(/^VN-2000 · Kinh tuyến trục\s*/, ""),
          zone_width: 3 as const,
        },
      };
    }

    const ring = boundary.points.map((point) => [point.y, point.x]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
    return { boundary_geojson: { type: "Polygon", coordinates: [ring] } };
  }

async function resolveBoundaryGeometry(boundary: FarmBoundary | null) {
  const payload = boundaryPayload(boundary);
  return payload.boundary_vn2000
    ? (await convertVN2000("organizations", payload.boundary_vn2000)).boundary_geojson
    : payload.boundary_geojson;
}

function ensureNoFarmConflict(boundary: FarmBoundary | null, farms: Farm[], farmId?: string) {
  const conflict = conflictingFarm(getFarmPolygon({ boundary }), farms, farmId);
  if (conflict) throw new Error(`Ranh giới không được chạm hoặc lấn vào nông trại ${conflict.name}.`);
}

function composeAddress(data: Pick<FarmFormData, "address" | "district" | "province">) {
    const parts = [data.address.trim(), data.district.trim(), data.province.trim()]
      .filter(Boolean)
      .reduce<string[]>((uniqueParts, part) => {
        const duplicate = uniqueParts.some((existing) =>
          existing.toLocaleLowerCase("vi").includes(part.toLocaleLowerCase("vi"))
          || part.toLocaleLowerCase("vi").includes(existing.toLocaleLowerCase("vi")),
        );
        return duplicate ? uniqueParts : [...uniqueParts, part];
      }, []);
    return parts.join(", ");
  }

function addressRegion(address: string) {
    const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
    const removePrefix = (value: string) =>
      value.replace(/^(tỉnh|thành phố|tp\.|huyện|thị xã|quận)\s+/i, "");
    return {
      province: removePrefix(parts.at(-1) ?? ""),
      district: removePrefix(parts.at(-2) ?? ""),
    };
  }

function mapOrganization(dto: OrganizationDto, owner: FarmOwner): Farm {
    const boundary = toFarmBoundary(dto.boundary_geojson);
    const address = dto.address ?? "";
    const region = addressRegion(address);
    return {
      id: dto.org_id,
      code: `FARM-${dto.org_id.slice(0, 8).toUpperCase()}`,
      name: dto.name,
      address,
      ...region,
      estimatedArea: boundary?.area ?? 0,
      owner,
      status: dto.status,
      establishedAt: dto.created_at?.slice(0, 10) ?? "",
      boundary,
      linkedData: {
        plotCount: dto.plots_count ?? 0,
        activeSeasonCount: dto.active_seasons_count ?? 0,
        harvestBatchCount: dto.harvest_batches_count ?? 0,
      },
      createdAt: dto.created_at ?? "",
      updatedAt: dto.updated_at ?? dto.created_at ?? "",
    };
  }

async function getOwner(): Promise<FarmOwner> {
    const account = await accountService.getAccount();
    return { name: account.fullName, phone: account.phone, email: account.email };
  }

async function getDetails(id: string) {
    return httpClient.get<OrganizationDto>(`/organizations/${id}`);
  }

export const farmService = {
    async getAll(): Promise<Farm[]> {
      const [owner, currentUser] = await Promise.all([
        getOwner(),
        accountService.getCurrentUser(),
      ]);
      const organizationPath = currentUser.role === "owner"
        ? "/organizations/mine"
        : "/organizations";
      const organizations = await httpClient.get<OrganizationDto[]>(organizationPath);
      const batches = await httpClient.get<Array<{ org_id: string; status: string }>>("/harvest-batches");
      return Promise.all(organizations.map(async (organization) => {
        const detail = await getDetails(organization.org_id);
        detail.harvest_batches_count = batches.filter((batch) => batch.org_id === detail.org_id && batch.status !== "cancelled").length;
        return mapOrganization(detail, owner);
      }));
    },

    async getById(id: string): Promise<Farm | null> {
      try {
        const [organization, owner] = await Promise.all([getDetails(id), getOwner()]);
        const batches = await httpClient.get<Array<{ status: string }>>(`/harvest-batches?org_id=${encodeURIComponent(id)}`);
        organization.harvest_batches_count = batches.filter((batch) => batch.status !== "cancelled").length;
        return mapOrganization(organization, owner);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },

    async create(data: FarmFormData): Promise<Farm> {
      const geometry = await resolveBoundaryGeometry(data.boundary);
      if (geometry) ensureNoFarmConflict(toFarmBoundary(geometry), await this.getAll());
      const organization = await httpClient.post<OrganizationDto>("/organizations", {
        name: data.name.trim(),
        address: composeAddress(data),
        boundary_geojson: geometry,
      });
      const owner = await getOwner();
      window.dispatchEvent(new Event("farms-updated"));
      return mapOrganization(organization, owner);
    },

    async update(id: string, data: Partial<FarmFormData>): Promise<Farm | null> {
      const payload: Record<string, unknown> = {};
      if (data.name !== undefined) payload.name = data.name.trim();
      if (data.address !== undefined || data.district !== undefined || data.province !== undefined) {
        const current = await this.getById(id);
        if (!current) return null;
        payload.address = composeAddress({
          address: data.address ?? current.address,
          district: data.district ?? current.district,
          province: data.province ?? current.province,
        });
      }
      if (data.boundary !== undefined) {
        const geometry = await resolveBoundaryGeometry(data.boundary);
        const farm = { boundary: toFarmBoundary(geometry) };
        if (geometry) ensureNoFarmConflict(farm.boundary, await this.getAll(), id);
        const plots = await plotService.getMapBoundaries(id);
        const outside = plots.find(plot => plot.boundary.length >= 3 && plotBoundaryError(plot.boundary, farm, true));
        if (outside) throw new Error(`Ranh giới nông trại phải bao trọn vùng trồng ${outside.name}.`);
        payload.boundary_geojson = geometry;
      }
      if (data.status !== undefined) payload.status = data.status;

      try {
        const [organization, owner] = await Promise.all([
          httpClient.patch<OrganizationDto>(`/organizations/${id}`, payload),
          getOwner(),
        ]);
        window.dispatchEvent(new Event("farms-updated"));
        const batches = await httpClient.get<Array<{ status: string }>>(`/harvest-batches?org_id=${encodeURIComponent(id)}`);
        organization.harvest_batches_count = batches.filter((batch) => batch.status !== "cancelled").length;
        return mapOrganization(organization, owner);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },

    async changeStatus(id: string, status: FarmStatus): Promise<Farm | null> {
      return this.update(id, { status });
    },

    async delete(id: string): Promise<DeleteFarmResult> {
      try {
        await httpClient.delete<void>(`/organizations/${id}?soft=true`);
        window.dispatchEvent(new Event("farms-updated"));
        return { success: true, message: "Nông trại đã được chuyển sang trạng thái tạm ngưng." };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "Không thể cập nhật nông trại.",
        };
      }
    },
  };

export type DeleteFarmResult = {
  success: boolean;
  message: string;
};
