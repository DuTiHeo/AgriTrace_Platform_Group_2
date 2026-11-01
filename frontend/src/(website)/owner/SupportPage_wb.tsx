import "../../styles/support_wb.css";
import { ImagePlus, LifeBuoy, Send, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useFarmContext } from "../../contexts/FarmContext_wb";
import { errorReportCategories } from "../../features/owner/support_wb";
import { supportService } from "../../sevices/supportService_wb";
export default function SupportPage() {
  const { farms, selectedFarmId } = useFarmContext();
  const [farmId, setFarmId] = useState("");
  const [category, setCategory] = useState("bug");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<Array<{ file: File; url: string }>>([]);
  const imageInput = useRef<HTMLInputElement>(null);
  const imageUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = imageUrls.current;
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); };
  }, []);
  const selectImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setNotice("");
    if (files.some(file => !file.type.startsWith("image/"))) { setError("Vui lòng chọn tệp ảnh."); return; }
    if (images.length + files.length > 3) { setError("Chỉ được chọn tối đa 3 ảnh."); return; }
    setError("");
    const additions = files.map(file => { const url = URL.createObjectURL(file); imageUrls.current.add(url); return { file, url }; });
    setImages(current => [...current, ...additions]);
  };
  const removeImage = (url: string) => {
    URL.revokeObjectURL(url); imageUrls.current.delete(url);
    setImages(current => current.filter(image => image.url !== url));
    setError("");
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    if (description.trim().length < 5) { setError("Mô tả cần ít nhất 5 ký tự."); return; }
    if (images.length) { setError("Chưa thể gửi ảnh đính kèm vì hệ thống chưa hỗ trợ tải ảnh báo lỗi lên máy chủ."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await supportService.create(farmId || (selectedFarmId !== "all" ? selectedFarmId : ""), { error_type: category, description: description.trim(), screenshot_url: null });
      setDescription("");
      setNotice("Đã gửi báo lỗi đến quản trị viên.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể gửi báo lỗi."); }
    finally { setBusy(false); }
  };
  return <div className="page support-page">
    <div className="page-heading"><div><h1>Hỗ trợ & báo lỗi</h1><p>Gửi thông tin lỗi hệ thống đến quản trị viên.</p></div></div>
    {error && <div className="page-error" role="alert">{error}</div>}{notice && <p role="status">{notice}</p>}
    <div className="support-form-only">
      <section className="card support-form-card"><div className="support-heading"><span className="support-icon"><LifeBuoy size={21} /></span><div><h2>Gửi báo lỗi</h2><p>Mô tả thao tác và lỗi bạn gặp phải.</p></div></div>
        <form onSubmit={submit}>
          <div className="support-form-row">
          <label><span>Nông trại *</span><select required disabled={busy} value={farmId || (selectedFarmId !== "all" ? selectedFarmId : "")} onChange={event => setFarmId(event.target.value)}><option value="">Chọn nông trại</option>{farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label>
          <label><span>Loại lỗi</span><select disabled={busy} value={category} onChange={event => setCategory(event.target.value)}>{Object.entries(errorReportCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <label><span>Mô tả lỗi *</span><textarea required minLength={5} rows={4} disabled={busy} value={description} onChange={event => setDescription(event.target.value)} /></label>
          <div className="support-image-section">
            <input ref={imageInput} type="file" accept="image/*" multiple hidden onChange={selectImages} disabled={busy || images.length >= 3} />
            <button className="btn btn-secondary support-upload-button" type="button" disabled={busy || images.length >= 3} onClick={() => imageInput.current?.click()}><ImagePlus size={18} />Đăng tải ảnh</button>
            <div className="support-image-preview" role="group" aria-label="Ảnh minh họa lỗi">
              {images.map(image => <figure key={image.url}><img src={image.url} alt={image.file.name} /><button type="button" aria-label={`Xóa ảnh ${image.file.name}`} disabled={busy} onClick={() => removeImage(image.url)}><X size={17} /></button></figure>)}
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy || !farms.length}><Send size={17} />{busy ? "Đang gửi..." : "Gửi báo lỗi"}</button>
        </form>
      </section>
    </div>
  </div>;
}


