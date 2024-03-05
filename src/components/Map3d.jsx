import React, { useState, useEffect, useRef } from 'react';

import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import { BASEMAP } from '@deck.gl/carto';
import { Map as BaseMap } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import { area } from '@turf/turf';

import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import LoadingSpinner from 'react-bootstrap/Spinner';


const TRIPS_ENDPOINT_URL = import.meta.env.VITE_TRIPS_ENDPOINT_URL || alert("Please set the VITE_TRIPS_ENDPOINT_URL environment variable");

// Viewport settings
const INITIAL_VIEW_STATE = {
    longitude: -77.055,
    latitude: -12.044,
    zoom: 14.5,
    pitch: 45,
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

const WORK_TRIP_COLOR = [253, 128, 93];
const HOME_TRIP_COLOR = [23, 184, 190];

const TODAY = new Date();
const ONLY_DATE = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
const TODAY_TIMESTAMP = ONLY_DATE.getTime() / 1000;
if (import.meta.env.VITE_DEBUG) console.log("TODAY_TIMESTAMP", TODAY_TIMESTAMP);

export default function Map3D({ gridData }) {
    const basemapRef = useRef();
    const mapRef = useRef();
    const [time, setTime] = useState(20_000);
    const [animation] = useState({});
    const [tripsCount, setTripsCount] = useState(0);
    const [tripsAvgTravelTime, setTripsAvgTravelTime] = useState(0);
    const [fetching, setFetching] = useState(false);
    const [tripsData, setTripsData] = useState(null);
    const [fetchTimeout, setFetchTimeout] = useState(null);
    const [abortController, setAbortController] = useState(new AbortController());

    // Make an async iterator that yields batches of data
    const makeBatchIterator = async function* (gridData, signal) {
        try {
            if (import.meta.env.VITE_DEBUG) console.log("Starting data fetching in batches");
            const url = TRIPS_ENDPOINT_URL + "?trips_per_person=2";
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gridData),
                signal: signal,
            };

            setFetching(true);
            const response = await fetch(url, requestOptions);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let batch_str = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (signal.aborted) {
                    console.log("signal.aborted", signal.aborted)
                    // Close readable stream if signal is aborted
                    reader.cancel();
                    break;
                }
                const response_str = decoder.decode(value);
                // Accumulate batch_str
                batch_str += response_str;
                if (response_str.includes("}]")) {
                    // Parse batch
                    const batch = JSON.parse(batch_str);
                    // Reset batch_str
                    batch_str = "";

                    // Increment trips count with batch data length
                    setTripsCount(prevTripsCount => prevTripsCount + batch.length);
                    let SumBatchTravelTimes = 0;
                    batch.forEach(d => { SumBatchTravelTimes += (d.timestamps ? (d.timestamps[d.timestamps.length - 1] - d.timestamps[0]) / 60 : 0) });
                    // Calculate average travel time (sum of travel times / number of trips in batch)
                    const batchAvgTravelTime = SumBatchTravelTimes / batch.length;
                    // Increment trips average travel time with batch average travel time
                    if (batchAvgTravelTime) setTripsAvgTravelTime(prevTripsAvgTravelTime => (prevTripsAvgTravelTime + batchAvgTravelTime) / 2);

                    console.log("batch", batch.length)
                    console.log("batch time", batch[0].timestamps[0])
                    console.log("batch time - today ", batch[0].timestamps[0] - TODAY_TIMESTAMP)
                    console.log("current time inside batcher", time)

                    yield batch;
                }
            }

        } catch (error) {
            if (!signal.aborted) {
                console.error('Error:', error);
            }
        } finally {
            setFetching(false);
        }
    };

    const loopLength = 90_000;
    const animationSpeed = 7
    const animate = () => {
        setTime(t => (t + animationSpeed) % loopLength);
        animation.id = window.requestAnimationFrame(animate);
    };

    useEffect(() => {
        animation.id = window.requestAnimationFrame(animate);
        return () => window.cancelAnimationFrame(animation.id);
    }, [animation]);

    // const buildings = new GeoJsonLayer({
    //     id: 'buildings-layer',
    //     data: "https://raw.githubusercontent.com/Claudio9701/mediamap/separate-components/public/buildings.geojson",
    //     wireframe: false,
    //     extruded: true,
    //     opacity: 0.5,
    //     getFillColor: [74, 80, 87],
    //     getElevation: d => d.properties.denspob,
    //     elevationScale: 0.25,
    //     material: {
    //         ambient: 0.1,
    //         diffuse: 0.6,
    //         shininess: 32,
    //         specularColor: [60, 64, 70]
    //     }
    // });

    useEffect(() => {
        // Clear the previous timeout if there is one
        if (fetchTimeout) {
            clearTimeout(fetchTimeout);
        }

        if (fetching) {
            // Abort the fetch request if it's still going
            abortController.abort();
        }

        // Set a new timeout
        const timeout = setTimeout(() => {
            // Fetch new trips data
            setTripsData(makeBatchIterator(gridData, abortController.signal))
        }, 1000); // Wait for 1 second after the last change

        // Save the timeout ID for later
        setFetchTimeout(timeout);

        // Clean up the timeout when the component is unmounted
        return () => {
            // Clear the timeout
            clearTimeout(timeout);

            // Abort the fetch request if it's still going
            abortController.abort();
            // Reset controller
            setAbortController(new AbortController());
            // Reset trips count and average travel time
            setTripsCount(0);
            setTripsAvgTravelTime(0);
            setTripsData([]);
        }
    }, [gridData]);

    let trips = new TripsLayer({
        id: 'trips-layer',
        data: tripsData,
        getPath: d => d.path,
        getColor: d => (d.type === "to_work" ? WORK_TRIP_COLOR : HOME_TRIP_COLOR),
        getTimestamps: d => (d.timestamps.map(t => t - TODAY_TIMESTAMP)),
        opacity: 1,
        widthMinPixels: 2,
        rounded: true,
        trailLength: 180,
        currentTime: time,
        shadowEnabled: false
    });

    useEffect(() => {
        if (tripsData) {
            trips = new TripsLayer({
                id: 'trips-layer',
                data: tripsData,
                getPath: d => d.path,
                getColor: d => (d.type === "to_work" ? WORK_TRIP_COLOR : HOME_TRIP_COLOR),
                getTimestamps: d => (d.timestamps.map(t => t - TODAY_TIMESTAMP)),
                opacity: 1,
                widthMinPixels: 2,
                rounded: true,
                trailLength: 180,
                currentTime: time,
                shadowEnabled: false
            });
        }
    }, [tripsData]);

    const grid = new GeoJsonLayer({
        id: 'grid-layer',
        data: gridData,
        pickable: false,
        stroked: false,
        extruded: false,
        opacity: 0.01,
        getFillColor: d => getColor(d.properties.desc_zoni),
    });

    return (
        <div style={{ zIndex: 10 }}>

            {/* Left panel */}
            <Row xs={1} md={2} className="g-4"
                style={{
                    // Let pointer events go through
                    pointerEvents: "none",
                }}
            >
                <Col style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px", zIndex: 11,
                }}
                >
                    <Card
                        bg="dark"
                        text="white"
                        style={{
                            width: '15rem',
                            opacity: 0.8
                        }}
                        className="mb-2" // mb-2: margin bottom 2
                    >
                        <Card.Body>
                            <Card.Header>Simulation Metrics</Card.Header>
                            <Card.Title>
                                <br />
                                {fetching && <LoadingSpinner animation="border" />}
                                {!fetching && "Ready"}
                            </Card.Title>
                        </Card.Body>
                    </Card>

                    {/* Show the time slider to visualize the trips */}
                    <Card
                        bg="dark"
                        text="white"
                        style={{
                            width: '15rem',
                            opacity: 0.8,
                            pointerEvents: "auto"
                        }}
                        className="mb-2" // mb-2: margin bottom 2
                    >
                        <Card.Body>
                            {/* TODO: Read simulation date from data */}
                            <Card.Header> Date: {new Date((time + TODAY_TIMESTAMP) * 1000).toISOString().slice(0, 10)}</Card.Header>
                            <Card.Title> Time <input
                                type="range"
                                step="1000"
                                // Set min to approx seconds from 00:00 to 4:30 am
                                min="20000"
                                max={loopLength}
                                value={time}
                                onChange={(e) => { setTime(Number(e.target.value)) }}
                                // Make input fill the width of the card
                                style={{ width: "100%" }}
                            /></Card.Title>
                            <Card.Text>{new Date((time + TODAY_TIMESTAMP) * 1000).toISOString().slice(11, 19)}</Card.Text>
                        </Card.Body>
                    </Card>
                    {/* End of time slider  */}

                    {/* Show number of simulated trips */}
                    <Card
                        bg="dark"
                        text="white"
                        style={{
                            width: '15rem',
                            opacity: 0.8
                        }}
                        className="mb-2" // mb-2: margin bottom 2
                    >
                        <Card.Body>
                            <Card.Header>No. Trips</Card.Header>
                            <Card.Title>{tripsCount}</Card.Title>
                        </Card.Body>
                    </Card>
                    {/* End of number of simulated trips */}

                    {/* Show average travel time */}
                    <Card
                        bg="dark"
                        text="white"
                        style={{
                            width: '15rem',
                            opacity: 0.8
                        }}
                        className="mb-2" // mb-2: margin bottom 2
                    >
                        <Card.Body>
                            <Card.Header>Avg. Travel Time</Card.Header>
                            <Card.Title>{tripsAvgTravelTime.toFixed(0)} min</Card.Title>
                        </Card.Body>
                    </Card>
                    {/* End of average travel time */}

                </Col>

                {/* Right panel */}
                <Col style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px", zIndex: 11,
                    // Make content go to the right
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end"
                }}
                >
                    {/* Show cell area */}
                    <Card
                        bg="dark"
                        text="white"
                        style={{
                            width: '15rem',
                            opacity: 0.8
                        }}
                        className="mb-2" // mb-2: margin bottom 2
                    >
                        <Card.Body>
                            <Card.Header>Cell Avg. Area</Card.Header>
                            <Card.Title>22.23 km²</Card.Title>
                        </Card.Body>
                    </Card>

                    {/* Show cell legend with count */}
                    <Card
                        bg="dark"
                        text="white"
                        style={{
                            width: '15rem',
                            opacity: 0.8
                        }}
                        className="mb-2" // mb-2: margin bottom 2
                    >
                        <Card.Body>
                            <Card.Header>Zonification Grid</Card.Header>
                            <Card.Title>{gridData?.features?.length} cells</Card.Title>

                            {/* Make values left aligned */}
                            <ul style={{ textAlign: "left" }}>
                                {/* Add color box next to each label */}
                                <li>
                                    <span style={{ backgroundColor: "red", width: "200px", color: "red", marginRight: "10px" }}>BOX</span>
                                    COMERCIAL: {gridData?.features?.filter(d => d.properties.desc_zoni === "COMERCIAL").length}
                                </li>
                                <li>
                                    <span style={{ backgroundColor: "green", width: "200px", color: "green", marginRight: "10px" }}>BOX</span>
                                    RESIDENCIAL: {gridData?.features?.filter(d => d.properties.desc_zoni === "RESIDENCIAL").length}
                                </li>
                                <li>
                                    <span style={{ backgroundColor: "grey", width: "200px", color: "grey", marginRight: "10px" }}>BOX</span>
                                    Others: {gridData?.features?.filter(d => d.properties.desc_zoni !== "COMERCIAL" && d.properties.desc_zoni !== "RESIDENCIAL").length}
                                </li>
                            </ul>

                        </Card.Body>
                    </Card>
                    {/* End of cell legend */}


                    {/* Show population density */}
                    <Card
                        bg="dark"
                        text="white"
                        style={{
                            width: '15rem',
                            opacity: 0.8,
                        }}
                        className="mb-2" // mb-2: margin bottom 2
                    >
                        <Card.Body>
                            <Card.Header>Population Density</Card.Header>
                            <Card.Title>{gridData?.features?.reduce((acc, d) => acc + d.properties.denspob, 0).toFixed(0)} hab</Card.Title>
                            <Card.Text>{(gridData?.features?.reduce((acc, d) => acc + d.properties.denspob, 0) / gridData?.features?.length * 22.23).toFixed(0)} hab/km²</Card.Text>
                        </Card.Body>
                    </Card>
                    {/* End of population density */}
                </Col>
            </Row>

            <DeckGL
                id="map"
                ref={mapRef}
                initialViewState={INITIAL_VIEW_STATE}
                controller={true}
                layers={[
                    grid,
                    trips
                    // buildings
                ]}
                getTooltip={({ object }) => object && {
                    html: `<div>
                        <h4>Cell properties</h4>
                        <ul>
                            <li>Population density: ${object.properties.denspob.toFixed(0)} hab/km²</li>
                            <li>Zone: ${object.properties.desc_zoni}</li>
                            <li>Area: ${area(object).toFixed(2)} km²</li>
                        </ul>
                    </div>`,
                    style: {
                        fontSize: '0.8em'
                    }
                }}
            >
                <BaseMap id="basemap" ref={basemapRef} reuseMaps mapLib={maplibregl} mapStyle={BASEMAP.DARK_MATTER} preventStyleDiffing={true} />
            </DeckGL >

        </div >
    )
}
