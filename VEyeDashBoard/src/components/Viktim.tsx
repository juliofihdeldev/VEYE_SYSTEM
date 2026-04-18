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
  EventOutlined as DateIcon,
  PersonOutline as PersonIcon,
  PlaceOutlined as PlaceIcon,
  PaidOutlined as PaidIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import moment from 'moment';
import ModalComponent from './Modal';
import ConfirmDialog from './ConfirmDialog';
import ViktimForm from '../form/ViktimForm';
import EditViktimForm from '../form/EditViktimForm';
import { handleDeletedViktim, searchViktim } from '../api';

moment.locale('fr');

type ViktimRow = {
  id: string;
  fullName?: string;
  zone?: string;
  details?: string;
  type?: string;
  status?: string;
  amount?: number | string;
  date?: { seconds: number };
};

type FilterChip = { value: string; label: string };

const TYPE_FILTERS: FilterChip[] = [
  { value: 'All', label: 'Tout' },
  { value: 'kidnaping', label: 'Kidnaping' },
  { value: 'Pedi', label: 'Pèdi' },
  { value: 'byBandi', label: 'Bandi' },
];

const STATUS_FILTERS: FilterChip[] = [
  { value: '', label: 'Tout estati' },
  { value: 'Captive', label: 'Captive' },
  { value: 'Relache', label: 'Relache' },
];

const typeStyles: Record<string, { bg: string; color: string; label: string }> = {
  kidnaping: { bg: '#fee2e2', color: '#b91c1c', label: 'Kidnaping' },
  pedi: { bg: '#fef3c7', color: '#b45309', label: 'Pèdi' },
  disparut: { bg: '#fef3c7', color: '#b45309', label: 'Pèdi' },
  bybandi: { bg: '#ede9fe', color: '#7c3aed', label: 'Bandi' },
  'bandi-touye': { bg: '#ede9fe', color: '#7c3aed', label: 'Bandi' },
  bandi: { bg: '#ede9fe', color: '#7c3aed', label: 'Bandi' },
};
const defaultTypeStyle = { bg: '#e2e8f0', color: '#334155', label: '—' };

const statusStyles: Record<string, { bg: string; color: string }> = {
  captive: { bg: '#fee2e2', color: '#b91c1c' },
  relache: { bg: '#dcfce7', color: '#15803d' },
};

const initialsOf = (name?: string) => {
  if (!name) return 'VK';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase() || 'VK';
};

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
const colorFor = (id?: string) => {
  if (!id) return avatarColors[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % avatarColors.length;
  return avatarColors[h];
};

const formatAmount = (raw: ViktimRow['amount']) => {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(n)) return String(raw);
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function Viktim() {
  const [search, setSearch] = React.useState('');
  const [type, setType] = React.useState<string>('All');
  const [status, setStatus] = React.useState<string>('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const [data, setData] = React.useState<ViktimRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const [open, setOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<ViktimRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    open: boolean;
    item: ViktimRow | null;
  }>({ open: false, item: null });

  const debouncedSearch = useDebouncedValue(search, 300);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchViktim({
        query: debouncedSearch,
        type,
        status: status || undefined,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      });
      setData(res.rows as ViktimRow[]);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, type, status, dateFrom, dateTo, page, rowsPerPage]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    setPage(0);
  }, [debouncedSearch, type, status, dateFrom, dateTo]);

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
    await handleDeletedViktim(deleteConfirm.item);
    setDeleteConfirm({ open: false, item: null });
    fetchData();
  };

  const clearFilters = () => {
    setSearch('');
    setType('All');
    setStatus('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = !!(search || type !== 'All' || status || dateFrom || dateTo);

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
            Viktim
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
              {total} {total === 1 ? 'viktim' : 'viktim yo'} · live updates
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
          Ajoute viktim
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
            placeholder="Chache non, zon, tip, enfomasyon… (full-text search)"
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
            label="De"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="Jiska"
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
              Efase filtre
            </Button>
          )}
          {loading && <CircularProgress size={18} thickness={5} sx={{ ml: 1 }} />}
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 2.5 }}
        >
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mr: 0.5 }}>
              TYPE
            </Typography>
            {TYPE_FILTERS.map((opt) => {
              const active = type === opt.value;
              return (
                <Chip
                  key={opt.value}
                  size="small"
                  label={opt.label}
                  onClick={() => setType(opt.value)}
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

          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mr: 0.5 }}>
              ESTATI
            </Typography>
            {STATUS_FILTERS.map((opt) => {
              const active = status === opt.value;
              return (
                <Chip
                  key={opt.value || 'all'}
                  size="small"
                  label={opt.label}
                  onClick={() => setStatus(opt.value)}
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
        </Stack>

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
                {['Viktim', 'Zon', 'Tip', 'Estati', 'Montan', 'Dat', ''].map((h) => (
                  <TableCell
                    key={h}
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
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Stack alignItems="center" spacing={1}>
                      <PersonIcon sx={{ fontSize: 36, color: 'text.disabled' }} />
                      <Typography color="text.secondary">
                        {hasFilters ? 'Pa gen rezilta pou filtre yo.' : 'Pa gen okenn viktim ankò.'}
                      </Typography>
                      {hasFilters && (
                        <Button size="small" onClick={clearFilters}>
                          Efase filtre
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              )}

              {data.map((row) => {
                const tKey = (row.type || '').toLowerCase();
                const tStyle = typeStyles[tKey] || {
                  ...defaultTypeStyle,
                  label: row.type || defaultTypeStyle.label,
                };
                const sKey = (row.status || '').toLowerCase();
                const sStyle = statusStyles[sKey];
                const amount = formatAmount(row.amount);

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
                          {initialsOf(row.fullName)}
                        </Avatar>
                        <Box sx={{ minWidth: 0, maxWidth: 240 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: 14 }} noWrap>
                            {row.fullName || '—'}
                          </Typography>
                          {row.details && (
                            <Typography
                              sx={{
                                fontSize: 12,
                                color: 'text.secondary',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {row.details}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ maxWidth: 200 }}>
                      <Stack direction="row" spacing={0.75} alignItems="flex-start">
                        <PlaceIcon sx={{ fontSize: 16, color: 'text.disabled', mt: 0.25 }} />
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>
                          {row.zone || '—'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={tStyle.label}
                        sx={{
                          bgcolor: tStyle.bg,
                          color: tStyle.color,
                          fontWeight: 700,
                          fontSize: 11,
                          height: 22,
                          letterSpacing: '0.04em',
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      {row.status ? (
                        <Chip
                          size="small"
                          label={row.status}
                          sx={{
                            bgcolor: sStyle?.bg || '#e2e8f0',
                            color: sStyle?.color || '#334155',
                            fontWeight: 700,
                            fontSize: 11,
                            height: 22,
                          }}
                        />
                      ) : (
                        <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>—</Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      {amount ? (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <PaidIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                            {amount}
                            <Typography
                              component="span"
                              sx={{ ml: 0.5, fontSize: 11, color: 'text.secondary', fontWeight: 500 }}
                            >
                              HTG
                            </Typography>
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>—</Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <DateIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                          {row?.date?.seconds
                            ? moment(row.date.seconds * 1000).format('MMM Do YY')
                            : '—'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Modifye">
                          <IconButton
                            size="small"
                            onClick={() => setEditItem(row)}
                            sx={{ color: 'text.secondary' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Efase">
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

      <ModalComponent handleClose={handleClose} open={open}>
        <Stack direction="row" spacing={2} justifyContent="space-between" mb={2}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Ajoute yon viktim
          </Typography>
          <IconButton aria-label="close" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <ViktimForm handleClose={handleClose} />
      </ModalComponent>

      <ModalComponent handleClose={handleEditClose} open={!!editItem}>
        <Stack direction="row" spacing={2} justifyContent="space-between" mb={2}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Modifye viktim
          </Typography>
          <IconButton aria-label="close" onClick={handleEditClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
        {editItem && (
          <EditViktimForm
            item={editItem}
            handleClose={handleEditClose}
            onSaved={handleEditSaved}
          />
        )}
      </ModalComponent>

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Efase viktim"
        message="Ou sèten ou vle efase viktim sa a? Aksyon sa a pa ka defèt."
        confirmLabel="Efase"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ open: false, item: null })}
      />
    </Box>
  );
}
