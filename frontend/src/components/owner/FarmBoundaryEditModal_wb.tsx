import { Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import FarmBoundaryEditor from "./FarmBoundaryEditor_wb";
import { farmService } from "../../sevices/farmService_wb";
import type { Farm, FarmBoundary } from "../../features/owner/farm_wb";
import "../../styles/farm_form_wb.css";

export default function FarmBoundaryEditModal({ farm, onClose, onSaved }: {
  farm: Farm; onClose: () => void; onSaved: (farm: Farm) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [boundary, setBoundary] = useState<FarmBoundary | null>(farm.boundary);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { trigger?.focus(); };
  }, []);

  const save = async () => {
    if (saving || !boundary?.isValid) return;
    setSaving(true);
    setError("");
    try {
      const updated = await farmService.update(farm.id, { boundary });
      if (!updated) throw new Error("Không tìm thấy nông trại.");
      onSaved(updated);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu ranh giới.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog ref={dialog} className="farm-boundary-dialog" aria-labelledby="farm-boundary-edit-title"
      onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}
    >
      <div className="detail-modal-heading">
        <div><h2 id="farm-boundary-edit-title">Chỉnh sửa ranh giới</h2><p>{farm.name}</p></div>
        <button type="button" aria-label="Đóng" disabled={saving} onClick={onClose}><X size={20} /></button>
      </div>
      <div className="farm-boundary-dialog-body">
        <div inert={saving}>
          <FarmBoundaryEditor boundary={boundary} onChange={(value) => { setBoundary(value); setError(""); }}
            summary={<div className="farm-boundary-area" aria-live="polite"><span>Diện tích từ ranh giới</span><strong>{boundary?.isValid ? `${boundary.area.toLocaleString("vi-VN")} ha` : "Chưa xác định"}</strong></div>}
          />
        </div>
        {error && <div className="form-message form-message-error" role="alert">{error}</div>}
      </div>
      <div className="detail-modal-actions">
        <button className="btn btn-secondary" type="button" disabled={saving} onClick={onClose}>Hủy</button>
        <button className="btn btn-primary" type="button" disabled={saving || !boundary?.isValid} onClick={() => void save()}><Save size={17} />{saving ? "Đang lưu..." : "Lưu ranh giới"}</button>
      </div>
    </dialog>
  );
}
