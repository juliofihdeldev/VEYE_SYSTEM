import Modal from '@mui/material/Modal';
import Paper from '@mui/material/Paper';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: 560 },
  maxWidth: 560,
  maxHeight: '90vh',
  overflow: 'auto',
  p: 3,
  borderRadius: 3,
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

export default function ModalComponent({
  children,
  handleClose,
  open,
}: {
  children: React.ReactNode;
  handleClose: () => void;
  open: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Paper sx={style} elevation={0}>
        {children}
      </Paper>
    </Modal>
  );
}
