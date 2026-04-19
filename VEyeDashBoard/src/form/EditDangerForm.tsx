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
  CrisisAlertRounded,
  DescriptionRounded,
  GpsFixedRounded,
  HelpOutlineRounded,
  MyLocationRounded,
  PlaceOutlined,
} from '@mui/icons-material';
import { handleUpdatedAlert } from '../api';
import { Field, FieldLabel, StyledSelect } from './Field';
import { useTranslation } from 'react-i18next';

interface Props {
  item: any;
  handleClose: () => void;
  onSaved: () => void;
}

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

function parseOptionalCoord(value: string): number | undefined {
  const t = value.trim().replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function firestoreDateToDatetimeLocal(raw: unknown): string {
  if (raw == null) return '';
  let ms: number | null = null;
  const d = raw as { seconds?: number; nanoseconds?: number; toDate?: () => Date };
  if (typeof d.seconds === 'number') {
    ms = d.seconds * 1000 + Math.floor((d.nanoseconds ?? 0) / 1e6);
  } else if (typeof d.toDate === 'function') {
    ms = d.toDate().getTime();
  } else if (raw instanceof Date) {
    ms = raw.getTime();
  } else if (typeof raw === 'string') {
    const t = new Date(raw).getTime();
    if (!Number.isNaN(t)) ms = t;
  }
  if (ms == null || Number.isNaN(ms)) return '';
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function coordToInput(value: unknown): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '';
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

export default function EditDangerForm({ item, handleClose, onSaved }: Props) {
  const { t } = useTranslation();
  const [name, setName] = React.useState<string>(item?.name ?? '');
  const [rezon, setRezon] = React.useState<string>(item?.rezon ?? '');
  const [address, setAddress] = React.useState<string>(item?.address ?? '');
  const [latitude, setLatitude] = React.useState<string>(() => coordToInput(item?.latitude));
  const [longitude, setLongitude] = React.useState<string>(() => coordToInput(item?.longitude));
  const [incidentDate, setIncidentDate] = React.useState<string>(
    () => firestoreDateToDatetimeLocal(item?.date),
  );
  const [level, setLevel] = React.useState<Level>(
    (item?.level as Level) || 'medium',
  );
  const [incidentType, setIncidentType] = React.useState<string>(item?.incident_type ?? '');

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [locating, setLocating] = React.useState(false);
  const [toast, setToast] = React.useState<{
    open: boolean;
    severity: 'success' | 'error';
    msg: string;
  }>({ open: false, severity: 'success', msg: '' });

  React.useEffect(() => {
    setName(item?.name ?? '');
    setRezon(item?.rezon ?? '');
    setAddress(item?.address ?? '');
    setLatitude(coordToInput(item?.latitude));
    setLongitude(coordToInput(item?.longitude));
    setIncidentDate(firestoreDateToDatetimeLocal(item?.date));
    setLevel((item?.level as Level) || 'medium');
    setIncidentType(item?.incident_type ?? '');
    setErrors({});
  }, [item?.id]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('form.danger.nameRequired');
    if (!rezon.trim()) e.rezon = t('form.danger.describeRequired');
    const latEmpty = !latitude.trim();
    const lngEmpty = !longitude.trim();
    const lat = parseOptionalCoord(latitude);
    const lng = parseOptionalCoord(longitude);
    const hasPair = lat !== undefined && lng !== undefined;
    const bothEmpty = latEmpty && lngEmpty;
    if (!hasPair && !bothEmpty) {
      e.coords = t('form.danger.coordsPair');
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const lat = parseOptionalCoord(latitude);
    const lng = parseOptionalCoord(longitude);
    const hasPair = lat !== undefined && lng !== undefined;
    const bothEmpty = !latitude.trim() && !longitude.trim();

    const fields: Record<string, unknown> = {
      name: name.trim(),
      rezon: rezon.trim(),
      address: address.trim(),
      level,
      incident_type: incidentType || null,
    };

    if (incidentDate.trim()) {
      fields.date = new Date(incidentDate.trim()).toISOString();
    }

    if (hasPair) {
      fields.latitude = lat;
      fields.longitude = lng;
    } else if (bothEmpty) {
      fields.latitude = null;
      fields.longitude = null;
    }

    setLoading(true);
    try {
      await handleUpdatedAlert(item.id, fields);
      setToast({ open: true, severity: 'success', msg: t('form.danger.updatedToast') });
      onSaved();
      window.setTimeout(handleClose, 500);
    } catch (err) {
      console.error(err);
      setToast({ open: true, severity: 'error', msg: t('form.danger.updatedError') });
    } finally {
      setLoading(false);
    }
  };

  const lat = parseOptionalCoord(latitude);
  const lng = parseOptionalCoord(longitude);

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
          placeholder={t('form.danger.addressPlaceholderEdit')}
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
          helperText={t('form.danger.incidentDateHelperEdit')}
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
            disabled={loading}
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
            disabled={loading}
            startIcon={
              loading ? <CircularProgress size={16} thickness={5} sx={{ color: '#fff' }} /> : null
            }
            sx={{ minWidth: 140 }}
          >
            {loading ? t('form.viktim.savingEdit') : t('form.danger.submit')}
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
