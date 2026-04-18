import * as React from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccessTimeRounded,
  AttachMoneyRounded,
  BadgeRounded,
  BrokenImageRounded,
  DescriptionRounded,
  HelpOutlineRounded,
  LinkRounded,
  PersonOutlineRounded,
  PlaceOutlined,
} from '@mui/icons-material';
import { handleUpdatedViktim } from '../api';
import { Field, FieldLabel } from './Field';

interface Props {
  item: any;
  handleClose: () => void;
  onSaved: () => void;
}

type ViktimType = '' | 'kidnaping' | 'Pedi' | 'byBandi' | 'disparut' | 'bandi-touye';
type ViktimStatus = '' | 'Captive' | 'Relache';

const TYPE_OPTIONS: { value: Exclude<ViktimType, ''>; label: string; color: string; bg: string }[] = [
  { value: 'kidnaping', label: 'Kidnaping', color: '#b91c1c', bg: '#fee2e2' },
  { value: 'Pedi', label: 'Pedi', color: '#b45309', bg: '#fef3c7' },
  { value: 'byBandi', label: 'Bandi', color: '#7c3aed', bg: '#ede9fe' },
];

const STATUS_OPTIONS: { value: Exclude<ViktimStatus, ''>; label: string; color: string; bg: string }[] = [
  { value: 'Captive', label: 'Captive', color: '#b91c1c', bg: '#fee2e2' },
  { value: 'Relache', label: 'Relache', color: '#15803d', bg: '#dcfce7' },
];

const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return 'V';
  return parts.map((p) => p[0]).join('').toUpperCase();
};

const colorPalette = ['#a78bfa', '#f59e0b', '#fb923c', '#34d399', '#f472b6', '#60a5fa', '#ef4444', '#0ea5e9'];
const colorFor = (s: string) => {
  if (!s) return colorPalette[0];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % colorPalette.length;
  return colorPalette[h];
};

function dateToDatetimeLocal(raw: unknown): string {
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

export default function EditViktimForm({ item, handleClose, onSaved }: Props) {
  const [fullName, setFullName] = React.useState<string>(item?.fullName ?? item?.full_name ?? '');
  const [imageSource, setImageSource] = React.useState<string>(
    item?.imageSource ?? item?.image_source ?? '',
  );
  const [imgError, setImgError] = React.useState(false);
  const [amount, setAmount] = React.useState<string>(
    item?.amount != null ? String(item.amount) : '',
  );
  const [status, setStatus] = React.useState<ViktimStatus>((item?.status as ViktimStatus) ?? '');
  const [zone, setZone] = React.useState<string>(item?.zone ?? item?.city ?? '');
  const [type, setType] = React.useState<ViktimType>((item?.type as ViktimType) ?? '');
  const [details, setDetails] = React.useState<string>(item?.details ?? '');
  const [incidentDate, setIncidentDate] = React.useState<string>(
    () => dateToDatetimeLocal(item?.date),
  );

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<{
    open: boolean;
    severity: 'success' | 'error';
    msg: string;
  }>({ open: false, severity: 'success', msg: '' });

  React.useEffect(() => {
    setFullName(item?.fullName ?? item?.full_name ?? '');
    setImageSource(item?.imageSource ?? item?.image_source ?? '');
    setAmount(item?.amount != null ? String(item.amount) : '');
    setStatus((item?.status as ViktimStatus) ?? '');
    setZone(item?.zone ?? item?.city ?? '');
    setType((item?.type as ViktimType) ?? '');
    setDetails(item?.details ?? '');
    setIncidentDate(dateToDatetimeLocal(item?.date));
    setErrors({});
    setImgError(false);
  }, [item?.id]);

  const formatAmount = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return new Intl.NumberFormat('fr-HT').format(n);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Non viktim lan obligatwa.';
    if (!details.trim()) e.details = 'Bay yon eksplikasyon.';
    if (imageSource.trim() && !/^https?:\/\//i.test(imageSource.trim())) {
      e.imageSource = 'Lyen foto a dwe kòmanse ak http(s)://';
    }
    if (amount && Number(amount) < 0) e.amount = 'Kantite a pa ka negatif.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const fields: Record<string, unknown> = {
      fullName: fullName.trim(),
      details: details.trim(),
      imageSource: imageSource.trim() || null,
      amount: amount ? amount.trim() : null,
      type: type || null,
      status: status || null,
      zone: zone.trim() || null,
    };
    if (incidentDate.trim()) {
      fields.date = new Date(incidentDate.trim()).toISOString();
    }

    setSubmitting(true);
    try {
      await handleUpdatedViktim(item.id, fields);
      setToast({ open: true, severity: 'success', msg: 'Mizajou anrejistre.' });
      onSaved();
      window.setTimeout(handleClose, 500);
    } catch (e) {
      console.error(e);
      setToast({ open: true, severity: 'error', msg: 'Echèk nan mizajou. Eseye ankò.' });
    } finally {
      setSubmitting(false);
    }
  };

  const formattedAmount = formatAmount(amount);
  const showPreview = !!fullName.trim() || !!imageSource.trim();

  React.useEffect(() => {
    setImgError(false);
  }, [imageSource]);

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%' }}>
      {showPreview && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            mb: 1,
            borderRadius: 2,
            bgcolor: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          {imageSource.trim() && !imgError ? (
            <Avatar
              src={imageSource.trim()}
              alt={fullName || 'viktim'}
              sx={{ width: 48, height: 48 }}
              imgProps={{ onError: () => setImgError(true) }}
            />
          ) : imageSource.trim() && imgError ? (
            <Avatar sx={{ width: 48, height: 48, bgcolor: '#fee2e2', color: '#b91c1c' }}>
              <BrokenImageRounded fontSize="small" />
            </Avatar>
          ) : (
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: colorFor(fullName),
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              {initialsOf(fullName)}
            </Avatar>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>
              {fullName.trim() || 'Non viktim lan…'}
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
              {type &&
                (() => {
                  const t = TYPE_OPTIONS.find((x) => x.value === type);
                  if (!t) return null;
                  return (
                    <Chip
                      size="small"
                      label={t.label}
                      sx={{
                        bgcolor: t.bg,
                        color: t.color,
                        fontWeight: 700,
                        fontSize: 10,
                        height: 20,
                      }}
                    />
                  );
                })()}
              {status &&
                (() => {
                  const s = STATUS_OPTIONS.find((x) => x.value === status);
                  if (!s) return null;
                  return (
                    <Chip
                      size="small"
                      label={s.label}
                      sx={{
                        bgcolor: s.bg,
                        color: s.color,
                        fontWeight: 700,
                        fontSize: 10,
                        height: 20,
                      }}
                    />
                  );
                })()}
              {zone.trim() && (
                <Chip
                  size="small"
                  label={zone.trim()}
                  sx={{
                    bgcolor: '#f1f5f9',
                    color: 'text.secondary',
                    fontWeight: 600,
                    fontSize: 10,
                    height: 20,
                  }}
                />
              )}
            </Stack>
          </Box>
          {formattedAmount && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase' }}>
                Ranson
              </Typography>
              <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>
                {formattedAmount} HTG
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <SectionHeader icon={<PersonOutlineRounded sx={{ fontSize: 16 }} />} title="Idantite viktim lan" />

      <Stack spacing={2}>
        <Field
          label="Non a siyati"
          required
          autoFocus
          placeholder="Non konplè viktim lan"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={!!errors.fullName}
          helperText={errors.fullName}
        />

        <Field
          label="Lyen foto"
          placeholder="https://..."
          value={imageSource}
          onChange={(e) => setImageSource(e.target.value)}
          error={!!errors.imageSource}
          helperText={errors.imageSource || 'URL piblik yon foto (opsyonèl).'}
          startAdornment={
            <InputAdornment position="start">
              <LinkRounded fontSize="small" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          }
        />
      </Stack>

      <SectionHeader icon={<BadgeRounded sx={{ fontSize: 16 }} />} title="Klasifikasyon" />

      <Stack spacing={2}>
        <Box>
          <FieldLabel label="Tip viktim" />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {TYPE_OPTIONS.map((t) => {
              const active = type === t.value;
              return (
                <Chip
                  key={t.value}
                  label={t.label}
                  onClick={() => setType(active ? '' : t.value)}
                  sx={{
                    flex: { xs: '1 1 30%', sm: '0 0 auto' },
                    minWidth: 100,
                    borderRadius: '10px',
                    height: 40,
                    fontWeight: 700,
                    fontSize: 13,
                    bgcolor: active ? t.bg : '#f8fafc',
                    color: active ? t.color : 'text.secondary',
                    border: '1px solid',
                    borderColor: active ? `${t.color}55` : '#e2e8f0',
                    '&:hover': { bgcolor: active ? t.bg : '#f1f5f9' },
                  }}
                />
              );
            })}
          </Stack>
        </Box>

        <Box>
          <FieldLabel label="Estati" />
          <Stack direction="row" spacing={1}>
            {STATUS_OPTIONS.map((s) => {
              const active = status === s.value;
              return (
                <Chip
                  key={s.value}
                  label={s.label}
                  onClick={() => setStatus(active ? '' : s.value)}
                  sx={{
                    flex: 1,
                    borderRadius: '10px',
                    height: 40,
                    fontWeight: 700,
                    fontSize: 13,
                    bgcolor: active ? s.bg : '#f8fafc',
                    color: active ? s.color : 'text.secondary',
                    border: '1px solid',
                    borderColor: active ? `${s.color}55` : '#e2e8f0',
                    '&:hover': { bgcolor: active ? s.bg : '#f1f5f9' },
                  }}
                />
              );
            })}
          </Stack>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Field
            label="Kantite kòb mande (HTG)"
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={!!errors.amount}
            helperText={errors.amount || (formattedAmount ? `${formattedAmount} HTG` : undefined)}
            inputProps={{ inputMode: 'numeric', min: 0 }}
            startAdornment={
              <InputAdornment position="start">
                <AttachMoneyRounded fontSize="small" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            }
          />
          <Field
            label="Zòn"
            placeholder="Kote sa pase"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <PlaceOutlined fontSize="small" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            }
          />
        </Stack>
      </Stack>

      <SectionHeader icon={<AccessTimeRounded sx={{ fontSize: 16 }} />} title="Lè ensidan" />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
        <Field
          label="Dat / lè"
          type="datetime-local"
          value={incidentDate}
          onChange={(e) => setIncidentDate(e.target.value)}
          helperText="Vid = pa chanje dat la nan baz la."
        />
        <Button
          variant="text"
          onClick={() => setIncidentDate(nowLocalIso())}
          sx={{ height: 42, alignSelf: { xs: 'flex-start', sm: 'flex-end' }, mb: { sm: 3 } }}
        >
          Kounye a
        </Button>
      </Stack>

      <SectionHeader icon={<DescriptionRounded sx={{ fontSize: 16 }} />} title="Eksplikasyon" />

      <Field
        label="Detay sou ka a"
        required
        multiline
        minRows={4}
        maxRows={10}
        placeholder="Dekri sak pase a ak nenpòt enfòmasyon ki itil…"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        error={!!errors.details}
        helperText={errors.details || `${details.length} karaktè`}
      />

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
            {submitting ? 'Ankou…' : 'Mete ajou'}
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
