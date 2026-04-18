import * as React from 'react';
import { Box, FormHelperText, InputBase, InputBaseProps, Stack, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const baseInputSx = {
  width: '100%',
  borderRadius: '10px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  padding: '10px 14px',
  fontSize: 14,
  fontFamily:
    '"Plus Jakarta Sans", "Roboto", "Helvetica", "Arial", sans-serif',
  color: '#0f172a',
  transition: 'background 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
  outline: 'none',
  appearance: 'none' as const,
};

export const StyledInput = styled(InputBase)(({ theme }) => ({
  ...baseInputSx,
  '&.Mui-focused': {
    background: '#ffffff',
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px ${theme.palette.primary.main}1f`,
  },
  '&.Mui-error': {
    borderColor: theme.palette.error.main,
    background: '#fef2f2',
    boxShadow: `0 0 0 3px ${theme.palette.error.main}1a`,
  },
  '&.Mui-disabled': { opacity: 0.6 },
  '& .MuiInputBase-input, & textarea': {
    padding: 0,
    fontFamily: 'inherit',
    '&::placeholder': { color: '#94a3b8', opacity: 1 },
  },
}));

export const StyledSelect = styled('select')(({ theme }) => ({
  ...baseInputSx,
  cursor: 'pointer',
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 36,
  '&:focus': {
    background: '#ffffff',
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px ${theme.palette.primary.main}1f`,
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
  },
}));

export function FieldLabel({
  label,
  required,
  hint,
}: {
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.75 }}>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 600,
          color: 'text.secondary',
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </Typography>
      {required && (
        <Typography component="span" sx={{ color: 'error.main', fontSize: 12, fontWeight: 700 }}>
          *
        </Typography>
      )}
      {hint && (
        <Typography component="span" sx={{ ml: 0.5, fontSize: 12, color: 'text.disabled' }}>
          · {hint}
        </Typography>
      )}
    </Stack>
  );
}

export type FieldProps = InputBaseProps & {
  label?: React.ReactNode;
  required?: boolean;
  helperText?: React.ReactNode;
  error?: boolean;
  hint?: React.ReactNode;
  trailing?: React.ReactNode;
};

export function Field({
  label,
  required,
  helperText,
  error,
  hint,
  trailing,
  ...input
}: FieldProps) {
  return (
    <Box sx={{ width: '100%' }}>
      {label && <FieldLabel label={label} required={required} hint={hint} />}
      <Stack direction="row" spacing={1} alignItems="stretch">
        <StyledInput
          fullWidth
          error={error}
          {...input}
          sx={{
            ...(input.multiline && { p: '12px 14px' }),
            ...(input.sx as object),
          }}
        />
        {trailing}
      </Stack>
      {helperText && (
        <FormHelperText error={error} sx={{ mt: 0.5, ml: 0.5 }}>
          {helperText}
        </FormHelperText>
      )}
    </Box>
  );
}
