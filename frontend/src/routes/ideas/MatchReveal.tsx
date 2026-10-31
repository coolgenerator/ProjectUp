import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Check, Eye, Inbox, Loader2, RefreshCw, Users } from "lucide-react";
import { Alert, Button, Card, FadeIn, Skeleton } from "../../components/ui";
import { CandidatesByRole, useCandidateMatches } from "../../components/match/Recommendations";

// Steps shown while the AI ranks candidates; the last one waits for the result.
const STEP_KEYS = ["roles", "shortlist", "explain"] as const;
const STEP_DELAY_MS = 1200;

const Step: React.FC<{ state: "done" | "active" | "pending"; children: React.ReactNode }> = ({ state, children }) => (
    <li className={state === "pending" ? "flex items-center gap-2.5 text-gray-400" : "flex items-center gap-2.5 text-gray-800"}>
        {state === "done" ? (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-3 w-3" />
            </motion.span>
        ) : state === "active" ? (
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" aria-hidden />
        ) : (
            <span className="h-5 w-5 rounded-full border-2 border-gray-200" />
        )}
        {children}
    </li>
);

interface MatchRevealProps {
    postSid: string;
    title: string;
    roleCount: number;
}

// MatchReveal is what a founder sees right after publishing: for each role the
// idea is missing, the few people who could fill it, why, and the main risk.
const MatchReveal: React.FC<MatchRevealProps> = ({ postSid, title, roleCount }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { matches, roles, poolSize, loading, error, refresh } = useCandidateMatches(postSid);
    const [step, setStep] = useState(1);

    // Walk through the first steps on a timer so the wait reads as progress
    useEffect(() => {
        if (!loading) return;
        setStep(1);
        const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1)), STEP_DELAY_MS);
        return () => clearInterval(timer);
    }, [loading]);

    const found = matches.filter((m) => m.candidate).length;
    const filledRoles = new Set(matches.map((m) => m.role)).size;

    return (
        <div className="space-y-6">
            <FadeIn>
                <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                                <Check className="h-4 w-4" aria-hidden /> {t("match.reveal.published")}
                            </p>
                            <h2 className="mt-1 truncate text-xl font-bold text-gray-900">{title}</h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" icon={<Eye className="h-4 w-4" />} onClick={() => navigate(`/projectpost/${postSid}`)}>
                                {t("match.ideas.viewPost")}
                            </Button>
                            <Button variant="secondary" icon={<Inbox className="h-4 w-4" />} onClick={() => navigate("/applications")}>
                                {t("match.reveal.board")}
                            </Button>
                        </div>
                    </div>
                </Card>
            </FadeIn>

            <Card>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                            <Users className="h-5 w-5 text-indigo-600" aria-hidden />
                            {loading ? t("match.reveal.findingTitle") : t("match.reveal.title")}
                        </h2>
                        {!loading && !error && (
                            <p className="mt-1 text-sm text-gray-600">
                                {found > 0
                                    ? t("match.reveal.summary", { pool: poolSize, roles: roles.length || roleCount, filled: filledRoles, n: found })
                                    : t("match.reveal.none", { pool: poolSize })}
                            </p>
                        )}
                    </div>
                    {!loading && (
                        <Button variant="ghost" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={refresh}>
                            {t("match.recs.refresh")}
                        </Button>
                    )}
                </div>

                {loading ? (
                    <div>
                        <ol className="space-y-3 text-sm">
                            {STEP_KEYS.map((key, i) => (
                                <Step key={key} state={i < step ? "done" : i === step ? "active" : "pending"}>
                                    {t(`match.reveal.steps.${key}`, { n: roleCount })}
                                </Step>
                            ))}
                        </ol>
                        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {Array.from({ length: Math.min(Math.max(roleCount, 1), 2) * 2 }, (_, i) => <Skeleton key={i} className="h-48" />)}
                        </div>
                    </div>
                ) : error ? (
                    <Alert>
                        {error}
                        <Button variant="secondary" size="sm" className="ml-3" onClick={refresh}>{t("match.reveal.retry")}</Button>
                    </Alert>
                ) : (
                    <>
                        <CandidatesByRole matches={matches} roles={roles} projectTitle={title} />
                        <p className="mt-6 border-t border-gray-100 pt-4 text-sm text-gray-500">{t("match.reveal.footer")}</p>
                    </>
                )}
            </Card>
        </div>
    );
};

export default MatchReveal;
