import * as React from 'react';
import Modal from '@mui/material/Modal';
import Paper from '@mui/material/Paper';
import Backdrop from '@mui/material/Backdrop';
import Fade from '@mui/material/Fade';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

const paperStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: 620 },
  maxWidth: 620,
  maxHeight: '92vh',
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden',
  borderRadius: 3,
  boxShadow:
    '0 30px 60px -25px rgba(15,23,42,0.35), 0 8px 20px -8px rgba(15,23,42,0.18)',
  border: '1px solid rgba(15,23,42,0.06)',
};

const headerStyle = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 2,
  px: { xs: 2.5, sm: 3.5 },
  pt: { xs: 2, sm: 2.5 },
  pb: { xs: 1.5, sm: 2 },
  borderBottom: '1px solid rgba(15,23,42,0.06)',
  bgcolor: '#fff',
  position: 'sticky' as const,
  top: 0,
  zIndex: 1,
};

const bodyStyle = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto' as const,
  overflowX: 'hidden' as const,
  WebkitOverflowScrolling: 'touch' as const,
  px: { xs: 2.5, sm: 3.5 },
  py: { xs: 2.5, sm: 3 },
  '&::-webkit-scrollbar': { width: 8 },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(15,23,42,0.18)',
    borderRadius: 8,
  },
  '&::-webkit-scrollbar-thumb:hover': {
    backgroundColor: 'rgba(15,23,42,0.28)',
  },
  '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
};

export default function ModalComponent({
  children,
  handleClose,
  open,
  title,
}: {
  children: React.ReactNode;
  handleClose: () => void;
  open: boolean;
  title?: React.ReactNode;
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
          sx: {
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(2px)',
          },
        },
      }}
      aria-labelledby="modal-title"
    >
      <Fade in={open}>
        <Paper sx={paperStyle} elevation={0}>
          {title !== undefined && (
            <Box sx={headerStyle}>
              {typeof title === 'string' ? (
                <Typography
                  id="modal-title"
                  variant="h6"
                  sx={{ fontWeight: 700, fontSize: '1.05rem' }}
                >
                  {title}
                </Typography>
              ) : (
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                  {title}
                </Stack>
              )}
              <IconButton
                aria-label="close"
                onClick={handleClose}
                size="small"
                sx={{
                  color: 'text.secondary',
                  '&:hover': { bgcolor: 'rgba(15,23,42,0.06)' },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
          <Box sx={bodyStyle}>{children}</Box>
        </Paper>
      </Fade>
    </Modal>
  );
}
