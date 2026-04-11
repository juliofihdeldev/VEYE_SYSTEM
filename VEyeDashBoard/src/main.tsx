import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import App from './App.tsx';
import theme from './theme';
import './index.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Login from './components/auth/Login.tsx';
import AuthRecovery from './components/auth/AuthRecovery.tsx';
import RequireAuth from './auth/RequireAuth.tsx';
import Viktim from './components/Viktim.tsx';
import DangerZone from './components/DangerZone.tsx';
import Kidnapping from './components/Kidnapping.tsx';
import News from './components/News.tsx';
import Maps from './components/Maps.tsx';
import StatIncident from './components/StatIncident.tsx';
import TelegramMonitorTool from './components/TelegramMonitorTool.tsx';

const router = createBrowserRouter([
  { path: '/', element: <Login /> },
  { path: 'auth/reset', element: <AuthRecovery /> },
  {
    element: <RequireAuth />,
    children: [
      { path: 'home', element: <App><Viktim /></App> },
      { path: 'viktim', element: <App><Viktim /></App> },
      { path: 'news', element: <App><News /></App> },
      { path: 'zone-danger', element: <App><DangerZone /></App> },
      { path: 'maps', element: <App><Maps /></App> },
      { path: 'kidnapping', element: <App><Kidnapping /></App> },
      { path: 'stat-incident', element: <App><StatIncident /></App> },
      { path: 'telegram', element: <App><TelegramMonitorTool /></App> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
);
