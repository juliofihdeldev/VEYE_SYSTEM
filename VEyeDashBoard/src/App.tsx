import * as React from 'react';
import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ExitToApp from '@mui/icons-material/ExitToApp';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import LanguageIcon from '@mui/icons-material/Language';
import {
  DashboardOutlined,
  ErrorOutline,
  ReportProblemOutlined,
  PlaceOutlined,
  ArticleOutlined,
  GroupsOutlined,
  GavelOutlined,
  AssessmentOutlined,
  CloudSyncOutlined,
  SettingsOutlined,
  Map as MapIcon,
  RawOffTwoTone,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import Popper from '@mui/material/Popper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
import { getSupabase } from './lib/supabase';
import { useCurrentUser } from './auth/useCurrentUser';
import i18n, { LANGUAGE_LABEL, nextLanguage, type AppLanguage } from './i18n';
import { searchGlobal, type GlobalSearchHit, type GlobalSearchKind } from './api';

const drawerWidth = 248;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1.5),
  ...theme.mixins.toolbar,
}));

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    '& .MuiDrawer-paper': {
      backgroundColor: theme.palette.background.paper,
      borderRight: '1px solid rgba(15, 23, 42, 0.08)',
      borderRadius: 0,
    },
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': closedMixin(theme),
    }),
  }),
);

type NavItem = {
  /** i18n key resolved from `nav.items.*`. */
  key: string;
  icon: React.ReactNode;
  link: string;
  badge?: number;
  badgeColor?: 'primary' | 'error' | 'warning' | 'info';
};

type NavSection = {
  /** i18n key resolved from `nav.*`. */
  key: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    key: 'operations',
    items: [
      { key: 'dashboard', icon: <DashboardOutlined />, link: '/home' },
      { key: 'viktim', icon: <ErrorOutline />, link: '/viktim', badge: 142, badgeColor: 'error' },
      { key: 'incidents', icon: <ReportProblemOutlined />, link: '/stat-incident', badge: 28, badgeColor: 'warning' },
      { key: 'zoneDanger', icon: <PlaceOutlined />, link: '/zone-danger' },
      { key: 'news', icon: <ArticleOutlined />, link: '/news' },
    ],
  },
  {
    key: 'community',
    items: [
      { key: 'users', icon: <GroupsOutlined />, link: '/users' },
      { key: 'moderation', icon: <GavelOutlined />, link: '/moderation' },
      { key: 'reports', icon: <AssessmentOutlined />, link: '/reports' },
    ],
  },
  {
    key: 'system',
    items: [
      { key: 'sync', icon: <CloudSyncOutlined />, link: '/sync' },
      { key: 'settings', icon: <SettingsOutlined />, link: '/settings' },
    ],
  },
];

const legacyExtras: NavItem[] = [
  { key: 'kidnapping', icon: <RawOffTwoTone />, link: '/kidnapping' },
  { key: 'maps', icon: <MapIcon />, link: '/maps' },
  { key: 'telegram', icon: <CloudSyncOutlined />, link: '/telegram' },
];

export interface PropsChildren {
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Global search — display config per result kind.
// `route` is where we navigate when the user clicks/Enters a result; for now
// each kind goes to its list page. Per-row deep links can be added later.
// `labelKey` resolves to `topbar.kinds.*` at render time.
// ---------------------------------------------------------------------------
const kindConfig: Record<
  GlobalSearchKind,
  { labelKey: string; icon: React.ReactNode; route: string; color: string }
> = {
  viktim: {
    labelKey: 'viktim',
    icon: <ErrorOutline sx={{ fontSize: 18 }} />,
    route: '/viktim',
    color: '#ef4444',
  },
  zone_danger: {
    labelKey: 'zoneDanger',
    icon: <PlaceOutlined sx={{ fontSize: 18 }} />,
    route: '/zone-danger',
    color: '#f59e0b',
  },
  news: {
    labelKey: 'news',
    icon: <ArticleOutlined sx={{ fontSize: 18 }} />,
    route: '/news',
    color: '#0ea5e9',
  },
  kidnaping_alert: {
    labelKey: 'kidnaping',
    icon: <RawOffTwoTone sx={{ fontSize: 18 }} />,
    route: '/kidnapping',
    color: '#7c3aed',
  },
  moderation_queue: {
    labelKey: 'moderation',
    icon: <GavelOutlined sx={{ fontSize: 18 }} />,
    route: '/moderation',
    color: '#0f766e',
  },
};

const kindOrder: GlobalSearchKind[] = [
  'viktim',
  'zone_danger',
  'moderation_queue',
  'news',
  'kidnaping_alert',
];

type PageHit = {
  kind: 'page';
  id: string;
  title: string;
  subtitle: string;
  route: string;
  icon: React.ReactNode;
};

type FlatHit =
  | (PageHit & { sectionLabel: string })
  | (GlobalSearchHit & { sectionLabel: string });

// Wrap matched substring in <mark> for inline highlight. Case-insensitive,
// safe against regex-special chars. Returns React nodes.
function highlight(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const tokens = query.trim().split(/\s+/).filter((t) => t.length >= 1);
  if (tokens.length === 0) return text;
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  try {
    const re = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(re);
    return parts.map((p, i) =>
      re.test(p) ? (
        <Box
          key={i}
          component="mark"
          sx={{ bgcolor: 'rgba(245, 158, 11, 0.35)', color: 'inherit', px: 0.25, borderRadius: 0.5 }}
        >
          {p}
        </Box>
      ) : (
        <React.Fragment key={i}>{p}</React.Fragment>
      ),
    );
  } catch {
    return text;
  }
}

export default function App({ children }: PropsChildren) {
  const theme = useTheme();
  const { t, i18n: i18nInstance } = useTranslation();
  const [open, setOpen] = React.useState(true);
  const currentLangBase = (i18nInstance.language || 'fr')
    .split('-')[0]
    .toLowerCase() as AppLanguage;
  const langLabel = LANGUAGE_LABEL[currentLangBase] ?? LANGUAGE_LABEL.fr;
  const navigate = useNavigate();
  const location = useLocation();
  const { displayName, email, roleLabel, initials } = useCurrentUser();

  const openLink = (link: string) => navigate(link);
  const handleDrawerOpen = () => setOpen(true);
  const handleDrawerClose = () => setOpen(false);

  // ------------------------------------------------------------------------
  // Global search
  // ------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchHits, setSearchHits] = React.useState<GlobalSearchHit[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const searchAnchorRef = React.useRef<HTMLDivElement | null>(null);
  const searchAbortRef = React.useRef<AbortController | null>(null);

  // Flat list of all nav targets for the "Pages" group.
  const allPages = React.useMemo<PageHit[]>(() => {
    const pages: PageHit[] = [];
    sections.forEach((sec) => {
      sec.items.forEach((it) => {
        pages.push({
          kind: 'page',
          id: it.link,
          title: t(`nav.items.${it.key}`),
          subtitle: t(`nav.${sec.key}`),
          route: it.link,
          icon: it.icon,
        });
      });
    });
    legacyExtras.forEach((it) => {
      pages.push({
        kind: 'page',
        id: it.link,
        title: t(`nav.items.${it.key}`),
        subtitle: t('nav.moreTools'),
        route: it.link,
        icon: it.icon,
      });
    });
    return pages;
  }, [t]);

  const matchedPages = React.useMemo<PageHit[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return allPages
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.route.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [allPages, searchQuery]);

  // Debounced fetch. Aborts any previous in-flight request so the UI never
  // paints stale results on top of fresh ones.
  React.useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      searchAbortRef.current?.abort();
      setSearchHits([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const handle = window.setTimeout(() => {
      searchAbortRef.current?.abort();
      const ctl = new AbortController();
      searchAbortRef.current = ctl;
      searchGlobal(q, 8, ctl.signal)
        .then((hits) => {
          if (ctl.signal.aborted) return;
          setSearchHits(hits);
        })
        .finally(() => {
          if (!ctl.signal.aborted) setSearchLoading(false);
        });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  // Cmd/Ctrl+K focuses the search box from anywhere.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close on route change.
  React.useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname]);

  // Build the flat, keyboard-navigable list. Pages first, then DB hits grouped
  // by kind in the configured display order.
  const flatHits = React.useMemo<FlatHit[]>(() => {
    const pageLabel = t('topbar.kinds.page');
    const out: FlatHit[] = [];
    matchedPages.forEach((p) => out.push({ ...p, sectionLabel: pageLabel }));
    kindOrder.forEach((kind) => {
      const group = searchHits.filter((h) => h.kind === kind);
      const label = t(`topbar.kinds.${kindConfig[kind].labelKey}`);
      group.forEach((h) => out.push({ ...h, sectionLabel: label }));
    });
    return out;
  }, [matchedPages, searchHits, t]);

  React.useEffect(() => {
    setActiveIdx(0);
  }, [flatHits.length]);

  const activateHit = React.useCallback(
    (hit: FlatHit) => {
      const route = hit.kind === 'page' ? hit.route : kindConfig[hit.kind].route;
      setSearchOpen(false);
      setSearchQuery('');
      navigate(route);
    },
    [navigate],
  );

  const handleSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setSearchQuery('');
      setSearchOpen(false);
      searchInputRef.current?.blur();
      return;
    }
    if (flatHits.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % flatHits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + flatHits.length) % flatHits.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = flatHits[activeIdx] ?? flatHits[0];
      if (hit) activateHit(hit);
    }
  };

  const showPopper =
    searchOpen && searchQuery.trim().length >= 2 && Boolean(searchAnchorRef.current);
  const showEmpty = !searchLoading && flatHits.length === 0 && searchQuery.trim().length >= 2;

  const fnLogout = async () => {
    await getSupabase().auth.signOut();
    navigate('/');
  };

  const cycleLang = () => {
    void i18n.changeLanguage(nextLanguage(i18nInstance.language));
  };

  const isActiveLink = (link: string) => {
    if (link === '/home') {
      return location.pathname === '/home' || location.pathname === '/';
    }
    return location.pathname === link;
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, minHeight: 64 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerOpen}
              edge="start"
              sx={{ ...(open && { display: 'none' }) }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="overline"
              sx={{ color: 'rgba(255,255,255,0.85)', letterSpacing: '0.12em', fontWeight: 700 }}
            >
              {t('topbar.operations')}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, ml: 1 }}>
              {t('topbar.viktimDashboard')}
            </Typography>
          </Stack>

          <ClickAwayListener onClickAway={() => setSearchOpen(false)}>
            <Box
              ref={searchAnchorRef}
              sx={{
                flex: 1,
                maxWidth: 520,
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                bgcolor: 'rgba(255,255,255,0.16)',
                borderRadius: 2,
                px: 1.5,
                py: 0.5,
                position: 'relative',
                '&:focus-within': { bgcolor: 'rgba(255,255,255,0.24)' },
              }}
            >
              <SearchIcon sx={{ color: 'rgba(255,255,255,0.85)', mr: 1 }} />
              <InputBase
                inputRef={searchInputRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) setSearchOpen(true);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={t('topbar.searchPlaceholder')}
                inputProps={{
                  'aria-label': t('topbar.searchAria'),
                  autoComplete: 'off',
                  spellCheck: false,
                }}
                sx={{
                  color: '#fff',
                  flex: 1,
                  fontSize: 14,
                  '& input::placeholder': { color: 'rgba(255,255,255,0.7)', opacity: 1 },
                }}
              />
              {searchLoading && (
                <CircularProgress size={14} sx={{ color: 'rgba(255,255,255,0.85)', mr: 0.5 }} />
              )}
              {searchQuery && (
                <IconButton
                  size="small"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchHits([]);
                    setSearchOpen(false);
                    searchInputRef.current?.focus();
                  }}
                  sx={{ color: 'rgba(255,255,255,0.85)', p: 0.25 }}
                  aria-label={t('topbar.searchClearAria')}
                >
                  <ChevronRightIcon sx={{ transform: 'rotate(45deg)', fontSize: 18 }} />
                </IconButton>
              )}

              <Popper
                open={showPopper}
                anchorEl={searchAnchorRef.current}
                placement="bottom-start"
                modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
                style={{ zIndex: theme.zIndex.modal + 1, width: searchAnchorRef.current?.clientWidth }}
              >
                <Paper
                  elevation={8}
                  sx={{
                    width: '100%',
                    maxHeight: 'min(70vh, 560px)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid rgba(15,23,42,0.08)',
                  }}
                >
                  {searchLoading && <LinearProgress sx={{ height: 2 }} />}
                  <Box sx={{ overflowY: 'auto', flex: 1 }}>
                    {showEmpty ? (
                      <Box sx={{ px: 2.5, py: 3, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                          {t('topbar.noResults')}{' '}
                          <Typography component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            "{searchQuery}"
                          </Typography>
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>
                          {t('topbar.noResultsHint')}
                        </Typography>
                      </Box>
                    ) : (
                      (() => {
                        let runningIdx = 0;
                        const groups: { label: string; rows: { hit: FlatHit; idx: number }[] }[] = [];
                        flatHits.forEach((hit) => {
                          const label = hit.sectionLabel;
                          const last = groups[groups.length - 1];
                          if (!last || last.label !== label) {
                            groups.push({ label, rows: [{ hit, idx: runningIdx }] });
                          } else {
                            last.rows.push({ hit, idx: runningIdx });
                          }
                          runningIdx += 1;
                        });
                        return groups.map((g, gi) => (
                          <Box key={`${g.label}-${gi}`} sx={{ pb: 0.5 }}>
                            <Typography
                              sx={{
                                px: 2,
                                pt: gi === 0 ? 1.25 : 1.5,
                                pb: 0.5,
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                color: 'text.disabled',
                              }}
                            >
                              {g.label}
                            </Typography>
                            {g.rows.map(({ hit, idx }) => {
                              const isPage = hit.kind === 'page';
                              const accent = isPage ? '#475569' : kindConfig[hit.kind].color;
                              const subtitle = isPage
                                ? hit.subtitle
                                : (hit as GlobalSearchHit).subtitle;
                              const meta = isPage ? null : (hit as GlobalSearchHit).meta;
                              const isActive = idx === activeIdx;
                              return (
                                <Box
                                  key={`${hit.kind}-${hit.id}-${idx}`}
                                  onMouseEnter={() => setActiveIdx(idx)}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    activateHit(hit);
                                  }}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.25,
                                    px: 2,
                                    py: 1,
                                    cursor: 'pointer',
                                    bgcolor: isActive ? 'rgba(15,118,110,0.08)' : 'transparent',
                                    borderLeft: isActive
                                      ? `3px solid ${accent}`
                                      : '3px solid transparent',
                                    transition: 'background-color 80ms ease',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 1.25,
                                      bgcolor: `${accent}1f`,
                                      color: accent,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {isPage
                                      ? (hit as PageHit).icon
                                      : kindConfig[(hit as GlobalSearchHit).kind].icon}
                                  </Box>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                      sx={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: 'text.primary',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {highlight(hit.title, searchQuery)}
                                    </Typography>
                                    {subtitle && (
                                      <Typography
                                        sx={{
                                          fontSize: 11,
                                          color: 'text.secondary',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}
                                      >
                                        {highlight(subtitle, searchQuery)}
                                      </Typography>
                                    )}
                                  </Box>
                                  {meta && (
                                    <Typography
                                      sx={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        letterSpacing: '0.05em',
                                        color: accent,
                                        bgcolor: `${accent}14`,
                                        px: 0.75,
                                        py: 0.25,
                                        borderRadius: 1,
                                        flexShrink: 0,
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      {meta}
                                    </Typography>
                                  )}
                                </Box>
                              );
                            })}
                          </Box>
                        ));
                      })()
                    )}
                  </Box>
                  <Box
                    sx={{
                      px: 2,
                      py: 0.75,
                      borderTop: '1px solid rgba(15,23,42,0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      bgcolor: 'rgba(15,23,42,0.02)',
                    }}
                  >
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                      {t('topbar.footerHelp')}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                      {searchLoading
                        ? t('topbar.footerSearching')
                        : t('topbar.footerCount', { count: flatHits.length })}
                    </Typography>
                  </Box>
                </Paper>
              </Popper>
            </Box>
          </ClickAwayListener>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title={t('topbar.notifications')}>
              <IconButton
                color="inherit"
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
              >
                <Badge color="error" variant="dot" overlap="circular">
                  <NotificationsNoneIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title={t('topbar.help')}>
              <IconButton
                color="inherit"
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('topbar.languageTooltip', { lang: langLabel })}>
              <Button
                onClick={cycleLang}
                startIcon={<LanguageIcon />}
                sx={{
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  minWidth: 0,
                  px: 1.5,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                }}
              >
                {langLabel}
              </Button>
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" open={open}>
        <DrawerHeader sx={{ justifyContent: open ? 'space-between' : 'center', py: 1 }}>
          {open ? (
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
              <Avatar
                variant="rounded"
                sx={{
                  bgcolor: 'primary.main',
                  width: 36,
                  height: 36,
                  fontWeight: 800,
                  fontSize: 16,
                }}
              >
                V
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>{t('sidebar.adminTitle')}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', letterSpacing: '0.05em' }}>
                  {t('sidebar.opsLocation')}
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Avatar
              variant="rounded"
              sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontWeight: 800 }}
            >
              V
            </Avatar>
          )}
          {open && (
            <IconButton onClick={handleDrawerClose} size="small">
              {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          )}
        </DrawerHeader>
        <Divider />

        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
          {sections.map((section, idx) => (
            <Box key={section.key} sx={{ mb: 1 }}>
              {open && (
                <Typography
                  variant="caption"
                  sx={{
                    px: 3,
                    py: 1,
                    display: 'block',
                    color: 'text.secondary',
                    letterSpacing: '0.12em',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: 10,
                  }}
                >
                  {t(`nav.${section.key}`)}
                </Typography>
              )}
              <List sx={{ py: 0 }}>
                {section.items.map((item) => {
                  const isActive = isActiveLink(item.link);
                  return (
                    <ListItem key={item.link} disablePadding sx={{ display: 'block', mb: 0.25 }}>
                      <ListItemButton
                        onClick={() => openLink(item.link)}
                        sx={{
                          minHeight: 40,
                          justifyContent: open ? 'initial' : 'center',
                          px: 2,
                          mx: 1,
                          borderRadius: 2,
                          bgcolor: isActive ? 'primary.main' : 'transparent',
                          color: isActive ? 'primary.contrastText' : 'text.primary',
                          '&:hover': {
                            bgcolor: isActive ? 'primary.dark' : 'action.hover',
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 0,
                            mr: open ? 1.75 : 'auto',
                            justifyContent: 'center',
                            color: 'inherit',
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={t(`nav.items.${item.key}`)}
                          primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                          sx={{ opacity: open ? 1 : 0 }}
                        />
                        {open && item.badge != null && (
                          <Box
                            sx={{
                              minWidth: 28,
                              height: 20,
                              px: 0.75,
                              borderRadius: 999,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: isActive
                                ? 'rgba(255,255,255,0.22)'
                                : item.badgeColor === 'warning'
                                  ? '#fef3c7'
                                  : '#fee2e2',
                              color: isActive
                                ? '#fff'
                                : item.badgeColor === 'warning'
                                  ? '#b45309'
                                  : '#b91c1c',
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {item.badge}
                          </Box>
                        )}
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
              {idx < sections.length - 1 && open && <Divider sx={{ mx: 2, mt: 1, opacity: 0.6 }} />}
            </Box>
          ))}

          {open && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="caption"
                sx={{
                  px: 3,
                  py: 1,
                  display: 'block',
                  color: 'text.disabled',
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontSize: 10,
                }}
              >
                {t('nav.moreTools')}
              </Typography>
              <List sx={{ py: 0 }}>
                {legacyExtras.map((item) => {
                  const isActive = isActiveLink(item.link);
                  return (
                    <ListItem key={item.link} disablePadding sx={{ display: 'block', mb: 0.25 }}>
                      <ListItemButton
                        onClick={() => openLink(item.link)}
                        sx={{
                          minHeight: 36,
                          px: 2,
                          mx: 1,
                          borderRadius: 2,
                          bgcolor: isActive ? 'primary.main' : 'transparent',
                          color: isActive ? 'primary.contrastText' : 'text.secondary',
                          '&:hover': {
                            bgcolor: isActive ? 'primary.dark' : 'action.hover',
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 0, mr: 1.75, color: 'inherit' }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={t(`nav.items.${item.key}`)}
                          primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </Box>

        <Divider />
        <Box sx={{ p: 1.5 }}>
          {open ? (
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Tooltip title={email || displayName}>
                <Avatar sx={{ bgcolor: '#0f766e', width: 36, height: 36, fontWeight: 700 }}>
                  {initials}
                </Avatar>
              </Tooltip>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }} noWrap>
                  {displayName}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }} noWrap>
                  {email || roleLabel}
                </Typography>
              </Box>
              <Tooltip title={t('sidebar.logout')}>
                <IconButton size="small" onClick={fnLogout}>
                  <ExitToApp fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <Stack alignItems="center" spacing={1}>
              <Tooltip title={email || displayName}>
                <Avatar
                  sx={{ bgcolor: '#0f766e', width: 32, height: 32, fontWeight: 700, fontSize: 13 }}
                >
                  {initials}
                </Avatar>
              </Tooltip>
              <IconButton size="small" onClick={fnLogout}>
                <ExitToApp fontSize="small" />
              </IconButton>
            </Stack>
          )}
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: 0,
          mb: 2,
          width: '100%',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <DrawerHeader />
        <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>
      </Box>
    </Box>
  );
}
