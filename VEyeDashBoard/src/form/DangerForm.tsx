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
import { useTranslation } from 'react-i18next';

type Level = 'low' | 'medium' | 'high';

const LEVELS: { key: Level; i18nKey: string; color: string; bg: string }[] = [
  { key: 'low', i18nKey: 'form.danger.levels.low', color: '#15803d', bg: '#dcfce7' },
  { key: 'medium', i18nKey: 'form.danger.levels.medium', color: '#b45309', bg: '#fef3c7' },
  { key: 'high', i18nKey: 'form.danger.levels.high', color: '#b91c1c', bg: '#fee2e2' },
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
  const { t } = useTranslation();
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
    if (!name.trim()) e.name = t('form.danger.nameRequired');
    if (!rezon.trim()) e.rezon = t('form.danger.describeRequired');
    const lat = parseCoord(latitude);
    const lng = parseCoord(longitude);
    if ((latitude.trim() && lat === undefined) || (longitude.trim() && lng === undefined)) {
      e.coords = t('form.danger.coordsInvalid');
    }
    if ((lat !== undefined) !== (lng !== undefined)) {
      e.coords = t('form.danger.coordsPair');
    }
    if (!confirm) e.confirm = t('form.common.verifyError');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setToast({ open: true, severity: 'error', msg: t('form.danger.geoUnavailable') });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocating(false);
        setToast({ open: true, severity: 'success', msg: t('form.danger.geoSuccess') });
      },
      (err) => {
        setLocating(false);
        setToast({ open: true, severity: 'error', msg: err.message || t('form.danger.geoError') });
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
      setToast({ open: true, severity: 'success', msg: t('form.danger.addedToast') });
      window.setTimeout(handleClose, 600);
    } catch (e) {
      console.error(e);
      setToast({ open: true, severity: 'error', msg: t('form.danger.addedError') });
    } finally {
      setSubmitting(false);
    }
  };

  const lat = parseCoord(latitude);
  const lng = parseCoord(longitude);

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <SectionHeader icon={<CrisisAlertRounded sx={{ fontSize: 16 }} />} title={t('form.danger.section.identity')} />

      <Stack spacing={2}>
        <Field
          label={t('form.danger.nameLabel')}
          required
          autoFocus
          placeholder={t('form.danger.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={!!errors.name}
          helperText={errors.name}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Box sx={{ flex: 1 }}>
            <FieldLabel label={t('form.danger.incidentType')} />
            <StyledSelect value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
              <option value="">{t('form.danger.incidentTypePlaceholder')}</option>
              {INCIDENT_TYPES.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`form.danger.incidentTypes.${opt}`)}
                </option>
              ))}
            </StyledSelect>
          </Box>

          <Box sx={{ flex: 1 }}>
            <FieldLabel label={t('form.danger.level')} />
            <Stack direction="row" spacing={1}>
              {LEVELS.map((l) => {
                const active = level === l.key;
                return (
                  <Chip
                    key={l.key}
                    label={t(l.i18nKey)}
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
        title={t('form.danger.section.location')}
        hint={t('form.danger.section.locationHint')}
      />

      <Stack spacing={2}>
        <Field
          label={t('form.danger.addressLabel')}
          placeholder={t('form.danger.addressPlaceholderNew')}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Field
            label={t('form.danger.latitude')}
            placeholder="18.5392"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            inputProps={{ inputMode: 'decimal' }}
            error={!!errors.coords}
          />
          <Field
            label={t('form.danger.longitude')}
            placeholder="-72.3364"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            inputProps={{ inputMode: 'decimal' }}
            error={!!errors.coords}
          />
          <Box sx={{ alignSelf: 'flex-end' }}>
            <Tooltip title={t('form.danger.useMyLocation')}>
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
                {locating ? t('form.danger.locating') : t('form.danger.useMe')}
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

      <SectionHeader icon={<AccessTimeRounded sx={{ fontSize: 16 }} />} title={t('form.danger.section.incidentTime')} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
        <Field
          label={t('form.danger.incidentDateLabel')}
          type="datetime-local"
          value={incidentDate}
          onChange={(e) => setIncidentDate(e.target.value)}
          helperText={t('form.danger.incidentDateHelperNew')}
        />
        <Button
          variant="text"
          onClick={() => setIncidentDate(nowLocalIso())}
          sx={{ height: 42, alignSelf: { xs: 'flex-start', sm: 'flex-end' }, mb: { sm: 3 } }}
        >
          {t('form.danger.now')}
        </Button>
      </Stack>

      <SectionHeader icon={<DescriptionRounded sx={{ fontSize: 16 }} />} title={t('form.danger.section.happened')} />

      <Field
        label={t('form.danger.describeLabel')}
        required
        multiline
        minRows={4}
        maxRows={10}
        placeholder={t('form.danger.describePlaceholder')}
        value={rezon}
        onChange={(e) => setRezon(e.target.value)}
        error={!!errors.rezon}
        helperText={errors.rezon || t('form.viktim.charsCount', { count: rezon.length })}
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
            {t('form.common.verifyTitle')}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('form.common.verifyDangerHint')}
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
        <Tooltip title={t('form.common.help')}>
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
            {t('common.cancel')}
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
            {submitting ? t('form.common.submitting') : t('form.danger.submitNew')}
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
