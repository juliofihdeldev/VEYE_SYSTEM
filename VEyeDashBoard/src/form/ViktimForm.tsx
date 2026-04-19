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
  AttachMoneyRounded,
  BadgeRounded,
  BrokenImageRounded,
  CheckCircleRounded,
  DescriptionRounded,
  HelpOutlineRounded,
  LinkRounded,
  PersonOutlineRounded,
  PlaceOutlined,
  WarningAmberRounded,
} from '@mui/icons-material';
import { handleSendViktim } from '../api';
import { Field, FieldLabel } from './Field';
import { useTranslation } from 'react-i18next';

type ViktimType = '' | 'kidnaping' | 'Pedi' | 'byBandi';
type ViktimStatus = '' | 'Captive' | 'Relache';

const TYPE_OPTIONS: { value: ViktimType; i18nKey: string; color: string; bg: string }[] = [
  { value: 'kidnaping', i18nKey: 'viktim.typeChips.kidnaping', color: '#b91c1c', bg: '#fee2e2' },
  { value: 'Pedi', i18nKey: 'viktim.typeChips.pedi', color: '#b45309', bg: '#fef3c7' },
  { value: 'byBandi', i18nKey: 'viktim.typeChips.bandi', color: '#7c3aed', bg: '#ede9fe' },
];

const STATUS_OPTIONS: { value: ViktimStatus; i18nKey: string; color: string; bg: string }[] = [
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

export default function ViktimForm({ handleClose }: { handleClose: () => void }) {
  const { t } = useTranslation();
  const [fullName, setFullName] = React.useState('');
  const [imageSource, setImageSource] = React.useState('');
  const [imgError, setImgError] = React.useState(false);
  const [amount, setAmount] = React.useState('');
  const [status, setStatus] = React.useState<ViktimStatus>('');
  const [zone, setZone] = React.useState('');
  const [type, setType] = React.useState<ViktimType>('');
  const [details, setDetails] = React.useState('');
  const [confirm, setConfirm] = React.useState(false);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<{
    open: boolean;
    severity: 'success' | 'error';
    msg: string;
  }>({ open: false, severity: 'success', msg: '' });

  React.useEffect(() => {
    setImgError(false);
  }, [imageSource]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = t('form.viktim.fullNameRequired');
    if (!details.trim()) e.details = t('form.viktim.detailsRequired');
    if (imageSource.trim() && !/^https?:\/\//i.test(imageSource.trim())) {
      e.imageSource = t('form.viktim.photoInvalid');
    }
    if (amount && Number(amount) < 0) e.amount = t('form.viktim.amountInvalid');
    if (!confirm) e.confirm = t('form.common.verifyError');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const formatAmount = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return new Intl.NumberFormat('fr-HT').format(n);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      fullName: fullName.trim(),
      details: details.trim(),
      imageSource: imageSource.trim() || undefined,
      amount: amount ? Number(amount) : undefined,
      type: type || undefined,
      status: status || undefined,
      zone: zone.trim() || undefined,
      confirm: 'confirme',
      date: new Date(),
    };

    setSubmitting(true);
    try {
      await handleSendViktim(payload);
      setToast({ open: true, severity: 'success', msg: t('form.viktim.addedToast') });
      window.setTimeout(handleClose, 600);
    } catch (e) {
      console.error(e);
      setToast({ open: true, severity: 'error', msg: t('form.viktim.addedError') });
    } finally {
      setSubmitting(false);
    }
  };

  const formattedAmount = formatAmount(amount);
  const showPreview = !!fullName.trim() || !!imageSource.trim();

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
            {t('form.common.verifyHint')}
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
            {submitting ? t('form.common.submitting') : t('form.viktim.submit')}
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
