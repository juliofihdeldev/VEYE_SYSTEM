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
import { handleGetKidnapping } from '../api';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import moment from 'moment';
moment.locale('fr');
const columns = [
    { id: 'zone', label: 'Zone', minWidth: 170 },
    {
        id: 'address',
        label: 'Address',
        minWidth: 70,
        align: 'left',
        format: (value) => value.toLocaleString('en-US'),
    },
    { id: 'enfomasyon', label: 'Enfomasyon', minWidth: 200 },
    {
        id: 'date',
        label: 'Date',
        minWidth: 70,
        align: 'left',
        format: (value) => value.toFixed(2),
    },
];
export default function Kidnapping() {
    const navigate = useNavigate();
    React.useEffect(() => {
        const auth = getAuth();
        onAuthStateChanged(auth, (user) => {
            // if (!user) navigate("/");
        });
    }, []);
    const [data, setData] = React.useState([]);
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const handleChangePage = (newPage) => {
        setPage(newPage);
    };
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };
    React.useEffect(() => {
        async function getData() {
            const signalKidnapping = await handleGetKidnapping();
            setData(signalKidnapping);
        }
        getData();
    }, []);
    return (_jsx(Box, { sx: { mt: 3, mb: 2, marginLeft: 8, backgroundColor: '#fff', display: 'flex' }, children: _jsxs(Box, { sx: { width: '100%', overflow: 'hidden' }, children: [_jsx(Stack, { direction: "row", spacing: 2, marginBottom: 4, justifyContent: "space-between", children: _jsx(Typography, { variant: "h4", component: "h2", children: "Signal kidnaping" }) }), _jsx(TableContainer, { sx: { width: '100%', minHeight: 500 }, children: _jsxs(Table, { stickyHeader: true, "aria-label": "sticky table", children: [_jsx(TableHead, { children: _jsx(TableRow, { children: columns.map((column) => (_jsx(TableCell, { align: column?.align, style: { minWidth: column.minWidth }, children: column.label }, column?.id))) }) }), _jsx(TableBody, { children: data?.map((row) => {
                                    return (_jsxs(TableRow, { hover: true, role: "checkbox", tabIndex: -1, children: [_jsx(TableCell, { children: row?.address }), _jsxs(TableCell, { children: [JSON.parse(row?.full_address)?.county, " ", ' ', JSON.parse(row?.full_address)?.city, " ", ' ', JSON.parse(row?.full_address)?.street] }), _jsxs(TableCell, { children: [row?.latitude, " / ", row?.longitude] }), _jsx(TableCell, { children: moment(row?.data?.seconds).format("MMM Do YY") })] }, row?.id));
                                }) })] }) }), _jsx(TablePagination, { rowsPerPageOptions: [10, 25, 100], component: "div", count: data?.length, rowsPerPage: rowsPerPage, page: page, onPageChange: handleChangePage, onRowsPerPageChange: handleChangeRowsPerPage })] }) }));
}
