import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { Stack } from '@mui/material';
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
import { handleGetALert, handleDeletedAlert } from '../api';
import { Delete, Edit } from '@mui/icons-material';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import DangerForm from '../form/DangerForm';
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
        format: (value) => value.toLocaleString('en-US'),
    },
    {
        id: 'date',
        label: 'Date',
        minWidth: 70,
        align: 'left',
        format: (value) => value.toFixed(2),
    },
];
export default function DangerZone() {
    // const navigate = useNavigate();
    React.useEffect(() => {
        const auth = getAuth();
        onAuthStateChanged(auth, () => {
            // if (!user) navigate("/");
        });
    }, []);
    const [open, setOpen] = React.useState(false);
    const [data, setData] = React.useState([]);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const handleChangePage = (newPage) => {
        setPage(newPage);
    };
    const handleDelete = (item) => {
        handleDeletedAlert(item);
        alert("Merci");
        handleGetALert();
    };
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };
    React.useEffect(() => {
        async function getData() {
            const viktim = await handleGetALert();
            setData(viktim);
        }
        getData();
    }, []);
    return (_jsx(Box, { sx: { mt: 3, mb: 2, marginLeft: 8, backgroundColor: '#fff', display: 'flex' }, children: _jsxs(Box, { sx: { width: '100%', overflow: 'hidden' }, children: [_jsxs(Stack, { direction: "row", spacing: 2, marginBottom: 4, justifyContent: "space-between", children: [_jsx(Typography, { variant: "h4", component: "h2", children: "Zone danger" }), _jsx(Button, { variant: "contained", startIcon: _jsx(Add, {}), onClick: handleOpen, children: "Signaler" })] }), _jsxs(ModalComponent, { handleClose: handleClose, handleOpen: handleOpen, open: open, children: [_jsxs(Stack, { direction: "row", spacing: 2, justifyContent: "space-between", children: [_jsx(Typography, { variant: "h4", component: "h2", children: "Signaler yn bagay" }), _jsx(IconButton, { "aria-label": "delete", onClick: handleClose, children: _jsx(CloseIcon, {}) })] }), _jsx(DangerForm, { handleOpen: handleOpen, open: open, handleClose: handleClose })] }), _jsx(TableContainer, { sx: { width: '100%', minHeight: 500 }, children: _jsxs(Table, { stickyHeader: true, "aria-label": "sticky table", children: [_jsx(TableHead, { children: _jsx(TableRow, { children: columns.map((column) => (_jsx(TableCell, { align: column.align, style: { minWidth: column.minWidth }, children: column.label }, column?.id))) }) }), _jsx(TableBody, { children: data?.map((row) => {
                                    return (_jsxs(TableRow, { hover: true, role: "checkbox", tabIndex: -1, children: [_jsx(TableCell, { children: row?.name }), _jsx(TableCell, { children: row?.rezon }), _jsxs(TableCell, { children: [row?.address, row?.latitude, " ", " / ", " ", row?.longitude] }), _jsx(TableCell, { children: moment(row?.date?.seconds).format("MMM Do YY") }), _jsx(TableCell, { children: _jsx(IconButton, { "aria-label": "delete", onClick: () => alert('Contact admin to update information.'), children: _jsx(Edit, {}) }) }), _jsx(TableCell, { children: _jsx(IconButton, { "aria-label": "delete", onClick: () => handleDelete(row), children: _jsx(Delete, {}) }) })] }, row?.id));
                                }) })] }) }), _jsx(TablePagination, { rowsPerPageOptions: [10, 25, 100], component: "div", count: data?.length, rowsPerPage: rowsPerPage, page: page, onPageChange: handleChangePage, onRowsPerPageChange: handleChangeRowsPerPage })] }) }));
}
