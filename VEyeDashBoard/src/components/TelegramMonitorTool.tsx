import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { runTelegramMonitor } from '../api';

type ChatSource = 'channel' | 'group' | 'supergroup' | 'private' | 'none';

const CHAT_SOURCE_UI: Record<
  ChatSource,
  { label: string; color: 'primary' | 'secondary' | 'info' | 'warning' | 'default' }
> = {
  channel: { label: 'Canal', color: 'primary' },
  group: { label: 'Groupe', color: 'secondary' },
  supergroup: { label: 'Supergroupe', color: 'info' },
  private: { label: 'Privé (bot)', color: 'warning' },
  none: { label: 'Sans payload', color: 'default' },
};

const OUTCOME_LABELS: Record<string, string> = {
  no_payload: 'Pas de message / type non géré',
  skipped_channel_filter: 'Exclu (hors liste de canaux)',
  skipped_no_text: 'Ignoré (pas de texte)',
  skipped_duplicate_db: 'Déjà en base',
  saved_ai: 'Enregistré (IA)',
  ai_not_relevant: 'IA : non pertinent',
  ai_duplicate: 'IA : doublon',
  saved_news_fallback: 'News (repli)',
};

type UpdateDetailRow = {
  updateId: number;
  chatSource: string;
  chatTitle: string;
  chatId: number | null;
  textPreview: string;
  outcome: string;
  collection?: string;
};

type MonitorResult = {
  success?: boolean;
  processed?: number;
  writtenNews?: number;
  writtenZoneDanger?: number;
  writtenViktim?: number;
  skippedRelevant?: number;
  skippedDuplicate?: number;
  updatesReceivedByType?: Partial<Record<ChatSource, number>>;
  chatSourceLabels?: Record<string, string>;
  updateDetails?: UpdateDetailRow[];
};

function outcomeLabel(outcome: string, collection?: string) {
  if (outcome === 'saved_ai' && collection) {
    return `${OUTCOME_LABELS.saved_ai} → ${collection}`;
  }
  return OUTCOME_LABELS[outcome] ?? outcome;
}

export default function TelegramMonitorTool() {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<MonitorResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await runTelegramMonitor();
      setResult(data as MonitorResult);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string }; status?: number }; message?: string };
      const msg =
        ax?.response?.data?.error ??
        (ax?.response?.status === 401 ? 'Non autorisé — vérifiez VITE_PROCESS_ALERT_SECRET.' : null) ??
        ax?.message ??
        'Échec de l’appel';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const byType = result?.updatesReceivedByType;
  const details = result?.updateDetails ?? [];

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        Telegram — exécution manuelle
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Lance le même traitement que la tâche planifiée : récupération des nouveaux messages Telegram,
        passage par l’IA, écriture dans Firestore (ZoneDanger, News, etc.). Peut prendre jusqu’à ~2
        minutes. La réponse indique si chaque mise à jour vient d’un <strong>canal</strong>, d’un{' '}
        <strong>groupe</strong>, d’un <strong>supergroupe</strong> ou d’une conversation{' '}
        <strong>privée</strong> avec le bot.
      </Typography>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          <Button
            variant="contained"
            size="large"
            startIcon={<CloudSyncIcon />}
            onClick={handleRun}
            disabled={loading}
            sx={{ mb: 2 }}
          >
            {loading ? 'Exécution en cours…' : 'Lancer le moniteur Telegram'}
          </Button>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {result && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Exécution terminée
                </Typography>
                <Typography variant="body2" component="span">
                  Mises à jour Telegram traitées : <strong>{result.processed ?? 0}</strong>
                  {' · '}
                  ZoneDanger : <strong>{result.writtenZoneDanger ?? 0}</strong>
                  {' · '}
                  Viktim : <strong>{result.writtenViktim ?? 0}</strong>
                  {' · '}
                  News : <strong>{result.writtenNews ?? 0}</strong>
                  {' · '}
                  IA non pertinent : <strong>{result.skippedRelevant ?? 0}</strong>
                  {' · '}
                  IA doublon : <strong>{result.skippedDuplicate ?? 0}</strong>
                </Typography>
              </Alert>

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Origine des mises à jour (reçues de Telegram)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Compte chaque <code>update</code> selon le type de chat : publication de canal, message de
                groupe, supergroupe, ou message privé au bot.
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
                {(Object.keys(CHAT_SOURCE_UI) as ChatSource[]).map((key) => {
                  const n = byType?.[key] ?? 0;
                  if (n === 0) return null;
                  const ui = CHAT_SOURCE_UI[key];
                  return (
                    <Chip
                      key={key}
                      label={`${ui.label} : ${n}`}
                      color={ui.color}
                      variant={ui.color === 'default' ? 'outlined' : 'filled'}
                    />
                  );
                })}
                {result.processed === 0 && (
                  <Chip label="Aucune mise à jour Telegram" variant="outlined" />
                )}
                {result.processed !== 0 && byType == null && (
                  <Chip
                    label="Redéployez telegramMonitorRun pour afficher canal / groupe / privé"
                    color="warning"
                    variant="outlined"
                  />
                )}
              </Stack>

              {details.length > 0 && (
                <>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Détail par mise à jour
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420, mb: 2 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>update_id</TableCell>
                          <TableCell>Origine</TableCell>
                          <TableCell>Chat</TableCell>
                          <TableCell>ID chat</TableCell>
                          <TableCell>Aperçu</TableCell>
                          <TableCell>Résultat</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {details.map((row) => {
                          const src = (row.chatSource as ChatSource) in CHAT_SOURCE_UI
                            ? CHAT_SOURCE_UI[row.chatSource as ChatSource]
                            : CHAT_SOURCE_UI.none;
                          return (
                            <TableRow key={row.updateId}>
                              <TableCell>{row.updateId}</TableCell>
                              <TableCell>
                                <Chip size="small" label={src.label} color={src.color} variant="outlined" />
                              </TableCell>
                              <TableCell sx={{ maxWidth: 160 }}>{row.chatTitle}</TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{row.chatId ?? '—'}</TableCell>
                              <TableCell sx={{ maxWidth: 220, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {row.textPreview || '—'}
                              </TableCell>
                              <TableCell sx={{ maxWidth: 200 }}>
                                {outcomeLabel(row.outcome, row.collection)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">Réponse JSON brute</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 1.5,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      fontSize: 11,
                      overflow: 'auto',
                      maxHeight: 280,
                    }}
                  >
                    {JSON.stringify(result, null, 2)}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
