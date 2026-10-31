/* Lucian UX/UI Prompt #044 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#044 */
import React, { useEffect, useRef } from "react";
import "./tokens.css";
import "./lucian-044.css";

export interface FaqItem {
    question: string;
    answer: string;
    linkLabel: string;
    href: string;
}

interface Props {
    items: FaqItem[];
    onNavigate: (href: string) => void;
}

// FAQ accordion: one question open at a time; the plus folds into a minus.
const FaqAccordion: React.FC<Props> = ({ items: faq, onNavigate }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = ref.current!;
        const items = Array.from(root.querySelectorAll<HTMLElement>(".u044-it"));
        const qs = items.map((it) => it.querySelector(".u044-q") as HTMLButtonElement);
        const ac = new AbortController();
        const opts = { signal: ac.signal };
        const uid = "u044-" + Math.random().toString(36).slice(2, 7);
        items.forEach((it, i) => {
            const q = qs[i], body = it.querySelector(".u044-body") as HTMLElement;
            q.id = uid + "-q" + i; body.id = uid + "-a" + i;
            q.setAttribute("aria-controls", body.id); body.setAttribute("aria-labelledby", q.id);
        });
        function set(it: HTMLElement, open: boolean) {
            it.classList.toggle("open", open);
            (it.querySelector(".u044-q") as HTMLElement).setAttribute("aria-expanded", String(open));
            (it.querySelector(".u044-a a") as HTMLAnchorElement).tabIndex = open ? 0 : -1;
        }
        items.forEach((it, i) => {
            set(it, it.classList.contains("open"));
            qs[i].addEventListener("click", () => {
                const willOpen = !it.classList.contains("open");
                items.forEach((o) => { if (o !== it) set(o, false); });
                set(it, willOpen);
            }, opts);
            qs[i].addEventListener("keydown", (e) => {
                const n = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? qs.length - 1 : -2;
                if (n === -2) return;
                e.preventDefault();
                qs[(n + qs.length) % qs.length].focus();
            }, opts);
            // The original only prevents navigation; here the links go to real pages
            const link = it.querySelector(".u044-a a") as HTMLAnchorElement;
            link.addEventListener("click", (e) => { e.preventDefault(); onNavigate(link.getAttribute("href") || "/"); }, opts);
        });
        return () => ac.abort();
    }, [faq, onNavigate]);

    return (
        <div ref={ref} className="ux u044">
            {faq.map((item, i) => (
                <div key={item.question} className={"u044-it" + (i === 0 ? " open" : "")}>
                    <button className="u044-q" type="button" aria-expanded={i === 0}>
                        <span className="u044-n">{String(i + 1).padStart(2, "0")}</span>
                        <span className="u044-t">{item.question}</span>
                        <span className="u044-pm" aria-hidden="true"></span>
                    </button>
                    <div className="u044-body" role="region">
                        <div>
                            <div className="u044-a">
                                <p>{item.answer}</p>
                                <a href={item.href}>{item.linkLabel} <i aria-hidden="true">→</i></a>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FaqAccordion;
