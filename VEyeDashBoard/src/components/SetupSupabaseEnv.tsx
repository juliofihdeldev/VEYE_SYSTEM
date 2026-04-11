import * as React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

/**
 * Shown when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing (dev misconfiguration).
 */
export default function SetupSupabaseEnv() {
  return (
    <Box sx={{ maxWidth: 560, mx: "auto", mt: 6, px: 2 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Supabase environment variables missing
        </Typography>
        <Typography color="text.secondary" paragraph>
          The dashboard needs your project URL and the public anon key before it can sign you in or load data. The file
          must live in this app folder (same place as <code>vite.config.ts</code>), not only at the monorepo root.
        </Typography>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          1. Copy the example file
        </Typography>
        <Box
          component="pre"
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: "grey.100",
            fontSize: 13,
            overflow: "auto",
            mb: 2,
          }}
        >
          cp VEyeDashBoard/.env.example VEyeDashBoard/.env
        </Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          2. Edit <code>VEyeDashBoard/.env</code> and set at least:
        </Typography>
        <Box
          component="pre"
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: "grey.100",
            fontSize: 13,
            overflow: "auto",
            mb: 2,
          }}
        >
          {`VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Project Settings → API>`}
        </Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          3. Restart the Vite dev server
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Typography color="text.secondary" component="span" variant="body2">
            Env vars are only read at startup — <strong>pnpm dev:dashboard</strong> must be restarted after saving{" "}
            <code>.env</code>.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
