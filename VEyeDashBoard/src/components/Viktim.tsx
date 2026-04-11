import * as React from 'react';
import { Stack } from '@mui/material';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import Box from '@mui/material/Box';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import ModalComponent from './Modal';
import ViktimForm from '../form/ViktimForm';
import ConfirmDialog from './ConfirmDialog';
import CloseIcon from '@mui/icons-material/Close';
import Add from '@mui/icons-material/Add';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { handleGetViktim, handleDeletedViktim } from '../api';
import { Delete, Edit } from '@mui/icons-material';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import moment from 'moment';
moment.locale('fr');



const columns = [
  { id: 'name', label: ' Nom & Siyati ', minWidth: 170 },
  {
    id: 'address',
    label: 'Address',
    minWidth: 70,
    align: 'left',
    format: (value: number) => value.toLocaleString('en-US'),
  },
  { id: 'detils', label: 'Enfomasyon', minWidth: 200 },
  { id: 'type', label: 'Type', minWidth: 200 },
  { id: 'status', label: 'Status', minWidth: 200 },
  { id: 'amount', label: 'Montan kob', minWidth: 200 },
  {
    id: 'date',
    label: 'Date',
    minWidth: 70,
    align: 'left',
    format: (value: number) => value.toFixed(2),
  },
  
];

export default function Viktim() {

  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState<any[]>([]);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [type, setType] = React.useState('All');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [search, setSearch] = React.useState('');

  const getSec = (row: any): number | null => {
    const d = row?.date;
    if (!d) return null;
    if (typeof d?.seconds === 'number') return d.seconds;
    if (typeof d === 'number') return d >= 1e12 ? Math.floor(d / 1000) : d;
    if (typeof d === 'string') return Math.floor(new Date(d).getTime() / 1000);
    return null;
  };

  const filteredData = React.useMemo(() => {
    let result = data || [];
    if (dateFrom || dateTo) {
      result = result.filter((row: any) => {
        const sec = getSec(row);
        if (!sec) return false;
        const rowDate = new Date(sec * 1000);
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          if (rowDate < from) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (rowDate > to) return false;
        }
        return true;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (row: any) =>
          (row?.fullName || '').toLowerCase().includes(q) ||
          (row?.zone || '').toLowerCase().includes(q) ||
          (row?.details || '').toLowerCase().includes(q) ||
          (row?.type || '').toLowerCase().includes(q) ||
          (row?.status || '').toLowerCase().includes(q) ||
          String(row?.amount || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, dateFrom, dateTo, search]);

  const paginatedData = React.useMemo(
    () => filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredData, page, rowsPerPage]
  );

  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false);

  const handleChange = async (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    setType(value);

    const viktim = await handleGetViktim(value);
    setData(viktim)
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const [deleteConfirm, setDeleteConfirm] = React.useState<{ open: boolean; item: any }>({ open: false, item: null });

  const handleDeleteClick = (item: any) => {
    setDeleteConfirm({ open: true, item });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.item) return;
    await handleDeletedViktim(deleteConfirm.item);
    setDeleteConfirm({ open: false, item: null });
    const viktim = await handleGetViktim(type);
    setData(viktim);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ open: false, item: null });
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  React.useEffect(() => { 
    async function getData() {
      const viktim = await handleGetViktim(type);
      setData(viktim)
    }
    getData()
  },[])

  return (
    <Paper sx={{ p: 3, width: '100%', overflow: 'hidden' }} elevation={0}>
      <Box sx={{ width: '100%' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          mb={3}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Typography variant="h5" component="h2" fontWeight={600}>
            Viktim
          </Typography>

          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              label="Depi"
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160, '& .MuiInputBase-root': { borderRadius: 2 } }}
            />
            <TextField
              label="Jiska"
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160, '& .MuiInputBase-root': { borderRadius: 2 } }}
            />
            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel id="demo-simple-select-label">Chwazi type viktim</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={type}
                label="Chwazi type viktim"
                onChange={handleChange}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="All">Tous</MenuItem>
                <MenuItem value="kidnaping">Kidnapping</MenuItem>
                <MenuItem value="disparut">Pèdi</MenuItem>
                <MenuItem value="bandi-touye">Bandi touye</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpen}
              sx={{ borderRadius: 2 }}
            >
              Ajoute viktim
            </Button>
          </Stack>
        </Stack>

        <TextField
          placeholder="Chache non, zon, enfomasyon, tip..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          size="small"
          sx={{ mb: 2, maxWidth: 360 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
    
      <ModalComponent handleClose={handleClose} open={open}>
          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Typography variant="h4" component="h2">
            Viktim
            </Typography>
          <IconButton aria-label="delete"
           onClick={handleClose}
          >
            <CloseIcon />
            </IconButton>
          </Stack>
          <ViktimForm handleClose={handleClose}/>
      </ModalComponent>

      <TableContainer sx={{ width: '100%', minHeight: 400, borderRadius: 2, overflow: 'hidden' }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column?.id}
                  align={(column.align as "left" | "right" | "center") ?? "left"}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData?.map((row: any) => {
                return (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row?.id}>
                    <TableCell >
                      {row?.fullName}
                    </TableCell>

                    
                    <TableCell >
                      {row?.zone}
                    </TableCell>

                    
                    <TableCell >
                      {row?.details}
                    </TableCell>

                 
                    <TableCell >
                      {row?.type}
                    </TableCell>

                    
                    <TableCell >
                      {row?.status}
                    </TableCell>

                    
                    <TableCell >
                      {row?.amount}
                    </TableCell>

                    <TableCell >
                      {moment(row?.date?.seconds).format("MMM Do YY")}
                    </TableCell>

                    <TableCell >
                    <IconButton aria-label="delete"
                      onClick={()=>alert('Contact admin to update information.')}
                    >
                       <Edit />
                    </IconButton>
                    </TableCell>

                    <TableCell >
                      <IconButton
                        aria-label="delete"
                        onClick={()=>handleDeleteClick(row)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={filteredData?.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Efase viktim"
        message="Ou sèten ou vle efase viktim sa a? Aksyon sa a pa ka defèt."
        confirmLabel="Efase"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
      </Box>
    </Paper>
  );
}
