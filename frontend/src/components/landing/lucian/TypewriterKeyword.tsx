/* Lucian UX/UI Prompt #307 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#307 */
import React, { useEffect, useRef } from "react";
import "./tokens.css";
import "./lucian-307.css";

export interface TypewriterWord {
    word: string;
    color: string; // a --ux-* color token, e.g. "var(--ux-mint)"
}

interface Props {
    kicker: string;
    lead: string;
    words: TypewriterWord[];
    tail?: string;
    chipsLabel: string;
}

// Typewriter rotating keyword: only the last word of the sentence is deleted
// and retyped; the chips below jump straight to a word.
const TypewriterKeyword: React.FC<Props> = ({ kicker, lead, words, tail = "", chipsLabel }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = ref.current!;
        const line = root.querySelector(".u307-line") as HTMLElement;
        const wEl = root.querySelector(".u307-w") as HTMLElement;
        const sr = root.querySelector(".u307-sr") as HTMLElement;
        const chips = Array.from(root.querySelectorAll<HTMLButtonElement>(".u307-chip"));
        const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const WORDS = words.map((w) => w.word);
        const COLORS = words.map((w) => w.color);
        const CHO = [0x3131, 0x3132, 0x3134, 0x3137, 0x3138, 0x3139, 0x3141, 0x3142, 0x3143, 0x3145, 0x3146, 0x3147, 0x3148, 0x3149, 0x314A, 0x314B, 0x314C, 0x314D, 0x314E];
        let cur = 0, timer = 0, hold = false, busy = false;
        // StrictMode re-runs this effect on the same nodes, so listeners must be removable
        const ac = new AbortController();
        const opts = { signal: ac.signal };

        function frames(word: string) {
            const out: string[] = [];
            let pre = "";
            Array.from(word).forEach((ch) => {
                const c = ch.charCodeAt(0) - 0xAC00;
                if (c >= 0 && c < 11172) {
                    const jong = c % 28, base = ch.charCodeAt(0) - jong;
                    out.push(pre + String.fromCharCode(CHO[Math.floor(c / 588)]));
                    out.push(pre + String.fromCharCode(base));
                    if (jong) out.push(pre + ch);
                } else out.push(pre + ch);
                pre += ch;
            });
            return out;
        }
        function wait(ms: number, fn: () => void) {
            clearTimeout(timer);
            timer = window.setTimeout(() => { if (root.isConnected) fn(); }, ms);
        }
        function go(i: number, manual?: boolean) {
            if (busy && !manual) return;
            busy = true;
            cur = i;
            chips.forEach((c, k) => c.setAttribute("aria-pressed", String(k === i)));
            const target = WORDS[i], seq = frames(target);
            root.classList.add("is-typing");
            if (rm) { wEl.textContent = target; done(); return; }
            (function del() {
                const s = wEl.textContent || "";
                if (s.length) { wEl.textContent = s.slice(0, -1); wait(55, del); return; }
                root.style.setProperty("--c", COLORS[i]);
                let k = 0;
                wait(220, function type() {
                    wEl.textContent = seq[k++];
                    if (k < seq.length) wait(70 + Math.random() * 70, type); else done();
                });
            })();
        }
        function done() {
            root.classList.remove("is-typing");
            root.style.setProperty("--c", COLORS[cur]);
            sr.textContent = WORDS[cur];
            busy = false;
            next();
        }
        function next() { wait(2300, () => { if (hold) { next(); return; } go((cur + 1) % WORDS.length); }); }
        chips.forEach((c, i) => c.addEventListener("click", () => { if (i !== cur || busy) go(i, true); }, opts));
        line.addEventListener("pointerenter", () => { hold = true; }, opts);
        line.addEventListener("pointerleave", () => { hold = false; }, opts);
        wEl.textContent = "";
        go(0, true);

        return () => { clearTimeout(timer); ac.abort(); };
    }, [words]);

    return (
        <div ref={ref} className="ux u307">
            <p className="u307-k">{kicker}</p>
            <p className="u307-line">
                <span className="u307-a">{lead}</span> <span className="u307-sr"></span>
                <span className="u307-b">
                    <span className="u307-w" aria-hidden="true"></span>
                    <span className="u307-caret" aria-hidden="true"></span>
                    <span className="u307-tail">{tail}</span>
                </span>
            </p>
            <div className="u307-chips" role="group" aria-label={chipsLabel}>
                {words.map((w, i) => (
                    <button
                        key={w.word}
                        className="u307-chip"
                        type="button"
                        aria-pressed={i === 0}
                        style={{ "--k": w.color } as React.CSSProperties}
                    >
                        {w.word}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TypewriterKeyword;
