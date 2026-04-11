import * as React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import SetupSupabaseEnv from "../components/SetupSupabaseEnv";

type AuthGateState = "loading" | "authed" | "anon" | "missing_env";

/**
 * Wraps dashboard routes: allows render only when a Supabase session exists.
 */
export default function RequireAuth() {
  const location = useLocation();
  const [state, setState] = React.useState<AuthGateState>(() =>
    isSupabaseConfigured() ? "loading" : "missing_env",
  );

  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState("missing_env");
      return;
    }
    const sb = getSupabase();
    let cancelled = false;

    sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setState(data.session ? "authed" : "anon");
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setState(session ? "authed" : "anon");
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === "missing_env") {
    return <SetupSupabaseEnv />;
  }

  if (state === "loading") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (state === "anon") {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
