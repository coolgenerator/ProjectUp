/* Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#039 */
import React, { useEffect, useRef } from "react";
import "./tokens.css";
import "./lucian-039.css";

// [title, detail, right-hand value, gradient, badge]
type Row = [string, string, string, string, string?];

export interface MatchPreviewTab {
    label: string;
    rows: Row[];
}

interface Props {
    tabs: MatchPreviewTab[];
    ariaLabel: string;
}

// Sliding pill tabs: the pill glides to the chosen tab and its rows slide in
// from the direction you moved. Used to preview what each side of a match sees.
const MatchPreviewTabs: React.FC<Props> = ({ tabs: tabData, ariaLabel }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = ref.current!;
        const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>(".u039-tab"));
        const pill = root.querySelector(".u039-pill") as HTMLElement;
        const panel = root.querySelector(".u039-panel") as HTMLElement;
        const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const ac = new AbortController();
        const opts = { signal: ac.signal };
        const pending: number[] = [];
        const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
        let cur = 0;
        let list: HTMLUListElement | null = null;

        function movePill(animate: boolean) {
            const t = tabs[cur];
            if (!animate) pill.style.transition = "none";
            pill.style.setProperty("--x", t.offsetLeft + "px");
            pill.style.setProperty("--w", t.offsetWidth + "px");
            if (!animate) { void pill.offsetWidth; pill.style.transition = ""; }
        }
        function make(i: number) {
            const ul = document.createElement("ul");
            ul.className = "u039-list";
            ul.innerHTML = tabData[i].rows.map((r, k) =>
                '<li class="u039-row" style="transition-delay:' + (k * 45) + 'ms"><span class="u039-art" style="--g:' + r[3] + '" aria-hidden="true"></span><span><b>' + esc(r[0]) + (r[4] ? '<span class="u039-badge">' + esc(r[4]) + "</span>" : "") + "</b><small>" + esc(r[1]) + "</small></span><em>" + esc(r[2]) + "</em></li>"
            ).join("");
            return ul;
        }
        function select(i: number, focus?: boolean) {
            if (i === cur && list) return;
            const dir = i > cur ? 1 : -1;
            cur = i;
            tabs.forEach((t, k) => { t.setAttribute("aria-selected", String(k === i)); t.tabIndex = k === i ? 0 : -1; });
            if (focus) tabs[i].focus();
            movePill(true);
            const next = make(i), old = list;
            list = next;
            if (!old || rm) { if (old) old.remove(); panel.appendChild(next); return; }
            Array.from(next.children as HTMLCollectionOf<HTMLElement>).forEach((r) => { r.style.transform = "translateX(" + (dir * 70) + "%)"; r.style.opacity = "0"; });
            panel.appendChild(next);
            void next.offsetWidth;
            Array.from(next.children as HTMLCollectionOf<HTMLElement>).forEach((r) => { r.style.transform = ""; r.style.opacity = ""; });
            Array.from(old.children as HTMLCollectionOf<HTMLElement>).forEach((r) => { r.style.transform = "translateX(" + (-dir * 60) + "%)"; r.style.opacity = "0"; });
            pending.push(window.setTimeout(() => { old.remove(); }, 700));
        }
        tabs.forEach((t, i) => {
            t.addEventListener("click", () => select(i), opts);
            t.addEventListener("keydown", (e) => {
                const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                if (d) { e.preventDefault(); select((i + d + tabs.length) % tabs.length, true); }
            }, opts);
        });
        const uid = "u039-" + Math.random().toString(36).slice(2, 7);
        panel.id = uid;
        tabs.forEach((t) => t.setAttribute("aria-controls", uid));
        list = make(0);
        panel.appendChild(list);
        tabs.forEach((t, k) => { t.tabIndex = k === 0 ? 0 : -1; });
        movePill(false);

        return () => {
            ac.abort();
            pending.forEach(clearTimeout);
            panel.replaceChildren();
        };
    }, [tabData]);

    return (
        <div ref={ref} className="ux u039">
            <div className="u039-tabs" role="tablist" aria-label={ariaLabel}>
                <span className="u039-pill" aria-hidden="true"></span>
                {tabData.map((t, i) => (
                    <button key={t.label} className="u039-tab" type="button" role="tab" aria-selected={i === 0}>{t.label}</button>
                ))}
            </div>
            <div className="u039-panel" role="tabpanel"></div>
        </div>
    );
};

export default MatchPreviewTabs;
