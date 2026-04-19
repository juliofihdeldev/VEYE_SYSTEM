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
import { Trans, useTranslation } from 'react-i18next';
import { runTelegramMonitor } from '../api';

type ChatSource = 'channel' | 'group' | 'supergroup' | 'private' | 'none';

const CHAT_SOURCE_COLOR: Record<
  ChatSource,
  'primary' | 'secondary' | 'info' | 'warning' | 'default'
> = {
  channel: 'primary',
  group: 'secondary',
  supergroup: 'info',
  private: 'warning',
  none: 'default',
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

export default function TelegramMonitorTool() {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<MonitorResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const outcomeLabel = React.useCallback(
    (outcome: string, collection?: string) => {
      const key = `telegram.outcomes.${outcome}`;
      const translated = t(key);
      const label = translated === key ? outcome : translated;
      if (outcome === 'saved_ai' && collection) {
        return `${label} → ${collection}`;
      }
      return label;
    },
    [t],
  );

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
        (ax?.response?.status === 401 ? t('telegram.errorUnauthorized') : null) ??
        ax?.message ??
        t('telegram.errorGeneric');
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
        {t('telegram.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        <Trans
          i18nKey="telegram.intro"
          components={{ 1: <strong />, 3: <strong />, 5: <strong />, 7: <strong /> }}
        />
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
            {loading ? t('telegram.running') : t('telegram.run')}
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
                  {t('telegram.successTitle')}
                </Typography>
                <Typography variant="body2" component="span">
                  <Trans
                    i18nKey="telegram.successDetails"
                    values={{
                      processed: result.processed ?? 0,
                      zones: result.writtenZoneDanger ?? 0,
                      viktim: result.writtenViktim ?? 0,
                      news: result.writtenNews ?? 0,
                      notRelevant: result.skippedRelevant ?? 0,
                      duplicate: result.skippedDuplicate ?? 0,
                    }}
                    components={{ strong: <strong /> }}
                  />
                </Typography>
              </Alert>

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                {t('telegram.originHeading')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                <Trans i18nKey="telegram.originBody" components={{ code: <code /> }} />
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
                {(Object.keys(CHAT_SOURCE_COLOR) as ChatSource[]).map((key) => {
                  const n = byType?.[key] ?? 0;
                  if (n === 0) return null;
                  const color = CHAT_SOURCE_COLOR[key];
                  return (
                    <Chip
                      key={key}
                      label={t('telegram.chatSourcesWithCount', { label: t(`telegram.chatSources.${key}`), count: n })}
                      color={color}
                      variant={color === 'default' ? 'outlined' : 'filled'}
                    />
                  );
                })}
                {result.processed === 0 && (
                  <Chip label={t('telegram.noUpdates')} variant="outlined" />
                )}
                {result.processed !== 0 && byType == null && (
                  <Chip
                    label={t('telegram.redeployHint')}
                    color="warning"
                    variant="outlined"
                  />
                )}
              </Stack>

              {details.length > 0 && (
                <>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    {t('telegram.detailHeading')}
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420, mb: 2 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('telegram.detailColumns.updateId')}</TableCell>
                          <TableCell>{t('telegram.detailColumns.origin')}</TableCell>
                          <TableCell>{t('telegram.detailColumns.chat')}</TableCell>
                          <TableCell>{t('telegram.detailColumns.chatId')}</TableCell>
                          <TableCell>{t('telegram.detailColumns.preview')}</TableCell>
                          <TableCell>{t('telegram.detailColumns.outcome')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {details.map((row) => {
                          const sourceKey: ChatSource =
                            row.chatSource in CHAT_SOURCE_COLOR
                              ? (row.chatSource as ChatSource)
                              : 'none';
                          const color = CHAT_SOURCE_COLOR[sourceKey];
                          return (
                            <TableRow key={row.updateId}>
                              <TableCell>{row.updateId}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={t(`telegram.chatSources.${sourceKey}`)}
                                  color={color}
                                  variant="outlined"
                                />
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
                  <Typography variant="subtitle2">{t('telegram.rawJson')}</Typography>
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
