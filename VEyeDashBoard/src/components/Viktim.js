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
import ViktimForm from '../form/ViktimForm';
import CloseIcon from '@mui/icons-material/Close';
import Add from '@mui/icons-material/Add';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { handleGetViktim, handleDeletedViktim } from '../api';
import { Delete, Edit } from '@mui/icons-material';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import moment from 'moment';
moment.locale('fr');
const columns = [
    { id: 'name', label: ' Nom & Siyati ', minWidth: 170 },
    {
        id: 'address',
        label: 'Address',
        minWidth: 70,
        align: 'left',
        format: (value) => value.toLocaleString('en-US'),
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
        format: (value) => value.toFixed(2),
    },
];
export default function Viktim() {
    React.useEffect(() => {
        const auth = getAuth();
        onAuthStateChanged(auth, () => {
            // if (!user) navigate("/");
        });
    }, []);
    const [open, setOpen] = React.useState(false);
    const [data, setData] = React.useState([]);
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const [type, setType] = React.useState('All');
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    const handleChange = async (event) => {
        setType(event.target.value);
        const viktim = await handleGetViktim(event.target.value);
        setData(viktim);
    };
    const handleChangePage = (newPage) => {
        setPage(newPage);
    };
    const handleDelete = async (item) => {
        handleDeletedViktim(item);
        alert("Ou efase l viktim lan, Mèsi");
        const viktim = await handleGetViktim(type);
        setData(viktim);
    };
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };
    React.useEffect(() => {
        async function getData() {
            const viktim = await handleGetViktim(type);
            setData(viktim);
        }
        getData();
    }, []);
    return (_jsx(Box, { sx: { mt: 3, mb: 2, marginLeft: 8, backgroundColor: '#fff', display: 'flex' }, children: _jsxs(Box, { sx: { width: '100%', overflow: 'hidden' }, children: [_jsxs(Stack, { direction: "row", spacing: 2, marginBottom: 4, justifyContent: "space-between", children: [_jsx(Typography, { variant: "h4", component: "h2", children: "Viktim" }), _jsxs(Stack, { direction: "row", spacing: 2, marginBottom: 4, justifyContent: "space-between", children: [_jsx(Box, { sx: { minWidth: 120 }, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { id: "demo-simple-select-label", children: " Chwazi type viktim" }), _jsxs(Select, { labelId: "demo-simple-select-label", id: "demo-simple-select", value: type, label: "Type", onChange: handleChange, children: [_jsx(MenuItem, { value: "All", children: "Tous" }), _jsx(MenuItem, { value: "kidnaping", children: "Kidnapping" }), _jsx(MenuItem, { value: 'disparut', children: "P\u00E8di" }), _jsx(MenuItem, { value: "bandi-touye", children: "Bandi touye" })] })] }) }), _jsx(Button, { variant: "contained", startIcon: _jsx(Add, {}), onClick: handleOpen, children: "Ajoute  viktim" })] })] }), _jsxs(ModalComponent, { handleClose: handleClose, handleOpen: handleOpen, open: open, children: [_jsxs(Stack, { direction: "row", spacing: 2, justifyContent: "space-between", children: [_jsx(Typography, { variant: "h4", component: "h2", children: "Viktim" }), _jsx(IconButton, { "aria-label": "delete", onClick: handleClose, children: _jsx(CloseIcon, {}) })] }), _jsx(ViktimForm, { handleOpen: handleOpen, open: open, handleClose: handleClose })] }), _jsx(TableContainer, { sx: { width: '100%', minHeight: 500 }, children: _jsxs(Table, { stickyHeader: true, "aria-label": "sticky table", children: [_jsx(TableHead, { children: _jsx(TableRow, { children: columns.map((column) => (_jsx(TableCell, { align: column.align, style: { minWidth: column.minWidth }, children: column.label }, column?.id))) }) }), _jsx(TableBody, { children: data?.map((row) => {
                                    return (_jsxs(TableRow, { hover: true, role: "checkbox", tabIndex: -1, children: [_jsx(TableCell, { children: row?.fullName }), _jsx(TableCell, { children: row?.zone }), _jsx(TableCell, { children: row?.details }), _jsx(TableCell, { children: row?.type }), _jsx(TableCell, { children: row?.status }), _jsx(TableCell, { children: row?.amount }), _jsx(TableCell, { children: moment(row?.date?.seconds).format("MMM Do YY") }), _jsx(TableCell, { children: _jsx(IconButton, { "aria-label": "delete", onClick: () => alert('Contact admin to update information.'), children: _jsx(Edit, {}) }) }), _jsx(TableCell, { children: _jsx(IconButton, { "aria-label": "delete", onClick: () => handleDelete(row), children: _jsx(Delete, {}) }) })] }, row?.id));
                                }) })] }) }), _jsx(TablePagination, { rowsPerPageOptions: [10, 25, 100], component: "div", count: data?.length, rowsPerPage: rowsPerPage, page: page, onPageChange: handleChangePage, onRowsPerPageChange: handleChangeRowsPerPage })] }) }));
}
