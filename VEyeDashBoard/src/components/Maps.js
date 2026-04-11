import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import Box from '@mui/material/Box';
import { handleGetKidnapping } from '../api';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { GoogleMap, LoadScript } from '@react-google-maps/api';
import { Typography } from '@mui/material';
const containerStyle = {
    width: 1300,
    height: 600
};
const center = {
    lat: 18.50210851,
    lng: -72.28107521
};
let WIND = 'AIzaSyBspHPD1vl1PJOm9koz-wpilPbo15sphV4';
const MyGreatPlace = ({ lat, lng }) => (_jsx("div", { children: _jsxs("h1", { children: [lat, lng, _jsx("img", { src: "https://images.mylawquestions.com/slideshow-mobile-small/female-child-with-hand-over-her-mouth.jpg", style: { width: 50, height: 60 } })] }) }));
export default function Maps() {
    const navigate = useNavigate();
    let [data, setData] = React.useState([]);
    React.useEffect(() => {
        const auth = getAuth();
        onAuthStateChanged(auth, () => {
            // if (!user) navigate("/");
        });
    }, []);
    React.useEffect(() => {
        async function getData() {
            const signalKidnapping = await handleGetKidnapping();
            setData(signalKidnapping);
        }
        getData();
    }, []);
    return (_jsx(Box, { sx: { mt: 3, mb: 2, marginLeft: 8, backgroundColor: '#fff', display: 'flex' }, children: _jsxs(Box, { sx: { width: '100%', overflow: 'hidden' }, children: [_jsx(Typography, { color: "textPrimary", variant: "h4", children: "Map Kidnapping signal" }), _jsx("div", { style: { height: '100vh', width: '100%' }, children: _jsx(LoadScript, { googleMapsApiKey: WIND, children: _jsxs(GoogleMap, { mapContainerStyle: containerStyle, center: center, zoom: 13, children: [data.map((item) => {
                                    return (_jsx(MyGreatPlace, { lat: item.latitude, lng: item.longitude, text: '' }, item.id));
                                }), _jsx("h1", { children: "  " })] }) }) })] }) }));
}
