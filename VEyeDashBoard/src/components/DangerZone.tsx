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
  Add as AddIcon,
  Close as CloseIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  PlaceOutlined as PlaceIcon,
  Search as SearchIcon,
  CheckCircleRounded as VerifiedIcon,
  HourglassEmptyRounded as PendingIcon,
  EventOutlined as DateIcon,
} from '@mui/icons-material';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import ModalComponent from './Modal';
import ConfirmDialog from './ConfirmDialog';
import DangerForm from '../form/DangerForm';
import EditDangerForm from '../form/EditDangerForm';
import { handleDeletedAlert, searchDangerZones } from '../api';

type ZoneRow = {
  id: string;
  name?: string;
  rezon?: string;
  address?: string;
  city?: string;
  latitude?: number | string;
  longitude?: number | string;
  level?: string;
  incident_type?: string;
  verified?: boolean;
  date?: { seconds: number };
};

const levelStyles: Record<string, { bg: string; color: string }> = {
  high: { bg: '#fee2e2', color: '#b91c1c' },
  medium: { bg: '#fef3c7', color: '#b45309' },
  low: { bg: '#dcfce7', color: '#15803d' },
  default: { bg: '#e2e8f0', color: '#334155' },
};

const initialsOf = (name?: string) => {
  if (!name) return 'ZD';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase() || 'ZD';
};

const avatarColors = ['#a78bfa', '#f59e0b', '#fb923c', '#34d399', '#f472b6', '#60a5fa', '#ef4444', '#0ea5e9'];
const colorFor = (id?: string) => {
  if (!id) return avatarColors[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % avatarColors.length;
  return avatarColors[h];
};

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function DangerZone() {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const [data, setData] = React.useState<ZoneRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const [open, setOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<ZoneRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ open: boolean; item: ZoneRow | null }>(
    { open: false, item: null },
  );

  const debouncedSearch = useDebouncedValue(search, 300);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchDangerZones({
        query: debouncedSearch,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      });
      setData(res.rows as ZoneRow[]);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, dateFrom, dateTo, page, rowsPerPage]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    setPage(0);
  }, [debouncedSearch, dateFrom, dateTo]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    fetchData();
  };
  const handleEditClose = () => setEditItem(null);
  const handleEditSaved = async () => {
    setEditItem(null);
    await fetchData();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.item) return;
    await handleDeletedAlert(deleteConfirm.item);
    setDeleteConfirm({ open: false, item: null });
    fetchData();
  };

  const clearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = !!(search || dateFrom || dateTo);

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
            {t('zoneDanger.title')}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'error.main',
                boxShadow: '0 0 0 4px rgba(239,68,68,0.18)',
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {t('zoneDanger.totalSubtitle', { count: total })}
            </Typography>
          </Stack>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          size="large"
          onClick={handleOpen}
        >
          {t('zoneDanger.report')}
        </Button>
      </Stack>

      <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{ mb: 2 }}
        >
          <TextField
            placeholder={t('zoneDanger.searchPlaceholder')}
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
          <TextField
            label={t('common.from')}
            type="date"
            size="small"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label={t('common.to')}
            type="date"
            size="small"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
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

        <TableContainer
          sx={{
            borderRadius: 2,
            border: '1px solid rgba(15,23,42,0.06)',
            overflow: 'hidden',
          }}
        >
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                {[
                  t('zoneDanger.columns.zone'),
                  t('zoneDanger.columns.reason'),
                  t('zoneDanger.columns.address'),
                  t('zoneDanger.columns.status'),
                  t('zoneDanger.columns.date'),
                  '',
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
              {data.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Stack alignItems="center" spacing={1}>
                      <PlaceIcon sx={{ fontSize: 36, color: 'text.disabled' }} />
                      <Typography color="text.secondary">
                        {hasFilters ? t('zoneDanger.emptyFiltered') : t('zoneDanger.emptyAll')}
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
                const lvlKey = (row.level || '').toLowerCase();
                const lvl = levelStyles[lvlKey] || levelStyles.default;
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
                          {initialsOf(row.name)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: 14 }} noWrap>
                            {row.name || '—'}
                          </Typography>
                          {row.incident_type && (
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>
                              {row.incident_type}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ maxWidth: 360 }}>
                      <Typography
                        sx={{
                          fontSize: 13,
                          color: 'text.primary',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {row.rezon || '—'}
                      </Typography>
                      {row.level && (
                        <Chip
                          size="small"
                          label={row.level.toUpperCase()}
                          sx={{
                            mt: 0.75,
                            bgcolor: lvl.bg,
                            color: lvl.color,
                            fontWeight: 700,
                            fontSize: 10,
                            height: 20,
                            letterSpacing: '0.06em',
                          }}
                        />
                      )}
                    </TableCell>

                    <TableCell sx={{ maxWidth: 220 }}>
                      <Stack direction="row" spacing={0.75} alignItems="flex-start">
                        <PlaceIcon sx={{ fontSize: 16, color: 'text.disabled', mt: 0.25 }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                            {row.address || row.city || '—'}
                          </Typography>
                          {(row.latitude != null || row.longitude != null) && (
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: 'text.secondary',
                                fontFamily:
                                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              }}
                            >
                              {Number(row.latitude).toFixed?.(4) ?? row.latitude},{' '}
                              {Number(row.longitude).toFixed?.(4) ?? row.longitude}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      {row.verified ? (
                        <Chip
                          size="small"
                          icon={<VerifiedIcon sx={{ fontSize: '14px !important', color: '#15803d !important' }} />}
                          label={t('zoneDanger.verified')}
                          sx={{
                            bgcolor: '#dcfce7',
                            color: '#15803d',
                            fontWeight: 600,
                            fontSize: 12,
                            height: 24,
                          }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          icon={<PendingIcon sx={{ fontSize: '14px !important', color: '#b45309 !important' }} />}
                          label={t('zoneDanger.pending')}
                          sx={{
                            bgcolor: '#fef3c7',
                            color: '#b45309',
                            fontWeight: 600,
                            fontSize: 12,
                            height: 24,
                          }}
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <DateIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                          {moment((row?.date?.seconds ?? 0) * 1000).format('MMM Do YY')}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title={t('common.edit')}>
                          <IconButton size="small" onClick={() => setEditItem(row)} sx={{ color: 'text.secondary' }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.delete')}>
                          <IconButton
                            size="small"
                            onClick={() => setDeleteConfirm({ open: true, item: row })}
                            sx={{ color: '#ef4444' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
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

      <ModalComponent handleClose={handleClose} open={open} title={t('zoneDanger.addModalTitle')}>
        <DangerForm handleClose={handleClose} />
      </ModalComponent>

      <ModalComponent
        handleClose={handleEditClose}
        open={!!editItem}
        title={t('zoneDanger.editModalTitle')}
      >
        {editItem && (
          <EditDangerForm
            item={editItem}
            handleClose={handleEditClose}
            onSaved={handleEditSaved}
          />
        )}
      </ModalComponent>

      <ConfirmDialog
        open={deleteConfirm.open}
        title={t('zoneDanger.deleteTitle')}
        message={t('zoneDanger.deleteMessage')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ open: false, item: null })}
      />
    </Box>
  );
}
