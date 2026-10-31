import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import { FounderStats, FounderStatsLine } from "./PostTeam";
import { ReliabilityLine, Reliability } from "./Reliability";

interface RecordItem {
    post_sid: string;
    title: string;
    role: string;
    status: number;
    since: string;
}

const STATUS_KEYS: Record<number, string> = { 1: "statusActive", 2: "statusArchived", 3: "statusCompleted" };

// ProfileRecord is someone's track record on ProjectUp: public projects they founded or joined.
// Real collaboration history is the strongest signal a newcomer can show.
const ProfileRecord: React.FC<{ sid: string; resumeUrl?: string }> = ({ sid, resumeUrl }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [record, setRecord] = useState<{ founded: RecordItem[]; joined: RecordItem[]; founder_stats: FounderStats; reliability: Reliability } | null>(null);

    useEffect(() => {
        fetchWithAuth(`/api/match/users/${sid}/record`)
            .then((r) => (r.ok ? r.json() : null))
            .then(setRecord)
            .catch(() => setRecord(null));
    }, [sid]);

    if (!record) return null;
    const year = (d: string) => new Date(d).toLocaleDateString(i18n.language, { year: "numeric", month: "short" });

    const list = (items: RecordItem[], heading: string) =>
        items.length > 0 && (
            <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-600">{heading}</h3>
                <ul className="space-y-2">
                    {items.map((item) => (
                        <li key={item.post_sid}>
                            <button onClick={() => navigate(`/projectpost/${item.post_sid}`)} className="w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50">
                                <span className="flex items-center justify-between gap-3">
                                    <span className="font-medium text-gray-900">{item.title}</span>
                                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                        {t(`match.record.${STATUS_KEYS[item.status] || "statusActive"}`)}
                                    </span>
                                </span>
                                <span className="mt-0.5 block text-xs text-gray-500">
                                    {item.role ? `${t("match.record.asRole", { role: item.role })} · ` : ""}{year(item.since)}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        );

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-1">{t("match.record.title")}</h2>
            <ReliabilityLine reliability={record.reliability} className="mb-4" />
            {record.founded.length > 0 && (
                <div className="mb-4">
                    <FounderStatsLine stats={record.founder_stats} />
                </div>
            )}
            {record.founded.length === 0 && record.joined.length === 0 ? (
                <p className="text-gray-500">{t("match.record.empty")}</p>
            ) : (
                <div className="space-y-4">
                    {list(record.founded, t("match.record.founded"))}
                    {list(record.joined, t("match.record.joined"))}
                </div>
            )}
            {resumeUrl && (
                <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
                    {t("match.board.resume")}
                </a>
            )}
        </div>
    );
};

export default ProfileRecord;
