import React, { useState, useEffect, useRef } from 'react';

import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { BASEMAP } from '@deck.gl/carto';
import { Map as BaseMap } from 'react-map-gl';
import maplibregl from 'maplibre-gl';

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

export default function Map2d({ gridData, setGridData }) {
    const basemapRef = useRef();
    const mapRef = useRef();
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
    const [layers, setLayers] = useState([]);
    const [cellChanged, setCellChanged] = useState(null);
    const [cellSide, setCellSide] = useState(0.005); // Express in kilometers
    const [gridLayer, setGridLayer] = useState();
    const [modifiedObjects, setModifiedObjects] = useState(new Map());

    // TODO: Read DEBUG from .env file
    const debug = false;

    function handleClick(e) {
        if (debug) { console.log("SIMULATED CLICK RECEIVED", e); }

        if (e.coordinate !== undefined && e.object !== undefined) {
            // Change current cell value to opposite value (COMERCIAL/RESIDENCIAL)
            const cell_id = e.object["properties"]["OBJECTID"];
            const cell_value = e.object["properties"]["desc_zoni"];

            if (!modifiedObjects.has(cell_id) || modifiedObjects.get(cell_id) !== cell_value) {
                console.log("CELL CHANGED", cell_id, cell_value);
                const prev_cell_value = cell_value;
                const new_zoni = cell_value === "COMERCIAL" ? "RESIDENCIAL" : "COMERCIAL";

                e.object["properties"]["desc_zoni"] = new_zoni;

                setModifiedObjects(prevModifiedObjects => {
                    const newModifiedObjects = new Map(prevModifiedObjects);
                    newModifiedObjects.set(cell_id, prev_cell_value);
                    return newModifiedObjects;
                });

                setCellChanged(e.index);
            }
            // new_zoni = e.object["properties"]["desc_zoni"] === "COMERCIAL" ? "RESIDENCIAL" : "COMERCIAL";
            // e.object["properties"]["desc_zoni"] = new_zoni;

            if (debug) {
                // Add a geographical point in the position of the click
                setGridLayer(new ScatterplotLayer({
                    id: 'scatter-layer-2',
                    data: [
                        {
                            position: [e.coordinate[0], e.coordinate[1]],
                            color: [255, 0, 0],
                            radius: 4,
                        },
                    ],
                    pickable: true,
                    opacity: 0.8,
                    stroked: true,
                    filled: true,
                    radiusScale: 6,
                    radiusMinPixels: 1,
                    radiusMaxPixels: 100,
                    lineWidthMinPixels: 1,
                    getPosition: d => d.position,
                    getRadius: d => d.radius,
                    getFillColor: d => d.color,
                    getLineColor: d => d.color,
                    getLineWidth: d => 1,
                }));
            }
        }
    }

    useEffect(() => {
        if (
            mapRef.current !== null &&
            mapRef.current?.deck.viewManager !== null &&
            mapRef.current?.deck.viewManager._viewportMap !== null

        ) {
            const viewport = mapRef.current?.deck.viewManager._viewportMap["default-view"];
            const bbox = viewport?.getBounds();
            if (bbox !== undefined) {

                // Add a margin to the bbox
                const margin = 0.005;
                bbox[0] = bbox[0] - margin;
                bbox[1] = bbox[1] - margin;
                bbox[2] = bbox[2] + margin;
                bbox[3] = bbox[3] + margin;

                // TODO: Handle data from API using bbox
                if (debug) {
                    console.log("CREATE GRID bbox", bbox)
                    // console.log("CREATE GRID cellSide", cellSide)
                }
                // const squareGrid = turf.squareGrid(bbox, cellSide);
                // // Create property "desc_zoni" with value "COMERCIAL" for each feature
                // squareGrid["features"].forEach(d => {
                //     d["properties"]["desc_zoni"] = "COMERCIAL";
                // });
                // setGridData(squareGrid);
                // localStorage.setItem("gridData", JSON.stringify(squareGrid));

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
            if (gridData !== undefined) { localStorage.setItem("gridData", JSON.stringify(gridData)) };

            // Create a GeoJsonLayer with the updated grid data
            const gridLayer = new GeoJsonLayer({
                id: 'grid-layer',
                data: gridData,
                pickable: true,
                stroked: true,
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
                // TODO: Handle mediapipe map controller
                // viewState={viewState}
                // onViewStateChange={({ viewState }) => setViewState(viewState)}
                // controller={{ doubleClickZoom: false }} // Avoid infinite zoom
                initialViewState={INITIAL_VIEW_STATE}
                controller={false}
                layers={[gridLayer]}
                onClick={handleClick}
            >
                <BaseMap id="basemap" ref={basemapRef} reuseMaps mapLib={maplibregl} mapStyle={BASEMAP.DARK_MATTER} preventStyleDiffing={true} />
            </DeckGL>

        </div>
    )
}
