import * as React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { Trans, useTranslation } from "react-i18next";

/**
 * Shown when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing (dev misconfiguration).
 */
export default function SetupSupabaseEnv() {
  const { t } = useTranslation();
  return (
    <Box sx={{ maxWidth: 560, mx: "auto", mt: 6, px: 2 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          {t("setupEnv.title")}
        </Typography>
        <Typography color="text.secondary" paragraph>
          <Trans i18nKey="setupEnv.intro" components={{ 1: <code /> }} />
        </Typography>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {t("setupEnv.step1")}
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
          {t("setupEnv.step2Prefix")}<code>VEyeDashBoard/.env</code>{t("setupEnv.step2Suffix")}
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
          {t("setupEnv.step3")}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Typography color="text.secondary" component="span" variant="body2">
            <Trans i18nKey="setupEnv.restartHint" components={{ 1: <strong />, 3: <code /> }} />
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
