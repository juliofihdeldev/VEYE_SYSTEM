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
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, onAuthStateChanged, getAuth } from 'firebase/auth';

function Copyright(props: any) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link to="https://veye.dev/">VEYe</Link> {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

export default function Login() {
  const navigate = useNavigate();

  React.useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) navigate('/home');
    });
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const email = data.get('email');
    const password = data.get('password');
    const auth = getAuth();

    signInWithEmailAndPassword(auth, String(email), String(password))
      .then((userCredential) => {
        const user = userCredential.user;
        console.log(user);
      })
      .catch((error) => {
        alert(error.message);
      });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'background.default',
      }}
    >
      <CssBaseline />

      {/* Left side - Branding */}
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

      {/* Right side - Form */}
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

          <Box component="form" onSubmit={handleSubmit} noValidate>
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
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                fontSize: '1rem',
              }}
            >
              Sign In
            </Button>

            <Grid container justifyContent="flex-end">
              <Grid item>
                <Link to="#" style={{ fontSize: '0.875rem' }}>
                  Forgot password?
                </Link>
              </Grid>
            </Grid>
          </Box>

          <Copyright sx={{ mt: 6, opacity: 0.8 }} />
        </Box>
      </Box>
    </Box>
  );
}
