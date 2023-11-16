import React, { useState, useEffect, useRef } from 'react';

import DeckGL from '@deck.gl/react';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { GeoJsonLayer } from '@deck.gl/layers';
import { BASEMAP } from '@deck.gl/carto';
import { Map as BaseMap } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import { latLngToCell } from 'h3-js';
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
            return [255, 0, 0];
        case 'RESIDENCIAL':
            return [0, 255, 0];
        default:
            return [255, 255, 255];
    }
}


export default function Map({ data, mapWrapperRef }) {
    const basemapRef = useRef();
    const mapRef = useRef();
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
    const [layers, setLayers] = useState([]);
    let cellChanged = null;

    function handleClick(e) {
        console.log("CLICKED", e);
        // if (e.coordinate !== undefined) {
        //     cellChanged = e.index;
        //     data["features"][e.index]["properties"]["desc_zoni"] = "COMERCIAL";
        //     e.object.properties.desc_zoni = "RESIDENCIAL";
        // }
    }

    useEffect(() => {
        setLayers([
            // TEST DATA
            new GeoJsonLayer({
                id: 'grid-layer',
                data: data,
                pickable: true,
                stroked: true,
                filled: true,
                extruded: true,
                wireframe: true,
                elevationScale: 0.3,
                getElevation: d => d.properties.denspob,
                getFillColor: d => getColor(d.properties.desc_zoni),
                getLineColor: d => [0, 0, 0],
                updateTriggers: {
                    getElevation: cellChanged,
                    getFillColor: data,
                },
            }),
        ]);
        // console.log("mapRef", mapRef.current.deck.viewManager._viewportMap["default-view"].getBounds());
    }, []);



    return (
        <div id="map-wrapper" ref={mapWrapperRef}>
            <Legend />

            <DeckGL
                id="map"
                ref={mapRef}
                // viewState={viewState}
                initialViewState={INITIAL_VIEW_STATE}
                // onViewStateChange={({ viewState }) => setViewState(viewState)}
                // controller={{ doubleClickZoom: false }} // Avoid infinite zoom
                controller={true}
                layers={layers}
                getTooltip={({ object }) => object && (object.properties.name || object.properties.station)}
                onClick={handleClick}
            >

                <BaseMap id="basemap" ref={basemapRef} reuseMaps mapLib={maplibregl} mapStyle={BASEMAP.DARK_MATTER} preventStyleDiffing={true} />
            </DeckGL>

        </div>
    )
}