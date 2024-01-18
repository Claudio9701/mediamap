import React, { useState, useEffect, useRef } from 'react';

import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { BASEMAP } from '@deck.gl/carto';
import { Map as BaseMap } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';

import { Legend } from './Legend.jsx';

// Viewport settings
const INITIAL_VIEW_STATE = {
    longitude: -77.055,
    latitude: -12.044,
    zoom: 15,
    pitch: 0,
    bearing: 0
};

function getColor(type) {
    switch (type) {
        case 'COMERCIAL':
            return [255, 0, 0, 255 * 0.2];
        case 'RESIDENCIAL':
            return [0, 255, 0, 255 * 0.2];
        default:
            return [255, 255, 255, 255 * 0.2];
    }
}


export default function Map({ gridData, setGridData }) {
    const basemapRef = useRef();
    const mapRef = useRef();
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
    const [layers, setLayers] = useState([]);
    const [cellChanged, setCellChanged] = useState(null);
    const [cellSide, setCellSide] = useState(0.005); // Express in kilometers
    const [gridLayer, setGridLayer] = useState();

    function handleClick(e) {
        console.log("SIMULATED CLICK RECEIVED", e);
        if (e.coordinate !== undefined || e.object !== undefined) {
            // Change current cell value
            e.object["properties"]["desc_zoni"] = "RESIDENCIAL";
            setCellChanged(e.index);
            localStorage.setItem("gridData", JSON.stringify(gridData));

            // // Add a geographical point in the position of the click
            // setGridLayer(new ScatterplotLayer({
            //     id: 'scatter-layer-2',
            //     data: [
            //         {
            //             position: [e.coordinate[0], e.coordinate[1]],
            //             color: [255, 0, 0],
            //             radius: 4,
            //         },
            //     ],
            //     pickable: true,
            //     opacity: 0.8,
            //     stroked: true,
            //     filled: true,
            //     radiusScale: 6,
            //     radiusMinPixels: 1,
            //     radiusMaxPixels: 100,
            //     lineWidthMinPixels: 1,
            //     getPosition: d => d.position,
            //     getRadius: d => d.radius,
            //     getFillColor: d => d.color,
            //     getLineColor: d => d.color,
            //     getLineWidth: d => 1,
            // }));
        }
    }

    useEffect(() => {
        console.log("USE EFFECT RUNNING IN MAP")
        if (
            mapRef.current !== null &&
            mapRef.current?.deck.viewManager !== null &&
            mapRef.current?.deck.viewManager._viewportMap !== null

        ) {
            // Apply the CSS transform to the map container too
            const viewport = mapRef.current?.deck.viewManager._viewportMap["default-view"];
            const bbox = viewport?.getBounds();
            if (bbox !== undefined) {

                // Add a margin to the bbox
                const margin = 0.005;
                bbox[0] = bbox[0] - margin;
                bbox[1] = bbox[1] - margin;
                bbox[2] = bbox[2] + margin;
                bbox[3] = bbox[3] + margin;

                console.log("CREATE GRID bbox", bbox)
                console.log("CREATE GRID cellSide", cellSide)

                // const squareGrid = turf.squareGrid(bbox, cellSide);
                // // Create property "desc_zoni" with value "COMERCIAL" for each feature
                // squareGrid["features"].forEach(d => {
                //     d["properties"]["desc_zoni"] = "COMERCIAL";
                // });
                // console.log("CREATE GRID squareGrid", squareGrid);
                console.log("READED GRID gridData", gridData);

                // setGridData(squareGrid);
                localStorage.setItem("gridData", JSON.stringify(gridData));

                const gridLayer = new GeoJsonLayer({
                    id: 'grid-layer',
                    data: gridData,
                    pickable: true,
                    stroked: true,
                    // lineWidthScale: 20,
                    // lineWidthMinPixels: 2,
                    getFillColor: d => getColor(d.properties.desc_zoni),
                    getLineColor: [255, 255, 255],
                    getLineWidth: 1,
                    updateTriggers: {
                        getFillColor: [cellChanged],
                    },
                });

                setGridLayer(gridLayer);
            }
        }

    }, [gridData]);


    useEffect(() => {
        if (cellChanged !== null) {
            // Create a GeoJsonLayer with the grid data
            console.log("CLICKED cellChanged", cellChanged)
            console.log("CLICKED gridData", gridData["features"][cellChanged])

            const gridLayer = new GeoJsonLayer({
                id: 'grid-layer',
                data: gridData,
                pickable: true,
                stroked: true,
                // lineWidthScale: 20,
                // lineWidthMinPixels: 2,
                getFillColor: d => getColor(d.properties.desc_zoni),
                getLineColor: [255, 255, 255],
                getLineWidth: 1,
                updateTriggers: {
                    getFillColor: [cellChanged],
                },
            });

            setGridLayer(gridLayer);
        }

    }, [cellChanged]);


    return (
        <div style={{ zIndex: 10 }}>
            {/* <Legend /> */}

            {/* Cell side length slider */}
            {/* <div style={{
                position: "absolute",
                bottom: "10px",
                right: "10px",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                padding: "10px",
                borderRadius: "5px",
                boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.2)",
                display: "flex",
                zIndex: 11,
                flexDirection: "column"
            }}> */}
            {/* Format value to be three decimal floating point */}
            {/* <label htmlFor="cell-side">Cell side length {cellSide.toFixed(3)} km</label>
                <input
                    type="range"
                    step="0.005"
                    min="0.005"
                    max="1"
                    value={cellSide}
                    onChange={(e) => { setCellSide(Number(e.target.value)) }}
                />
            </div> */}

            <DeckGL
                id="map"
                ref={mapRef}
                // viewState={viewState}
                initialViewState={INITIAL_VIEW_STATE}
                // onViewStateChange={({ viewState }) => setViewState(viewState)}
                // controller={{ doubleClickZoom: false }} // Avoid infinite zoom
                controller={false}
                layers={[gridLayer]}
                // getTooltip={({ object }) => object && (object.properties.desc_zoni)}
                onClick={handleClick}
            >
                <BaseMap id="basemap" ref={basemapRef} reuseMaps mapLib={maplibregl} mapStyle={BASEMAP.DARK_MATTER} preventStyleDiffing={true} />
            </DeckGL>

        </div>
    )
}
