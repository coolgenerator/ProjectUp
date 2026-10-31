import { NavigateFunction } from "react-router-dom";

// openChatWith opens (or creates) the private chat with a user. A draft, when
// given, is placed in the message box for the sender to edit, never sent as is.
export function openChatWith(navigate: NavigateFunction, userSid: string, draft?: string) {
    sessionStorage.setItem("pendingChatUserSID", userSid);
    if (draft) sessionStorage.setItem("pendingChatDraft", draft);
    else sessionStorage.removeItem("pendingChatDraft");
    navigate("/messages");
}
