import Modal from '@mui/material/Modal';
import Paper from '@mui/material/Paper';
import Backdrop from '@mui/material/Backdrop';
import Fade from '@mui/material/Fade';

const style = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: 620 },
  maxWidth: 620,
  maxHeight: '92vh',
  overflow: 'auto',
  p: { xs: 2.5, sm: 3.5 },
  borderRadius: 3,
  boxShadow: '0 30px 60px -25px rgba(15,23,42,0.35), 0 8px 20px -8px rgba(15,23,42,0.18)',
  border: '1px solid rgba(15,23,42,0.06)',
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
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 250,
          sx: { backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(2px)' },
        },
      }}
      aria-labelledby="modal-title"
    >
      <Fade in={open}>
        <Paper sx={style} elevation={0}>
          {children}
        </Paper>
      </Fade>
    </Modal>
  );
}
