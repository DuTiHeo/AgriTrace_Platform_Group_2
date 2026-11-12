import type { ReactNode } from "react";
import { pages, type AdminPage } from "../../features/admin/data_wb";

export function Icon({ page }: { page: AdminPage }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={pages[page][1]} /></svg>;
}

export function PageHead({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="page-head"><div><h1>{title}</h1><p className="muted">{description}</p></div>{children}</div>;
}

export function Badge({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function DataTable({ headers, rows }: { headers: string[]; rows: { id: string; cells: ReactNode[] }[] }) {
  return <div className="table-wrap" tabIndex={0} role="region" aria-label="Bảng dữ liệu"><table>
    <thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead>
    <tbody>{rows.length ? rows.map(({ id, cells }) => <tr key={id}>{cells.map((cell, index) => <td key={headers[index]}>{cell}</td>)}</tr>)
      : <tr><td className="empty" colSpan={headers.length}>Không có dữ liệu phù hợp.</td></tr>}</tbody>
  </table></div>;
}

export function SearchBox({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <input type="search" aria-label={label} placeholder={label} value={value} onChange={event => onChange(event.target.value)} />;
}

export function Filter({ label, options, value, onChange }: { label: string; options: Record<string, string>; value: string; onChange: (value: string) => void }) {
  return <select aria-label={label} value={value} onChange={event => onChange(event.target.value)}>
    <option value="">{label}</option>{Object.entries(options).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
  </select>;
}

export function LoadFeedback({ pending, error, retry }: { pending: boolean; error?: string; retry: () => void }) {
  if (error) return <div className="notice" role="alert">{error} <button type="button" onClick={retry}>Thử lại</button></div>;
  return pending ? <p className="muted" role="status">Đang tải dữ liệu...</p> : null;
}
