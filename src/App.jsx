
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import { useRef, useState, useEffect } from 'react';

import Map2d from './components/Map.jsx';
import Map3D from './components/Map3d.jsx';
import Roboflow from './components/Roboflow.jsx';
import ProjectionMapping from './components/ProjectionMapping';

import { load } from '@loaders.gl/core';
import { JSONLoader } from '@loaders.gl/json';
import { Routes, Route } from 'react-router-dom';

const DATA_URL = 'https://raw.githubusercontent.com/Claudio9701/mediamap/separate-components/public/grid_data.geojson';
const loadGridData = async () => await load(DATA_URL, JSONLoader);

function App() {
  const appWrapperRef = useRef();
  const webcamRef = useRef();
  const webcamCanvasRef = useRef();
  const [calibrated, setCalibrated] = useState(false);
  const [gridData, setGridData] = useState();

  // Synchronize gridData changes between tabs using localStorage
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

  return (
    <div className="App" >
      <Routes>
        <Route path="/2d" element={
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

            {calibrated && <Map2d
              gridData={gridData}
              setGridData={setGridData}
            />}

          </div>
        }
        />
        <Route path="/3d" element={
          <Map3D
            gridData={gridData}
            setGridData={setGridData}
          />
        } />
      </Routes >
    </div>
  )
}

export default App;