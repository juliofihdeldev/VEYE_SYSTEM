import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { getSupabase, isSupabaseConfigured } from "../../lib/supabase";
import SetupSupabaseEnv from "../SetupSupabaseEnv";

/**
 * Password reset landing: user arrives from email with hash tokens; Supabase client picks up session.
 */
export default function AuthRecovery() {
  const navigate = useNavigate();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [hasSession, setHasSession] = React.useState(false);

  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setHasSession(false);
      setReady(true);
      return;
    }
    const sb = getSupabase();
    sb.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) return;
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await getSupabase().auth.updateUser({ password });
      if (err) {
        setError(err.message);
        return;
      }
      navigate("/home", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography>Loading…</Typography>
      </Box>
    );
  }

  if (!isSupabaseConfigured()) {
    return <SetupSupabaseEnv />;
  }

  if (!hasSession) {
    return (
      <Box sx={{ maxWidth: 480, mx: "auto", mt: 6, px: 2 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Invalid or expired link
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Open the reset link from your email again, or request a new one from the sign-in page.
          </Typography>
          <Button component={Link} to="/" variant="contained">
            Back to sign in
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", mt: 6, px: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Set a new password
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Choose a new password for your dashboard account.
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="new-password"
            />
            <TextField
              label="Confirm password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              fullWidth
              autoComplete="new-password"
            />
            {error ? (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            ) : null}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button component={Link} to="/" disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={busy}>
                {busy ? "Saving…" : "Update password"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
