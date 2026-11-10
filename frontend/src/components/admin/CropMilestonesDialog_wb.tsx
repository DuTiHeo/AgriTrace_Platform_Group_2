import { useState } from "react";
import AdminDialog from "./AdminDialog_wb";
import { LoadFeedback } from "./AdminUi_wb";
import { adminAuditMessage } from "../../features/admin/adminAudit_wb";
import { adminCodeLabel } from "../../features/admin/data_wb";
import { useAdminData } from "../../features/admin/useAdminData_wb";
import type { CropDetail, CropSummary, MilestoneCreate, MilestoneOut } from "../../sevices/backend_api_types_wb";
import { webApi } from "../../sevices/webApi_wb";

type Row = { key: string; saved?: MilestoneOut };

function MilestoneEditor({ crop, onClose, onSaved }: {
  crop: CropDetail;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const crop_id = crop.crop_id;
  const [rows, setRows] = useState<Row[]>(() => [...(crop.milestones ?? [])]
    .sort((a, b) => a.days_after_planting - b.days_after_planting)
    .map(saved => ({ key: saved.milestone_id, saved })));
  const [removed, setRemoved] = useState<MilestoneOut[]>([]);

  async function save(data: FormData) {
    const edits = rows.map(({ key, saved }) => {
      const days = String(data.get(`${key}-days`)).trim();
      const taskType = String(data.get(`${key}-type`)).trim();
      const body: MilestoneCreate = {
        days_after_planting: Number(days),
        task_type: saved && taskType === adminCodeLabel(saved.task_type) ? saved.task_type : taskType,
        description: String(data.get(`${key}-description`)).trim(),
      };
      if (!days || !Number.isInteger(body.days_after_planting) || body.days_after_planting < 0 || !body.task_type) {
        throw new Error("Mỗi mốc cần loại công việc và số ngày nguyên từ 0 trở lên.");
      }
      return { key, saved, body };
    });
    let changed = false;
    let auditWarning = "";
    async function audit(id: string, action: string) {
      changed = true;
      const warning = await adminAuditMessage("", "crop_care_milestones", id, action);
      if (warning) auditWarning = warning;
    }

    for (const { key, saved, body } of edits) {
      if (saved && saved.days_after_planting === body.days_after_planting && saved.task_type === body.task_type &&
          (saved.description ?? "") === body.description) continue;
      const result = saved
        ? await webApi.cropCatalog.updateMilestone({ path: { crop_id, milestone_id: saved.milestone_id }, body })
        : await webApi.cropCatalog.createMilestone({ path: { crop_id }, body });
      setRows(current => current.map(row => row.key === key ? { ...row, saved: result } : row));
      await audit(result.milestone_id, saved ? "Sửa mốc chăm sóc" : "Thêm mốc chăm sóc");
    }
    for (const item of removed) {
      await webApi.cropCatalog.deleteMilestone({ path: { crop_id, milestone_id: item.milestone_id } });
      setRemoved(current => current.filter(saved => saved.milestone_id !== item.milestone_id));
      await audit(item.milestone_id, "Xóa mốc chăm sóc");
    }
    if (changed) onSaved("Đã lưu các mốc chăm sóc." + auditWarning);
  }

  return <AdminDialog title="Mốc chăm sóc" submit="Lưu mốc chăm sóc" onClose={onClose} onSave={save}>
    <p><strong>{crop.name}</strong></p>
    <div className="milestone-rows">
      {rows.length === 0 && <p className="muted">Chưa có mốc chăm sóc.</p>}
      {rows.map(({ key, saved }, index) => <fieldset className="milestone-row" key={key}>
        <legend>Mốc {index + 1}</legend>
        <label>Ngày sau khi trồng<input name={`${key}-days`} type="number" min="0" step="1" required defaultValue={saved?.days_after_planting} /></label>
        <label>Loại công việc<input name={`${key}-type`} required maxLength={50} defaultValue={saved && adminCodeLabel(saved.task_type)} /></label>
        <label>Mô tả<input name={`${key}-description`} defaultValue={saved?.description ?? ""} /></label>
        <button type="button" aria-label={`Xóa mốc ${index + 1}`} onClick={() => {
          if (saved) setRemoved(current => [...current, saved]);
          setRows(current => current.filter(row => row.key !== key));
        }}>Xóa</button>
      </fieldset>)}
    </div>
    <div className="actions">
      <button type="button" onClick={() => setRows(current => [...current, { key: crypto.randomUUID() }])}>+ Thêm mốc</button>
    </div>
  </AdminDialog>;
}

export default function CropMilestonesDialog({ crop, onClose, onSaved }: {
  crop: CropSummary;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [load] = useState(() => (signal: AbortSignal) =>
    webApi.cropCatalog.getCropDetail({ path: { crop_id: crop.crop_id }, signal }));
  const detail = useAdminData(load);
  if (detail.data) return <MilestoneEditor crop={detail.data} onClose={onClose} onSaved={onSaved} />;
  return <AdminDialog title="Mốc chăm sóc" onClose={onClose}>
    <LoadFeedback pending={detail.pending} error={detail.error} retry={detail.reload} />
  </AdminDialog>;
}
