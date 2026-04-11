import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Link, } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, onAuthStateChanged, getAuth } from "firebase/auth";
function Copyright(props) {
    return (_jsxs(Typography, { variant: "body2", color: "text.secondary", align: "center", ...props, children: ['Copyright © ', _jsx(Link, { to: "https://veye.dev/", children: "VEYe" }), ' ', new Date().getFullYear(), '.'] }));
}
const theme = createTheme();
export default function Login() {
    const navigate = useNavigate();
    React.useEffect(() => {
        const auth = getAuth();
        onAuthStateChanged(auth, (user) => {
            if (user)
                navigate("/home");
            console.log("how many time");
        });
    }, []);
    const handleSubmit = (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        let email = data.get('email');
        let password = data.get('password');
        const auth = getAuth();
        signInWithEmailAndPassword(auth, String(email), String(password))
            .then((userCredential) => {
            // Signed in 
            const user = userCredential.user;
            console.log(user);
            // ...
        })
            .catch((error) => {
            const errorMessage = error.message;
            alert(errorMessage);
        });
    };
    return (_jsx(ThemeProvider, { theme: theme, children: _jsxs(Container, { sx: {
                width: '100%',
                marginLeft: '60%',
                backgroundColor: '#fff'
            }, children: [_jsx(CssBaseline, {}), _jsxs(Box, { sx: {
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }, children: [_jsx(Typography, { component: "h1", variant: "h5", children: "Login to VEYe" }), _jsxs(Box, { component: "form", onSubmit: handleSubmit, noValidate: true, sx: { mt: 1 }, children: [_jsx(TextField, { margin: "normal", required: true, fullWidth: true, id: "email", label: "Email Address", name: "email", autoComplete: "email", autoFocus: true }), _jsx(TextField, { margin: "normal", required: true, fullWidth: true, name: "password", label: "Password", type: "password", id: "password", autoComplete: "current-password" }), _jsx(FormControlLabel, { control: _jsx(Checkbox, { value: "remember", color: "primary" }), label: "Remember me" }), _jsx(Button, { type: "submit", fullWidth: true, variant: "contained", sx: { mt: 3, mb: 2 }, children: "Sign In" }), _jsx(Grid, { container: true, children: _jsx(Grid, { item: true, xs: true, children: _jsx(Link, { to: "#", children: "Forgot password?" }) }) })] })] }), _jsx(Copyright, { sx: { mt: 8, mb: 4 } })] }) }));
}
