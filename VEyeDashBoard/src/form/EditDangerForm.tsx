import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import { handleUpdatedAlert } from '../api';

interface Props {
  item: any;
  handleClose: () => void;
  onSaved: () => void;
}

function parseOptionalCoord(value: string): number | undefined {
  const t = value.trim().replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Firestore Timestamp / plain `{ seconds }` / Date → value for `datetime-local` */
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

export default function EditDangerForm({ item, handleClose, onSaved }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState(item?.name ?? '');
  const [rezon, setRezon] = React.useState(item?.rezon ?? '');
  const [address, setAddress] = React.useState(item?.address ?? '');
  const [latitude, setLatitude] = React.useState(() => coordToInput(item?.latitude));
  const [longitude, setLongitude] = React.useState(() => coordToInput(item?.longitude));
  const [incidentDate, setIncidentDate] = React.useState(() => firestoreDateToDatetimeLocal(item?.date));

  React.useEffect(() => {
    setName(item?.name ?? '');
    setRezon(item?.rezon ?? '');
    setAddress(item?.address ?? '');
    setLatitude(coordToInput(item?.latitude));
    setLongitude(coordToInput(item?.longitude));
    setIncidentDate(firestoreDateToDatetimeLocal(item?.date));
  }, [item?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rezon.trim()) {
      alert('Non zon lan ak rezon yo obligatwa.');
      return;
    }

    const latEmpty = !latitude.trim();
    const lngEmpty = !longitude.trim();
    const lat = parseOptionalCoord(latitude);
    const lng = parseOptionalCoord(longitude);
    const hasPair = lat !== undefined && lng !== undefined;
    const bothEmpty = latEmpty && lngEmpty;
    if (!hasPair && !bothEmpty) {
      alert('Antre latitid ak longitid tou de, oswa kite yo vid.');
      return;
    }

    const fields: Record<string, unknown> = {
      name: name.trim(),
      rezon: rezon.trim(),
      address: address.trim(),
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
      onSaved();
      handleClose();
    } catch (err) {
      console.error(err);
      alert('Echèk nan mizajou. Eseye ankò.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%', mt: 1 }}>
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            label="Non zon lan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Adrès"
            placeholder="Adrès oswa kote presi"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Latitid"
            placeholder="18.5392"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            inputProps={{ inputMode: 'decimal' }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Longitid"
            placeholder="-72.3364"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            inputProps={{ inputMode: 'decimal' }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Dat / lè"
            type="datetime-local"
            value={incidentDate}
            onChange={(e) => setIncidentDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText="Vid = pa chanje dat la nan baz la."
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            multiline
            rows={4}
            label="Sakap pase"
            value={rezon}
            onChange={(e) => setRezon(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 1 }}>
            <Button variant="outlined" onClick={handleClose} disabled={loading}>
              Anile
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {loading ? 'Ankou...' : 'Mete ajou'}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
