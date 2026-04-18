import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export interface CurrentUser {
  user: User | null;
  /** Best-effort display name (full_name → name → email local-part → "Itilizatè"). */
  displayName: string;
  /** Email if available, else empty string. */
  email: string;
  /** Role label for the sidebar (user_metadata.role / app_metadata.role → "Administratè"). */
  roleLabel: string;
  /** 1–2 char initials derived from {@link displayName}. */
  initials: string;
  /** True until the first `getSession()` resolves. */
  loading: boolean;
}

const FALLBACK_NAME = "Itilizatè";
const FALLBACK_ROLE = "Administratè";

function pickDisplayName(user: User | null): string {
  if (!user) return FALLBACK_NAME;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidates = [meta.full_name, meta.name, meta.display_name, meta.username];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim();
  }
  if (user.email) return user.email.split("@")[0];
  return FALLBACK_NAME;
}

function pickRoleLabel(user: User | null): string {
  if (!user) return FALLBACK_ROLE;
  const userRole = (user.user_metadata as Record<string, unknown> | undefined)?.role;
  const appRole = (user.app_metadata as Record<string, unknown> | undefined)?.role;
  for (const r of [userRole, appRole]) {
    if (typeof r === "string" && r.trim().length > 0) return r.trim();
  }
  return FALLBACK_ROLE;
}

function pickInitials(displayName: string): string {
  const parts = displayName
    .replace(/[._-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return "??";
}

export function useCurrentUser(): CurrentUser {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState<boolean>(() => isSupabaseConfigured());

  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    let cancelled = false;

    sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const displayName = React.useMemo(() => pickDisplayName(user), [user]);
  const roleLabel = React.useMemo(() => pickRoleLabel(user), [user]);
  const initials = React.useMemo(() => pickInitials(displayName), [displayName]);

  return {
    user,
    displayName,
    email: user?.email ?? "",
    roleLabel,
    initials,
    loading,
  };
}
