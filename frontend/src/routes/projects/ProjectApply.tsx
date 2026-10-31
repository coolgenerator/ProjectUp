import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import config from "../../config";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import { ArrowLeft } from "lucide-react";
import { Alert, Button, Card, EmptyState, Input, Label, PageHeader, Select, Skeleton, TextArea } from "../../components/ui";
import { parseRoles, RoleCard } from "../../components/match/RoleCards";

const { API_BASE_URL } = config;

interface ProjectDetails {
    post_id: number;
    title: string;
    description: string;
    cover: string;
    style: string;
    topics: string;
    start_time: string;
    end_time: string;
    location?: string;
    communication_app?: string;
    spots?: RoleCard[];
}

interface ApplicationQuestion {
    question_id: number;
    text: string;
    type: number;
    choices: string[];
}

interface ApplicationStatus {
    status: string;
    message: string;
    statusCode: number;
    stage?: "new" | "talking" | "trial";
    trial_task?: string;
    trial_due?: string | null;
}

interface MyProfileSummary {
    skills: { name: string; level_text?: string }[];
    hours_per_week?: number | null;
    website?: string | null;
    resume_url?: string | null;
}

// ProfilePreview shows applicants what the founder will see from their profile, so gaps get fixed before applying.
const ProfilePreview: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<MyProfileSummary | null>(null);

    useEffect(() => {
        fetchWithAuth(`${API_BASE_URL}/api/my-profile`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => data?.user && setProfile({ skills: data.user.skills || [], ...data.user }))
            .catch(() => setProfile(null));
    }, []);

    if (!profile) return null;
    return (
        <Card>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-semibold text-gray-900">{t("match.applyProfile.title")}</h3>
                    <p className="text-sm text-gray-500">{t("match.applyProfile.hint")}</p>
                </div>
                <button type="button" onClick={() => navigate("/my-profile")} className="shrink-0 text-sm text-indigo-700 hover:underline">
                    {t("match.applyProfile.edit")}
                </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.skills.length > 0 ? (
                    profile.skills.map((s) => (
                        <span key={s.name} className="rounded bg-white px-2 py-0.5 text-xs text-gray-700 ring-1 ring-gray-200">{s.name}</span>
                    ))
                ) : (
                    <span className="text-sm text-amber-700">{t("match.applyProfile.noSkills")}</span>
                )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                {profile.hours_per_week ? <span>{t("match.applyProfile.hours", { n: profile.hours_per_week })}</span> : null}
                {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{t("match.board.website")}</a>}
                {profile.resume_url && <a href={profile.resume_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{t("match.board.resume")}</a>}
            </div>
        </Card>
    );
};

// A first-step proposal shorter than this can't say anything concrete.
const MIN_FIRST_STEP_LENGTH = 10;

const ProjectApply: React.FC = () => {
    const { shortId } = useParams<{ shortId: string }>();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
    const [applicationQuestions, setApplicationQuestions] = useState<ApplicationQuestion[]>([]);
    const [responses, setResponses] = useState<Record<number, string>>({});
    const [motivation, setMotivation] = useState<string>("");
    const [searchParams] = useSearchParams();
    const [role, setRole] = useState<string>(searchParams.get("role") || "");
    const [hoursPerWeek, setHoursPerWeek] = useState<string>("");
    const [firstStep, setFirstStep] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);

    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const fetchProjectDetails = async () => {
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/post/${shortId}`);
                const data = await response.json();
                console.log("Project details:", data);
                setProjectDetails(data.project_post);

                // After getting project details, check application status
                if (data.project_post?.post_id) {
                    checkApplicationStatus(data.project_post.post_id);
                }
            } catch (error) {
                console.error("Failed to fetch project details:", error);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchApplicationQuestions = async () => {
            try {
                // Direct endpoint using shortId from URL
                const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${shortId}/application-questions`);
                const data = await response.json();
                console.log("Application questions:", data);
                setApplicationQuestions(data.questions || []);
            } catch (error) {
                console.error("Failed to fetch application questions:", error);
            }
        };

        if (shortId) {
            // Fetch project details and then application questions
            fetchProjectDetails();
            fetchApplicationQuestions();
        } else {
            setIsLoading(false);
        }
    }, [shortId]);

    const checkApplicationStatus = async (postId: number) => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/applications/status?postId=${postId}`);
            const data = await response.json();
            console.log("Application status:", data);
            setApplicationStatus(data);
        } catch (error) {
            console.error("Failed to check application status:", error);
        }
    };

    const handleResponseChange = (questionId: number, value: string) => {
        setResponses((prev) => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const payload = {
                postId: projectDetails?.post_id,
                motivation: motivation.trim(),
                role,
                hoursPerWeek: Number(hoursPerWeek) || 0,
                firstStep: firstStep.trim(),
                responses: Object.entries(responses).map(([questionId, response]) => ({
                    questionId: Number(questionId),
                    response,
                })),
            };
            console.log("Submitting application:", payload);
            const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/applications`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to submit application");
            }

            setSubmitted(true);
            // Refresh application status or navigate back
            if (projectDetails?.post_id) {
                await checkApplicationStatus(projectDetails.post_id);
            }
        } catch (error: any) {
            console.error("Failed to submit application:", error);
            setSubmitError(error.message || t("match.board.updateFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
                <Skeleton className="h-24" />
                <Skeleton className="h-72" />
            </div>
        );
    }

    if (!projectDetails) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-10">
                <EmptyState title={t("match.apply.notFound")} action={<Button onClick={() => navigate("/projects")}>{t("match.todo.browse")}</Button>} />
            </div>
        );
    }

    const roles = parseRoles(projectDetails.spots);
    const selectedRole = roles.find((r) => r.title === role);
    const firstStepReady = firstStep.trim().length >= MIN_FIRST_STEP_LENGTH;
    const canApply = !applicationStatus || applicationStatus.status === "can_apply";
    const questionsAnswered = applicationQuestions.every((q) => (responses[q.question_id] || "").trim());

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
                <button onClick={() => navigate(`/projectpost/${shortId}`)} className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
                    <ArrowLeft className="h-4 w-4" /> {t("match.apply.back")}
                </button>
                <PageHeader title={t("match.apply.pageTitle", { title: projectDetails.title })} />

                {applicationStatus?.status === "existing" && (
                    <Card className={applicationStatus.statusCode === 1 ? "mb-6 border-emerald-200 bg-emerald-50" : "mb-6 border-indigo-200 bg-indigo-50"}>
                        <p className="font-medium text-gray-900">
                            {applicationStatus.statusCode === 1
                                ? t("match.todo.status.accepted")
                                : applicationStatus.stage ? t(`match.apply.stage.${applicationStatus.stage}`) : applicationStatus.message}
                        </p>
                        {applicationStatus.statusCode === 0 && applicationStatus.trial_task && (
                            <div className="mt-3 rounded-lg bg-white p-3 text-sm ring-1 ring-amber-200">
                                <p className="font-medium text-amber-900">
                                    {t("match.apply.trial")}
                                    {applicationStatus.trial_due && (
                                        <span className="font-normal"> · {t("match.apply.trialDue", { date: new Date(applicationStatus.trial_due).toLocaleDateString(i18n.language) })}</span>
                                    )}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-gray-800">{applicationStatus.trial_task}</p>
                            </div>
                        )}
                        <Button variant="secondary" className="mt-4" onClick={() => navigate(`/projectpost/${shortId}`)}>{t("match.apply.viewProject")}</Button>
                    </Card>
                )}

                {submitted && <Alert tone="success" className="mb-6">{t("match.apply.submitted")}</Alert>}

                {canApply && !submitted && (
                    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                        {/* Role and commitment */}
                        <Card>
                            <h2 className="text-lg font-semibold text-gray-900">{t("match.apply.title")}</h2>
                            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Label label={t("match.apply.role")}>
                                    <Select value={role} onChange={(e) => setRole(e.target.value)}>
                                        <option value="">{t("match.apply.chooseRole")}</option>
                                        {roles.map((spot) => (
                                            <option key={spot.title} value={spot.title}>
                                                {spot.title}{spot.hours_per_week ? t("match.apply.roleHours", { n: spot.hours_per_week }) : ""}
                                            </option>
                                        ))}
                                    </Select>
                                </Label>
                                <Label label={t("match.apply.hours")}>
                                    <Input type="number" min={1} max={80} value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} />
                                </Label>
                            </div>
                            <p className="mt-3 text-sm text-gray-500">{t("match.apply.note")}</p>
                        </Card>

                        {/* First step */}
                        <Card>
                            <h2 className="text-lg font-semibold text-gray-900">{t("match.apply.firstStep")}</h2>
                            <p className="mt-1 text-sm text-gray-600">{t("match.apply.firstStepHint")}</p>
                            {selectedRole?.first_week && (
                                <p className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm text-gray-800">
                                    <span className="font-medium text-indigo-700">{t("match.apply.roleFirstWeek")}</span>{selectedRole.first_week}
                                </p>
                            )}
                            <TextArea
                                className="min-h-[120px]"
                                placeholder={t("match.apply.firstStepPlaceholder")}
                                value={firstStep}
                                onChange={(e) => setFirstStep(e.target.value)}
                            />
                            {!firstStepReady && firstStep.length > 0 && (
                                <p className="mt-1 text-xs text-amber-700">{t("match.apply.firstStepMin", { n: MIN_FIRST_STEP_LENGTH })}</p>
                            )}
                        </Card>

                        {/* Founder's questions, only when there are any */}
                        {applicationQuestions.length > 0 && (
                            <Card>
                                <h2 className="text-lg font-semibold text-gray-900">{t("match.apply.questions")}</h2>
                                <div className="mt-4 space-y-4">
                                    {applicationQuestions.map((question) => (
                                        <Label key={question.question_id} label={question.text}>
                                            {question.type === 0 ? (
                                                <TextArea value={responses[question.question_id] || ""} onChange={(e) => handleResponseChange(question.question_id, e.target.value)} />
                                            ) : (
                                                <Select value={responses[question.question_id] || ""} onChange={(e) => handleResponseChange(question.question_id, e.target.value)}>
                                                    <option value="">{t("match.apply.selectOption")}</option>
                                                    {question.choices.map((choice, index) => <option key={index} value={choice}>{choice}</option>)}
                                                </Select>
                                            )}
                                        </Label>
                                    ))}
                                </div>
                            </Card>
                        )}

                        <Card>
                            <Label label={t("match.apply.motivation")}>
                                <TextArea
                                    className="min-h-[100px]"
                                    placeholder={t("match.apply.motivationPlaceholder")}
                                    value={motivation}
                                    onChange={(e) => setMotivation(e.target.value)}
                                />
                            </Label>
                        </Card>

                        <ProfilePreview />

                        {submitError && <Alert>{submitError}</Alert>}
                        <div className="flex justify-end">
                            <Button type="submit" size="lg" loading={isSubmitting} disabled={!hoursPerWeek || !firstStepReady || !questionsAnswered}>
                                {isSubmitting ? t("match.apply.submitting") : t("match.apply.submit")}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ProjectApply;
