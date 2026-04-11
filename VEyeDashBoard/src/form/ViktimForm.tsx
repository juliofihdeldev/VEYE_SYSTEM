import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

import { handleSendViktim } from '../api';

export default function ViktimForm({ handleClose }: { handleClose: () => void }) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
      fullName: formData.get('fullName'),
      details: formData.get('details'),
      imageSource: formData.get('imageSource'),
      amount: formData.get('amount'),
      type: formData.get('type'),
      status: formData.get('status'),
      zone: formData.get('zone'),
      confirm: formData.get('confirm'),
      date: new Date(),
    };

    if (!formData.get('confirm')) {
      alert('Fò w kroche avan');
      return;
    }
    if (!formData.get('fullName') || !formData.get('details')) {
      alert('Fò w di sak pase an epi non zon lan');
      return;
    }

    handleSendViktim(data);
    alert('Enfomasyon yo antre, merci');
    handleClose();
  };

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <TextField
            name="fullName"
            required
            fullWidth
            id="fullName"
            label="Non a siyati"
            placeholder="Non konplè viktim lan"
            autoFocus
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            name="imageSource"
            fullWidth
            id="imageSource"
            label="Link photo l"
            placeholder="https://..."
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            name="amount"
            type="number"
            fullWidth
            id="amount"
            label="Kantite kob an HTG"
            placeholder="0"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="status-label">Stati lan</InputLabel>
            <Select
              labelId="status-label"
              id="status"
              name="status"
              label="Stati lan"
              defaultValue=""
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="Relache">Relache</MenuItem>
              <MenuItem value="Captive">Captive</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            name="zone"
            fullWidth
            id="zone"
            label="Nom zòn lan"
            placeholder="Kote sa pase"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="type-label">Chwazi type lan</InputLabel>
            <Select
              labelId="type-label"
              id="type"
              name="type"
              label="Chwazi type lan"
              defaultValue=""
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="kidnaping">Kidnapping</MenuItem>
              <MenuItem value="Pedi">Pedi</MenuItem>
              <MenuItem value="byBandi">Bandi</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            multiline
            rows={4}
            required
            fullWidth
            id="details"
            label="Explication"
            name="details"
            placeholder="Dekri enfomasyon yo"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>

        <Grid item xs={12}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          >
            <FormControlLabel
              required
              control={<Checkbox value="confirme" color="primary" name="confirm" />}
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
            <Button variant="outlined" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Ajouter
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
