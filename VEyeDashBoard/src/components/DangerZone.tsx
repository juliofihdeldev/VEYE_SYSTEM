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
import CloseIcon from '@mui/icons-material/Close';
import Add from '@mui/icons-material/Add';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { handleGetALert, handleDeletedAlert } from '../api';
import { Delete, Edit } from '@mui/icons-material';
import ConfirmDialog from './ConfirmDialog';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import DangerForm from '../form/DangerForm';
import EditDangerForm from '../form/EditDangerForm';
import moment from 'moment';
moment.locale('fr');

const columns = [
  {
    id: 'name', label: 'Zone',
    align: 'left',
    minWidth: 170
  },
  {
    id: 'rezon', label: 'Rezon',
    align: 'left',
    minWidth: 100
  },
  {
    id: 'address',
    label: 'Address',
    minWidth: 100,
    align: 'left',
    format: (value: number) => value.toLocaleString('en-US'),
  },
  {
    id: 'date',
    label: 'Date',
    minWidth: 70,
    align: 'left',
    format: (value: number) => value.toFixed(2),
  },

];

export default function DangerZone() {
  // const navigate = useNavigate();

  React.useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, () => {

      // if (!user) navigate("/");
    });
  }, [])

  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const filteredData = React.useMemo(() => {
    let result = data || [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (row: any) =>
          (row?.name || '').toLowerCase().includes(q) ||
          (row?.rezon || '').toLowerCase().includes(q) ||
          (row?.address || '').toLowerCase().includes(q) ||
          String(row?.latitude || '').includes(q) ||
          String(row?.longitude || '').includes(q)
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime() / 1000;
      result = result.filter((row: any) => (row?.date?.seconds ?? 0) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() / 1000 + 86399;
      result = result.filter((row: any) => (row?.date?.seconds ?? 0) <= to);
    }
    return result;
  }, [data, search, dateFrom, dateTo]);

  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const paginatedData = React.useMemo(
    () => filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredData, page, rowsPerPage]
  );

  const [editItem, setEditItem] = React.useState<any>(null);

  const handleEditClick = (item: any) => setEditItem(item);
  const handleEditClose = () => setEditItem(null);
  const handleEditSaved = async () => {
    const list = await handleGetALert();
    setData(list ?? []);
  };

  const [deleteConfirm, setDeleteConfirm] = React.useState<{ open: boolean; item: any }>({ open: false, item: null });

  const handleDeleteClick = (item: any) => {
    setDeleteConfirm({ open: true, item });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.item) return;
    await handleDeletedAlert(deleteConfirm.item);
    setDeleteConfirm({ open: false, item: null });
    const list = await handleGetALert();
    setData(list ?? []);
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
      const viktim = await handleGetALert();
      setData(viktim ?? [])
    }
    getData()
  }, [])


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
            Zone danger
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpen}
            sx={{ borderRadius: 2, alignSelf: { xs: 'stretch', sm: 'center' } }}
          >
            Signaler
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems={{ sm: 'center' }}>
          <TextField
            placeholder="Chache zon, rezon, adrès..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            size="small"
            sx={{ maxWidth: 360 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="De"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="Jiska"
            type="date"
            size="small"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          {(dateFrom || dateTo) && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => { setDateFrom(''); setDateTo(''); setPage(0); }}
            >
              Efase filtre
            </Button>
          )}
        </Stack>

        <ModalComponent handleClose={handleClose} open={open}>
          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Typography variant="h4" component="h2">
              Signaler yn bagay
            </Typography>
            <IconButton aria-label="delete" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <DangerForm handleClose={handleClose} />
        </ModalComponent>

        <ModalComponent handleClose={handleEditClose} open={!!editItem}>
          <Stack direction="row" spacing={2} justifyContent="space-between" mb={2}>
            <Typography variant="h5" component="h2" fontWeight={600}>
              Modifye zon danje
            </Typography>
            <IconButton aria-label="close" onClick={handleEditClose}>
              <CloseIcon />
            </IconButton>
          </Stack>
          {editItem && (
            <EditDangerForm
              item={editItem}
              handleClose={handleEditClose}
              onSaved={handleEditSaved}
            />
          )}
        </ModalComponent>

        <TableContainer sx={{ width: '100%', minHeight: 400, borderRadius: 2, overflow: 'hidden' }}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
                {columns.map((column: any) => (
                  <TableCell
                    key={column?.id}
                    align={column.align}
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
                      {row?.name}
                    </TableCell>

                    <TableCell >
                      {row?.rezon}
                    </TableCell>

                    <TableCell >
                      {row?.address}
                      <br />
                      latitude: {row?.latitude} <br /> longitude: {row?.longitude}
                    </TableCell>

                    <TableCell >


                      {moment((row?.date?.seconds ?? 0) * 1000).format("MMM Do YY")}

                    </TableCell>

                    <TableCell>
                      <IconButton aria-label="edit" onClick={() => handleEditClick(row)}>
                        <Edit />
                      </IconButton>
                    </TableCell>

                    <TableCell >
                      <IconButton
                        aria-label="delete"
                        onClick={() => handleDeleteClick(row)}
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
          title="Efase zon danje"
          message="Ou sèten ou vle efase zon danje sa a? Aksyon sa a pa ka defèt."
          confirmLabel="Efase"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      </Box>
    </Paper>
  );
}
