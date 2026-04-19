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
import { handleGetKidnapping } from '../api';
import moment from 'moment';
import { useTranslation } from 'react-i18next';

const COLUMN_DEFS: { id: string; minWidth: number; align?: 'left' | 'right' | 'center' }[] = [
  { id: 'zone', minWidth: 170 },
  { id: 'address', minWidth: 70, align: 'left' },
  { id: 'info', minWidth: 200 },
  { id: 'date', minWidth: 70, align: 'left' },
];

export default function Kidnapping() {
  const { t } = useTranslation();
  const [data, setData] = React.useState<any[]>([]);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);


  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  React.useEffect(() => { 
    async function getData() {
      const signalKidnapping = await handleGetKidnapping();
      setData(signalKidnapping)
    }
    getData()
  },[])

  return (
    <Paper sx={{ p: 3, width: '100%', overflow: 'hidden' }} elevation={0}>
      <Box sx={{ width: '100%' }}>
        <Stack direction="row" spacing={2} mb={3} justifyContent="space-between">
          <Typography variant="h5" component="h2" fontWeight={600}>
            {t('kidnapping.title')}
          </Typography>
        </Stack>
      <TableContainer sx={{ width: '100%', minHeight: 400, borderRadius: 2, overflow: 'hidden' }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {COLUMN_DEFS.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {t(`kidnapping.columns.${column.id}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map((row:any) => {
                return (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row?.id}>
                    <TableCell >
                      {row?.zone ?? row?.name ?? '—'}
                    </TableCell>
                    <TableCell >
                      {row?.address ?? '—'}
                    </TableCell>
                    <TableCell >
                      {row?.enfomasyon ?? row?.rezon ?? '—'}
                    </TableCell>
                    <TableCell >
                      {row?.date?.seconds != null ? moment.unix(row.date.seconds).format("MMM Do YY") : "—"}
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

      </Box>
    </Paper>
  );
}