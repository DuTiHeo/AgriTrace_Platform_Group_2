import { useEffect, useRef, useState } from 'react';
import { convertVN2000, parseVN2000Coordinates } from '../../sevices/vn2000Service_wb';
import type { BoundaryPoint } from '../../features/owner/plot_wb';
import '../../styles/vn2000_wb.css';

export default function VN2000Import({ disabled, onConverted }: { disabled: boolean; onConverted: (points: BoundaryPoint[]) => boolean }) {
  const [text, setText] = useState('');
  const [meridian, setMeridian] = useState("105°00'");
  const [zone, setZone] = useState<3 | 6>(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const convert = async () => {
    if (disabled || busy) return;
    setError('');
    let points;
    try { points = parseVN2000Coordinates(text); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Tọa độ chưa hợp lệ.'); return; }
    const request = new AbortController(); controller.current = request; setBusy(true);
    try {
      const result = await convertVN2000('plots', { points, central_meridian: meridian, zone_width: zone }, request.signal);
      if (!request.signal.aborted) onConverted(result.points);
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không chuyển được tọa độ.');
    } finally { if (!request.signal.aborted) setBusy(false); }
  };
  return <details className="vn2000-import"><summary>Nhập tọa độ VN-2000</summary>
    <fieldset disabled={disabled || busy} className="vn2000-fields">
      <label><span>Kinh tuyến trục</span><input value={meridian} onChange={event => setMeridian(event.target.value)} placeholder="105°00'" /></label>
      <label><span>Múi chiếu</span><select value={zone} onChange={event => setZone(Number(event.target.value) as 3 | 6)}><option value={3}>3 độ</option><option value={6}>6 độ</option></select></label>
      <label className="vn2000-points"><span>Tọa độ X (Bắc), Y (Đông) — mỗi điểm một dòng</span><textarea rows={5} value={text} onChange={event => setText(event.target.value)} placeholder={'2323000, 585000\n2323000, 585100\n2323100, 585100'} /></label>
      <label className="vn2000-points"><span>Tải bảng tọa độ TXT/CSV</span><input type="file" accept=".txt,.csv" onChange={event => {
        const file = event.target.files?.[0]; event.target.value = '';
        if (file) void file.text().then(setText).catch(() => setError('Không đọc được tệp tọa độ.'));
      }} /></label>
      <button className="btn btn-secondary" type="button" onClick={() => void convert()}>{busy ? 'Đang chuyển tọa độ…' : 'Chuyển tọa độ và áp dụng lên bản đồ'}</button>
    </fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}
  </details>;
}
