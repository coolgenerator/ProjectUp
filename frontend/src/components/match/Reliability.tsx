import React from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";

export interface Reliability {
    projects_joined: number;
    projects_completed: number;
    checkin_weeks: number;
}

// ReliabilityLine summarizes how someone has followed through: projects joined
// and completed, and how regularly they checked in lately.
export const ReliabilityLine: React.FC<{ reliability?: Reliability; className?: string }> = ({ reliability, className }) => {
    const { t } = useTranslation();
    if (!reliability) return null;
    const isNew = reliability.projects_joined === 0 && reliability.checkin_weeks === 0;
    return (
        <p className={`flex items-center gap-1.5 text-xs text-gray-500 ${className || ""}`}>
            <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${isNew ? "text-gray-400" : "text-emerald-600"}`} aria-hidden />
            {isNew
                ? t("match.reliability.none")
                : t("match.reliability.line", { joined: reliability.projects_joined, completed: reliability.projects_completed, weeks: reliability.checkin_weeks })}
        </p>
    );
};
