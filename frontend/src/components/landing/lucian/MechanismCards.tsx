/* Lucian UX/UI Prompt #251 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#251 */
import React, { useEffect, useRef } from "react";
import "./tokens.css";
import "./lucian-251.css";

interface Props {
    kicker: string;
    title: string;
    description: string;
    // [title, one-line detail, optional inner SVG for a 16x16 icon]; six of them
    features: [string, string, string?][];
    ctaLabel: string;
    ctaHref: string;
    onCta: () => void;
}

const COL = ["#6366F1", "#EC4899", "#10B981", "#F59E0B", "#0EA5E9", "#8B5CF6"];
const ICO = [
    '<circle cx="7.5" cy="7.5" r="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    '<path d="M3 13l1-3.5L11 2.5l2.5 2.5L6.5 12z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    '<path d="M3 9a5 5 0 1 0 1.5-3.6M3 2.5v3h3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    '<rect x="3" y="7" width="10" height="7" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    '<path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z" fill="currentColor"/>',
    '<circle cx="4" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="4" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 7l4-2M6 9l4 2" stroke="currentColor" stroke-width="1.6"/>',
];

// Staggered scroll-in feature cards: scroll inside the card and each feature
// rises in turn while its icon pops.
const MechanismCards: React.FC<Props> = ({ kicker, title, description, features, ctaLabel, ctaHref, onCta }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = ref.current!;
        const sc = root.querySelector(".u251-sc") as HTMLElement;
        const gd = root.querySelector(".u251-gd") as HTMLElement;
        const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        features.forEach((f, i) => {
            const c = document.createElement("div");
            c.className = "u251-cd"; c.setAttribute("data-rv", ""); c.style.setProperty("--d", (i % 2) * 0.09 + "s");
            c.innerHTML = '<div class="u251-ic" style="background:' + COL[i % COL.length] + '"><svg viewBox="0 0 16 16" aria-hidden="true">' + (f[2] || ICO[i % ICO.length]) + "</svg></div><b></b><span></span>";
            (c.querySelector("b") as HTMLElement).textContent = f[0];
            (c.querySelector("span") as HTMLElement).textContent = f[1];
            gd.appendChild(c);
        });
        const R = Array.from(root.querySelectorAll<HTMLElement>("[data-rv]"));
        let io: IntersectionObserver | null = null;
        if (rm || !("IntersectionObserver" in window)) {
            R.forEach((el) => el.classList.add("is-in"));
        } else {
            io = new IntersectionObserver((es) => {
                es.forEach((e) => {
                    if (e.isIntersecting) e.target.classList.add("is-in");
                    else if (e.rootBounds && e.boundingClientRect.top > e.rootBounds.bottom - 1) e.target.classList.remove("is-in");
                });
            }, { root: sc, threshold: 0.18 });
            R.forEach((el) => io!.observe(el));
        }
        return () => {
            io?.disconnect();
            gd.replaceChildren();
        };
    }, [features]);

    return (
        <div ref={ref} className="ux u251">
            <div className="u251-sc" tabIndex={0} aria-label={title}>
                <div className="u251-hd" data-rv=""><small>{kicker}</small><br /><h3>{title}</h3><p>{description}</p></div>
                <div className="u251-gd"></div>
                <div className="u251-ft">
                    <a
                        href={ctaHref}
                        style={{ textDecoration: "none" }}
                        onClick={(e) => { e.preventDefault(); onCta(); }}
                    >
                        <span>{ctaLabel}</span>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default MechanismCards;
