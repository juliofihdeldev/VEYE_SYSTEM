import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import { handleGetKidnapping } from '../api';

import { GoogleMap, LoadScript } from '@react-google-maps/api';
const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: 500,
}

const center = {
  lat: 18.50210851,
  lng: -72.28107521
};

let WIND = 'AIzaSyBspHPD1vl1PJOm9koz-wpilPbo15sphV4'

const MyGreatPlace = ({  lat, lng }:any) => (
  <div>
    <h1>

      {lat}
      {lng}
      <img src="https://images.mylawquestions.com/slideshow-mobile-small/female-child-with-hand-over-her-mouth.jpg"
      style={{width: 50, height: 60}}
      />
    </h1>
  </div>)



export default function Maps() {
  let [data, setData] = React.useState<any[]>([]);

  React.useEffect(() => {
    async function getData() {
      const signalKidnapping = await handleGetKidnapping();
      setData(signalKidnapping);
    }
    getData();
  }, []);

  return (
    <Paper sx={{ p: 3, width: '100%', overflow: 'hidden' }} elevation={0}>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h5" component="h2" fontWeight={600} mb={3}>
          Map Kidnapping signal
        </Typography>
        <Box sx={{ borderRadius: 2, overflow: 'hidden', height: 500, width: '100%' }}>
          <LoadScript
        googleMapsApiKey={WIND}
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
            >
              {data.map((item:any) => {
                  return (
                    <MyGreatPlace lat={item.latitude} lng={item.longitude} text={''}
                      key={item.id} />
                  )
                })
              }
          </GoogleMap>
        </LoadScript>
    
  
        </Box>
      </Box>
    </Paper>
  );
}
