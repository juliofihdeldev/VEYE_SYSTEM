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
import { getSupabase } from './lib/supabase';
import { useCurrentUser } from './auth/useCurrentUser';

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
  name: string;
  icon: React.ReactNode;
  link: string;
  badge?: number;
  badgeColor?: 'primary' | 'error' | 'warning' | 'info';
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { name: 'Dashboard', icon: <DashboardOutlined />, link: '/home' },
      { name: 'Viktim', icon: <ErrorOutline />, link: '/viktim', badge: 142, badgeColor: 'error' },
      { name: 'Zon Danje', icon: <PlaceOutlined />, link: '/zone-danger' },
      { name: 'Nouvo', icon: <ArticleOutlined />, link: '/news' },
    ],
  },
  {
    title: 'Community',
    items: [
      { name: 'Itilizatè', icon: <GroupsOutlined />, link: '/users' },
      { name: 'Moderasyon', icon: <GavelOutlined />, link: '/moderation' },
      { name: 'Rapò', icon: <AssessmentOutlined />, link: '/reports' },
    ],
  },
  {
    title: 'System',
    items: [
      { name: 'Sync Supabase', icon: <CloudSyncOutlined />, link: '/sync' },
      { name: 'Paramèt', icon: <SettingsOutlined />, link: '/settings' },
    ],
  },
];

const legacyExtras: NavItem[] = [
  { name: 'Kidnapping', icon: <RawOffTwoTone />, link: '/kidnapping' },
  { name: 'Maps', icon: <MapIcon />, link: '/maps' },
  { name: 'Telegram', icon: <CloudSyncOutlined />, link: '/telegram' },
];

export interface PropsChildren {
  children?: React.ReactNode;
}

export default function App({ children }: PropsChildren) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(true);
  const [lang, setLang] = React.useState<'FR' | 'KR' | 'EN'>('FR');
  const navigate = useNavigate();
  const location = useLocation();
  const { displayName, email, roleLabel, initials } = useCurrentUser();

  const openLink = (link: string) => navigate(link);
  const handleDrawerOpen = () => setOpen(true);
  const handleDrawerClose = () => setOpen(false);

  const fnLogout = async () => {
    await getSupabase().auth.signOut();
    navigate('/');
  };

  const cycleLang = () => {
    setLang((l) => (l === 'FR' ? 'KR' : l === 'KR' ? 'EN' : 'FR'));
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
              OPERATIONS
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, ml: 1 }}>
              Viktim dashboard
            </Typography>
          </Stack>

          <Box
            sx={{
              flex: 1,
              maxWidth: 520,
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              bgcolor: 'rgba(255,255,255,0.16)',
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              '&:focus-within': { bgcolor: 'rgba(255,255,255,0.24)' },
            }}
          >
            <SearchIcon sx={{ color: 'rgba(255,255,255,0.85)', mr: 1 }} />
            <InputBase
              placeholder="Chache non, zòn, enfòmasyon, tip…"
              sx={{
                color: '#fff',
                flex: 1,
                fontSize: 14,
                '& input::placeholder': { color: 'rgba(255,255,255,0.7)', opacity: 1 },
              }}
            />
          </Box>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="Notifications">
              <IconButton
                color="inherit"
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
              >
                <Badge color="error" variant="dot" overlap="circular">
                  <NotificationsNoneIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title="Aide">
              <IconButton
                color="inherit"
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={`Lang: ${lang}`}>
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
                {lang}
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
                <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>VEYe Admin</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', letterSpacing: '0.05em' }}>
                  OPS · PORT-AU-PRINCE
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
            <Box key={section.title} sx={{ mb: 1 }}>
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
                  {section.title}
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
                          primary={item.name}
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
                More tools
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
                          primary={item.name}
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
              <Tooltip title="Dekonekte">
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
