import React from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../ui";

export interface ProjectBrief {
    one_liner: string;
    vision: string;
    problem: string;
    target_users: string;
    blockers: string[] | null;
    next_steps: string[] | null;
}

// ProjectBriefCard lays out a workbench-shaped project so applicants can judge it at a glance.
const ProjectBriefCard: React.FC<{ brief: ProjectBrief }> = ({ brief }) => {
    const { t } = useTranslation();
    return (
        <Card className="mt-6">
            <h2 className="text-xl font-semibold text-gray-900">{t("match.detail.about")}</h2>
            {brief.one_liner && <p className="mt-1 text-gray-600">{brief.one_liner}</p>}
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 text-sm md:grid-cols-2">
                {brief.problem && (
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("match.detail.problem")}</dt>
                        <dd className="mt-1 text-gray-900">{brief.problem}</dd>
                    </div>
                )}
                {brief.target_users && (
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("match.detail.targetUsers")}</dt>
                        <dd className="mt-1 text-gray-900">{brief.target_users}</dd>
                    </div>
                )}
                {brief.next_steps && brief.next_steps.length > 0 && (
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("match.detail.nextSteps")}</dt>
                        <dd className="mt-1"><ol className="list-decimal space-y-1 pl-5 text-gray-900">{brief.next_steps.map((s) => <li key={s}>{s}</li>)}</ol></dd>
                    </div>
                )}
                {brief.blockers && brief.blockers.length > 0 && (
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("match.detail.blockers")}</dt>
                        <dd className="mt-1"><ul className="list-disc space-y-1 pl-5 text-gray-900">{brief.blockers.map((s) => <li key={s}>{s}</li>)}</ul></dd>
                    </div>
                )}
            </dl>
        </Card>
    );
};

export default ProjectBriefCard;
