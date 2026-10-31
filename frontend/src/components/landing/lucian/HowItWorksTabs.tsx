/* Lucian UX/UI Prompt #213 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#213 */
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./tokens.css";
import "./lucian-213.css";

// Auto-advancing feature tabs adapted to the three product steps: the AI asks
// (document lines write themselves), the idea is shaped into a two-week plan
// (calendar blocks drop in) and candidates are matched (score counts up, bars grow).
// [weekday, top %, height %]; labels come from landing.how.demo.plan
const PLAN = [
    [0, 8, 22], [1, 30, 20], [2, 6, 16],
    [2, 52, 24], [3, 18, 30], [4, 40, 18],
] as const;
const PLAN_COLORS = ["#6366F1", "#EC4899", "#0EA5E9", "#F59E0B", "#10B981", "#8B5CF6"];
const MATCH_SCORE = 92;

// Mount it with key={language}: the script reads the translated text once.
const HowItWorksTabs: React.FC = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();
    const d = (key: string) => t("landing.how.demo." + key);
    const list = (key: string) => t("landing.how.demo." + key, { returnObjects: true }) as unknown as string[];
    const tabs = list("tabs");
    const planLabels = list("plan");
    const scoreText = (n: number) => t("landing.how.demo.score", { n });

    useEffect(() => {
        const root = ref.current!;
        const T = Array.from(root.querySelectorAll<HTMLButtonElement>(".u213-tb"));
        const P = Array.from(root.querySelectorAll<HTMLElement>(".u213-pn"));
        const pv = root.querySelector(".u213-pv") as HTMLElement;
        const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const ac = new AbortController();
        const opts = { signal: ac.signal };
        const uid = "u213" + Math.random().toString(36).slice(2, 7);
        T.forEach((t, i) => { t.id = uid + "t" + i; P[i].id = uid + "p" + i; t.setAttribute("aria-controls", P[i].id); P[i].setAttribute("aria-labelledby", t.id); });

        const wk = root.querySelector(".u213-wk") as HTMLElement;
        const created: HTMLElement[] = [];
        PLAN.forEach((e, i) => {
            const d = document.createElement("div");
            d.className = "u213-ev";
            d.textContent = planLabels[i];
            d.style.cssText = "left:calc(" + e[0] * 20 + "% + 1px);width:calc(20% - 6px);top:calc(18px + " + e[1] + "% * .8);height:calc(" + e[2] + "% * .8);background:" + PLAN_COLORS[i] + ";transition-delay:" + (0.15 + i * 0.09) + "s";
            wk.appendChild(d);
            created.push(d);
        });
        root.querySelectorAll<HTMLElement>(".u213-ln").forEach((l, i) => { l.style.transitionDelay = (0.1 + i * 0.12) + "s"; });
        root.querySelectorAll<HTMLElement>(".u213-br i").forEach((b, i) => { b.style.transitionDelay = (0.08 + i * 0.06) + "s"; });

        const cr = root.querySelector(".u213-cr") as HTMLElement;
        const kp = root.querySelector(".u213-kp b") as HTMLElement;
        const DUR = 4200;
        let cur = -1, acc = 0, last = 0, hold = false, vis = true, raf = 0;
        let sub: number[] = [];
        const clearSub = () => { sub.forEach(clearTimeout); sub = []; };

        // Scenes are picked by panel content rather than index, since the tab order changed
        function scene(i: number) {
            const p = P[i];
            p.classList.remove("is-play"); void p.offsetWidth; p.classList.add("is-play"); clearSub();
            if (p.querySelector(".u213-ln")) {
                const L = p.querySelectorAll<HTMLElement>(".u213-ln");
                cr.style.transform = "translate(0,0)";
                [1, 2, 3, 5].forEach((n, k) => {
                    sub.push(window.setTimeout(() => {
                        const l = L[n];
                        cr.style.transform = "translate(" + (l.offsetWidth * parseFloat(l.style.getPropertyValue("--w"))).toFixed(0) + "px," + (l.offsetTop - 40 - 3) + "px)";
                    }, rm ? 0 : 250 + k * 380));
                });
            }
            if (p.querySelector(".u213-kp")) {
                const t0 = performance.now();
                if (rm) { kp.textContent = scoreText(MATCH_SCORE); return; }
                (function f(now: number) {
                    const k = Math.min(1, (now - t0) / 1100), e = 1 - Math.pow(1 - k, 3);
                    kp.textContent = scoreText(Math.round(MATCH_SCORE * e));
                    if (k < 1 && cur === i && root.isConnected) requestAnimationFrame(f);
                })(t0);
            }
        }
        function go(i: number) {
            if (i === cur) return;
            cur = i; acc = 0;
            T.forEach((t, k) => {
                const on = k === i;
                t.classList.toggle("is-on", on); t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1;
                (t.querySelector("b") as HTMLElement).style.transform = "scaleX(" + (on && rm ? 1 : 0) + ")";
            });
            P.forEach((p, k) => { p.classList.toggle("is-on", k === i); p.setAttribute("aria-hidden", String(k !== i)); if (k !== i) p.classList.remove("is-play"); });
            scene(i);
        }
        function tick(now: number) {
            raf = 0;
            if (!root.isConnected || rm) return;
            if (!hold && vis) acc += Math.min(64, now - last);
            last = now;
            const p = Math.min(1, acc / DUR);
            (T[cur].querySelector("b") as HTMLElement).style.transform = "scaleX(" + p.toFixed(3) + ")";
            if (p >= 1) go((cur + 1) % T.length);
            if (vis) raf = requestAnimationFrame(tick);
        }
        function run() { if (!raf && !rm) { last = performance.now(); raf = requestAnimationFrame(tick); } }
        T.forEach((t, i) => {
            t.addEventListener("click", () => { go(i); run(); }, opts);
            t.addEventListener("keydown", (e) => {
                const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                if (d) { e.preventDefault(); const n = (i + d + T.length) % T.length; go(n); T[n].focus(); }
            }, opts);
        });
        pv.addEventListener("pointerenter", () => { hold = true; }, opts);
        pv.addEventListener("pointerleave", () => { hold = false; }, opts);
        root.addEventListener("focusin", () => { hold = true; }, opts);
        root.addEventListener("focusout", () => { hold = false; }, opts);
        let io: IntersectionObserver | null = null;
        if ("IntersectionObserver" in window) {
            io = new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis) run(); });
            io.observe(root);
        }
        go(0); run();

        return () => {
            ac.abort();
            cancelAnimationFrame(raf);
            clearSub();
            io?.disconnect();
            created.forEach((d) => d.remove());
        };
        // Text is read once; the parent remounts this component when the language changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div ref={ref} className="ux u213">
            <div className="u213-hd"><small>{d("kicker")}</small><h3>{d("title")}</h3></div>
            <div className="u213-tl" role="tablist" aria-label={d("tablistLabel")}>
                <button type="button" className="u213-tb" role="tab"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.8h5.5L13 5.3v8.4a.6.6 0 0 1-.6.6H4a.6.6 0 0 1-.6-.6V2.4a.6.6 0 0 1 .6-.6z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M6 8.5h4.5M6 11h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>{tabs[0]}<i><b></b></i></button>
                <button type="button" className="u213-tb" role="tab"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>{tabs[1]}<i><b></b></i></button>
                <button type="button" className="u213-tb" role="tab"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>{tabs[2]}<i><b></b></i></button>
            </div>
            <div className="u213-pv">
                <div className="u213-pn" role="tabpanel">
                    <div className="u213-dh"><b>{d("docHeading")}</b><em>{d("docStatus")}</em></div>
                    <div className="u213-ln is-h" style={{ "--w": ".55" } as React.CSSProperties}></div>
                    <div className="u213-ln" style={{ "--w": ".95" } as React.CSSProperties}></div>
                    <div className="u213-ln" style={{ "--w": ".82" } as React.CSSProperties}></div>
                    <div className="u213-ln" style={{ "--w": ".9" } as React.CSSProperties}></div>
                    <div className="u213-ln is-h" style={{ "--w": ".4" } as React.CSSProperties}></div>
                    <div className="u213-ln" style={{ "--w": ".75" } as React.CSSProperties}></div>
                    <div className="u213-ln" style={{ "--w": ".6" } as React.CSSProperties}></div>
                    <span className="u213-cr" data-label={d("cursor")} aria-hidden="true"></span>
                </div>
                <div className="u213-pn" role="tabpanel">
                    <small>{d("planLabel")}</small>
                    <div className="u213-wk">{list("weekdays").map((w) => <span key={w}>{w}</span>)}</div>
                </div>
                <div className="u213-pn" role="tabpanel">
                    <small>{d("matchLabel")}</small>
                    <div className="u213-kp"><b>{scoreText(0)}</b><span>{d("scoreNote")}</span></div>
                    <div className="u213-br">
                        <i style={{ "--h": "38%" } as React.CSSProperties}></i><i style={{ "--h": "52%" } as React.CSSProperties}></i>
                        <i style={{ "--h": "44%" } as React.CSSProperties}></i><i style={{ "--h": "63%" } as React.CSSProperties}></i>
                        <i style={{ "--h": "58%" } as React.CSSProperties}></i><i style={{ "--h": "76%" } as React.CSSProperties}></i>
                        <i style={{ "--h": "94%" } as React.CSSProperties}></i>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HowItWorksTabs;
