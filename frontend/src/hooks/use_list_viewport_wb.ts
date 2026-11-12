import { useEffect } from "react";
import type { RefObject } from "react";
import "../styles/list_viewport_wb.css";

const lists = [
  [".task-list", ":scope > *"],
  [".farming-log-list", ":scope > *"],
  [".team-card-grid", ":scope > *"],
  [".plots-map-list", ":scope > *"],
  [".notice-feed", ".notice-row"],
  [".plot-coordinate-list", ":scope > *"],
  [".boundary-point-list", ":scope > *"],
  [".harvest-contribution-list", ":scope > *"],
  [".personnel-history-list", ":scope > article"],
  [".season-note-list", ":scope > li"],
  [".season-team-list", ":scope > li"],
  [".farming-log-notes", ":scope > article"],
] as const;

/** Keep all records in the DOM; size each scroll area from its first 15 visual rows. */
export default function useListViewport(root: RefObject<HTMLElement | null>, pathname: string) {
  useEffect(() => {
    const scope = root.current;
    if (!scope || pathname === "/") return;
    let frame = 0;
    const originals = new Map<HTMLElement, { maxHeight: string; tabIndex: string | null; label: string | null; role: string | null }>();
    const observed = new Set<Element>();
    const remember = (host: HTMLElement) => {
      if (!originals.has(host)) originals.set(host, { maxHeight: host.style.maxHeight, tabIndex: host.getAttribute("tabindex"), label: host.getAttribute("aria-label"), role: host.getAttribute("role") });
    };
    const restore = (host: HTMLElement) => {
      const original = originals.get(host);
      if (!original) return;
      host.classList.remove("owner-list-viewport");
      host.style.maxHeight = original.maxHeight;
      for (const [key, value] of [["tabindex", original.tabIndex], ["aria-label", original.label], ["role", original.role]] as const) {
        if (value === null) host.removeAttribute(key); else host.setAttribute(key, value);
      }
    };
    const measure = () => {
      frame = 0;
      const targets = new Map<HTMLElement, HTMLElement[]>();
      scope.querySelectorAll<HTMLTableElement>("table").forEach(table => {
        if (table.parentElement) targets.set(table.parentElement, Array.from(table.querySelectorAll<HTMLElement>("tbody > tr")));
      });
      lists.forEach(([selector, rowSelector]) => scope.querySelectorAll<HTMLElement>(selector).forEach(host => {
        targets.set(host, Array.from(host.querySelectorAll<HTMLElement>(rowSelector)));
      }));
      const nextObserved = new Set<Element>([scope]);
      targets.forEach((rows, host) => {
        remember(host);
        const visibleRows = rows.filter(row => row.getClientRects().length && row.offsetHeight > 0);
        visibleRows.forEach(row => nextObserved.add(row));
        // Cards sharing a horizontal grid line count as one row.
        const lines: { top: number; bottom: number }[] = [];
        for (const row of visibleRows) {
          const rect = row.getBoundingClientRect();
          const last = lines.at(-1);
          if (last && Math.abs(last.top - rect.top) < 2) last.bottom = Math.max(last.bottom, rect.bottom);
          else lines.push({ top: rect.top, bottom: rect.bottom });
        }
        if (lines.length <= 15) { restore(host); return; }
        const style = getComputedStyle(host);
        const height = Math.ceil(lines[14].bottom - host.getBoundingClientRect().top + host.scrollTop
          + parseFloat(style.paddingBottom || "0") + parseFloat(style.borderBottomWidth || "0"));
        host.classList.add("owner-list-viewport");
        host.style.maxHeight = `${height}px`;
        if (!host.hasAttribute("tabindex")) host.tabIndex = 0;
        if (!host.hasAttribute("role")) host.setAttribute("role", "region");
        if (!host.hasAttribute("aria-label")) host.setAttribute("aria-label", "Danh sách, hiển thị tối đa 15 hàng. Cuộn để xem thêm.");
      });
      originals.forEach((_, host) => { if (!targets.has(host)) { restore(host); originals.delete(host); } });
      observed.forEach(element => { if (!nextObserved.has(element)) { resize.unobserve(element); observed.delete(element); } });
      nextObserved.forEach(element => { if (!observed.has(element)) { observed.add(element); resize.observe(element); } });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const resize = new ResizeObserver(schedule);
    const mutation = new MutationObserver(schedule);
    mutation.observe(scope, { subtree: true, childList: true, characterData: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      mutation.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", schedule);
      originals.forEach((_, host) => restore(host));
    };
  }, [root, pathname]);
}
