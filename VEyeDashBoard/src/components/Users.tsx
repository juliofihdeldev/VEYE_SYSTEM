import * as React from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopyOutlined as CopyIcon,
  EventOutlined as DateIcon,
  NotificationsActiveOutlined as BellIcon,
  NotificationsOffOutlined as BellOffIcon,
  PersonOutline as PersonIcon,
  PlaceOutlined as PlaceIcon,
  Search as SearchIcon,
  SmartphoneOutlined as PhoneIcon,
} from '@mui/icons-material';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { searchAppUsers, type AppUserRow } from '../api';

type DeviceFilter = 'all' | 'with' | 'without';

const avatarColors = [
  '#a78bfa',
  '#f59e0b',
  '#fb923c',
  '#34d399',
  '#f472b6',
  '#60a5fa',
  '#ef4444',
  '#0ea5e9',
];

const colorFor = (id?: string | null) => {
  if (!id) return avatarColors[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % avatarColors.length;
  return avatarColors[h];
};

const initialsOf = (value?: string | null) => {
  if (!value) return 'U';
  const cleaned = value.includes('@') ? value.split('@')[0] : value;
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return cleaned.slice(0, 2).toUpperCase() || 'U';
  return parts.map((p) => p[0]).join('').toUpperCase();
};

const truncate = (value: string, len = 16) => {
  if (value.length <= len) return value;
  const head = Math.ceil((len - 1) / 2);
  const tail = Math.floor((len - 1) / 2);
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
};

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function Users() {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState('');
  const [device, setDevice] = React.useState<DeviceFilter>('all');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  const [data, setData] = React.useState<AppUserRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchAppUsers({
        query: debouncedSearch,
        hasDevice: device === 'all' ? null : device === 'with',
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      });
      setData(res.rows);
      setTotal(res.total);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || t('users.errorGeneric'));
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, device, page, rowsPerPage, t]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    setPage(0);
  }, [debouncedSearch, device]);

  const clearFilters = () => {
    setSearch('');
    setDevice('all');
  };

  const hasFilters = !!(search || device !== 'all');

  const copyToClipboard = (value: string) => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(value);
  };

  const deviceFilters: { value: DeviceFilter; key: string }[] = [
    { value: 'all', key: 'all' },
    { value: 'with', key: 'pushOn' },
    { value: 'without', key: 'pushOff' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
      >
        <Box>
          <Typography variant="h2" sx={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {t('users.title')}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#0ea5e9',
                boxShadow: '0 0 0 4px rgba(14,165,233,0.18)',
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {t('users.totalSubtitle', { count: total })}
            </Typography>
          </Stack>
        </Box>
      </Stack>

      <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{ mb: 2 }}
        >
          <TextField
            placeholder={t('users.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flex: 1, maxWidth: { md: 420 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mr: 0.5 }}>
              {t('users.deviceLabel')}
            </Typography>
            {deviceFilters.map((opt) => {
              const active = device === opt.value;
              return (
                <Chip
                  key={opt.value}
                  size="small"
                  label={t(`users.deviceFilters.${opt.key}`)}
                  onClick={() => setDevice(opt.value)}
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    bgcolor: active ? '#0f172a' : '#f1f5f9',
                    color: active ? '#fff' : '#475569',
                    border: '1px solid',
                    borderColor: active ? '#0f172a' : 'transparent',
                    '&:hover': { bgcolor: active ? '#0f172a' : '#e2e8f0' },
                  }}
                />
              );
            })}
          </Stack>

          {hasFilters && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<CloseIcon fontSize="small" />}
              onClick={clearFilters}
              sx={{
                borderColor: 'rgba(15,23,42,0.12)',
                color: 'text.secondary',
                '&:hover': { borderColor: 'rgba(15,23,42,0.24)', bgcolor: '#f8fafc' },
              }}
            >
              {t('common.clearFilters')}
            </Button>
          )}
          {loading && <CircularProgress size={18} thickness={5} sx={{ ml: 1 }} />}
        </Stack>

        {error && (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: 13,
            }}
          >
            {error}
          </Box>
        )}

        <TableContainer
          sx={{
            borderRadius: 2,
            border: '1px solid rgba(15,23,42,0.06)',
            overflow: 'hidden',
          }}
        >
          <Table sx={{ minWidth: 880 }}>
            <TableHead>
              <TableRow>
                {[
                  t('users.columns.user'),
                  t('users.columns.notifications'),
                  t('users.columns.location'),
                  t('users.columns.device'),
                  t('users.columns.updated'),
                ].map((h, i) => (
                  <TableCell
                    key={`${i}-${h}`}
                    sx={{
                      textTransform: 'uppercase',
                      fontSize: 11,
                      letterSpacing: '0.08em',
                      color: 'text.secondary',
                      bgcolor: '#f8fafc',
                      borderBottom: '1px solid rgba(15,23,42,0.06)',
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length === 0 && !loading && !error && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Stack alignItems="center" spacing={1}>
                      <PersonIcon sx={{ fontSize: 36, color: 'text.disabled' }} />
                      <Typography color="text.secondary">
                        {hasFilters ? t('users.emptyFiltered') : t('users.emptyAll')}
                      </Typography>
                      {hasFilters && (
                        <Button size="small" onClick={clearFilters}>
                          {t('common.clearFilters')}
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              )}

              {data.map((row) => {
                const displayName = row.email || row.userId || row.id;
                const hasPush = !!(row.deviceToken && row.deviceToken.trim());
                const hasLocation =
                  row.latitude != null && row.longitude != null;
                const radius =
                  row.notificationRadiusKm ?? row.radiusKm ?? null;

                return (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{
                      '& td': {
                        borderBottom: '1px solid rgba(15,23,42,0.06)',
                        py: 1.5,
                        verticalAlign: 'top',
                      },
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          variant="rounded"
                          sx={{
                            bgcolor: colorFor(row.id),
                            color: '#fff',
                            width: 36,
                            height: 36,
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {initialsOf(displayName)}
                        </Avatar>
                        <Box sx={{ minWidth: 0, maxWidth: 280 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: 14 }} noWrap>
                            {row.email || row.userId || t('users.anonymous')}
                          </Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: 'text.disabled',
                                fontFamily:
                                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              }}
                              noWrap
                            >
                              {truncate(row.id, 22)}
                            </Typography>
                            <Tooltip title={t('common.copy')}>
                              <IconButton
                                size="small"
                                onClick={() => copyToClipboard(row.id)}
                                sx={{ color: 'text.disabled', p: 0.25 }}
                              >
                                <CopyIcon sx={{ fontSize: 12 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      {hasPush ? (
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <BellIcon sx={{ fontSize: 16, color: '#0d9488' }} />
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                            {radius != null
                              ? t('users.radiusKm', { km: radius })
                              : t('users.pushOnNoRadius')}
                          </Typography>
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <BellOffIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                            {t('users.pushOff')}
                          </Typography>
                        </Stack>
                      )}
                    </TableCell>

                    <TableCell sx={{ maxWidth: 220 }}>
                      {hasLocation ? (
                        <Stack direction="row" spacing={0.75} alignItems="flex-start">
                          <PlaceIcon sx={{ fontSize: 16, color: 'text.disabled', mt: 0.25 }} />
                          <Box>
                            <Typography
                              sx={{
                                fontSize: 13,
                                fontWeight: 600,
                                fontFamily:
                                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              }}
                            >
                              {row.latitude!.toFixed(4)}, {row.longitude!.toFixed(4)}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                              {t('users.locationKnown')}
                            </Typography>
                          </Box>
                        </Stack>
                      ) : (
                        <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>
                          {t('users.locationUnknown')}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell sx={{ maxWidth: 180 }}>
                      {hasPush ? (
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <PhoneIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          <Tooltip title={row.deviceToken || ''}>
                            <Chip
                              size="small"
                              label={truncate(row.deviceToken!, 14)}
                              onClick={() => copyToClipboard(row.deviceToken!)}
                              sx={{
                                fontFamily:
                                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                fontSize: 11,
                                bgcolor: '#f0fdfa',
                                color: '#0d9488',
                                fontWeight: 600,
                                cursor: 'pointer',
                                '&:hover': { bgcolor: '#ccfbf1' },
                              }}
                            />
                          </Tooltip>
                        </Stack>
                      ) : (
                        <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>
                          {t('users.noDevice')}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <DateIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                          {row.updatedAt
                            ? moment(row.updatedAt).fromNow()
                            : '—'}
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[25, 50, 100]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(+e.target.value);
            setPage(0);
          }}
          sx={{ borderTop: 'none', '& .MuiTablePagination-toolbar': { px: 0 } }}
        />
      </Paper>
    </Box>
  );
}
