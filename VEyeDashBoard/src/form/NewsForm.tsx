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

import { handleSendNews } from '../api';

export default function NewsForm({ handleClose }: { handleClose: () => void }) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
      source: formData.get('source'),
      title: formData.get('title'),
      imageSource: formData.get('imageSource'),
      url: formData.get('url'),
      summary: formData.get('summary'),
      confirm: formData.get('confirm'),
      date: new Date(),
    };

    if (!formData.get('confirm')) {
      alert('Fò w kroche avan');
      return;
    }
    if (!formData.get('source') || !formData.get('summary')) {
      alert('Tous les champs sont obligatoires');
      return;
    }

    handleSendNews(data);
    alert('Enfomasyon yo antre, merci');
    handleClose();
  };

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="news-source-label">Source</InputLabel>
            <Select
              labelId="news-source-label"
              id="news-source"
              name="source"
              label="Source"
              defaultValue=""
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="Ayibopost">Ayibopost</MenuItem>
              <MenuItem value="Nouveliste">Nouveliste</MenuItem>
              <MenuItem value="Autre">Autre</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            name="title"
            fullWidth
            id="title"
            label="Titre de l'article"
            placeholder="Antre tit article a"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            name="imageSource"
            fullWidth
            id="imageSource"
            label="Link imaj artikel la"
            placeholder="https://..."
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="url"
            fullWidth
            id="url"
            label="Link artikel la"
            placeholder="https://..."
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            multiline
            rows={5}
            required
            fullWidth
            id="summary"
            label="Résumé de l'article"
            name="summary"
            placeholder="Rezime artikel la"
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
