import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccessTimeRounded,
  CheckCircleRounded,
  CrisisAlertRounded,
  DescriptionRounded,
  GpsFixedRounded,
  HelpOutlineRounded,
  MyLocationRounded,
  PlaceOutlined,
  WarningAmberRounded,
} from '@mui/icons-material';
import { handleSendAlert } from '../api';
import { Field, FieldLabel, StyledSelect } from './Field';

type Level = 'low' | 'medium' | 'high';

const LEVELS: { key: Level; label: string; color: string; bg: string }[] = [
  { key: 'low', label: 'Ba', color: '#15803d', bg: '#dcfce7' },
  { key: 'medium', label: 'Mwayen', color: '#b45309', bg: '#fef3c7' },
  { key: 'high', label: 'Wo', color: '#b91c1c', bg: '#fee2e2' },
];

const INCIDENT_TYPES = [
  'Gang activity',
  'Manifestasyon',
  'Tire',
  'Kidnaping',
  'Aksidan',
  'Lòt',
];

function parseCoord(v: string): number | undefined {
  if (!v.trim()) return undefined;
  const n = Number(v.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function nowLocalIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function SectionHeader({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2.5, mb: 1.5 }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: 1.25,
          bgcolor: '#f0fdfa',
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em' }}>
        {title}
      </Typography>
      {hint && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>· {hint}</Typography>
      )}
    </Stack>
  );
}

export default function DangerForm({ handleClose }: { handleClose: () => void }) {
  const [name, setName] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [latitude, setLatitude] = React.useState('');
  const [longitude, setLongitude] = React.useState('');
  const [incidentDate, setIncidentDate] = React.useState('');
  const [rezon, setRezon] = React.useState('');
  const [level, setLevel] = React.useState<Level>('medium');
  const [incidentType, setIncidentType] = React.useState<string>('');
  const [confirm, setConfirm] = React.useState(false);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [locating, setLocating] = React.useState(false);
  const [toast, setToast] = React.useState<{
    open: boolean;
    severity: 'success' | 'error';
    msg: string;
  }>({ open: false, severity: 'success', msg: '' });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Non zòn lan obligatwa.';
    if (!rezon.trim()) e.rezon = 'Dekri sak pase a.';
    const lat = parseCoord(latitude);
    const lng = parseCoord(longitude);
    if ((latitude.trim() && lat === undefined) || (longitude.trim() && lng === undefined)) {
      e.coords = 'Latitid/longitid pa valab.';
    }
    if ((lat !== undefined) !== (lng !== undefined)) {
      e.coords = 'Antre tou de latitid ak longitid, oswa kite yo vid.';
    }
    if (!confirm) e.confirm = 'Ou dwe konfime ou verifye enfòmasyon yo.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setToast({ open: true, severity: 'error', msg: 'Geolokalizasyon pa disponib nan navigatè a.' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocating(false);
        setToast({ open: true, severity: 'success', msg: 'Pozisyon w pran.' });
      },
      (err) => {
        setLocating(false);
        setToast({ open: true, severity: 'error', msg: err.message || 'Pa ka jwenn pozisyon w.' });
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    const lat = parseCoord(latitude);
    const lng = parseCoord(longitude);
    const date = incidentDate ? new Date(incidentDate) : new Date();

    const payload: Record<string, unknown> = {
      name: name.trim(),
      rezon: rezon.trim(),
      address: address.trim() || undefined,
      level,
      incident_type: incidentType || undefined,
      date,
      confirm: 'confirme',
    };
    if (lat !== undefined && lng !== undefined) {
      payload.latitude = lat;
      payload.longitude = lng;
    }

    setSubmitting(true);
    try {
      await handleSendAlert(payload);
      setToast({ open: true, severity: 'success', msg: 'Zon danje a anrejistre, mèsi.' });
      window.setTimeout(handleClose, 600);
    } catch (e) {
      console.error(e);
      setToast({ open: true, severity: 'error', msg: 'Echèk nan voye alèt la. Eseye ankò.' });
    } finally {
      setSubmitting(false);
    }
  };

  const lat = parseCoord(latitude);
  const lng = parseCoord(longitude);

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <SectionHeader icon={<CrisisAlertRounded sx={{ fontSize: 16 }} />} title="Idantifikasyon zon lan" />

      <Stack spacing={2}>
        <Field
          label="Non zòn lan"
          required
          autoFocus
          placeholder="Egzanp: Sarthe (Germain)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={!!errors.name}
          helperText={errors.name}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Box sx={{ flex: 1 }}>
            <FieldLabel label="Tip ensidan" />
            <StyledSelect value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
              <option value="">— Chwazi —</option>
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </StyledSelect>
          </Box>

          <Box sx={{ flex: 1 }}>
            <FieldLabel label="Nivo danje" />
            <Stack direction="row" spacing={1}>
              {LEVELS.map((l) => {
                const active = level === l.key;
                return (
                  <Chip
                    key={l.key}
                    label={l.label}
                    onClick={() => setLevel(l.key)}
                    sx={{
                      flex: 1,
                      borderRadius: '10px',
                      height: 40,
                      fontWeight: 700,
                      fontSize: 13,
                      bgcolor: active ? l.bg : '#f8fafc',
                      color: active ? l.color : 'text.secondary',
                      border: '1px solid',
                      borderColor: active ? `${l.color}55` : '#e2e8f0',
                      '&:hover': { bgcolor: active ? l.bg : '#f1f5f9' },
                    }}
                  />
                );
              })}
            </Stack>
          </Box>
        </Stack>
      </Stack>

      <SectionHeader
        icon={<PlaceOutlined sx={{ fontSize: 16 }} />}
        title="Lokasyon"
        hint="Adrès ak/oswa kowòdone"
      />

      <Stack spacing={2}>
        <Field
          label="Adrès"
          placeholder="Adrès oswa kote presi (opsyonèl)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Field
            label="Latitid"
            placeholder="18.5392"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            inputProps={{ inputMode: 'decimal' }}
            error={!!errors.coords}
          />
          <Field
            label="Longitid"
            placeholder="-72.3364"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            inputProps={{ inputMode: 'decimal' }}
            error={!!errors.coords}
          />
          <Box sx={{ alignSelf: 'flex-end' }}>
            <Tooltip title="Sèvi ak pozisyon w">
              <Button
                onClick={useMyLocation}
                disabled={locating}
                startIcon={
                  locating ? <CircularProgress size={14} thickness={5} /> : <MyLocationRounded />
                }
                sx={{
                  height: 42,
                  whiteSpace: 'nowrap',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  bgcolor: '#f8fafc',
                  color: 'text.primary',
                  px: 2,
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: '#f0fdfa',
                    boxShadow: 'none',
                  },
                }}
              >
                {locating ? 'Cheche…' : 'Mwen menm'}
              </Button>
            </Tooltip>
          </Box>
        </Stack>
        {errors.coords && (
          <Typography variant="caption" color="error" sx={{ ml: 0.5 }}>
            {errors.coords}
          </Typography>
        )}

        {lat !== undefined && lng !== undefined && (
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: '#f0fdfa',
              border: '1px dashed rgba(13,148,136,0.35)',
              color: 'primary.dark',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <GpsFixedRounded sx={{ fontSize: 16 }} />
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </Box>
        )}
      </Stack>

      <SectionHeader icon={<AccessTimeRounded sx={{ fontSize: 16 }} />} title="Lè ensidan" />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
        <Field
          label="Dat / lè"
          type="datetime-local"
          value={incidentDate}
          onChange={(e) => setIncidentDate(e.target.value)}
          helperText="Vid = pa gen dat (kounye a pral itilize)."
        />
        <Button
          variant="text"
          onClick={() => setIncidentDate(nowLocalIso())}
          sx={{ height: 42, alignSelf: { xs: 'flex-start', sm: 'flex-end' }, mb: { sm: 3 } }}
        >
          Kounye a
        </Button>
      </Stack>

      <SectionHeader icon={<DescriptionRounded sx={{ fontSize: 16 }} />} title="Sak pase" />

      <Field
        label="Dekri ensidan an"
        required
        multiline
        minRows={4}
        maxRows={10}
        placeholder="Bay detay sou sak pase nan zòn lan…"
        value={rezon}
        onChange={(e) => setRezon(e.target.value)}
        error={!!errors.rezon}
        helperText={errors.rezon || `${rezon.length} karaktè`}
      />

      <Box
        sx={{
          mt: 2.5,
          p: 1.5,
          borderRadius: 2,
          bgcolor: confirm ? '#f0fdfa' : '#fff7ed',
          border: `1px solid ${confirm ? 'rgba(13,148,136,0.25)' : 'rgba(245,158,11,0.3)'}`,
          transition: 'all 180ms ease',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.25,
          cursor: 'pointer',
        }}
        onClick={() => setConfirm((c) => !c)}
        role="checkbox"
        aria-checked={confirm}
      >
        {confirm ? (
          <CheckCircleRounded sx={{ color: 'primary.main', mt: 0.25 }} />
        ) : (
          <WarningAmberRounded sx={{ color: 'warning.main', mt: 0.25 }} />
        )}
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            Mwen verifye enfòmasyon sa yo anvan m soumèt.
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            Fo enfòmasyon kapab mete kominote a an danje.
          </Typography>
          {errors.confirm && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
              {errors.confirm}
            </Typography>
          )}
        </Box>
      </Box>

      <Stack
        direction="row"
        spacing={1.25}
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(15,23,42,0.06)' }}
      >
        <Tooltip title="Èd">
          <IconButton size="small" sx={{ color: 'text.disabled' }}>
            <HelpOutlineRounded fontSize="small" />
          </IconButton>
        </Tooltip>
        <Stack direction="row" spacing={1.25}>
          <Button
            variant="outlined"
            onClick={handleClose}
            disabled={submitting}
            sx={{
              borderColor: 'rgba(15,23,42,0.12)',
              color: 'text.primary',
              '&:hover': { borderColor: 'rgba(15,23,42,0.24)', bgcolor: '#f8fafc' },
            }}
          >
            Anile
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={submitting}
            startIcon={
              submitting ? <CircularProgress size={16} thickness={5} sx={{ color: '#fff' }} /> : null
            }
            sx={{ minWidth: 140 }}
          >
            {submitting ? 'An voye…' : 'Mete ajou'}
          </Button>
        </Stack>
      </Stack>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          sx={{ borderRadius: 2 }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
