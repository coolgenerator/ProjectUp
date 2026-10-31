import React, { useCallback, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TypewriterKeyword, { TypewriterWord } from "../components/landing/lucian/TypewriterKeyword";
import HowItWorksTabs from "../components/landing/lucian/HowItWorksTabs";
import MatchPreviewTabs, { MatchPreviewTab } from "../components/landing/lucian/MatchPreviewTabs";
import MechanismCards from "../components/landing/lucian/MechanismCards";
import FaqAccordion, { FaqItem } from "../components/landing/lucian/FaqAccordion";
import "../components/landing/landing.css";

// Text comes from the "landing" locale; only colors, icons and links live here.
const ROLE_COLORS = ["var(--ux-accent)", "var(--ux-mint)", "var(--ux-warn)", "var(--ux-accent-2)"];

const GRAD = {
    violet: "linear-gradient(140deg,#8B6CFF,#FF6B8B)",
    teal: "linear-gradient(140deg,#22C3A6,#3D8BFF)",
    amber: "linear-gradient(140deg,#FFB547,#FF7A45)",
    blue: "linear-gradient(140deg,#3D8BFF,#B04FD0)",
};

const ICONS = {
    clock: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 5v3.2l2 1.3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    limit: '<path d="M3 4.5h10M3 8h10M3 11.5h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    check: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.5 8.2l1.7 1.7 3.3-3.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    star: '<path d="M8 2.2l1.7 3.5 3.8.5-2.8 2.6.7 3.8L8 10.8l-3.4 1.8.7-3.8-2.8-2.6 3.8-.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    lock: '<rect x="3" y="7" width="10" height="7" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    shield: '<path d="M8 2l5 2v3.6c0 3-2.2 5.2-5 6.4-2.8-1.2-5-3.4-5-6.4V4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
};

// Per preview tab: the gradient of each row; the first row of the two match tabs is the best match.
const MATCH_GRADS = [
    [GRAD.violet, GRAD.teal, GRAD.amber],
    [GRAD.teal, GRAD.amber, GRAD.blue],
    [GRAD.violet, GRAD.teal, GRAD.amber],
];
const MATCH_BADGED = [true, true, false];

const MECHANISM_ICONS = [ICONS.clock, ICONS.limit, ICONS.check, ICONS.star, ICONS.lock, ICONS.shield];
const FAQ_LINKS = ["/projects", "/ideas", "/ideas", "/register"];

type Pair = { title: string; body: string };

const Welcome: React.FC = () => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const isAuthenticated = useSelector((state: any) => state.auth.authenticated);
    const navigate = useNavigate();
    const { hash } = useLocation();
    const startPath = isAuthenticated ? "/ideas" : "/register";
    const goStart = useCallback(() => navigate(startPath), [navigate, startPath]);
    const onFaqNavigate = useCallback((href: string) => navigate(href), [navigate]);

    // Nav links like "/#faq" land here; scroll to the section once it has rendered.
    useEffect(() => {
        if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    }, [hash]);

    // The Lucian elements re-run their scripts when these arrays change, so build them once per language.
    const content = useMemo(() => {
        const list = <T,>(key: string) => t(key, { returnObjects: true }) as unknown as T[];
        const roles: TypewriterWord[] = list<string>("landing.hero.typewriter.roles").map((word, i) => ({ word, color: ROLE_COLORS[i % ROLE_COLORS.length] }));
        const matchTabs: MatchPreviewTab[] = list<{ label: string; rows: [string, string, string][] }>("landing.preview.tabs").map((tab, i) => ({
            label: tab.label,
            rows: tab.rows.map(([title, detail, value], j) => [title, detail, value, MATCH_GRADS[i][j], MATCH_BADGED[i] && j === 0 ? t("landing.preview.bestMatch") : undefined]),
        }));
        const mechanisms = list<[string, string]>("landing.trust.items").map(([title, detail], i): [string, string, string] => [title, detail, MECHANISM_ICONS[i]]);
        const faq: FaqItem[] = list<Omit<FaqItem, "href">>("landing.faq.items").map((item, i) => ({ ...item, href: FAQ_LINKS[i] }));
        return {
            roles,
            painPoints: list<Pair>("landing.pain.items"),
            steps: list<Pair>("landing.how.steps"),
            matchTabs,
            mechanisms,
            faq,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lang]);

    return (
        <div className="landing min-h-screen overflow-x-hidden bg-[var(--ux-page)] text-[var(--ux-ink)]">
            {/* Hero */}
            <section className="landing-hero-bg">
                <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pt-24">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--ux-accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--ux-accent)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ux-accent)]" aria-hidden="true" />
                            {t("landing.hero.badge")}
                        </span>
                        <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                            {t("landing.hero.titleLine1")}
                            <br />
                            <span className="landing-grad-text">{t("landing.hero.titleLine2")}</span>
                        </h1>
                        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--ux-ink-2)]">{t("landing.hero.body")}</p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <button type="button" className="landing-btn-primary" onClick={goStart}>
                                {isAuthenticated ? t("landing.hero.ctaMember") : t("landing.hero.ctaGuest")}
                            </button>
                            <button type="button" className="landing-btn-secondary" onClick={() => navigate("/projects")}>
                                {t("landing.hero.browse")}
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-center md:justify-end">
                        <TypewriterKeyword
                            key={lang}
                            kicker={t("landing.hero.typewriter.kicker")}
                            lead={t("landing.hero.typewriter.lead")}
                            words={content.roles}
                            tail={t("landing.hero.typewriter.tail")}
                            chipsLabel={t("landing.hero.typewriter.chipsLabel")}
                        />
                    </div>
                </div>
            </section>

            {/* Pain points */}
            <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                <p className="text-sm font-bold tracking-widest text-[var(--ux-accent)]">{t("landing.pain.kicker")}</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("landing.pain.title")}</h2>
                <div className="mt-10 grid gap-4 md:grid-cols-3">
                    {content.painPoints.map((p, i) => (
                        <div key={p.title} className="landing-card p-6">
                            <span className="text-sm font-bold text-[var(--ux-ink-3)]">0{i + 1}</span>
                            <h3 className="mt-2 text-xl font-bold">{p.title}</h3>
                            <p className="mt-2 leading-relaxed text-[var(--ux-ink-2)]">{p.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section id="how-it-works" className="scroll-mt-20 bg-[var(--ux-surface-2)]">
                <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2">
                    <div>
                        <p className="text-sm font-bold tracking-widest text-[var(--ux-accent)]">{t("landing.how.kicker")}</p>
                        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("landing.how.title")}</h2>
                        <ol className="mt-8 space-y-6">
                            {content.steps.map((s, i) => (
                                <li key={s.title} className="flex gap-4">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ux-ink)] font-bold text-[var(--ux-page)]">{i + 1}</span>
                                    <div>
                                        <h3 className="text-lg font-bold">{s.title}</h3>
                                        <p className="mt-1 leading-relaxed text-[var(--ux-ink-2)]">{s.body}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className="flex justify-center">
                        <HowItWorksTabs key={lang} />
                    </div>
                </div>
            </section>

            {/* Match preview */}
            <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2">
                <div className="order-2 flex justify-center md:order-1">
                    <MatchPreviewTabs key={lang} tabs={content.matchTabs} ariaLabel={t("landing.preview.ariaLabel")} />
                </div>
                <div className="order-1 md:order-2">
                    <p className="text-sm font-bold tracking-widest text-[var(--ux-accent)]">{t("landing.preview.kicker")}</p>
                    <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("landing.preview.title")}</h2>
                    <p className="mt-5 text-lg leading-relaxed text-[var(--ux-ink-2)]">{t("landing.preview.body")}</p>
                    <p className="mt-4 text-sm text-[var(--ux-ink-3)]">{t("landing.preview.hint")}</p>
                </div>
            </section>

            {/* Commitment mechanisms */}
            <section className="bg-[var(--ux-surface-2)]">
                <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2">
                    <div>
                        <p className="text-sm font-bold tracking-widest text-[var(--ux-accent)]">{t("landing.trust.kicker")}</p>
                        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("landing.trust.title")}</h2>
                        <p className="mt-5 text-lg leading-relaxed text-[var(--ux-ink-2)]">{t("landing.trust.body")}</p>
                    </div>
                    <div className="flex justify-center">
                        <MechanismCards
                            key={lang}
                            kicker={t("landing.trust.cardsKicker")}
                            title={t("landing.trust.cardsTitle")}
                            description={t("landing.trust.cardsDescription")}
                            features={content.mechanisms}
                            ctaLabel={t("landing.trust.cardsCta")}
                            ctaHref={startPath}
                            onCta={goStart}
                        />
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="scroll-mt-20 mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2">
                <div>
                    <p className="text-sm font-bold tracking-widest text-[var(--ux-accent)]">{t("landing.faq.kicker")}</p>
                    <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("landing.faq.title")}</h2>
                </div>
                <div className="flex justify-center md:justify-end">
                    <FaqAccordion key={lang} items={content.faq} onNavigate={onFaqNavigate} />
                </div>
            </section>

            {/* Final CTA */}
            <section className="px-4 pb-24 sm:px-6">
                <div className="landing-card mx-auto max-w-4xl px-6 py-14 text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("landing.final.title")}</h2>
                    <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--ux-ink-2)]">{t("landing.final.body")}</p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <button type="button" className="landing-btn-primary" onClick={goStart}>
                            {isAuthenticated ? t("landing.final.ctaMember") : t("landing.final.ctaGuest")}
                        </button>
                        <button type="button" className="landing-btn-secondary" onClick={() => navigate("/projects")}>
                            {t("landing.final.browse")}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Welcome;
