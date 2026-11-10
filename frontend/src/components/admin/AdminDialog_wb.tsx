import { isDialogBackdropClick } from "../../utils/dialogBackdrop_wb";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export default function AdminDialog({ title, submit, onSave, onClose, children, footer }: {
  title: string;
  submit?: string;
  onSave?: (data: FormData) => Promise<void>;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  return <dialog onClick={event => { if (!busy && isDialogBackdropClick(event)) onClose(); }} className="app-modal admin-dialog" ref={dialog} aria-labelledby="admin-dialog-title" onCancel={event => {
    event.preventDefault();
    if (!busy) onClose();
  }}>
    <form onSubmit={async event => {
      event.preventDefault();
      if (!onSave || busy) return;
      setBusy(true);
      setError("");
      try {
        await onSave(new FormData(event.currentTarget));
        onClose();
      } catch (error) {
        setError(error instanceof Error ? error.message : "Không thể lưu thay đổi.");
        setBusy(false);
      }
    }}>
      <div className="app-modal-header">
        <h2 id="admin-dialog-title">{title}</h2>
        <button type="button" aria-label="Đóng hộp thoại" onClick={onClose} disabled={busy}><X size={18} /></button>
      </div>
      <div className="app-modal-body">
        <fieldset className="admin-dialog-fields" disabled={busy}>{children}</fieldset>
        <div className="form-feedback" role="alert">{error}</div>
      </div>
      {(footer !== null || onSave) && <div className="app-modal-footer">
        {footer ?? <button className="btn btn-secondary" type="button" onClick={onClose} disabled={busy}>{onSave ? "Hủy" : "Đóng"}</button>}
        {onSave && <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Đang lưu..." : submit}</button>}
      </div>}
    </form>
  </dialog>;
}
