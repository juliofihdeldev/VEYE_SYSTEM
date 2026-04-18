import * as React from 'react';
import {
  Alert,
  AlertTitle,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  CheckCircleOutline as CheckCircleOutlineIcon,
  Close as CloseIcon,
  FileDownloadOutlined as FileDownloadOutlinedIcon,
  FilterList as FilterListIcon,
  MoreHoriz as MoreHorizIcon,
  Refresh as RefreshIcon,
  RemoveRedEyeOutlined as EyeIcon,
  ReportGmailerrorred as ReportIcon,
  ShieldOutlined as ShieldIcon,
  GavelOutlined as GavelIcon,
  WarningAmberOutlined as WarningIcon,
  BlockOutlined as BlockIcon,
  TrendingUp as TrendingUpIcon,
  HourglassEmpty as HourglassIcon,
  LockOutlined as LockIcon,
} from '@mui/icons-material';
import moment from 'moment';
import ConfirmDialog from './ConfirmDialog';
import ModalComponent from './Modal';
import {
  bulkDecideModeration,
  decideModeration,
  fetchAuditFeed,
  fetchHourlyMetrics,
  fetchLeaderboard,
  fetchModerationQueue,
  fetchReasonCounts24h,
  getCurrentUserRole,
  subscribeToModerationQueue,
  type AuditFeedItem,
  type HourlyMetric,
  type LeaderboardEntry,
  type ModerationContentType,
  type ModerationItem,
  type ModerationReason,
  type ModerationStatus,
  type ModeratorAction,
  type ModeratorRole,
  type ReasonCount,
} from '../api';

moment.locale('fr');

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

const reasonStyles: Record<ModerationReason, { bg: string; color: string; label: string }> = {
  MISINFORMATION: { bg: '#fee2e2', color: '#b91c1c', label: 'Misinformation' },
  HATE_SPEECH: { bg: '#fde68a', color: '#92400e', label: 'Hate speech' },
  SPAM: { bg: '#e0e7ff', color: '#3730a3', label: 'Spam' },
  GRAPHIC: { bg: '#fecaca', color: '#7f1d1d', label: 'Graphic content' },
  DUPLICATE: { bg: '#f1f5f9', color: '#475569', label: 'Duplicate' },
  OTHER: { bg: '#f1f5f9', color: '#475569', label: 'Other' },
};

const statusStyles: Record<ModerationStatus, { bg: string; color: string; label: string }> = {
  PENDING: { bg: '#fef3c7', color: '#b45309', label: 'Pending' },
  APPROVED: { bg: '#dcfce7', color: '#15803d', label: 'Apwouve' },
  REJECTED: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejte' },
  ESCALATED: { bg: '#e0f2fe', color: '#0369a1', label: 'Eskalade' },
};

const contentTypeStyles: Record<ModerationContentType, { bg: string; color: string; label: string }> = {
  POST: { bg: '#ede9fe', color: '#6d28d9', label: 'Post' },
  REPORT: { bg: '#fee2e2', color: '#b91c1c', label: 'Report' },
  NEWS: { bg: '#e0f2fe', color: '#0369a1', label: 'News' },
  COMMENT: { bg: '#f1f5f9', color: '#475569', label: 'Comment' },
};

// Deterministic avatar colors from author name -----------------------------
const AVATAR_PALETTE = [
  '#a78bfa', '#f59e0b', '#fb923c', '#34d399', '#f472b6',
  '#60a5fa', '#94a3b8', '#0f766e', '#ef4444', '#6366f1',
];
function avatarColorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// Visual maps for derived data
// ---------------------------------------------------------------------------

// Bar colors for "Pa rezon · 24h" — same palette as the row chips,
// but slightly stronger so they read as standalone bars.
const reasonBarColor: Record<ModerationReason, string> = {
  MISINFORMATION: '#ef4444',
  HATE_SPEECH: '#f59e0b',
  SPAM: '#6366f1',
  GRAPHIC: '#dc2626',
  DUPLICATE: '#94a3b8',
  OTHER: '#64748b',
};

// Activity feed: pick an icon + tint per moderator action.
const activityIconFor = (action: ModeratorAction) => {
  switch (action) {
    case 'approve':
      return { icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />, bg: '#dcfce7' };
    case 'reject':
      return { icon: <BlockIcon sx={{ fontSize: 18 }} />, bg: '#fee2e2' };
    case 'escalate':
      return { icon: <WarningIcon sx={{ fontSize: 18 }} />, bg: '#fef3c7' };
  }
};

const actionLabelKR: Record<ModeratorAction, string> = {
  approve: 'apwouve',
  reject: 'rejte',
  escalate: 'eskalade',
};

// Display name for a moderator: short prefix of email when no profile yet.
const moderatorDisplayName = (email: string | null): string => {
  if (!email) return 'Anonim moderatè';
  const at = email.indexOf('@');
  return at > 0 ? email.slice(0, at) : email;
};

// ---------------------------------------------------------------------------
// Small UI building blocks (Sparkline, KpiCard, chips)
// ---------------------------------------------------------------------------

function Sparkline({
  color,
  points,
  trend = 'flat',
}: {
  color: string;
  points: number[];
  trend?: 'up' | 'down' | 'flat';
}) {
  const width = 220;
  const height = 44;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const stepX = width / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / span) * (height - 6) - 3;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <Box sx={{ position: 'relative', width: '100%', height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        aria-hidden
      >
        <defs>
          <linearGradient id={`mod-grad-${color.slice(1)}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L ${width} ${height} L 0 ${height} Z`}
          fill={`url(#mod-grad-${color.slice(1)})`}
        />
        <path d={path} fill="none" stroke={color} strokeWidth={1.75} />
      </svg>
      {trend !== 'flat' && (
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            fontSize: 10,
            color,
            fontWeight: 600,
          }}
        >
          {trend === 'up' ? '▲' : '▼'}
        </Box>
      )}
    </Box>
  );
}

type KpiCardProps = {
  label: string;
  value: string | number;
  delta: string;
  deltaColor: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  spark: number[];
  sparkColor: string;
  trend: 'up' | 'down' | 'flat';
};

function KpiCard({
  label, value, delta, deltaColor, icon, iconBg, iconColor, spark, sparkColor, trend,
}: KpiCardProps) {
  return (
    <Card sx={{ flex: 1, minWidth: 220 }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              letterSpacing: '0.08em',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </Typography>
          <Box
            sx={{
              width: 32, height: 32, borderRadius: 1.5,
              bgcolor: iconBg, color: iconColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Stack>
        <Typography sx={{ fontSize: '2.25rem', fontWeight: 700, mt: 1, lineHeight: 1.1 }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: deltaColor, mt: 0.5 }}>
          {delta}
        </Typography>
        <Box sx={{ mt: 1.5 }}>
          <Sparkline color={sparkColor} points={spark} trend={trend} />
        </Box>
      </CardContent>
    </Card>
  );
}

function ReasonChip({ reason }: { reason: ModerationReason }) {
  const s = reasonStyles[reason];
  return (
    <Chip
      label={`● ${s.label}`}
      size="small"
      sx={{
        bgcolor: s.bg, color: s.color,
        fontWeight: 700, fontSize: 11, height: 24,
        letterSpacing: '0.04em',
        '& .MuiChip-label': { px: 1.25 },
      }}
    />
  );
}

function StatusChip({ status }: { status: ModerationStatus }) {
  const s = statusStyles[status];
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: 12, height: 24 }}
    />
  );
}

function TypeChip({ type }: { type: ModerationContentType }) {
  const s = contentTypeStyles[type];
  return (
    <Chip
      label={s.label}
      size="small"
      variant="outlined"
      sx={{
        bgcolor: s.bg, color: s.color, borderColor: 'transparent',
        fontWeight: 600, fontSize: 11, height: 22,
        '& .MuiChip-label': { px: 1 },
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type StatusFilter = 'all' | 'pending' | 'flagged' | 'approved' | 'rejected' | 'escalated';
type ReasonFilter = 'all' | ModerationReason;

type PendingAction =
  | { kind: ModeratorAction; ids: string[] }
  | null;

export default function Moderation() {
  const theme = useTheme();
  const [items, setItems] = React.useState<ModerationItem[]>([]);
  const [reasonCounts, setReasonCounts] = React.useState<ReasonCount[]>([]);
  const [auditFeed, setAuditFeed] = React.useState<AuditFeedItem[]>([]);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>([]);
  const [hourly, setHourly] = React.useState<HourlyMetric[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<ModeratorRole>(null);
  const [roleResolved, setRoleResolved] = React.useState(false);

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [reasonFilter, setReasonFilter] = React.useState<ReasonFilter>('all');
  const [selected, setSelected] = React.useState<string[]>([]);
  const [updatedAgo, setUpdatedAgo] = React.useState(0);
  const [detailItem, setDetailItem] = React.useState<ModerationItem | null>(null);
  const [pendingAction, setPendingAction] = React.useState<PendingAction>(null);
  const [actionNote, setActionNote] = React.useState('');
  const [snack, setSnack] = React.useState<{ msg: string; severity: 'success' | 'error' | 'info' } | null>(null);

  const isModerator = role === 'admin' || role === 'moderator';
  const isAdmin = role === 'admin';

  // Load --------------------------------------------------------------------
  const loadDerived = React.useCallback(async () => {
    try {
      const [r, a, l, h] = await Promise.all([
        fetchReasonCounts24h(),
        fetchAuditFeed(),
        fetchLeaderboard(),
        fetchHourlyMetrics(17),
      ]);
      setReasonCounts(r);
      setAuditFeed(a);
      setLeaderboard(l);
      setHourly(h);
    } catch (e) {
      console.error('loadDerived failed', e);
    }
  }, []);

  const load = React.useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [queue] = await Promise.all([fetchModerationQueue(), loadDerived()]);
      setItems(queue);
      setUpdatedAgo(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [loadDerived]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await getCurrentUserRole();
      if (cancelled) return;
      setRole(r);
      setRoleResolved(true);
      if (r === 'admin' || r === 'moderator') {
        load();
      } else {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [load]);

  // Realtime --------------------------------------------------------------
  React.useEffect(() => {
    if (!isModerator) return;
    let pending: number | null = null;
    const scheduleDerivedRefetch = () => {
      if (pending != null) return;
      pending = window.setTimeout(() => {
        pending = null;
        loadDerived();
      }, 250);
    };
    const unsubscribe = subscribeToModerationQueue((event) => {
      setItems((prev) => {
        if (event.kind === 'DELETE') {
          return prev.filter((it) => it.id !== event.id);
        }
        if (event.kind === 'INSERT') {
          if (prev.some((it) => it.id === event.item.id)) return prev;
          return [event.item, ...prev];
        }
        return prev.map((it) => (it.id === event.item.id ? event.item : it));
      });
      setUpdatedAgo(0);
      scheduleDerivedRefetch();
    });
    return () => {
      if (pending != null) window.clearTimeout(pending);
      unsubscribe();
    };
  }, [isModerator, loadDerived]);

  // Last-updated ticker ---------------------------------------------------
  React.useEffect(() => {
    const id = window.setInterval(() => setUpdatedAgo((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Derived ---------------------------------------------------------------
  const filtered = React.useMemo(() => {
    return items.filter((it) => {
      if (statusFilter === 'pending' && it.status !== 'PENDING') return false;
      if (statusFilter === 'approved' && it.status !== 'APPROVED') return false;
      if (statusFilter === 'rejected' && it.status !== 'REJECTED') return false;
      if (statusFilter === 'escalated' && it.status !== 'ESCALATED') return false;
      if (statusFilter === 'flagged' && it.reportsCount < 5) return false;
      if (reasonFilter !== 'all' && it.reason !== reasonFilter) return false;
      return true;
    });
  }, [items, statusFilter, reasonFilter]);

  const counts = React.useMemo(() => {
    const c = { all: items.length, pending: 0, flagged: 0, approved: 0, rejected: 0, escalated: 0 };
    items.forEach((it) => {
      if (it.status === 'PENDING') c.pending += 1;
      if (it.status === 'APPROVED') c.approved += 1;
      if (it.status === 'REJECTED') c.rejected += 1;
      if (it.status === 'ESCALATED') c.escalated += 1;
      if (it.reportsCount >= 5) c.flagged += 1;
    });
    return c;
  }, [items]);

  // Sparkline arrays + derived 24h totals straight from the hourly RPC.
  const series = React.useMemo(() => {
    const fallback = [0, 0];
    if (hourly.length === 0) {
      return {
        pending: fallback,
        flagged: fallback,
        approved: fallback,
        rejected: fallback,
        approved24: 0,
        rejected24: 0,
        flagged24: 0,
        pending24: 0,
      };
    }
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const pending = hourly.map((h) => h.pendingAdded);
    const flagged = hourly.map((h) => h.flaggedAdded);
    const approved = hourly.map((h) => h.approved);
    const rejected = hourly.map((h) => h.rejected);
    return {
      pending,
      flagged,
      approved,
      rejected,
      pending24: sum(pending),
      flagged24: sum(flagged),
      approved24: sum(approved),
      rejected24: sum(rejected),
    };
  }, [hourly]);

  const trendOf = (arr: number[]): 'up' | 'down' | 'flat' => {
    if (arr.length < 2) return 'flat';
    const half = Math.floor(arr.length / 2);
    const first = arr.slice(0, half).reduce((a, b) => a + b, 0);
    const second = arr.slice(half).reduce((a, b) => a + b, 0);
    if (second > first) return 'up';
    if (second < first) return 'down';
    return 'flat';
  };

  // "Pa rezon · 24h" — fixed display order with normalized bar widths.
  const reasonBars = React.useMemo(() => {
    const order: ModerationReason[] = [
      'MISINFORMATION', 'HATE_SPEECH', 'SPAM', 'GRAPHIC', 'DUPLICATE', 'OTHER',
    ];
    const byKey = new Map(reasonCounts.map((r) => [r.reason, r.count]));
    const max = Math.max(1, ...Array.from(byKey.values()));
    return order.map((key) => ({
      key,
      label: reasonStyles[key].label,
      value: byKey.get(key) ?? 0,
      color: reasonBarColor[key],
      pct: ((byKey.get(key) ?? 0) / max) * 100,
    }));
  }, [reasonCounts]);

  // Mutations -------------------------------------------------------------
  const confirmAction = async () => {
    if (!pendingAction) return;
    const note = actionNote.trim() || undefined;
    try {
      if (pendingAction.ids.length === 1) {
        await decideModeration(pendingAction.ids[0], pendingAction.kind, note);
        setSnack({ msg: `Aksyon "${pendingAction.kind}" reyisi`, severity: 'success' });
      } else {
        const result = await bulkDecideModeration(pendingAction.ids, pendingAction.kind, note);
        if (result.failed.length === 0) {
          setSnack({
            msg: `${result.succeeded.length} kontni: aksyon "${pendingAction.kind}" reyisi`,
            severity: 'success',
          });
        } else {
          setSnack({
            msg: `${result.succeeded.length} reyisi, ${result.failed.length} echwe`,
            severity: result.succeeded.length > 0 ? 'info' : 'error',
          });
        }
      }
      setSelected((prev) => prev.filter((id) => !pendingAction.ids.includes(id)));
      // Realtime will sync items, but be optimistic just in case the channel is slow:
      const nextStatus: ModerationStatus =
        pendingAction.kind === 'approve' ? 'APPROVED'
          : pendingAction.kind === 'reject' ? 'REJECTED'
            : 'ESCALATED';
      setItems((prev) =>
        prev.map((it) => (pendingAction.ids.includes(it.id) ? { ...it, status: nextStatus } : it)),
      );
      loadDerived();
    } catch (e) {
      setSnack({
        msg: e instanceof Error ? e.message : 'Aksyon echwe',
        severity: 'error',
      });
    } finally {
      setActionNote('');
    }
  };

  const closeAction = () => {
    setPendingAction(null);
    setActionNote('');
  };

  // Selection -------------------------------------------------------------
  const allSelected = filtered.length > 0 && filtered.every((it) => selected.includes(it.id));
  const someSelected = selected.length > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected([]);
    else setSelected(filtered.map((it) => it.id));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Filter chip configs ---------------------------------------------------
  const statusFilters: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Tout', count: counts.all },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'flagged', label: 'Auto-flagged', count: counts.flagged },
    { key: 'approved', label: 'Apwouve', count: counts.approved },
    { key: 'rejected', label: 'Rejte', count: counts.rejected },
    { key: 'escalated', label: 'Eskalade', count: counts.escalated },
  ];

  const reasonFilters: { key: ReasonFilter; label: string }[] = [
    { key: 'all', label: 'Tout rezon' },
    { key: 'MISINFORMATION', label: 'Misinformation' },
    { key: 'HATE_SPEECH', label: 'Hate speech' },
    { key: 'SPAM', label: 'Spam' },
    { key: 'GRAPHIC', label: 'Graphic content' },
    { key: 'DUPLICATE', label: 'Duplicate' },
  ];

  // ---------------------------------------------------------------------
  // Access gate: role must be moderator or admin
  // ---------------------------------------------------------------------
  if (roleResolved && !isModerator) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Paper sx={{ p: 4, maxWidth: 520, textAlign: 'center' }}>
          <Box
            sx={{
              width: 56, height: 56, mx: 'auto', mb: 2, borderRadius: 2,
              bgcolor: '#fef3c7', color: '#b45309',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <LockIcon />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Aksè limite
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Itilizatè ou pa gen wòl moderatè. Mande yon Admin pou ajoute ou nan tab
            <Box component="code" sx={{ mx: 0.75, px: 0.75, py: 0.25, bgcolor: '#f1f5f9', borderRadius: 1 }}>
              user_roles
            </Box>
            ak wòl <strong>moderator</strong> oswa <strong>admin</strong>.
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Detected role: {role ?? 'none'}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, position: 'relative' }}>
      {/* Header --------------------------------------------------------- */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
      >
        <Box>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 36, height: 36, borderRadius: 2,
                bgcolor: '#ede9fe', color: '#6d28d9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <GavelIcon />
            </Box>
            <Box>
              <Typography variant="h2" sx={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.1 }}>
                Moderasyon
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                <Box
                  sx={{
                    width: 8, height: 8, borderRadius: '50%',
                    bgcolor: 'success.main',
                    boxShadow: '0 0 0 4px rgba(16,185,129,0.18)',
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  File modere · {counts.pending} kontni nan kèk · last updated {updatedAgo}s ago
                </Typography>
                {role && (
                  <Chip
                    size="small"
                    label={`Role: ${role}`}
                    sx={{
                      ml: 1, height: 20,
                      bgcolor: isAdmin ? '#dcfce7' : '#e0f2fe',
                      color: isAdmin ? '#15803d' : '#0369a1',
                      fontWeight: 700, fontSize: 10, letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  />
                )}
              </Stack>
            </Box>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            sx={{
              bgcolor: 'background.paper',
              borderColor: 'rgba(15,23,42,0.12)',
              color: 'text.primary',
              '&:hover': { bgcolor: '#f8fafc', borderColor: 'rgba(15,23,42,0.2)' },
            }}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            sx={{
              bgcolor: 'background.paper',
              borderColor: 'rgba(15,23,42,0.12)',
              color: 'text.primary',
              '&:hover': { bgcolor: '#f8fafc', borderColor: 'rgba(15,23,42,0.2)' },
            }}
          >
            Filters
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={load}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          <AlertTitle>Erè chajman</AlertTitle>
          {error}
        </Alert>
      )}

      {/* KPIs ----------------------------------------------------------- */}
      <Box
        sx={{
          display: 'grid', gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        }}
      >
        <KpiCard
          label="Pending review"
          value={counts.pending}
          delta={`+${series.pending24} soumèt · 17h`}
          deltaColor="#b45309"
          icon={<HourglassIcon sx={{ fontSize: 18 }} />}
          iconBg="#f59e0b"
          iconColor="#fff"
          sparkColor="#f59e0b"
          spark={series.pending}
          trend={trendOf(series.pending)}
        />
        <KpiCard
          label="Auto-flagged · 24h"
          value={counts.flagged}
          delta={`+${series.flagged24} ≥ 5 rapò · 17h`}
          deltaColor="#ef4444"
          icon={<ReportIcon sx={{ fontSize: 18 }} />}
          iconBg="#ef4444"
          iconColor="#fff"
          sparkColor="#ef4444"
          spark={series.flagged}
          trend={trendOf(series.flagged)}
        />
        <KpiCard
          label="Apwouve · 17h"
          value={series.approved24}
          delta={
            series.approved24 + series.rejected24 > 0
              ? `${Math.round((series.approved24 / (series.approved24 + series.rejected24)) * 100)}% taux`
              : 'Pa gen aksyon'
          }
          deltaColor="#10b981"
          icon={<CheckCircleOutlineIcon sx={{ fontSize: 18 }} />}
          iconBg="#10b981"
          iconColor="#fff"
          sparkColor="#10b981"
          spark={series.approved}
          trend={trendOf(series.approved)}
        />
        <KpiCard
          label="Rejte · 17h"
          value={series.rejected24}
          delta={`Total tout tan: ${counts.rejected}`}
          deltaColor="#0369a1"
          icon={<BlockIcon sx={{ fontSize: 18 }} />}
          iconBg="#6366f1"
          iconColor="#fff"
          sparkColor="#6366f1"
          spark={series.rejected}
          trend={trendOf(series.rejected)}
        />
      </Box>

      {/* Main grid ------------------------------------------------------ */}
      <Box
        sx={{
          display: 'grid', gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' },
        }}
      >
        {/* Queue table -------------------------------------------------- */}
        <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700 }}>File modere</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {statusFilters.map((f) => {
                const isActive = statusFilter === f.key;
                return (
                  <Chip
                    key={f.key}
                    label={`${f.label} · ${f.count}`}
                    size="small"
                    onClick={() => setStatusFilter(f.key)}
                    sx={{
                      bgcolor: isActive ? 'primary.main' : '#f1f5f9',
                      color: isActive ? 'primary.contrastText' : 'text.primary',
                      fontWeight: 600, borderRadius: 999, px: 0.5,
                      '&:hover': { bgcolor: isActive ? 'primary.dark' : '#e2e8f0' },
                    }}
                  />
                );
              })}
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {reasonFilters.map((f) => {
              const isActive = reasonFilter === f.key;
              return (
                <Chip
                  key={f.key}
                  label={f.label}
                  size="small"
                  variant={isActive ? 'filled' : 'outlined'}
                  onClick={() => setReasonFilter(f.key)}
                  sx={{
                    bgcolor: isActive ? '#ede9fe' : 'transparent',
                    color: isActive ? '#6d28d9' : 'text.secondary',
                    borderColor: 'rgba(15,23,42,0.12)',
                    fontWeight: 600, borderRadius: 999,
                    '&:hover': { bgcolor: isActive ? '#ddd6fe' : '#f8fafc' },
                  }}
                />
              );
            })}
          </Stack>

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 880 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
                    <Checkbox
                      size="small"
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleAll}
                      disabled={filtered.length === 0}
                    />
                  </TableCell>
                  {['Otè', 'Tip', 'Kontni', 'Rezon', 'Rapò', 'Lè', 'Sitiyasyon', ''].map((h) => (
                    <TableCell
                      key={h}
                      sx={{
                        textTransform: 'uppercase', fontSize: 11,
                        letterSpacing: '0.08em', color: 'text.secondary',
                        bgcolor: 'transparent',
                        borderBottom: '1px solid rgba(15,23,42,0.08)',
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ py: 6, textAlign: 'center' }}>
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ py: 6, textAlign: 'center' }}>
                      <Stack alignItems="center" spacing={1}>
                        <ShieldIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                        <Typography sx={{ fontWeight: 600 }}>
                          Pa gen kontni nan filtè sa a
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Eseye chwazi yon lòt filtè oswa rafrechi.
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.map((row) => {
                  const isSelected = selected.includes(row.id);
                  const initials = initialsFor(row.authorName);
                  const avatarColor = avatarColorFor(row.authorHandle ?? row.authorName);
                  return (
                    <TableRow
                      key={row.id}
                      hover
                      selected={isSelected}
                      sx={{ '& td': { borderBottom: '1px solid rgba(15,23,42,0.06)', py: 1.5 } }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onChange={() => toggleOne(row.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar
                            sx={{
                              bgcolor: avatarColor, color: '#fff',
                              width: 36, height: 36, fontSize: 13, fontWeight: 700,
                            }}
                          >
                            {initials}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 14 }} noWrap>
                              {row.authorName}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 12,
                                color: row.authorAnonymous ? 'text.disabled' : 'text.secondary',
                                fontStyle: row.authorAnonymous ? 'italic' : 'normal',
                              }}
                              noWrap
                            >
                              {row.authorHandle ?? '—'}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell><TypeChip type={row.contentType} /></TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {row.thumbnail && (
                            <Box
                              component="img"
                              src={row.thumbnail}
                              alt=""
                              sx={{
                                width: 40, height: 40, borderRadius: 1.5,
                                objectFit: 'cover', flexShrink: 0,
                              }}
                            />
                          )}
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: 13, fontWeight: 500,
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {row.preview}
                            </Typography>
                            {row.location && (
                              <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25 }}>
                                {row.location}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell><ReasonChip reason={row.reason} /></TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <ReportIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                            {row.reportsCount}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                        {moment(row.submittedAt).fromNow()}
                      </TableCell>
                      <TableCell><StatusChip status={row.status} /></TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Wè detay">
                            <IconButton
                              size="small"
                              sx={{ color: 'text.secondary' }}
                              onClick={() => setDetailItem(row)}
                            >
                              <EyeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Apwouve">
                            <span>
                              <IconButton
                                size="small"
                                sx={{ color: '#15803d' }}
                                disabled={row.status === 'APPROVED'}
                                onClick={() => setPendingAction({ kind: 'approve', ids: [row.id] })}
                              >
                                <CheckCircleOutlineIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Rejte">
                            <span>
                              <IconButton
                                size="small"
                                sx={{ color: '#b91c1c' }}
                                disabled={row.status === 'REJECTED'}
                                onClick={() => setPendingAction({ kind: 'reject', ids: [row.id] })}
                              >
                                <BlockIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={isAdmin ? 'Eskalade' : 'Eskalade · admin sèlman'}>
                            <span>
                              <IconButton
                                size="small"
                                sx={{ color: '#0369a1' }}
                                disabled={row.status === 'ESCALATED' || !isAdmin}
                                onClick={() => setPendingAction({ kind: 'escalate', ids: [row.id] })}
                              >
                                <WarningIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <IconButton size="small" sx={{ color: 'text.secondary' }}>
                            <MoreHorizIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Paper>

        {/* Right rail -------------------------------------------------- */}
        <Stack spacing={2}>
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Pa rezon ·{' '}
                <Typography
                  component="span"
                  sx={{ color: 'text.secondary', fontWeight: 500, fontSize: 14 }}
                >
                  24 h
                </Typography>
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                Live · DB
              </Typography>
            </Stack>
            {reasonBars.every((b) => b.value === 0) ? (
              <Typography variant="body2" color="text.secondary">
                Pa gen kontni soumèt nan 24 dènye èdtan yo.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {reasonBars.map((b) => (
                  <Box key={b.key}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{b.label}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{b.value}</Typography>
                    </Stack>
                    <Box
                      sx={{
                        width: '100%', height: 8, borderRadius: 4,
                        bgcolor: '#f1f5f9', overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${b.pct}%`, height: '100%',
                          bgcolor: b.color, borderRadius: 4,
                          transition: 'width 600ms ease',
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Aktivite modere</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                Live · DB · {auditFeed.length}
              </Typography>
            </Stack>
            {auditFeed.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Poko gen aksyon modere. Apwouve / Rejte / Eskalade yon kontni pou kòmanse.
              </Typography>
            ) : (
              <Stack divider={<Divider flexItem />} spacing={0}>
                {auditFeed.map((a) => {
                  const ico = activityIconFor(a.action);
                  const who = moderatorDisplayName(a.moderatorEmail);
                  const reasonLabel = reasonStyles[a.reason].label;
                  return (
                    <Stack
                      key={a.id}
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                      sx={{ py: 1.25 }}
                    >
                      <Box
                        sx={{
                          width: 32, height: 32, borderRadius: 1.5,
                          bgcolor: ico.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, color: theme.palette.text.primary,
                        }}
                      >
                        {ico.icon}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }} noWrap>
                          {who} {actionLabelKR[a.action]} yon {a.contentType.toLowerCase()}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 12, color: 'text.secondary',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {reasonLabel} · {a.reportsCount} rapò · {a.preview}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25 }}>
                          {moment(a.createdAt).fromNow()}
                          {a.note ? ` · "${a.note}"` : ''}
                        </Typography>
                      </Box>
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Top moderatè · semèn</Typography>
              <TrendingUpIcon sx={{ color: 'success.main', fontSize: 20 }} />
            </Stack>
            {leaderboard.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Pa gen statistik moderatè pou semèn nan poko.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {leaderboard.map((m, i) => {
                  const name = moderatorDisplayName(m.moderatorEmail);
                  return (
                    <Stack key={m.moderatorId} direction="row" spacing={1.5} alignItems="center">
                      <Typography
                        sx={{
                          width: 18, fontSize: 12, fontWeight: 700,
                          color: 'text.disabled', textAlign: 'right',
                        }}
                      >
                        {i + 1}
                      </Typography>
                      <Avatar
                        sx={{
                          bgcolor: avatarColorFor(m.moderatorEmail ?? m.moderatorId),
                          color: '#fff',
                          width: 32, height: 32, fontSize: 12, fontWeight: 700,
                        }}
                      >
                        {initialsFor(name)}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }} noWrap>{name}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                          {m.actions} aksyon · {m.approvalPct}% apwouve · {m.escalates} eskalad
                        </Typography>
                      </Box>
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Stack>
      </Box>

      {/* Bulk action bar ------------------------------------------------ */}
      {selected.length > 0 && (
        <Paper
          elevation={6}
          sx={{
            position: 'sticky', bottom: 16, mx: 'auto',
            px: 2, py: 1.25, borderRadius: 999,
            display: 'flex', alignItems: 'center', gap: 1.5,
            bgcolor: 'background.paper',
            border: '1px solid rgba(15,23,42,0.08)',
            boxShadow: '0 20px 40px -12px rgba(15,23,42,0.25)',
            width: 'fit-content', zIndex: 10,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, px: 1 }}>
            {selected.length} chwazi
          </Typography>
          <Divider orientation="vertical" flexItem />
          <Button
            size="small"
            startIcon={<CheckCircleOutlineIcon />}
            sx={{ color: '#15803d' }}
            onClick={() => setPendingAction({ kind: 'approve', ids: selected })}
          >
            Apwouve tout
          </Button>
          <Button
            size="small"
            startIcon={<BlockIcon />}
            sx={{ color: '#b91c1c' }}
            onClick={() => setPendingAction({ kind: 'reject', ids: selected })}
          >
            Rejte tout
          </Button>
          <Tooltip title={isAdmin ? '' : 'Admin sèlman'}>
            <span>
              <Button
                size="small"
                startIcon={<WarningIcon />}
                sx={{ color: '#0369a1' }}
                disabled={!isAdmin}
                onClick={() => setPendingAction({ kind: 'escalate', ids: selected })}
              >
                Eskalade
              </Button>
            </span>
          </Tooltip>
          <IconButton size="small" onClick={() => setSelected([])}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      )}

      {/* Action confirm dialog ------------------------------------------ */}
      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction?.kind === 'approve'
            ? `Apwouve ${pendingAction.ids.length} kontni`
            : pendingAction?.kind === 'reject'
              ? `Rejte ${pendingAction.ids.length} kontni`
              : pendingAction?.kind === 'escalate'
                ? `Eskalade ${pendingAction.ids.length} kontni`
                : ''
        }
        message={
          pendingAction?.kind === 'approve'
            ? 'Kontni an pral parèt piblik. Ou sèten?'
            : pendingAction?.kind === 'reject'
              ? 'Kontni an pral kache pou itilizatè yo. Ou sèten?'
              : 'Kontni an pral monte bay yon Admin pou desizyon final. Ou sèten?'
        }
        confirmLabel={
          pendingAction?.kind === 'approve'
            ? 'Apwouve'
            : pendingAction?.kind === 'reject'
              ? 'Rejte'
              : 'Eskalade'
        }
        onConfirm={confirmAction}
        onCancel={closeAction}
      />

      {/* Detail modal --------------------------------------------------- */}
      <ModalComponent open={detailItem !== null} handleClose={() => setDetailItem(null)}>
        {detailItem && (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    bgcolor: avatarColorFor(detailItem.authorHandle ?? detailItem.authorName),
                    color: '#fff', width: 44, height: 44, fontWeight: 700,
                  }}
                >
                  {initialsFor(detailItem.authorName)}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{detailItem.authorName}</Typography>
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: detailItem.authorAnonymous ? 'text.disabled' : 'text.secondary',
                      fontStyle: detailItem.authorAnonymous ? 'italic' : 'normal',
                    }}
                  >
                    {detailItem.authorHandle ?? '—'} · {moment(detailItem.submittedAt).fromNow()}
                  </Typography>
                </Box>
              </Stack>
              <IconButton onClick={() => setDetailItem(null)} size="small">
                <CloseIcon />
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TypeChip type={detailItem.contentType} />
              <ReasonChip reason={detailItem.reason} />
              <StatusChip status={detailItem.status} />
              <Chip
                size="small"
                icon={<ReportIcon sx={{ fontSize: 14 }} />}
                label={`${detailItem.reportsCount} rapò`}
                sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 600 }}
              />
            </Stack>

            {detailItem.thumbnail && (
              <Box
                component="img"
                src={detailItem.thumbnail}
                alt=""
                sx={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 2 }}
              />
            )}

            <Paper
              variant="outlined"
              sx={{ p: 2, bgcolor: '#f8fafc', borderColor: 'rgba(15,23,42,0.08)' }}
            >
              <Typography sx={{ fontSize: 14, lineHeight: 1.6 }}>{detailItem.preview}</Typography>
              {detailItem.location && (
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>
                  Kote: {detailItem.location}
                </Typography>
              )}
              {detailItem.decisionNote && (
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>
                  Nòt presedan: {detailItem.decisionNote}
                </Typography>
              )}
            </Paper>

            <TextField
              label="Nòt modere (opsyonèl)"
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              multiline
              minRows={2}
              size="small"
              placeholder="Esplike desizyon ou pou odit..."
            />

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Tooltip title={isAdmin ? '' : 'Admin sèlman'}>
                <span>
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<WarningIcon />}
                    disabled={!isAdmin}
                    onClick={() => {
                      setPendingAction({ kind: 'escalate', ids: [detailItem.id] });
                      setDetailItem(null);
                    }}
                  >
                    Eskalade
                  </Button>
                </span>
              </Tooltip>
              <Button
                variant="outlined"
                color="error"
                startIcon={<BlockIcon />}
                onClick={() => {
                  setPendingAction({ kind: 'reject', ids: [detailItem.id] });
                  setDetailItem(null);
                }}
              >
                Rejte
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleOutlineIcon />}
                onClick={() => {
                  setPendingAction({ kind: 'approve', ids: [detailItem.id] });
                  setDetailItem(null);
                }}
              >
                Apwouve
              </Button>
            </Stack>
          </Stack>
        )}
      </ModalComponent>

      <Snackbar
        open={snack !== null}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? (
          <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(null)}>
            {snack.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
