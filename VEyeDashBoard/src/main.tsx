import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import App from './App.tsx';
import theme from './theme';
import './index.css';
import './i18n';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Login from './components/auth/Login.tsx';
import AuthRecovery from './components/auth/AuthRecovery.tsx';
import RequireAuth from './auth/RequireAuth.tsx';
import Viktim from './components/Viktim.tsx';
import DangerZone from './components/DangerZone.tsx';
import Kidnapping from './components/Kidnapping.tsx';
import News from './components/News.tsx';
import Maps from './components/Maps.tsx';
import TelegramMonitorTool from './components/TelegramMonitorTool.tsx';
import Dashboard from './components/Dashboard.tsx';
import Moderation from './components/Moderation.tsx';
import Users from './components/Users.tsx';
import ErrorPage from './components/ErrorPage.tsx';

const router = createBrowserRouter([
  {
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <Login /> },
      { path: 'auth/reset', element: <AuthRecovery /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'home', element: <App><Dashboard /></App> },
          { path: 'dashboard', element: <App><Dashboard /></App> },
          { path: 'viktim', element: <App><Viktim /></App> },
          { path: 'news', element: <App><News /></App> },
          { path: 'zone-danger', element: <App><DangerZone /></App> },
          { path: 'maps', element: <App><Maps /></App> },
          { path: 'kidnapping', element: <App><Kidnapping /></App> },
          { path: 'telegram', element: <App><TelegramMonitorTool /></App> },
          { path: 'moderation', element: <App><Moderation /></App> },
          { path: 'users', element: <App><Users /></App> },
        ],
      },
      { path: '*', element: <ErrorPage /> },
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
