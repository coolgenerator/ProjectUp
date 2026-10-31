import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, FadeIn, Tag } from "../ui";

export interface RoleCard {
    title: string;
    description?: string;
    skills?: string[];
    hours_per_week?: number;
    spots?: number;
    first_week?: string;
}

// parseRoles reads a post's `spots` field, which may arrive as an array or a JSON string.
export function parseRoles(spots: unknown): RoleCard[] {
    let value = spots;
    if (typeof value === "string") {
        try {
            value = JSON.parse(value);
        } catch {
            return [];
        }
    }
    return Array.isArray(value) ? value.filter((r) => r && (r.title || r.name)).map((r) => ({ ...r, title: r.title || r.name })) : [];
}

interface RoleCardsProps {
    postSid: string;
    roles: RoleCard[];
    // Accepted applicants per role title
    roleFills: Record<string, number>;
    isOwner: boolean;
}

const RoleCards: React.FC<RoleCardsProps> = ({ postSid, roles, roleFills, isOwner }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const applyTo = (role?: string) =>
        navigate(`/project/${postSid}/apply${role ? `?role=${encodeURIComponent(role)}` : ""}`);

    return (
        <Card className="mt-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">{t("match.roles.title")}</h2>
                    <p className="mt-1 text-sm text-gray-500">{isOwner ? t("match.roles.ownerHint") : t("match.roles.subtitle")}</p>
                </div>
                {isOwner && (
                    <Button variant="secondary" onClick={() => navigate("/applications")}>{t("match.roles.board")}</Button>
                )}
            </div>

            {roles.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                    <p>{t("match.roles.empty")}</p>
                    {!isOwner && <Button className="mt-3" onClick={() => applyTo()}>{t("match.roles.applyGeneral")}</Button>}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {roles.map((role, i) => {
                        const total = Math.max(role.spots || 1, 1);
                        const filled = roleFills[role.title] || 0;
                        const isFull = filled >= total;
                        return (
                            <FadeIn key={role.title} delay={i * 0.05} className="flex flex-col rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:border-indigo-200 hover:bg-white hover:shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="font-semibold text-gray-900">{role.title}</h3>
                                    <Badge tone={isFull ? "neutral" : "green"} title={t("match.roles.filled", { filled, total })}>
                                        {isFull ? t("match.roles.full") : t("match.roles.open", { n: total - filled })}
                                    </Badge>
                                </div>
                                {role.description && <p className="mt-1 text-sm text-gray-600">{role.description}</p>}
                                {role.skills && role.skills.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">{role.skills.map((s) => <Tag key={s}>{s}</Tag>)}</div>
                                )}
                                {role.first_week && (
                                    <p className="mt-3 rounded-lg bg-white p-2.5 text-sm text-gray-700 ring-1 ring-gray-200">
                                        <span className="font-medium text-indigo-700">{t("match.roles.firstWeek")}</span>{role.first_week}
                                    </p>
                                )}
                                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                                    <span className="text-sm text-gray-500">{role.hours_per_week ? t("match.roles.hours", { n: role.hours_per_week }) : ""}</span>
                                    {!isOwner && (
                                        <Button size="sm" onClick={() => applyTo(role.title)} disabled={isFull}>{t("match.roles.apply")}</Button>
                                    )}
                                </div>
                            </FadeIn>
                        );
                    })}
                </div>
            )}
        </Card>
    );
};

export default RoleCards;
