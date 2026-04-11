import * as React from 'react';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import { Link, useNavigate } from 'react-router-dom';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import SetupSupabaseEnv from '../SetupSupabaseEnv';

function Copyright(props: any) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link to="https://veye.dev/">VEYe</Link> {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

function loginErrorHint(message: string): string | null {
  const m = message.toLowerCase();
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return 'Supabase is waiting for email confirmation. In the dashboard: Authentication → Users → open your user → Confirm user, or turn off “Confirm email” under Authentication → Providers → Email (dev only).';
  }
  if (m.includes('invalid login') || m.includes('invalid credentials')) {
    return 'Wrong email/password, user is in another project than VITE_SUPABASE_URL, or email is not confirmed yet (check Authentication → Users → confirm).';
  }
  if (m.includes('fetch') || m.includes('network') || m === 'failed to fetch') {
    return [
      'Put `.env` in the VEyeDashBoard folder (next to `vite.config.ts`), not only at the monorepo root — then restart dev. This project pins Vite `envDir` there; if you still see this, confirm vars load (no quotes/spaces around =).',
      'Hosted: Project URL from Dashboard → Settings → API — usually https://<project-ref>.supabase.co with no path. Custom domains use that full https origin.',
      'Local CLI: http://127.0.0.1:54321 (http only) from `supabase status` after `supabase start`.',
      'Also: project not paused, VPN/ad-blockers, or a private window.',
    ].join('\n\n');
  }
  return null;
}

export default function Login() {
  const navigate = useNavigate();
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [signingIn, setSigningIn] = React.useState(false);

  React.useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = getSupabase();
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) navigate('/home', { replace: true });
    });
    sb.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/home', { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSupabaseConfigured()) return;
    setAuthError(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    setSigningIn(true);
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(error.message);
        return;
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) return;
    const email = window.prompt('Enter your account email:');
    if (!email?.trim()) return;
    const redirectTo = `${window.location.origin}/auth/reset`;
    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) {
      alert(error.message);
      return;
    }
    alert('If an account exists for that email, you will receive a reset link shortly.');
  };

  const authHint = authError ? loginErrorHint(authError) : null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'background.default',
      }}
    >
      <CssBaseline />

      <Paper
        elevation={0}
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #134e4a 100%)',
          borderRadius: 0,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 6,
        }}
      >
        <Box sx={{ textAlign: 'center', maxWidth: 420 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              color: 'white',
              fontWeight: 700,
              mb: 2,
              letterSpacing: '-0.02em',
            }}
          >
            VEYe Dashboard
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: '1.125rem',
              lineHeight: 1.7,
            }}
          >
            Community-driven safety platform. Report incidents, track alerts, and keep your community informed.
          </Typography>
        </Box>
      </Paper>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 6 },
          maxWidth: { md: 480 },
          mx: 'auto',
        }}
      >
        <Box sx={{ width: '100%' }}>
          <Typography
            component="h1"
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 1,
              display: { md: 'none' },
            }}
          >
            VEYe Dashboard
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: 'text.secondary',
              mb: 4,
              fontWeight: 500,
            }}
          >
            Sign in to your account
          </Typography>

          {isSupabaseConfigured() ? (
            <Box component="form" onSubmit={handleSubmit} noValidate>
              {authError ? (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAuthError(null)}>
                  <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                    {authError}
                  </Typography>
                  {authHint ? (
                    <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
                      {authHint}
                    </Typography>
                  ) : null}
                </Alert>
              ) : null}
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
              />
              <FormControlLabel
                control={<Checkbox value="remember" color="primary" />}
                label="Remember me"
                sx={{ mt: 1 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={signingIn}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  fontSize: '1rem',
                }}
              >
                {signingIn ? 'Signing in…' : 'Sign In'}
              </Button>

              <Grid container justifyContent="flex-end">
                <Grid item>
                  <Link to="#" onClick={handleForgotPassword} style={{ fontSize: '0.875rem' }}>
                    Forgot password?
                  </Link>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <SetupSupabaseEnv />
          )}

          <Copyright sx={{ mt: 6, opacity: 0.8 }} />
        </Box>
      </Box>
    </Box>
  );
}
