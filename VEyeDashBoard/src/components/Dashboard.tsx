import * as React from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import {
  CheckCircleOutline as CheckCircleOutlineIcon,
  Close as CloseIcon,
  FileDownloadOutlined as FileDownloadOutlinedIcon,
  FilterList as FilterListIcon,
  Group as GroupIcon,
  LocationOn as LocationOnIcon,
  MoreHoriz as MoreHorizIcon,
  Add as AddIcon,
  Verified as VerifiedIcon,
  RemoveRedEyeOutlined as EyeIcon,
  ReportGmailerrorred as ReportIcon,
} from '@mui/icons-material';

type SeverityKey =
  | 'KIDNAPPING'
  | 'MISSING'
  | 'DANGER ZONE'
  | 'RELEASED'
  | 'SHOOTING'
  | 'SUSPICIOUS';

type ReportRow = {
  id: string;
  reporterName: string;
  reporterEmail: string;
  reporterAnonymous?: boolean;
  initials: string;
  avatarColor: string;
  severity: SeverityKey;
  location: string;
  locationDetail?: string;
  time: string;
  status: string;
  statusTone: 'pending' | 'verified' | 'resolved' | 'awaiting';
};

type ActivityItem = {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  detail: string;
  time: string;
};

const severityStyles: Record<
  SeverityKey,
  { bg: string; color: string; label: string }
> = {
  KIDNAPPING: { bg: '#fee2e2', color: '#b91c1c', label: 'KIDNAPPING' },
  MISSING: { bg: '#fef3c7', color: '#b45309', label: 'MISSING' },
  'DANGER ZONE': { bg: '#ffedd5', color: '#c2410c', label: 'DANGER ZONE' },
  RELEASED: { bg: '#dcfce7', color: '#15803d', label: 'RELEASED' },
  SHOOTING: { bg: '#fee2e2', color: '#b91c1c', label: 'SHOOTING' },
  SUSPICIOUS: { bg: '#fef3c7', color: '#b45309', label: 'SUSPICIOUS' },
};

const statusStyles: Record<
  ReportRow['statusTone'],
  { bg: string; color: string }
> = {
  pending: { bg: '#fef3c7', color: '#b45309' },
  verified: { bg: '#dcfce7', color: '#15803d' },
  resolved: { bg: '#e0f2fe', color: '#0369a1' },
  awaiting: { bg: '#f1f5f9', color: '#475569' },
};

const reports: ReportRow[] = [
  {
    id: '1',
    reporterName: 'Marie Lavalle',
    reporterEmail: 'm.lavalle@veye.ht',
    initials: 'ML',
    avatarColor: '#a78bfa',
    severity: 'KIDNAPPING',
    location: 'Route de Kenscoff',
    locationDetail: 'Pétion-Ville · near Eko station',
    time: '14 min ago',
    status: 'Pending review',
    statusTone: 'pending',
  },
  {
    id: '2',
    reporterName: 'Jean-Pierre Louis',
    reporterEmail: 'anonymous',
    reporterAnonymous: true,
    initials: 'JP',
    avatarColor: '#f59e0b',
    severity: 'MISSING',
    location: 'Lycée Firmin',
    locationDetail: 'Delmas 75 · 14 y/o, blue uniform',
    time: '2 h ago',
    status: 'Verified · 3 sources',
    statusTone: 'verified',
  },
  {
    id: '3',
    reporterName: 'Kenley Rémy',
    reporterEmail: 'k.remy@veye.ht',
    initials: 'KR',
    avatarColor: '#fb923c',
    severity: 'DANGER ZONE',
    location: 'Route Nationale 1',
    locationDetail: 'Tabarre roadblocks active',
    time: '1 h ago',
    status: 'Verified · live',
    statusTone: 'verified',
  },
  {
    id: '4',
    reporterName: 'Naïka Joseph',
    reporterEmail: 'n.joseph@veye.ht',
    initials: 'NJ',
    avatarColor: '#34d399',
    severity: 'RELEASED',
    location: 'Marie Jean-Louis',
    locationDetail: 'Croix-des-Bouquets · reunited',
    time: '35 min ago',
    status: 'Resolved',
    statusTone: 'resolved',
  },
  {
    id: '5',
    reporterName: 'Chrismane H.',
    reporterEmail: 'anonymous',
    reporterAnonymous: true,
    initials: 'CH',
    avatarColor: '#f472b6',
    severity: 'SHOOTING',
    location: 'Bel-Air',
    locationDetail: "Rue de l'Enterrement",
    time: '6 min ago',
    status: 'Awaiting verify',
    statusTone: 'awaiting',
  },
  {
    id: '6',
    reporterName: 'Watson A.',
    reporterEmail: 'w.alexandre@veye.ht',
    initials: 'WA',
    avatarColor: '#60a5fa',
    severity: 'SUSPICIOUS',
    location: 'Marché en Fer',
    locationDetail: 'Port-au-Prince centre',
    time: '28 min ago',
    status: 'Pending review',
    statusTone: 'pending',
  },
];

const filters = [
  { key: 'all', label: 'All', count: 142, active: true },
  { key: 'kidnapping', label: 'Kidnapping', count: 23, active: false },
  { key: 'missing', label: 'Missing', count: 67, active: false },
  { key: 'danger', label: 'Danger', count: 14, active: false },
  { key: 'released', label: 'Released', count: 38, active: false },
];

const severityBars = [
  { label: 'Kidnapping', value: 72, color: '#ef4444' },
  { label: 'Dangerzone', value: 48, color: '#f59e0b' },
  { label: 'Missing', value: 60, color: '#facc15' },
  { label: 'Released', value: 38, color: '#10b981' },
  { label: 'Alerts', value: 22, color: '#3b82f6' },
];

const activity: ActivityItem[] = [
  {
    id: 'a1',
    icon: <ReportIcon sx={{ fontSize: 18 }} />,
    iconBg: '#fee2e2',
    title: 'New kidnapping report',
    detail: 'Route de Kenscoff · 2 km · verified by Marie L.',
    time: '14 min ago',
  },
  {
    id: 'a2',
    icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,
    iconBg: '#dcfce7',
    title: 'Marie Jean-Louis released',
    detail: 'Resolved · reunited with family',
    time: '35 min ago',
  },
  {
    id: 'a3',
    icon: <VerifiedIcon sx={{ fontSize: 18 }} />,
    iconBg: '#e0f2fe',
    title: 'Kenley R. verified report #2814',
    detail: '3 community sources confirmed',
    time: '42 min ago',
  },
  {
    id: 'a4',
    icon: <FilterListIcon sx={{ fontSize: 18 }} />,
    iconBg: '#fef3c7',
    title: 'Post flagged for moderation',
    detail: 'Itilizatè: @anon · reason: misinformation',
    time: '1 h ago',
  },
];

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
          <linearGradient id={`grad-${color.slice(1)}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L ${width} ${height} L 0 ${height} Z`}
          fill={`url(#grad-${color.slice(1)})`}
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
  label,
  value,
  delta,
  deltaColor,
  icon,
  iconBg,
  iconColor,
  spark,
  sparkColor,
  trend,
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
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: iconBg,
              color: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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

function SeverityChip({ severity }: { severity: SeverityKey }) {
  const s = severityStyles[severity];
  return (
    <Chip
      label={`● ${s.label}`}
      size="small"
      sx={{
        bgcolor: s.bg,
        color: s.color,
        fontWeight: 700,
        fontSize: 11,
        height: 24,
        letterSpacing: '0.04em',
        '& .MuiChip-label': { px: 1.25 },
      }}
    />
  );
}

function StatusChip({ row }: { row: ReportRow }) {
  const s = statusStyles[row.statusTone];
  return (
    <Chip
      label={row.status}
      size="small"
      sx={{
        bgcolor: s.bg,
        color: s.color,
        fontWeight: 600,
        fontSize: 12,
        height: 24,
      }}
    />
  );
}

export default function Dashboard() {
  const theme = useTheme();
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [updatedAgo, setUpdatedAgo] = React.useState(14);

  React.useEffect(() => {
    const id = window.setInterval(() => setUpdatedAgo((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

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
            Viktim dashboard
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'success.main',
                boxShadow: '0 0 0 4px rgba(16,185,129,0.18)',
              }}
            />
            <Typography variant="body2" color="text.secondary">
              Live feed of reports across Haiti · last updated {updatedAgo} seconds ago
            </Typography>
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
          <Button variant="contained" color="primary" startIcon={<AddIcon />}>
            Ajoute viktim
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
        }}
      >
        <KpiCard
          label="Active kidnappings"
          value={23}
          delta="↑ +4 today"
          deltaColor="#ef4444"
          icon={<CloseIcon sx={{ fontSize: 18 }} />}
          iconBg="#ef4444"
          iconColor="#fff"
          sparkColor="#ef4444"
          spark={[6, 8, 7, 9, 8, 11, 10, 12, 11, 13, 14, 15, 14, 17, 18, 20, 21, 22, 23]}
          trend="up"
        />
        <KpiCard
          label="Missing persons"
          value={67}
          delta="↑ +2 today"
          deltaColor="#f59e0b"
          icon={<GroupIcon sx={{ fontSize: 18 }} />}
          iconBg="#f59e0b"
          iconColor="#fff"
          sparkColor="#f59e0b"
          spark={[40, 44, 47, 46, 50, 53, 56, 58, 57, 60, 61, 62, 63, 65, 66, 65, 67]}
          trend="up"
        />
        <KpiCard
          label="Released · this week"
          value={38}
          delta="↑ +12% vs last wk"
          deltaColor="#10b981"
          icon={<CheckCircleOutlineIcon sx={{ fontSize: 18 }} />}
          iconBg="#10b981"
          iconColor="#fff"
          sparkColor="#10b981"
          spark={[10, 12, 14, 16, 17, 19, 20, 22, 24, 25, 27, 29, 30, 32, 34, 36, 38]}
          trend="up"
        />
        <KpiCard
          label="Danger zones live"
          value={14}
          delta="↓ -3 vs 24 h"
          deltaColor="#ef4444"
          icon={<LocationOnIcon sx={{ fontSize: 18 }} />}
          iconBg="#fb923c"
          iconColor="#fff"
          sparkColor="#fb923c"
          spark={[20, 19, 21, 22, 20, 19, 18, 18, 17, 17, 16, 16, 15, 15, 14, 14, 14]}
          trend="down"
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' },
        }}
      >
        <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Recent reports
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {filters.map((f) => {
                const isActive = activeFilter === f.key;
                return (
                  <Chip
                    key={f.key}
                    label={`${f.label} · ${f.count}`}
                    size="small"
                    onClick={() => setActiveFilter(f.key)}
                    sx={{
                      bgcolor: isActive ? 'primary.main' : '#f1f5f9',
                      color: isActive ? 'primary.contrastText' : 'text.primary',
                      fontWeight: 600,
                      borderRadius: 999,
                      px: 0.5,
                      '&:hover': {
                        bgcolor: isActive ? 'primary.dark' : '#e2e8f0',
                      },
                    }}
                  />
                );
              })}
            </Stack>
          </Stack>

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  {['Reporter', 'Severity', 'Location', 'Time', 'Status', ''].map((h) => (
                    <TableCell
                      key={h}
                      sx={{
                        textTransform: 'uppercase',
                        fontSize: 11,
                        letterSpacing: '0.08em',
                        color: 'text.secondary',
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
                {reports.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{
                      '& td': {
                        borderBottom: '1px solid rgba(15,23,42,0.06)',
                        py: 1.5,
                      },
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          sx={{
                            bgcolor: row.avatarColor,
                            color: '#fff',
                            width: 36,
                            height: 36,
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {row.initials}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                            {row.reporterName}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: 12,
                              color: row.reporterAnonymous ? 'text.disabled' : 'text.secondary',
                              fontStyle: row.reporterAnonymous ? 'italic' : 'normal',
                            }}
                          >
                            {row.reporterEmail}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <SeverityChip severity={row.severity} />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                        {row.location}
                      </Typography>
                      {row.locationDetail && (
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {row.locationDetail}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                      {row.time}
                    </TableCell>
                    <TableCell>
                      <StatusChip row={row} />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <IconButton size="small" sx={{ color: 'text.secondary' }}>
                          <EyeIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" sx={{ color: 'text.secondary' }}>
                          <CheckCircleOutlineIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" sx={{ color: 'text.secondary' }}>
                          <MoreHorizIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>

        <Stack spacing={2}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              By severity ·{' '}
              <Typography
                component="span"
                sx={{ color: 'text.secondary', fontWeight: 500, fontSize: 14 }}
              >
                24 h
              </Typography>
            </Typography>
            <Stack spacing={1.5}>
              {severityBars.map((b) => (
                <Box key={b.label}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                      {b.label}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{b.value}</Typography>
                  </Stack>
                  <Box
                    sx={{
                      width: '100%',
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#f1f5f9',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        width: `${b.value}%`,
                        height: '100%',
                        bgcolor: b.color,
                        borderRadius: 4,
                        transition: 'width 600ms ease',
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Live activity
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                Auto-refresh · 30 s
              </Typography>
            </Stack>
            <Stack divider={<Divider flexItem />} spacing={0}>
              {activity.map((a) => (
                <Stack
                  key={a.id}
                  direction="row"
                  spacing={1.5}
                  alignItems="flex-start"
                  sx={{ py: 1.25 }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: a.iconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: theme.palette.text.primary,
                    }}
                  >
                    {a.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{a.title}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {a.detail}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25 }}>
                      {a.time}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}
