

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
import ModalComponent from './Modal';
import CloseIcon from '@mui/icons-material/Close';
import Add from '@mui/icons-material/Add';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { handleGetNews, handleDeletedNews } from '../api';
import { Delete } from '@mui/icons-material';
import ConfirmDialog from './ConfirmDialog';
import moment from 'moment';
import NewsForm from '../form/NewsForm';
moment.locale('fr');

const columns= [

  { id: '', label: '', minWidth: 170 },
  { id: 'source', label: 'Source', minWidth: 170 },
  { id: 'title', label: 'Title', minWidth: 170 },
  {
    id: 'summary',
    label: 'Summary',
    minWidth: 170,
    align: 'left',
    format: (value: number) => value.toLocaleString('en-US'),
  },
  { id: 'url', label: 'url', minWidth: 200 },
  {
    id: 'date',
    label: 'Date',
    minWidth: 70,
    align: 'left',
    format: (value: number) => value.toFixed(2),
  },
  
];

export default function News() {
  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState<any[]>([]);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);


  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false);


  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const [deleteConfirm, setDeleteConfirm] = React.useState<{ open: boolean; item: any }>({ open: false, item: null });

  const handleDeleteClick = (item: any) => {
    setDeleteConfirm({ open: true, item });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.item) return;
    await handleDeletedNews(deleteConfirm.item);
    setDeleteConfirm({ open: false, item: null });
    const news = await handleGetNews();
    setData(news);
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
      const news = await handleGetNews();
      setData(news)
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
            News
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpen}
            sx={{ borderRadius: 2, alignSelf: { xs: 'stretch', sm: 'center' } }}
          >
            Ajoute News
          </Button>
        </Stack>
    
      <ModalComponent handleClose={handleClose} open={open}>
          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Typography variant="h4" component="h2">
            News
            </Typography>
          <IconButton aria-label="delete"
           onClick={handleClose}
          >
            <CloseIcon />
            </IconButton>
          </Stack>
          <NewsForm handleClose={handleClose}/>
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
            {data?.map((row:any) => {
                return (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row?.id}>
                       <TableCell >
                      <img src={row?.imageSource}  style={{width:100}}/>
                    </TableCell>
                    <TableCell >
                      {row?.source}
                    </TableCell>

                    <TableCell >
                      {row?.title}
                    </TableCell>
                 

                    <TableCell >
                      {row?.summary}
                    </TableCell>

                    <TableCell >
                      {row?.url}
                    </TableCell>
 
                    <TableCell >
                      {row?.date?.seconds != null ? moment.unix(row.date.seconds).format("MMM Do YY") : "—"}
                    </TableCell>

                    <TableCell >
                      <IconButton
                        aria-label="delete"
                        onClick={()=>handleDeleteClick(row)}
                      >
                        <Delete  />
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
        count={data?.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Efase news"
        message="Ou sèten ou vle efase news sa a? Aksyon sa a pa ka defèt."
        confirmLabel="Efase"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
      </Box>
    </Paper>
  );
}