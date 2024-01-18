import './App.css';

import { useRef, useState, useEffect } from 'react';
import Map from './components/Map.jsx';
import Map3D from './components/Map3d.jsx';
import Roboflow from './components/Roboflow.jsx';
import ProjectionMapping from './components/ProjectionMapping';

import { load } from '@loaders.gl/core';
import { JSONLoader } from '@loaders.gl/json';

// import { createSlice, configureStore } from '@reduxjs/toolkit'

const DATA_URL = 'https://raw.githubusercontent.com/Claudio9701/mediamap/separate-components/public/grid_data.geojson';
const loadGridData = async () => await load(DATA_URL, JSONLoader);

function App() {
  const appWrapperRef = useRef();
  const webcamRef = useRef();
  const webcamCanvasRef = useRef();
  const [calibrated, setCalibrated] = useState(false);
  const [gridData, setGridData] = useState();

  const onStorageUpdate = (e) => {
    const { key, newValue } = e;
    if (key === "gridData") {
      setGridData(JSON.parse(newValue));
    }
  };

  useEffect(() => {
    if (gridData === undefined) {
      loadGridData().then(data => {
        setGridData(data);
      });
    }
    setGridData(JSON.parse(localStorage.getItem("gridData")) || gridData);
    window.addEventListener("storage", onStorageUpdate);
    return () => {
      window.removeEventListener("storage", onStorageUpdate);
    };
  }, []);

  // Check if the url is "/" or "/3d"
  const url = window.location.href;

  if (url.includes("/2d")) return (
    <div className="App" >

      <div ref={appWrapperRef} style={{ display: "inline-block" }} >

        <ProjectionMapping
          appWrapperRef={appWrapperRef}
          webcamRef={webcamRef}
          webcamCanvasRef={webcamCanvasRef}
          setCalibrated={setCalibrated}
        />

        {calibrated && <Roboflow
          gridData={gridData}
          setGridData={setGridData}
          webcamRef={webcamRef}
          webcamCanvasRef={webcamCanvasRef}
          layers={null}
        />}

        {calibrated && <Map
          gridData={gridData}
          setGridData={setGridData}
        />}

      </div>

    </div>
  )

  if (url.includes("/3d")) return (
    <div className="App" >
      <Map3D
        gridData={gridData}
        setGridData={setGridData}
      />
    </div>
  )
}

export default App;