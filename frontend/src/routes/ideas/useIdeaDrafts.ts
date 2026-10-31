import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import fetchWithAuth from "../../hooks/fetchWithAuth";

// Ideas shorter than this aren't worth saving (and can't be started either).
export const MIN_IDEA_LENGTH = 10;
const AUTOSAVE_DELAY_MS = 700;

// DraftProject is the project a published draft became.
export interface DraftProject {
    sid: string;
    title: string;
    post_sid: string;
    status: number;
}

// DraftState is everything needed to restore the workbench exactly where the user left it.
export interface DraftState {
    idea: string;
    rounds: unknown[];
    current: { questions: unknown[]; answers: string[]; reflection: string } | null;
    brief: unknown | null;
    post_sid: string | null;
    // Set by the server once published; the draft is read-only from then on
    project?: DraftProject | null;
    // The existing project this draft writes a brief for, if any
    target_project_sid?: string | null;
}

export interface IdeaDraft extends DraftState {
    id: number;
    project_id: number | null;
    updated_at: string;
}

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * useIdeaDrafts autosaves the workbench state to the server and keeps the
 * open draft's id in the URL (?draft=), so a refresh restores it.
 * onOpen is called with a draft's state whenever one is opened.
 */
export function useIdeaDrafts(state: DraftState, onOpen: (state: DraftState) => void) {
    const [drafts, setDrafts] = useState<IdeaDraft[]>([]);
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [searchParams, setSearchParams] = useSearchParams();
    const draftIdRef = useRef<number | null>(null);
    const lastSavedRef = useRef("");
    // Set while a just-opened draft is being applied, so applying it isn't saved back
    const hydratingRef = useRef(false);
    // Saves run one at a time so the first save's POST finishes before any PUT
    const queueRef = useRef<Promise<void>>(Promise.resolve());
    const onOpenRef = useRef(onOpen);
    onOpenRef.current = onOpen;

    const setUrlDraft = useCallback(
        (id: number | null) => setSearchParams(id ? { draft: String(id) } : {}, { replace: true }),
        [setSearchParams]
    );

    const open = useCallback(
        (draft: IdeaDraft) => {
            if (draft.id === draftIdRef.current) return;
            draftIdRef.current = draft.id;
            hydratingRef.current = true;
            setUrlDraft(draft.id);
            setSaveState("idle");
            onOpenRef.current({
                idea: draft.idea,
                rounds: draft.rounds || [],
                current: draft.current,
                brief: draft.brief,
                post_sid: draft.post_sid,
                project: draft.project || null,
                target_project_sid: draft.target_project_sid || null,
            });
        },
        [setUrlDraft]
    );

    // Load the list once, reopening the draft named in the URL
    useEffect(() => {
        const urlDraftId = Number(searchParams.get("draft"));
        fetchWithAuth("/api/ideas/drafts")
            .then((r) => (r.ok ? r.json() : { drafts: [] }))
            .then((data) => {
                const list: IdeaDraft[] = data.drafts || [];
                setDrafts(list);
                const fromUrl = list.find((d) => d.id === urlDraftId);
                if (fromUrl) open(fromUrl);
                else if (urlDraftId) setUrlDraft(null);
            })
            .catch(() => setDrafts([]));
        // Runs on mount only; later URL changes come from this hook itself
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const save = useCallback(
        (next: DraftState) => {
            const payload = JSON.stringify(next);
            queueRef.current = queueRef.current.then(async () => {
                if (payload === lastSavedRef.current) return;
                setSaveState("saving");
                try {
                    const id = draftIdRef.current;
                    const response = await fetchWithAuth(id ? `/api/ideas/drafts/${id}` : "/api/ideas/drafts", {
                        method: id ? "PUT" : "POST",
                        body: payload,
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error);
                    const saved: IdeaDraft = data.draft;
                    lastSavedRef.current = payload;
                    if (!id) {
                        draftIdRef.current = saved.id;
                        setUrlDraft(saved.id);
                    }
                    setDrafts((list) => [saved, ...list.filter((d) => d.id !== saved.id)]);
                    setSaveState("saved");
                } catch {
                    setSaveState("error");
                }
            });
            return queueRef.current;
        },
        [setUrlDraft]
    );

    // Autosave shortly after the user stops typing
    const payload = JSON.stringify(state);
    useEffect(() => {
        if (hydratingRef.current) {
            hydratingRef.current = false;
            lastSavedRef.current = payload;
            return;
        }
        // A published draft is the project's record; the server refuses edits to it
        if (state.project || state.idea.trim().length < MIN_IDEA_LENGTH || payload === lastSavedRef.current) return;
        const timer = setTimeout(() => save(state), AUTOSAVE_DELAY_MS);
        return () => clearTimeout(timer);
        // payload captures every field of state
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payload, save]);

    // startNew detaches from the open draft; the next save creates a new one
    const startNew = useCallback(() => {
        draftIdRef.current = null;
        lastSavedRef.current = "";
        hydratingRef.current = false;
        setUrlDraft(null);
        setSaveState("idle");
    }, [setUrlDraft]);

    // remove deletes a draft and reports whether it was the open one
    const remove = useCallback(
        async (id: number) => {
            const response = await fetchWithAuth(`/api/ideas/drafts/${id}`, { method: "DELETE" });
            if (!response.ok) return false;
            setDrafts((list) => list.filter((d) => d.id !== id));
            if (draftIdRef.current === id) {
                startNew();
                return true;
            }
            return false;
        },
        [startNew]
    );

    // ensureSaved saves pending changes and returns the draft's id, creating the draft if needed
    const ensureSaved = useCallback(
        async (next: DraftState) => {
            await save(next);
            return draftIdRef.current;
        },
        [save]
    );

    // published records a draft the server just turned into a project
    const published = useCallback((draft: IdeaDraft) => {
        setDrafts((list) => [draft, ...list.filter((d) => d.id !== draft.id)]);
    }, []);

    const activeId = Number(searchParams.get("draft")) || null;
    return { drafts, saveState, activeId, open, save, ensureSaved, published, startNew, remove };
}
