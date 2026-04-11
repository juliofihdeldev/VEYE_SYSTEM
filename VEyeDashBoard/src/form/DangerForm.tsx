import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

import { handleSendAlert } from '../api';

function parseOptionalCoord(value: FormDataEntryValue | null): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

export default function DangerForm({ handleClose }: { handleClose: () => void }) {
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!formData.get('confirm')) {
      alert('Fo kroche avan');
      return;
    }
    if (!formData.get('name') || !formData.get('rezon')) {
      alert('Fo di sak pase an epi non zon lan');
      return;
    }

    const incidentDateRaw = String(formData.get('incidentDate') ?? '').trim();
    const date = incidentDateRaw ? new Date(incidentDateRaw) : new Date();

    const latitude = parseOptionalCoord(formData.get('latitude'));
    const longitude = parseOptionalCoord(formData.get('longitude'));
    if (
      (latitude !== undefined && longitude === undefined) ||
      (longitude !== undefined && latitude === undefined)
    ) {
      alert('Antre latitid ak longitid tou de, oswa kite yo vid.');
      return;
    }

    const address = String(formData.get('address') ?? '').trim();

    const data = {
      name: formData.get('name'),
      rezon: formData.get('rezon'),
      address: address || undefined,
      date,
      ...(latitude !== undefined && longitude !== undefined
        ? { latitude, longitude }
        : {}),
      confirm: formData.get('confirm'),
    };

    setSubmitting(true);
    try {
      await handleSendAlert(data);
      alert('Enfomasyon yo antre, merci');
      handleClose();
    } catch (e) {
      console.error(e);
      alert('Echèk nan voye alèt la. Eseye ankò.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <TextField
            name="name"
            required
            fullWidth
            id="name"
            label="Non zon lan"
            placeholder="Antre non zòn lan"
            autoFocus
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            name="address"
            fullWidth
            id="address"
            label="Adrès"
            placeholder="Adrès oswa kote presi (opsyonèl)"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            name="latitude"
            fullWidth
            id="latitude"
            label="Latitid"
            placeholder="18.5392"
            type="text"
            inputProps={{ inputMode: 'decimal' }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="longitude"
            fullWidth
            id="longitude"
            label="Longitid"
            placeholder="-72.3364"
            type="text"
            inputProps={{ inputMode: 'decimal' }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            name="incidentDate"
            fullWidth
            id="incidentDate"
            label="Dat / lè (opsyonèl)"
            type="datetime-local"
            defaultValue=""
            InputLabelProps={{ shrink: true }}
            helperText="Vid = kounye a. Sinon chwazi dat inidan an."
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            multiline
            rows={4}
            required
            fullWidth
            id="rezon"
            label="Sakap pase"
            name="rezon"
            placeholder="Dekri sak pase nan zòn lan"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          >
            <FormControlLabel
              control={<Checkbox value="confirme" color="primary" name="confirm" required />}
              label={
                <Typography variant="body2" color="text.secondary">
                  Mwen si ke m verifye information sa yo avan.
                </Typography>
              }
            />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 1 }}>
            <Button variant="outlined" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'An voye...' : 'Ajouter'}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
