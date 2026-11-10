import { Pencil, Trash2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { adminAuditMessage } from "../../features/admin/adminAudit_wb";
import { useState } from "react";
import AdminDialog from "../../components/admin/AdminDialog_wb";
import CropMilestonesDialog from "../../components/admin/CropMilestonesDialog_wb";
import AdminToast from "../../components/admin/AdminToast_wb";
import { DataTable, LoadFeedback, PageHead } from "../../components/admin/AdminUi_wb";
import { useAdminData } from "../../features/admin/useAdminData_wb";
import type { CropSummary } from "../../sevices/backend_api_types_wb";
import { webApi } from "../../sevices/webApi_wb";

const loadCrops = (signal: AbortSignal) => webApi.cropCatalog.listCrops({ signal });

function CropDialog({ crop, onClose, onSaved }: { crop: CropSummary | null; onClose: () => void; onSaved: (message: string, created?: CropSummary) => void }) {
  const [loadDetail] = useState(() => (signal: AbortSignal) => crop
    ? webApi.cropCatalog.getCropDetail({ path: { crop_id: crop.crop_id }, signal })
    : Promise.resolve(null));
  const detail = useAdminData(loadDetail);
  const ready = !crop || Boolean(detail.data);
  return <AdminDialog title={crop ? "Chỉnh sửa giống cây" : "Thêm giống cây"} submit="Lưu danh mục" onClose={onClose} onSave={ready ? async data => {
    const body = { name: String(data.get("name")).trim(), growth_days: Number(data.get("days")), planting_guide: String(data.get("guide")).trim() };
    if (!body.name) throw new Error("Nhập tên giống cây.");
    const saved = crop
      ? await webApi.cropCatalog.updateCrop({ path: { crop_id: crop.crop_id }, body })
      : await webApi.cropCatalog.createCrop({ body });
    onSaved(await adminAuditMessage("Đã lưu danh mục.", "crops", saved.crop_id, crop ? "Sửa giống cây" : "Thêm giống cây"), crop ? undefined : saved);
  } : undefined}>
    {ready ? <>
      <label>Tên giống cây<input name="name" defaultValue={crop?.name} required /></label>
      <label>Số ngày sinh trưởng<input name="days" type="number" min="1" defaultValue={crop?.growth_days} required /></label>
      <label>Hướng dẫn trồng<textarea name="guide" defaultValue={detail.data?.planting_guide ?? ""} /></label>
    </> : <LoadFeedback pending={detail.pending} error={detail.error} retry={detail.reload} />}
  </AdminDialog>;
}

export default function CatalogPage() {
  const { state } = useLocation();
  const [logTargetId, setLogTargetId] = useState<string | undefined>(state?.logTargetId);
  const crops = useAdminData(loadCrops);
  const [selected, setSelected] = useState<CropSummary | null>();
  const [cropToDelete, setCropToDelete] = useState<CropSummary>();
  const [milestoneCrop, setMilestoneCrop] = useState<CropSummary>();
  const [message, setMessage] = useState("");
  return <>
    <PageHead title="Danh mục giống cây" description="Quản lý danh mục giống cây dùng chung.">
      <button className="primary" onClick={() => setSelected(null)}>+ Thêm giống cây</button>
    </PageHead>
    {logTargetId && <div className="actions"><button type="button" onClick={() => setLogTargetId(undefined)}>Hiện tất cả</button></div>}
    <LoadFeedback pending={crops.pending} error={crops.error} retry={crops.reload} />
    <section className="panel admin-list-panel admin-catalog-panel"><DataTable headers={["Tên giống cây", "Số ngày sinh trưởng", "Thao tác"]} rows={(crops.data ?? []).filter(crop => !logTargetId || crop.crop_id === logTargetId).map(crop => ({
      id: crop.crop_id, cells: [crop.name, crop.growth_days, <div className="actions">
        <button type="button" onClick={() => setMilestoneCrop(crop)}>Mốc chăm sóc</button>
        <button className="table-icon-action" type="button" title="Chỉnh sửa" aria-label={`Chỉnh sửa ${crop.name}`} onClick={() => setSelected(crop)}><Pencil size={16} /></button>
        <button className="table-icon-action table-danger-action" type="button" title="Xóa" aria-label={`Xóa ${crop.name}`} onClick={() => setCropToDelete(crop)}><Trash2 size={16} /></button>
      </div>],
    }))} /></section>
    {selected !== undefined && <CropDialog crop={selected} onClose={() => setSelected(undefined)} onSaved={(message, created) => {
      crops.reload();
      setMessage(message);
      if (created) setMilestoneCrop(created);
    }} />}
    {milestoneCrop && <CropMilestonesDialog crop={milestoneCrop} onClose={() => setMilestoneCrop(undefined)} onSaved={setMessage} />}
    {cropToDelete && <AdminDialog title="Xóa giống cây?" submit="Xóa giống cây" onClose={() => setCropToDelete(undefined)} onSave={async () => {
      const cropId = cropToDelete.crop_id;
      await webApi.cropCatalog.deleteCrop({ path: { crop_id: cropId } });
      crops.reload();
      setMessage(await adminAuditMessage("Đã xóa giống cây.", "crops", cropId, "Xóa giống cây"));
    }}>
      <p>Bạn muốn xóa giống cây <strong>{cropToDelete.name}</strong> khỏi danh mục?</p>
    </AdminDialog>}
    <AdminToast message={message} clear={setMessage} />
  </>;
}
