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
    zoom: 14,
    pitch: 70,
    bearing: 0
};

function getColor(type) {
    switch (type) {
        case 'COMERCIAL':
            return [255, 0, 0, 255];
        case 'RESIDENCIAL':
            return [0, 255, 0, 255];
        default:
            return [255, 255, 255, 255];
    }
}


export default function Map3D({ gridData, setGridData }) {
    const basemapRef = useRef();
    const mapRef = useRef();
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
    const [layers, setLayers] = useState([]);
    const [cellChanged, setCellChanged] = useState(null);
    const [cellSide, setCellSide] = useState(0.005); // Express in kilometers
    const [gridLayer, setGridLayer] = useState();

    useEffect(() => {

        const grid = new GeoJsonLayer({
            id: 'grid-layer',
            data: gridData,
            pickable: true,
            stroked: true,
            extruded: true,
            // lineWidthScale: 20,
            // lineWidthMinPixels: 2,
            opacity: 0.25,
            getFillColor: d => getColor(d.properties.desc_zoni),
            getElevation: d => d.properties.denspob,
            elevationScale: 0.25,
            // getLineColor: [255, 255, 255],
            // getLineWidth: 1,
            updateTriggers: {
                getFillColor: [cellChanged],
            },
        });

        setGridLayer(grid);

    }, [gridData]);



    return (
        <div style={{ zIndex: 10 }}>
            <Legend />

            <DeckGL
                id="map"
                ref={mapRef}
                // viewState={viewState}
                initialViewState={INITIAL_VIEW_STATE}
                // onViewStateChange={({ viewState }) => setViewState(viewState)}
                // controller={{ doubleClickZoom: false }} // Avoid infinite zoom
                controller={true}
                layers={[gridLayer]}
                getTooltip={({ object }) => object && {
                    html: `<div>
                        <h4>Cell properties</h4>
                        <ul>
                            <li>Population density: ${object.properties.denspob.toFixed(0)} hab/km²</li>
                            <li>Zone: ${object.properties.desc_zoni}</li>
                            <li>Area: ${turf.area(object).toFixed(2)} km²</li>
                        </ul>
                    </div>`,
                    style: {
                        // backgroundColor: '#f00',
                        fontSize: '0.8em'

                    }
                }}
            >
                <BaseMap id="basemap" ref={basemapRef} reuseMaps mapLib={maplibregl} mapStyle={BASEMAP.DARK_MATTER} preventStyleDiffing={true} />
            </DeckGL >

        </div >
    )
}
