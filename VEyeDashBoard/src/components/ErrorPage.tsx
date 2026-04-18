import * as React from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowForward,
  Home as HomeIcon,
  RestartAlt,
  ArrowBack,
  ReportGmailerrorred,
  PlaceOutlined,
  ErrorOutline,
  ArticleOutlined,
} from '@mui/icons-material';
import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
  Link as RouterLink,
} from 'react-router-dom';

type ErrorInfo = {
  status: number;
  title: string;
  subtitle: string;
  detail?: string;
};

function classify(error: unknown): ErrorInfo {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        status: 404,
        title: 'Paj la pa egziste',
        subtitle: "Nou pa jwenn paj sa a — petèt li deplase, oswa lyen an pa kòrèk.",
        detail: error.statusText,
      };
    }
    if (error.status === 401 || error.status === 403) {
      return {
        status: error.status,
        title: 'Aksè refize',
        subtitle: "Ou pa gen pèmisyon pou wè paj sa a. Konekte ankò oswa kontakte yon administratè.",
        detail: error.statusText,
      };
    }
    return {
      status: error.status,
      title: `Erè ${error.status}`,
      subtitle: error.statusText || 'Yon bagay pa mache jan li ta dwe.',
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      title: 'Yon erè rive',
      subtitle: 'Aplikasyon an rankontre yon pwoblèm enprevi. Eseye chaje ankò.',
      detail: error.message,
    };
  }

  return {
    status: 500,
    title: 'Yon erè rive',
    subtitle: 'Yon bagay pa mache jan li ta dwe. Eseye ankò.',
  };
}

const quickLinks = [
  { name: 'Viktim dashboard', desc: 'Live feed of reports', link: '/home', icon: <HomeIcon /> },
  { name: 'Viktim', desc: 'Lis viktim yo', link: '/viktim', icon: <ErrorOutline /> },
  { name: 'Zon Danje', desc: 'Live danger zones', link: '/zone-danger', icon: <PlaceOutlined /> },
  { name: 'Nouvo', desc: 'Latest news feed', link: '/news', icon: <ArticleOutlined /> },
];

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const info = React.useMemo(() => classify(error), [error]);

  React.useEffect(() => {
    if (error) {
      console.error('[VEYe] route error:', error);
    }
  }, [error]);

  const isNotFound = info.status === 404;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.default',
        px: { xs: 2, md: 4 },
        py: { xs: 4, md: 6 },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(1100px 600px at 110% -10%, rgba(13,148,136,0.18), transparent 60%),' +
            'radial-gradient(900px 500px at -20% 110%, rgba(245,158,11,0.18), transparent 55%),' +
            'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)',
        }}
      />

      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 1080,
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid rgba(15,23,42,0.06)',
          boxShadow: '0 30px 80px -40px rgba(15,23,42,0.25)',
          bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.15fr 1fr' },
          }}
        >
          <Box sx={{ p: { xs: 4, md: 6 } }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 3 }}>
              <Avatar
                variant="rounded"
                sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontWeight: 800 }}
              >
                V
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>VEYe Admin</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', letterSpacing: '0.05em' }}>
                  OPS · PORT-AU-PRINCE
                </Typography>
              </Box>
            </Stack>

            <Chip
              size="small"
              label={isNotFound ? 'PAJ PA JWENN' : 'ERÈ APLIKASYON'}
              sx={{
                bgcolor: isNotFound ? '#fef3c7' : '#fee2e2',
                color: isNotFound ? '#b45309' : '#b91c1c',
                fontWeight: 700,
                letterSpacing: '0.08em',
                fontSize: 11,
                mb: 2,
              }}
            />

            <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ mb: 1.5 }}>
              <Typography
                component="div"
                sx={{
                  fontSize: { xs: 64, md: 96 },
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                  background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 60%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {info.status}
              </Typography>
              <ReportGmailerrorred
                sx={{
                  fontSize: { xs: 36, md: 44 },
                  color: isNotFound ? '#f59e0b' : '#ef4444',
                }}
              />
            </Stack>

            <Typography
              variant="h2"
              sx={{ fontSize: { xs: 24, md: 32 }, fontWeight: 700, mb: 1.25 }}
            >
              {info.title}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 15, mb: 3, maxWidth: 460 }}>
              {info.subtitle}
            </Typography>

            {info.detail && (
              <Box
                sx={{
                  bgcolor: '#f8fafc',
                  border: '1px dashed rgba(15,23,42,0.12)',
                  borderRadius: 2,
                  px: 1.75,
                  py: 1.25,
                  mb: 3,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: 12,
                  color: 'text.secondary',
                  maxWidth: 480,
                  wordBreak: 'break-word',
                }}
              >
                {info.detail}
              </Box>
            )}

            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<HomeIcon />}
                onClick={() => navigate('/home')}
              >
                Retounen Dashboard
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<ArrowBack />}
                onClick={() => navigate(-1)}
                sx={{
                  borderColor: 'rgba(15,23,42,0.12)',
                  color: 'text.primary',
                  '&:hover': { borderColor: 'rgba(15,23,42,0.24)', bgcolor: '#f8fafc' },
                }}
              >
                Paj presedan
              </Button>
              <Button
                variant="text"
                size="large"
                startIcon={<RestartAlt />}
                onClick={() => window.location.reload()}
                sx={{ color: 'text.secondary' }}
              >
                Reload
              </Button>
            </Stack>
          </Box>

          <Box
            sx={{
              position: 'relative',
              p: { xs: 4, md: 5 },
              bgcolor: '#0f172a',
              color: '#e2e8f0',
              overflow: 'hidden',
            }}
          >
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(420px 240px at 80% 0%, rgba(13,148,136,0.45), transparent 60%),' +
                  'radial-gradient(360px 220px at 0% 100%, rgba(245,158,11,0.35), transparent 55%)',
              }}
            />
            <Box sx={{ position: 'relative' }}>
              <Typography
                variant="overline"
                sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.16em', fontWeight: 700 }}
              >
                Quick navigation
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2.5, mt: 0.5 }}>
                Kote ou ka ale kounye a
              </Typography>

              <Stack spacing={1.25}>
                {quickLinks.map((q) => (
                  <Paper
                    key={q.link}
                    component={RouterLink}
                    to={q.link}
                    elevation={0}
                    sx={{
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#e2e8f0',
                      transition: 'all 180ms ease',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.12)',
                        borderColor: 'rgba(255,255,255,0.18)',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(13,148,136,0.25)',
                        color: '#5eead4',
                      }}
                    >
                      {q.icon}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                        {q.name}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: 'rgba(226,232,240,0.7)' }}>
                        {q.desc}
                      </Typography>
                    </Box>
                    <ArrowForward sx={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }} />
                  </Paper>
                ))}
              </Stack>

              <Box
                sx={{
                  mt: 3,
                  pt: 2.5,
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  fontSize: 12,
                  color: 'rgba(226,232,240,0.6)',
                }}
              >
                Bezwen èd? Kontakte ekip sipò a — <strong style={{ color: '#5eead4' }}>support@veye.ht</strong>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
