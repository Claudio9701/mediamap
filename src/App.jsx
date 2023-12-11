import './App.css';

import { useRef, useState } from 'react';
import Map from './components/Map.jsx';
import Roboflow from './components/Roboflow.jsx';
import ProjectionMapping from './components/ProjectionMapping';

import { load } from '@loaders.gl/core';
import { JSONLoader } from '@loaders.gl/json';

const DATA_URL = 'https://raw.githubusercontent.com/Claudio9701/mediamap/separate-components/public/grid_data.geojson';
const data = await load(DATA_URL, JSONLoader);


function App() {
  const appWrapperRef = useRef();
  const webcamRef = useRef();
  const webcamCanvasRef = useRef();
  const [calibrated, setCalibrated] = useState(false);
  const [gridData, setGridData] = useState(data);

  return (
    <div className="App" >

      <div ref={appWrapperRef} style={{ display: "inline-block" }} >

        <ProjectionMapping
          appWrapperRef={appWrapperRef}
          webcamRef={webcamRef}
          webcamCanvasRef={webcamCanvasRef}
          calibrated={calibrated}
          setCalibrated={setCalibrated}
        />

        {/* {calibrated && <Roboflow
          gridData={gridData}
          setGridData={setGridData}
          webcamRef={webcamRef}
          webcamCanvasRef={webcamCanvasRef}
          layers={null}
        />} */}

      </div>

    </div>
  )
}

export default App;