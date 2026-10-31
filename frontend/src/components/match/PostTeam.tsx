import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import config from "../../config";
import { MessageCircle } from "lucide-react";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import { openChatWith } from "../../utils/chat/openChat";
import { Button } from "../ui";

const { AWS_BASE_URL } = config;

export interface PersonCard {
    user_id: number;
    sid: string;
    name: string;
    avatar_url: string;
    field: string;
    school: string;
    role: string;
}

export interface FounderStats {
    projects_published: number;
    applications_received: number;
    applications_answered: number;
    avg_response_hours: number | null;
}

export const avatarSrc = (url?: string) => (!url ? "/default-avatar.jpg" : url.startsWith("http") ? url : `${AWS_BASE_URL}${url}`);

// useResponseTime renders a founder's average reply time as "N hours" or "N days".
export function useResponseTime() {
    const { t } = useTranslation();
    return (hours: number) =>
        hours < 24 ? t("match.roles.hoursShort", { n: Math.max(1, Math.round(hours)) }) : t("match.roles.daysShort", { n: Math.round(hours / 24) });
}

// FounderStatsLine summarizes how a founder handles applications, so applicants know whether they'll hear back.
export const FounderStatsLine: React.FC<{ stats: FounderStats }> = ({ stats }) => {
    const { t } = useTranslation();
    const responseTime = useResponseTime();
    return (
        <p className="text-sm text-gray-500">
            {t("match.roles.founderStats", { published: stats.projects_published })}
            {" · "}
            {stats.avg_response_hours !== null
                ? t("match.roles.responds", { time: responseTime(stats.avg_response_hours) })
                : t("match.roles.noResponseYet")}
            {stats.applications_received > 0 && (
                <> · {t("match.roles.answered", { answered: stats.applications_answered, received: stats.applications_received })}</>
            )}
        </p>
    );
};

const Person: React.FC<{ person: PersonCard; label?: string }> = ({ person, label }) => {
    const navigate = useNavigate();
    return (
        <button onClick={() => person.sid && navigate(`/profile/${person.sid}`)} className="flex min-w-0 items-center gap-3 rounded-lg p-1 text-left hover:bg-gray-50">
            <img
                src={avatarSrc(person.avatar_url)}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover"
                onError={(e) => { e.currentTarget.src = "/default-avatar.jpg"; }}
            />
            <span className="min-w-0">
                <span className="block truncate font-medium text-gray-900">{person.name}</span>
                <span className="block truncate text-xs text-gray-500">
                    {label || person.role || [person.field, person.school].filter(Boolean).join(" · ")}
                </span>
            </span>
        </button>
    );
};

// PostTeam shows who started the project, how they handle applications, and who already joined.
const PostTeam: React.FC<{ postSid: string; isOwner: boolean; projectTitle?: string }> = ({ postSid, isOwner, projectTitle }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [data, setData] = useState<{ founder: PersonCard; founder_stats: FounderStats; members: PersonCard[] } | null>(null);

    useEffect(() => {
        fetchWithAuth(`/api/match/posts/${postSid}/team`)
            .then((r) => (r.ok ? r.json() : null))
            .then(setData)
            .catch(() => setData(null));
    }, [postSid]);

    if (!data) return null;
    return (
        <section className="mt-6 grid grid-cols-1 gap-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 md:grid-cols-2">
            <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{t("match.roles.founder")}</h2>
                <Person person={data.founder} label={[data.founder.field, data.founder.school].filter(Boolean).join(" · ")} />
                <div className="mt-2">
                    <FounderStatsLine stats={data.founder_stats} />
                </div>
                {!isOwner && data.founder.sid && (
                    <div className="mt-3">
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={<MessageCircle className="h-3.5 w-3.5" />}
                            onClick={() => openChatWith(navigate, data.founder.sid, t("match.chat.toFounder", { project: projectTitle || "" }))}
                        >
                            {t("match.detail.ask")}
                        </Button>
                        <p className="mt-1 text-xs text-gray-500">{t("match.detail.askHint")}</p>
                    </div>
                )}
            </div>
            <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{t("match.roles.team")}</h2>
                {data.members.length === 0 ? (
                    <p className="text-sm text-gray-500">{t("match.roles.noTeam")}</p>
                ) : (
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {data.members.map((m) => <Person key={m.user_id} person={m} />)}
                    </div>
                )}
            </div>
        </section>
    );
};

export default PostTeam;
