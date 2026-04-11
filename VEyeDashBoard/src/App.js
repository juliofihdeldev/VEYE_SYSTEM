import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import MailIcon from '@mui/icons-material/Mail';
import ExitToApp from '@mui/icons-material/ExitToApp';
import { signOut, getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Dangerous, Error, Map, Newspaper, RawOffTwoTone } from '@mui/icons-material';
const drawerWidth = 240;
const openedMixin = (theme) => ({
    width: drawerWidth,
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
});
const closedMixin = (theme) => ({
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
    justifyContent: 'flex-end',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
}));
const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
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
const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
        ...openedMixin(theme),
        '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
        ...closedMixin(theme),
        '& .MuiDrawer-paper': closedMixin(theme),
    }),
}));
export default function App({ children }) {
    const theme = useTheme();
    const [open, setOpen] = React.useState(false);
    const navigate = useNavigate();
    const openLink = (link) => {
        navigate(link);
    };
    const handleDrawerOpen = () => {
        setOpen(true);
    };
    const handleDrawerClose = () => {
        setOpen(false);
    };
    const fnLogout = () => {
        const auth = getAuth();
        signOut(auth).then(() => {
            // Sign-out successful.
            navigate("/");
        }).catch(() => {
            // An error happened.
        });
    };
    let menu = [
        { name: 'Viktim', icon: _jsx(Error, {}), link: '/viktim' },
        { name: 'Zone Danger', icon: _jsx(Dangerous, {}), link: '/zone-danger' },
        { name: 'Kidnapping', icon: _jsx(RawOffTwoTone, {}), link: '/kidnapping' },
        { name: 'News', icon: _jsx(Newspaper, {}), link: '/news' },
        { name: 'Maps', icon: _jsx(Map, {}), link: '/maps' },
    ];
    return (_jsxs(Box, { sx: { display: 'flex' }, children: [_jsx(CssBaseline, {}), _jsx(AppBar, { position: "fixed", open: open, children: _jsxs(Toolbar, { children: [_jsx(IconButton, { color: "inherit", "aria-label": "open drawer", onClick: handleDrawerOpen, edge: "start", sx: {
                                marginRight: 5,
                                ...(open && { display: 'none' }),
                            }, children: _jsx(MenuIcon, {}) }), _jsx("div", { children: _jsx(Typography, { variant: "h6", noWrap: true, component: "div", children: "VEYe dashboard" }) }), _jsx(IconButton, { color: "inherit", "aria-label": "open drawer", onClick: fnLogout, edge: "start", sx: {
                                marginLeft: '82%'
                            }, children: _jsx(ExitToApp, {}) })] }) }), _jsxs(Drawer, { variant: "permanent", open: open, children: [_jsx(DrawerHeader, { children: _jsx(IconButton, { onClick: handleDrawerClose, children: theme.direction === 'rtl' ? _jsx(ChevronRightIcon, {}) : _jsx(ChevronLeftIcon, {}) }) }), _jsx(Divider, {}), _jsx(List, { children: menu.map((item) => (_jsx(ListItem, { disablePadding: true, sx: { display: 'block' }, onClick: () => openLink(item.link), children: _jsxs(ListItemButton, { sx: {
                                    minHeight: 48,
                                    justifyContent: open ? 'initial' : 'center',
                                    px: 2.5,
                                }, children: [_jsx(ListItemIcon, { sx: {
                                            minWidth: 0,
                                            mr: open ? 3 : 'auto',
                                            justifyContent: 'center',
                                        }, children: item.icon }), _jsx(ListItemText, { primary: item.name, sx: { opacity: open ? 1 : 0 } })] }) }, item.link))) }), _jsx(Divider, {}), _jsx(List, { children: ['Aide'].map((text, index) => (_jsx(ListItem, { disablePadding: true, sx: { display: 'block' }, children: _jsxs(ListItemButton, { sx: {
                                    minHeight: 48,
                                    justifyContent: open ? 'initial' : 'center',
                                    px: 2.5,
                                }, children: [_jsx(ListItemIcon, { sx: {
                                            minWidth: 0,
                                            mr: open ? 3 : 'auto',
                                            justifyContent: 'center',
                                        }, children: index % 2 === 0 ? _jsx(InboxIcon, {}) : _jsx(MailIcon, {}) }), _jsx(ListItemText, { primary: text, sx: { opacity: open ? 1 : 0 } })] }) }, text))) })] }), _jsxs(Box, { component: "main", sx: { mt: 3, mb: 2, width: '100%', backgroundColor: '#fff' }, children: [_jsx(DrawerHeader, {}), _jsx(Box, { component: "main", children: children })] })] }));
}
