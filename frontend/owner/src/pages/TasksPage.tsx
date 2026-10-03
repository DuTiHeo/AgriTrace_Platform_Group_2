import "../styles/tasks.css";
import { CalendarClock, CheckCheck, ClipboardList, Plus, Search, Send, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useFarmContext } from "../contexts/FarmContext";
import { getPersonnelList } from "../services/personnelService";
import { plotService } from "../services/plotService";
import { taskService } from "../services/taskService";
import { getTeamList } from "../services/teamService";
import type { Personnel } from "../types/personnel";
import type { Plot } from "../types/plot";
import type { Task, TaskStatus } from "../types/task";
import type { TeamSummary } from "../types/team";

type Draft = { farmId: string; plotId: string; teamId: string; assigneeId: string; content: string; startAt: string; dueAt: string };
type PageData = { tasks: Task[]; plots: Plot[]; teams: TeamSummary[]; personnel: Personnel[] };
const labels: Record<TaskStatus, string> = { in_progress: "Đang thực hiện", completed: "Đã hoàn thành", cancelled: "Đã hủy" };
function localTime(date: Date) { return new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString().slice(0,16); }
function emptyDraft(farmId: string): Draft {
  return { farmId, plotId: "", teamId: "", assigneeId: "", content: "", startAt: localTime(new Date()), dueAt: localTime(new Date(Date.now()+86400000)) };
}
function formatTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("vi-VN", { dateStyle:"medium", timeStyle:"short" }).format(date) : "Chưa ghi nhận";
}

export default function TasksPage() {
  const { farms, selectedFarmId, loadingFarms } = useFarmContext();
  const [data, setData] = useState<PageData>({ tasks:[], plots:[], teams:[], personnel:[] });
  const [loading,setLoading] = useState(true), [error,setError] = useState("");
  const [search,setSearch] = useState(""), [status,setStatus] = useState<TaskStatus|"all">("all");
  const [createOpen,setCreateOpen] = useState(false), [draft,setDraft] = useState(() => emptyDraft(""));
  const [saving,setSaving] = useState(false), [formError,setFormError] = useState(""), [notice,setNotice] = useState("");
  const requestId=useRef(0);
  const farmIds=useMemo(() => selectedFarmId === "all" ? farms.map(f=>f.id) : [selectedFarmId], [farms,selectedFarmId]);
  const load=useCallback(async () => {
    const id=++requestId.current;
    if (loadingFarms) return;
    setLoading(true); setError("");
    try {
      const groups=await Promise.all(farmIds.map(async farmId => {
        const [tasks,plots,teams,personnel]=await Promise.all([
          taskService.getAll(farmId), plotService.getAll(farmId),
          getTeamList({farmId,leaderStatus:"all"}), getPersonnelList({farmId,role:"all",teamId:"all",status:"all"}),
        ]);
        return {tasks,plots,teams,personnel};
      }));
      if (id!==requestId.current) return;
      setData({tasks:groups.flatMap(g=>g.tasks),plots:groups.flatMap(g=>g.plots),teams:groups.flatMap(g=>g.teams),personnel:groups.flatMap(g=>g.personnel)});
    } catch(e) { if(id===requestId.current) setError(e instanceof Error ? e.message : "Không thể tải công việc."); }
    finally { if(id===requestId.current) setLoading(false); }
  },[farmIds,loadingFarms]);
  useEffect(() => {
    const requestCounter=requestId;
    const timer=window.setTimeout(()=>void load(),0);
    const events=["tasks-updated","plots-updated","teams-updated","personnel-updated"];
    events.forEach(e=>window.addEventListener(e,load));
    return () => { window.clearTimeout(timer); requestCounter.current++; events.forEach(e=>window.removeEventListener(e,load)); };
  },[load]);
  const plots=data.plots.filter(p=>p.farmId===draft.farmId && p.status==="active");
  const teams=data.teams.filter(t=>t.farmId===draft.farmId);
  const members=data.personnel.filter(p=>p.teamId===draft.teamId && p.status==="active");
  const filtered=data.tasks.filter(t=>{
    const keyword=search.trim().toLocaleLowerCase("vi");
    const plot=data.plots.find(p=>p.id===t.plotId), team=data.teams.find(g=>g.id===t.teamId);
    return (status==="all" || t.status===status) && (!keyword || [t.content,t.assigneeName,plot?.name??"",team?.name??""].some(v=>v.toLocaleLowerCase("vi").includes(keyword)));
  }).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  const openCreate=()=>{ setDraft(emptyDraft(selectedFarmId==="all" ? farms[0]?.id??"" : selectedFarmId)); setFormError(""); setCreateOpen(true); };
  async function create(e:FormEvent) {
    e.preventDefault(); setSaving(true); setFormError("");
    try { await taskService.create(draft); setCreateOpen(false); setNotice("Đã giao công việc."); await load(); }
    catch(e) { setFormError(e instanceof Error ? e.message : "Không thể giao công việc."); }
    finally { setSaving(false); }
  }
  async function action(task:Task, cancel=false) {
    if(cancel && !window.confirm("Hủy công việc này?")) return;
    setSaving(true); setNotice("");
    try {
      if(cancel) await taskService.cancel(task.id,""); else await taskService.submitCompletion(task.id,task.assigneeId);
      setNotice(cancel ? "Đã hủy công việc." : "Đã hoàn thành công việc."); await load();
    } catch(e) { setNotice(e instanceof Error ? e.message : "Không thể cập nhật công việc."); }
    finally { setSaving(false); }
  }
  return <div className="page tasks-page">
    <div className="page-heading tasks-heading"><div><h1>Công việc</h1><p>Giao việc theo vùng trồng, tổ và người nhận.</p></div>
      <button className="btn btn-primary" onClick={openCreate} disabled={loading || farms.length===0}><Plus size={18}/>Giao công việc</button>
    </div>
    <section className="task-summary-grid">
      <article className="task-summary card"><ClipboardList size={20}/><span>Tổng công việc</span><strong>{data.tasks.filter(t=>t.status!=="cancelled").length}</strong></article>
      <article className="task-summary task-summary-active card"><CalendarClock size={20}/><span>Đang thực hiện</span><strong>{data.tasks.filter(t=>t.status==="in_progress").length}</strong></article>
      <article className="task-summary task-summary-completed card"><CheckCheck size={20}/><span>Đã hoàn thành</span><strong>{data.tasks.filter(t=>t.status==="completed").length}</strong></article>
    </section>
    {notice && <div className="task-notice" role="status">{notice}<button aria-label="Đóng thông báo" onClick={()=>setNotice("")}><X size={17}/></button></div>}
    {error && <div className="form-error" role="alert">{error} <button onClick={()=>void load()}>Thử lại</button></div>}
    <section className="task-list-panel card">
      <div className="task-toolbar"><label className="task-search"><Search size={18}/><input type="search" value={search} placeholder="Tìm công việc, vùng trồng, tổ hoặc người nhận" onChange={e=>setSearch(e.target.value)}/></label>
        <select value={status} aria-label="Lọc trạng thái" onChange={e=>setStatus(e.target.value as TaskStatus|"all")}><option value="all">Tất cả trạng thái</option>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      </div>
      {loading ? <div className="task-empty-state">Đang tải công việc...</div> : filtered.length ? <div className="task-list">{filtered.map(task=>{
        const person=data.personnel.find(p=>p.id===task.assigneeId);
        return <article className="task-row-card" key={task.id}><div className="task-row-main">
          <div className="task-row-title"><h2>{task.content}</h2><span className={`task-status task-status-${task.status}`}>{labels[task.status]}</span></div>
          <div className="task-context-line"><span>{data.plots.find(p=>p.id===task.plotId)?.name??"Vùng trồng"}</span><span>{data.teams.find(t=>t.id===task.teamId)?.name??"Tổ không còn tồn tại"}</span></div>
          <div className="task-assignment-line"><span><UserRound size={15}/>{task.assigneeName} {person ? `· ${person.role==="leader" ? "Tổ trưởng" : "Công nhân"}` : ""}</span><span><CalendarClock size={15}/>Hạn {formatTime(task.dueAt)}</span></div>
        </div>{task.status==="in_progress" && <div className="task-row-actions"><button className="btn btn-secondary" disabled={saving} onClick={()=>void action(task)}><Send size={16}/>Hoàn thành công việc</button><button className="task-cancel-button" aria-label="Hủy công việc" disabled={saving} onClick={()=>void action(task,true)}><X size={17}/></button></div>}</article>;
      })}</div> : <div className="task-empty-state"><ClipboardList size={34}/><strong>Chưa có công việc phù hợp</strong></div>}
    </section>
    {createOpen && <div className="modal-backdrop"><section className="app-modal task-create-modal" role="dialog" aria-modal="true" aria-labelledby="task-create-title">
      <header className="app-modal-header"><h2 id="task-create-title">Giao công việc</h2><button aria-label="Đóng" disabled={saving} onClick={()=>setCreateOpen(false)}><X size={20}/></button></header>
      <form className="task-create-form" onSubmit={create}>
        <label><span>Nông trại</span><select required value={draft.farmId} onChange={e=>setDraft(emptyDraft(e.target.value))}><option value="">Chọn nông trại</option>{farms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <label><span>Vùng trồng</span><select required value={draft.plotId} disabled={!draft.farmId} onChange={e=>setDraft({...draft,plotId:e.target.value})}><option value="">Chọn vùng trồng</option>{plots.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label><span>Tổ phụ trách</span><select required value={draft.teamId} disabled={!draft.farmId} onChange={e=>setDraft({...draft,teamId:e.target.value,assigneeId:""})}><option value="">Chọn tổ</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label><span>Người nhận</span><select required value={draft.assigneeId} disabled={!draft.teamId} onChange={e=>setDraft({...draft,assigneeId:e.target.value})}><option value="">Chọn người nhận</option>{members.map(p=><option key={p.id} value={p.id}>{p.fullName} · {p.role==="leader"?"Tổ trưởng":"Công nhân"}</option>)}</select></label>
        <label className="task-field-full"><span>Nội dung công việc</span><textarea required rows={3} maxLength={500} value={draft.content} onChange={e=>setDraft({...draft,content:e.target.value})}/></label>
        <div className="task-date-grid"><label><span>Bắt đầu</span><input required type="datetime-local" value={draft.startAt} onChange={e=>setDraft({...draft,startAt:e.target.value})}/></label><label><span>Hạn hoàn thành</span><input required type="datetime-local" value={draft.dueAt} onChange={e=>setDraft({...draft,dueAt:e.target.value})}/></label></div>
        {formError && <div className="form-error task-field-full" role="alert">{formError}</div>}
        <footer className="app-modal-footer task-field-full"><button className="btn btn-secondary" type="button" disabled={saving} onClick={()=>setCreateOpen(false)}>Hủy</button><button className="btn btn-primary" type="submit" disabled={saving || members.length===0}>{saving?"Đang lưu...":"Giao công việc"}</button></footer>
      </form>
    </section></div>}
  </div>;
}
