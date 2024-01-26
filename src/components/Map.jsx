import React, { useState, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import { BASEMAP } from '@deck.gl/carto';
import { Map as BaseMap } from 'react-map-gl';
import maplibregl from 'maplibre-gl';

// Viewport settings
const INITIAL_VIEW_STATE = {
    longitude: -77.055,
    latitude: -12.044,
    zoom: 14.5,
    pitch: 0,
    bearing: 0
};

function getColor(type) {
    switch (type) {
        case 'COMERCIAL':
            return [255, 0, 0];
        case 'RESIDENCIAL':
            return [0, 255, 0];
        default:
            return [255, 255, 255];
    }
}

export default function Map2d({ gridData }) {
    const basemapRef = useRef();
    const mapRef = useRef();
    const [cellChanged, setCellChanged] = useState(null);
    const [gridLayer, setGridLayer] = useState();
    const [modifiedObjects, setModifiedObjects] = useState(new Map());

    function handleClick(e) {
        if (import.meta.env.VITE_DEBUG) { console.log("SIMULATED CLICK RECEIVED", e) };

        if (e.coordinate !== undefined && e.object !== undefined) {
            // Change current cell value to opposite value (COMERCIAL/RESIDENCIAL)
            const cell_id = e.object["properties"]["OBJECTID"];
            const cell_value = e.object["properties"]["desc_zoni"];

            if (!modifiedObjects.has(cell_id) || modifiedObjects.get(cell_id) !== cell_value) {
                if (import.meta.env.VITE_DEBUG) { console.log("CELL CHANGED", cell_id, cell_value) };
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

                if (import.meta.env.VITE_DEBUG) console.log("MAP BBOX", bbox)

                localStorage.setItem("gridData", JSON.stringify(gridData));

                const gridLayer = new GeoJsonLayer({
                    id: 'grid-layer',
                    data: gridData,
                    pickable: true,
                    stroked: true,
                    getFillColor: d => getColor(d.properties.desc_zoni),
                    getLineColor: [255, 255, 255],
                    getLineWidth: 10,
                    getLineMinPixels: 2,
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
                getFillColor: d => getColor(d.properties.desc_zoni, 0.5),
                getLineColor: [255, 255, 255],
                getLineWidth: 10,
                getLineMinPixels: 2,
                updateTriggers: {
                    getFillColor: [cellChanged],
                },
            });

            setGridLayer(gridLayer);
        }

    }, [cellChanged]);


    return (
        <div style={{ zIndex: 10 }}>
            <DeckGL
                id="map"
                ref={mapRef}
                // TODO: Use a mediapipe controller to move the map
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
