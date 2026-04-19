import * as React from 'react';
import {
  Alert,
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
  ArticleOutlined,
  BrokenImageRounded,
  CheckCircleRounded,
  DescriptionRounded,
  HelpOutlineRounded,
  ImageOutlined,
  LinkRounded,
  OpenInNewRounded,
  WarningAmberRounded,
} from '@mui/icons-material';
import { handleSendNews } from '../api';
import { Field, FieldLabel } from './Field';
import { useTranslation } from 'react-i18next';

const SOURCES = [
  { value: 'Ayibopost', color: '#0d9488', bg: '#ccfbf1' },
  { value: 'Nouveliste', color: '#1d4ed8', bg: '#dbeafe' },
  { value: 'Le National', color: '#7c3aed', bg: '#ede9fe' },
  { value: 'Loop Haïti', color: '#b45309', bg: '#fef3c7' },
  { value: 'Autre', color: '#475569', bg: '#e2e8f0' },
];

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

export default function NewsForm({ handleClose }: { handleClose: () => void }) {
  const { t } = useTranslation();
  const [source, setSource] = React.useState('');
  const [customSource, setCustomSource] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [imageSource, setImageSource] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [summary, setSummary] = React.useState('');
  const [confirm, setConfirm] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

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

  const isValidUrl = (v: string) => /^https?:\/\//i.test(v.trim());

  const validate = () => {
    const e: Record<string, string> = {};
    const finalSource = source === 'Autre' ? customSource.trim() : source;
    if (!finalSource) e.source = t('form.news.sourceRequired');
    if (!summary.trim()) e.summary = t('form.news.summaryRequired');
    if (url.trim() && !isValidUrl(url)) e.url = t('form.news.urlInvalid');
    if (imageSource.trim() && !isValidUrl(imageSource)) {
      e.imageSource = t('form.news.imageInvalid');
    }
    if (!confirm) e.confirm = t('form.common.verifyError');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    const finalSource = source === 'Autre' ? customSource.trim() : source;

    const payload = {
      source: finalSource,
      title: title.trim() || null,
      imageSource: imageSource.trim() || null,
      url: url.trim() || null,
      summary: summary.trim(),
      confirm: 'confirme',
      date: new Date(),
    };

    setSubmitting(true);
    try {
      await handleSendNews(payload);
      setToast({ open: true, severity: 'success', msg: t('form.news.addedToast') });
      window.setTimeout(handleClose, 600);
    } catch (e) {
      console.error(e);
      setToast({ open: true, severity: 'error', msg: t('form.news.addedError') });
    } finally {
      setSubmitting(false);
    }
  };

  const finalSource = source === 'Autre' ? customSource.trim() : source;
  const showPreview = !!title.trim() || !!summary.trim() || !!imageSource.trim() || !!finalSource;

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%' }}>
      {showPreview && (
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            p: 1.5,
            mb: 1,
            borderRadius: 2,
            bgcolor: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 1.5,
              flexShrink: 0,
              bgcolor: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {imageSource.trim() && !imgError ? (
              <Box
                component="img"
                src={imageSource.trim()}
                alt={title || 'preview'}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setImgError(true)}
              />
            ) : imageSource.trim() && imgError ? (
              <BrokenImageRounded sx={{ color: '#94a3b8' }} />
            ) : (
              <ImageOutlined sx={{ color: '#94a3b8' }} />
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ mb: 0.5 }} flexWrap="wrap" useFlexGap>
              {finalSource &&
                (() => {
                  const s = SOURCES.find((x) => x.value === source) ?? SOURCES[SOURCES.length - 1];
                  return (
                    <Chip
                      size="small"
                      label={finalSource}
                      sx={{
                        bgcolor: s.bg,
                        color: s.color,
                        fontWeight: 700,
                        fontSize: 10,
                        height: 20,
                        letterSpacing: '0.04em',
                      }}
                    />
                  );
                })()}
              {url.trim() && isValidUrl(url) && (
                <Chip
                  size="small"
                  icon={<OpenInNewRounded sx={{ fontSize: '12px !important' }} />}
                  label={t('form.news.validLink')}
                  sx={{
                    bgcolor: '#dcfce7',
                    color: '#15803d',
                    fontWeight: 600,
                    fontSize: 10,
                    height: 20,
                  }}
                />
              )}
            </Stack>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {title.trim() || t('form.news.previewTitle')}
            </Typography>
            <Typography
              sx={{
                fontSize: 12,
                color: 'text.secondary',
                mt: 0.25,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {summary.trim() || t('form.news.previewSummary')}
            </Typography>
          </Box>
        </Box>
      )}

      <SectionHeader icon={<ArticleOutlined sx={{ fontSize: 16 }} />} title={t('form.news.section.sourceTitle')} />

      <Stack spacing={2}>
        <Box>
          <FieldLabel label={t('form.news.sourceLabel')} required />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {SOURCES.map((s) => {
              const active = source === s.value;
              const label = t(`form.sources.${s.value}`);
              return (
                <Chip
                  key={s.value}
                  label={label}
                  onClick={() => setSource(s.value)}
                  sx={{
                    borderRadius: '10px',
                    height: 36,
                    px: 0.5,
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
          {errors.source && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75, ml: 0.5 }}>
              {errors.source}
            </Typography>
          )}
          {source === 'Autre' && (
            <Box sx={{ mt: 1.25 }}>
              <Field
                label={t('form.news.customSourceLabel')}
                placeholder={t('form.news.customSourcePlaceholder')}
                value={customSource}
                onChange={(e) => setCustomSource(e.target.value)}
              />
            </Box>
          )}
        </Box>

        <Field
          label={t('form.news.title')}
          placeholder={t('form.news.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Stack>

      <SectionHeader
        icon={<LinkRounded sx={{ fontSize: 16 }} />}
        title={t('form.news.section.links')}
        hint={t('form.news.section.linksHint')}
      />

      <Stack spacing={2}>
        <Field
          label={t('form.news.imageUrl')}
          placeholder="https://..."
          value={imageSource}
          onChange={(e) => setImageSource(e.target.value)}
          error={!!errors.imageSource}
          helperText={errors.imageSource}
          startAdornment={
            <InputAdornment position="start">
              <ImageOutlined fontSize="small" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          }
        />

        <Field
          label={t('form.news.url')}
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          error={!!errors.url}
          helperText={errors.url}
          startAdornment={
            <InputAdornment position="start">
              <OpenInNewRounded fontSize="small" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          }
        />
      </Stack>

      <SectionHeader icon={<DescriptionRounded sx={{ fontSize: 16 }} />} title={t('form.news.section.summary')} />

      <Field
        label={t('form.news.summaryLabel')}
        required
        multiline
        minRows={5}
        maxRows={12}
        placeholder={t('form.news.summaryPlaceholder')}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        error={!!errors.summary}
        helperText={errors.summary || t('form.viktim.charsCount', { count: summary.length })}
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
            {t('form.common.verifyNewsTitle')}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('form.common.verifyNewsHint')}
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
            {submitting ? t('form.common.submitting') : t('form.news.submit')}
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
