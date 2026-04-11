import { jsx as _jsx } from "react/jsx-runtime";
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 500,
    bgcolor: 'background.paper',
    border: '1px solid #eee',
    boxShadow: 24,
    p: 4,
};
export default function ModalComponent({ children, handleClose, open }) {
    return (_jsx("div", { children: _jsx(Modal, { open: open, onClose: handleClose, "aria-labelledby": "modal-modal-title", "aria-describedby": "modal-modal-description", children: _jsx(Box, { sx: style, children: children }) }) }));
}
