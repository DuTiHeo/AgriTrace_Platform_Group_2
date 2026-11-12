import { isDialogBackdropClick } from "../../utils/dialogBackdrop_wb";
import { AlertTriangle, ArrowLeftRight, Eye, PauseCircle, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  to: string;
  name: string;
  statusLabel: string;
  resume?: boolean;
  statusIcon?: "toggle" | "change";
  onStatus?: (status: string, date: string) => void | Promise<void>;
  statusOptions?: Array<{ value: string; label: string }>;
  currentStatus?: string;
  statusDescription?: string;
};

type Action = "view" | "status" | "delete";

export function ListActionConfirmation({ action, name, statusLabel, onClose, onConfirm, unavailable, description, statusOptions, currentStatus, title: customTitle, confirmLabel }: {
  action: Action; name: string; statusLabel: string; onClose: () => void;
  onConfirm: (status: string, date: string) => void | Promise<void>;
  unavailable?: string; description?: string; statusOptions?: Props["statusOptions"]; currentStatus?: string;
  title?: string; confirmLabel?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(currentStatus ?? statusOptions?.[0]?.value ?? "");
  const [date, setDate] = useState("");
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { trigger?.focus(); };
  }, []);
  const title = customTitle ?? (action === "view" ? "Xem chi tiết?" : action === "delete" ? "Xóa dữ liệu?" : `${statusLabel}?`);
  const confirm = async () => {
    if (busy || unavailable) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm(status, date);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể thực hiện thao tác. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };
  return createPortal(
    <dialog ref={dialog} className="list-action-dialog" aria-labelledby="list-action-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} onClick={(event) => { if (!busy && isDialogBackdropClick(event)) onClose(); }}>
      <form onSubmit={(event) => { event.preventDefault(); void confirm(); }}>
        <div className={`list-action-symbol ${action === "delete" ? "is-danger" : ""}`}><AlertTriangle size={24} /></div>
        <h2 id="list-action-title">{title}</h2>
        <p className="list-action-name">{name}</p>
        <p>{unavailable ?? description ?? (action === "view" ? "Bạn muốn mở trang chi tiết của mục này?" : action === "delete" ? "Vui lòng xác nhận trước khi xóa mục này." : "Vui lòng xác nhận thay đổi trạng thái.")}</p>
        {action === "status" && statusOptions && <div className="list-action-fields">
          <label>Trạng thái mới<select value={status} onChange={(event) => setStatus(event.target.value)} disabled={busy}>{statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          {status === "completed" && <label>Ngày thu hoạch thực tế<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} disabled={busy} /></label>}
        </div>}
        {error && <div className="form-error-block" role="alert">{error}</div>}
        <div className="list-action-footer">
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={onClose}>{unavailable ? "Đóng" : "Hủy"}</button>
          {!unavailable && <button className={`btn ${action === "delete" ? "btn-danger" : "btn-primary"}`} type="submit" disabled={busy}>{busy ? "Đang xử lý..." : confirmLabel ?? (action === "view" ? "Xem chi tiết" : action === "delete" ? "Xác nhận xóa" : "Xác nhận")}</button>}
        </div>
      </form>
    </dialog>, document.body,
  );
}

export function DetailViewLink({ to, name, children, className }: { to: string; name: string; children: ReactNode; className?: string }) {
  return <Link to={to} className={className} title="Xem chi tiết" aria-label={`Xem chi tiết ${name}`}>{children}</Link>;
}

export default function ListRowActions({ to, name, statusLabel, resume = false, statusIcon = "toggle", onStatus, statusDescription, statusOptions, currentStatus }: Props) {
  const [statusOpen, setStatusOpen] = useState(false);
  const StatusIcon = statusIcon === "change" ? ArrowLeftRight : resume ? PlayCircle : PauseCircle;
  return <>
    <div className="list-row-actions" role="group" aria-label={`Thao tác với ${name}`}>
      <DetailViewLink to={to} name={name}><Eye size={16} /></DetailViewLink>
      <button type="button" title={statusLabel} aria-label={`${statusLabel}: ${name}`} onClick={() => setStatusOpen(true)}><StatusIcon size={16} /></button>
    </div>
    {statusOpen && <ListActionConfirmation action="status" name={name} statusLabel={statusLabel} onClose={() => setStatusOpen(false)}
      unavailable={!onStatus ? "Chưa thể thay đổi trạng thái mục này." : undefined}
      description={statusDescription} statusOptions={statusOptions} currentStatus={currentStatus}
      onConfirm={async (status, date) => { await onStatus?.(status, date); }} />}
  </>;
}
