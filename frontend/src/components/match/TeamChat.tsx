import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { MessagesSquare, Send } from "lucide-react";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import { RootState } from "../../store/store";
import { Alert, Button, Card, TextArea, cx } from "../ui";
import { avatarSrc } from "./PostTeam";

interface Sender {
    user_id: number;
    sid: string;
    name: string;
    avatar_url: string;
}

interface TeamMessage {
    id: number;
    sender: Sender;
    text?: string;
    event?: { event: string; role?: string };
    sent_at: string;
}

// New messages arrive by polling while the tab is visible
const POLL_MS = 5000;
const MAX_LENGTH = 2000;

// TeamChat is the project's team discussion: every current member can read
// and post, and joins are announced as they happen.
const TeamChat: React.FC<{ projectSid: string }> = ({ projectSid }) => {
    const { t, i18n } = useTranslation();
    const myId = useSelector((state: RootState) => state.auth.user?.id);
    const [messages, setMessages] = useState<TeamMessage[] | null>(null);
    const [memberCount, setMemberCount] = useState(0);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const lastId = useRef(0);

    const append = useCallback((incoming: TeamMessage[]) => {
        if (incoming.length === 0) return;
        setMessages((prev) => {
            const seen = new Set((prev || []).map((m) => m.id));
            return [...(prev || []), ...incoming.filter((m) => !seen.has(m.id))];
        });
        lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id));
    }, []);

    const load = useCallback(async () => {
        const response = await fetchWithAuth(`/api/match/projects/${projectSid}/team-chat${lastId.current ? `?after=${lastId.current}` : ""}`);
        if (!response.ok) return;
        const data = await response.json();
        setMemberCount(data.member_count || 0);
        setMessages((prev) => prev || []);
        append(data.messages || []);
    }, [projectSid, append]);

    useEffect(() => {
        lastId.current = 0;
        setMessages(null);
        load().catch(() => setMessages([]));
        const timer = setInterval(() => {
            if (document.visibilityState === "visible") load().catch(() => undefined);
        }, POLL_MS);
        return () => clearInterval(timer);
    }, [load]);

    // Keep the newest message in view
    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }, [messages?.length]);

    const send = async () => {
        const body = text.trim();
        if (!body || sending) return;
        setSending(true);
        setError(null);
        try {
            const response = await fetchWithAuth(`/api/match/projects/${projectSid}/team-chat`, { method: "POST", body: JSON.stringify({ text: body }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            append([data]);
            setText("");
        } catch {
            setError(t("match.teamChat.sendFailed"));
        } finally {
            setSending(false);
        }
    };

    const time = (iso: string) => {
        const d = new Date(iso);
        const sameDay = d.toDateString() === new Date().toDateString();
        return d.toLocaleString(i18n.language, sameDay ? { hour: "2-digit", minute: "2-digit" } : { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    return (
        <Card className="mt-6" id="team-chat">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <MessagesSquare className="h-5 w-5 text-indigo-600" aria-hidden />
                    {t("match.teamChat.title")}
                </h2>
                {memberCount > 0 && <span className="text-sm text-gray-500">{t("match.teamChat.members", { n: memberCount })}</span>}
            </div>

            <div ref={listRef} className="max-h-96 min-h-[8rem] space-y-3 overflow-y-auto rounded-lg bg-gray-50 p-3 sm:p-4">
                {messages === null ? (
                    <p className="py-8 text-center text-sm text-gray-400">{t("common.loading")}</p>
                ) : messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">{t("match.teamChat.empty")}</p>
                ) : (
                    messages.map((m) => {
                        if (m.event) {
                            return (
                                <p key={m.id} className="text-center text-xs text-gray-500">
                                    {m.event.role
                                        ? t("match.teamChat.joinedAs", { name: m.sender.name, role: m.event.role })
                                        : t("match.teamChat.joined", { name: m.sender.name })}
                                    <span className="ml-1.5 text-gray-400">{time(m.sent_at)}</span>
                                </p>
                            );
                        }
                        const mine = Number(m.sender.user_id) === Number(myId);
                        return (
                            <div key={m.id} className={cx("flex items-end gap-2", mine && "flex-row-reverse")}>
                                {!mine && <img src={avatarSrc(m.sender.avatar_url)} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-gray-200" />}
                                <div className={cx("max-w-[80%]", mine && "text-right")}>
                                    {!mine && <p className="mb-0.5 text-xs text-gray-500">{m.sender.name}</p>}
                                    <p
                                        className={cx(
                                            "inline-block whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-left text-sm",
                                            mine ? "rounded-br-sm bg-indigo-600 text-white" : "rounded-bl-sm bg-white text-gray-800 ring-1 ring-gray-200"
                                        )}
                                    >
                                        {m.text}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-gray-400">{time(m.sent_at)}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {error && <Alert className="mt-3">{error}</Alert>}
            <div className="mt-3 flex items-end gap-2">
                <TextArea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        // Enter sends, Shift+Enter adds a line; Enter while an IME is composing confirms the characters
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            send();
                        }
                    }}
                    maxLength={MAX_LENGTH}
                    rows={2}
                    placeholder={t("match.teamChat.placeholder")}
                    aria-label={t("match.teamChat.placeholder")}
                    className="mt-0 min-h-[44px] resize-none"
                />
                <Button onClick={send} loading={sending} disabled={!text.trim()} icon={<Send className="h-4 w-4" />} aria-label={t("match.teamChat.send")}>
                    <span className="hidden sm:inline">{t("match.teamChat.send")}</span>
                </Button>
            </div>
        </Card>
    );
};

export default TeamChat;
