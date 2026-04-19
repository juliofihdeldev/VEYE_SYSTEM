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
import { useTranslation } from 'react-i18next';

interface Props {
  item: any;
  handleClose: () => void;
  onSaved: () => void;
}

type ViktimType = '' | 'kidnaping' | 'Pedi' | 'byBandi' | 'disparut' | 'bandi-touye';
type ViktimStatus = '' | 'Captive' | 'Relache';

const TYPE_OPTIONS: { value: Exclude<ViktimType, ''>; i18nKey: string; color: string; bg: string }[] = [
  { value: 'kidnaping', i18nKey: 'viktim.typeChips.kidnaping', color: '#b91c1c', bg: '#fee2e2' },
  { value: 'Pedi', i18nKey: 'viktim.typeChips.pedi', color: '#b45309', bg: '#fef3c7' },
  { value: 'byBandi', i18nKey: 'viktim.typeChips.bandi', color: '#7c3aed', bg: '#ede9fe' },
];

const STATUS_OPTIONS: { value: Exclude<ViktimStatus, ''>; i18nKey: string; color: string; bg: string }[] = [
  { value: 'Captive', i18nKey: 'viktim.statusFilters.captive', color: '#b91c1c', bg: '#fee2e2' },
  { value: 'Relache', i18nKey: 'viktim.statusFilters.relache', color: '#15803d', bg: '#dcfce7' },
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
  const { t } = useTranslation();
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
    if (!fullName.trim()) e.fullName = t('form.viktim.fullNameRequired');
    if (!details.trim()) e.details = t('form.viktim.detailsRequired');
    if (imageSource.trim() && !/^https?:\/\//i.test(imageSource.trim())) {
      e.imageSource = t('form.viktim.photoInvalid');
    }
    if (amount && Number(amount) < 0) e.amount = t('form.viktim.amountInvalid');
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
      setToast({ open: true, severity: 'success', msg: t('form.viktim.updatedToast') });
      onSaved();
      window.setTimeout(handleClose, 500);
    } catch (e) {
      console.error(e);
      setToast({ open: true, severity: 'error', msg: t('form.viktim.updatedError') });
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
              {fullName.trim() || t('form.viktim.previewName')}
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
              {type &&
                (() => {
                  const opt = TYPE_OPTIONS.find((x) => x.value === type);
                  if (!opt) return null;
                  return (
                    <Chip
                      size="small"
                      label={t(opt.i18nKey)}
                      sx={{
                        bgcolor: opt.bg,
                        color: opt.color,
                        fontWeight: 700,
                        fontSize: 10,
                        height: 20,
                      }}
                    />
                  );
                })()}
              {status &&
                (() => {
                  const opt = STATUS_OPTIONS.find((x) => x.value === status);
                  if (!opt) return null;
                  return (
                    <Chip
                      size="small"
                      label={t(opt.i18nKey)}
                      sx={{
                        bgcolor: opt.bg,
                        color: opt.color,
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
                {t('form.viktim.ransomLabel')}
              </Typography>
              <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>
                {formattedAmount} HTG
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <SectionHeader icon={<PersonOutlineRounded sx={{ fontSize: 16 }} />} title={t('form.viktim.section.identity')} />

      <Stack spacing={2}>
        <Field
          label={t('form.viktim.fullNameLabel')}
          required
          autoFocus
          placeholder={t('form.viktim.fullNamePlaceholder')}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={!!errors.fullName}
          helperText={errors.fullName}
        />

        <Field
          label={t('form.viktim.photoLabel')}
          placeholder="https://..."
          value={imageSource}
          onChange={(e) => setImageSource(e.target.value)}
          error={!!errors.imageSource}
          helperText={errors.imageSource || t('form.viktim.photoHelper')}
          startAdornment={
            <InputAdornment position="start">
              <LinkRounded fontSize="small" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          }
        />
      </Stack>

      <SectionHeader icon={<BadgeRounded sx={{ fontSize: 16 }} />} title={t('form.viktim.section.classification')} />

      <Stack spacing={2}>
        <Box>
          <FieldLabel label={t('form.viktim.type')} />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {TYPE_OPTIONS.map((opt) => {
              const active = type === opt.value;
              return (
                <Chip
                  key={opt.value}
                  label={t(opt.i18nKey)}
                  onClick={() => setType(active ? '' : opt.value)}
                  sx={{
                    flex: { xs: '1 1 30%', sm: '0 0 auto' },
                    minWidth: 100,
                    borderRadius: '10px',
                    height: 40,
                    fontWeight: 700,
                    fontSize: 13,
                    bgcolor: active ? opt.bg : '#f8fafc',
                    color: active ? opt.color : 'text.secondary',
                    border: '1px solid',
                    borderColor: active ? `${opt.color}55` : '#e2e8f0',
                    '&:hover': { bgcolor: active ? opt.bg : '#f1f5f9' },
                  }}
                />
              );
            })}
          </Stack>
        </Box>

        <Box>
          <FieldLabel label={t('form.viktim.status')} />
          <Stack direction="row" spacing={1}>
            {STATUS_OPTIONS.map((opt) => {
              const active = status === opt.value;
              return (
                <Chip
                  key={opt.value}
                  label={t(opt.i18nKey)}
                  onClick={() => setStatus(active ? '' : opt.value)}
                  sx={{
                    flex: 1,
                    borderRadius: '10px',
                    height: 40,
                    fontWeight: 700,
                    fontSize: 13,
                    bgcolor: active ? opt.bg : '#f8fafc',
                    color: active ? opt.color : 'text.secondary',
                    border: '1px solid',
                    borderColor: active ? `${opt.color}55` : '#e2e8f0',
                    '&:hover': { bgcolor: active ? opt.bg : '#f1f5f9' },
                  }}
                />
              );
            })}
          </Stack>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Field
            label={t('form.viktim.amountLabel')}
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
            label={t('form.viktim.zoneLabel')}
            placeholder={t('form.viktim.zonePlaceholder')}
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

      <SectionHeader icon={<AccessTimeRounded sx={{ fontSize: 16 }} />} title={t('form.viktim.section_incidentTime')} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
        <Field
          label={t('form.viktim.incidentDate')}
          type="datetime-local"
          value={incidentDate}
          onChange={(e) => setIncidentDate(e.target.value)}
          helperText={t('form.viktim.incidentDateHelperEmptyKeep')}
        />
        <Button
          variant="text"
          onClick={() => setIncidentDate(nowLocalIso())}
          sx={{ height: 42, alignSelf: { xs: 'flex-start', sm: 'flex-end' }, mb: { sm: 3 } }}
        >
          {t('form.viktim.now')}
        </Button>
      </Stack>

      <SectionHeader icon={<DescriptionRounded sx={{ fontSize: 16 }} />} title={t('form.viktim.section.explanation')} />

      <Field
        label={t('form.viktim.detailsLabel')}
        required
        multiline
        minRows={4}
        maxRows={10}
        placeholder={t('form.viktim.detailsPlaceholder')}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        error={!!errors.details}
        helperText={errors.details || t('form.viktim.charsCount', { count: details.length })}
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
            {submitting ? t('form.viktim.savingEdit') : t('form.viktim.submitEdit')}
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
