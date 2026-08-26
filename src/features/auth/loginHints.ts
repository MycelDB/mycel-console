import { DEFAULT_CLUSTER_ADDR, type LoginInput } from "../../types/auth";

export const LOGIN_HINTS_STORAGE_KEY = "mycel-console:loginHints";

type LoginHints = Pick<LoginInput, "addr" | "username">;

export function readLoginHints(): LoginHints {
  const fallback = { addr: DEFAULT_CLUSTER_ADDR, username: "" };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(LOGIN_HINTS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<LoginHints>;
    return {
      addr: typeof parsed.addr === "string" && parsed.addr.trim() ? parsed.addr.trim() : fallback.addr,
      username: typeof parsed.username === "string" ? parsed.username.trim() : "",
    };
  } catch {
    return fallback;
  }
}

export function writeLoginHints(input: LoginInput): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LOGIN_HINTS_STORAGE_KEY,
      JSON.stringify({ addr: input.addr.trim(), username: input.username.trim() }),
    );
  } catch {
    // Login hints are non-critical convenience state.
  }
}
