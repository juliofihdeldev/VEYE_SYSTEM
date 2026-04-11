import * as React from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Error as ErrorIcon,
  Dangerous as DangerousIcon,
  RawOffTwoTone as KidnapIcon,
  Newspaper as NewsIcon,
  TrendingUp as TrendingIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { handleGetIncidentStats, type IncidentStatsFilters } from "../api";

const statCards = [
  {
    key: "viktim",
    label: "Viktim",
    icon: <ErrorIcon sx={{ fontSize: 32 }} />,
    color: "#ef4444",
  },
  {
    key: "zoneDanger",
    label: "Zone Danger",
    icon: <DangerousIcon sx={{ fontSize: 32 }} />,
    color: "#f59e0b",
  },
  {
    key: "kidnapping",
    label: "Kidnapping",
    icon: <KidnapIcon sx={{ fontSize: 32 }} />,
    color: "#dc2626",
  },
  {
    key: "news",
    label: "News",
    icon: <NewsIcon sx={{ fontSize: 32 }} />,
    color: "#0d9488",
  },
];

export default function StatIncident() {
  const [stats, setStats] = React.useState<{
    totals: { viktim: number; zoneDanger: number; kidnapping: number; news: number };
    viktimByType: Record<string, number>;
    byMonth: { label: string; viktim: number; zoneDanger: number; kidnapping: number }[];
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<IncidentStatsFilters>({ months: 6 });
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  const loadStats = React.useCallback(async () => {
    setLoading(true);
    const f: IncidentStatsFilters = { months: filters.months };
    if (dateFrom) {
      f.dateFrom = Math.floor(new Date(dateFrom + "T00:00:00").getTime() / 1000);
    }
    if (dateTo) {
      f.dateTo = Math.floor(new Date(dateTo + "T23:59:59").getTime() / 1000);
    }
    const data = await handleGetIncidentStats(f);
    setStats(data as any);
    setLoading(false);
  }, [filters.months, dateFrom, dateTo]);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleResetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setFilters({ months: 6 });
  };

  if (loading || !stats) {
    return (
      <Paper sx={{ p: 3, width: "100%", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography color="text.secondary">Chajman...</Typography>
      </Paper>
    );
  }

  const maxBar = Math.max(
    ...(stats.byMonth?.map((m) => m.viktim + m.zoneDanger + m.kidnapping) || [1]),
    1
  );

  return (
    <Paper sx={{ p: 3, width: "100%", overflow: "hidden" }} elevation={0}>
      <Typography variant="h5" component="h2" fontWeight={600} mb={3}>
        Estatistik Ensidan
      </Typography>

      {/* Data filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap" useFlexGap>
          <FilterIcon color="action" />
          <TextField
            label="Depi"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="Jiska"
            type="date"
            size="small"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Mwa pou grafik</InputLabel>
            <Select
              value={filters.months ?? 6}
              label="Mwa pou grafik"
              onChange={(e) => setFilters({ ...filters, months: Number(e.target.value) })}
            >
              <MenuItem value={3}>3 mwa</MenuItem>
              <MenuItem value={6}>6 mwa</MenuItem>
              <MenuItem value={12}>12 mwa</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" size="small" onClick={handleResetFilters}>
            Reyini
          </Button>
        </Stack>
      </Paper>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map(({ key, label, icon, color }) => (
          <Grid item xs={12} sm={6} md={3} key={key}>
            <Card
              sx={{
                borderRadius: 2,
                borderLeft: `4px solid ${color}`,
                height: "100%",
              }}
              elevation={0}
              variant="outlined"
            >
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      {label}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ color }}>
                      {(stats.totals as any)[key] ?? 0}
                    </Typography>
                  </Box>
                  <Box sx={{ color, opacity: 0.8 }}>{icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Viktim by type */}
      {Object.keys(stats.viktimByType).length > 0 && (
        <Box mb={3}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Viktim pa tip
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {Object.entries(stats.viktimByType).map(([type, count]) => (
              <Paper
                key={type}
                variant="outlined"
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography variant="body2" fontWeight={600} textTransform="capitalize">
                  {type}
                </Typography>
                <Typography variant="body2" color="primary.main" fontWeight={700}>
                  {count}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {/* Monthly trend */}
      {stats.byMonth && stats.byMonth.length > 0 && (
        <Box>
          <Typography variant="h6" fontWeight={600} mb={2}>
            <TrendingIcon sx={{ fontSize: 20, mr: 0.5, verticalAlign: "middle" }} />
            Ensidan pa mwa (dènye {filters.months ?? 6} mwa)
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack spacing={2}>
              {stats.byMonth.map((m) => (
                <Box key={m.label}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="body2" fontWeight={600}>
                      {m.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      V:{m.viktim} Z:{m.zoneDanger} K:{m.kidnapping}
                    </Typography>
                  </Stack>
                  <Stack direction="row" gap={0.5} sx={{ height: 24, borderRadius: 1, overflow: "hidden" }}>
                    {m.viktim > 0 && (
                      <Box
                        sx={{
                          width: `${(m.viktim / maxBar) * 100}%`,
                          minWidth: m.viktim > 0 ? 4 : 0,
                          bgcolor: "error.main",
                          borderRadius: 0.5,
                        }}
                        title={`Viktim: ${m.viktim}`}
                      />
                    )}
                    {m.zoneDanger > 0 && (
                      <Box
                        sx={{
                          width: `${(m.zoneDanger / maxBar) * 100}%`,
                          minWidth: m.zoneDanger > 0 ? 4 : 0,
                          bgcolor: "warning.main",
                          borderRadius: 0.5,
                        }}
                        title={`Zone Danger: ${m.zoneDanger}`}
                      />
                    )}
                    {m.kidnapping > 0 && (
                      <Box
                        sx={{
                          width: `${(m.kidnapping / maxBar) * 100}%`,
                          minWidth: m.kidnapping > 0 ? 4 : 0,
                          bgcolor: "#dc2626",
                          borderRadius: 0.5,
                        }}
                        title={`Kidnapping: ${m.kidnapping}`}
                      />
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Box>
      )}
    </Paper>
  );
}
