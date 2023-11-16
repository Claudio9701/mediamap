import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';

import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
// This functions are causing errors when loading them on vercel/production
// import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';

import { useInterval } from './goodies.js';

const getDistance = (point1, point2) => {
    // Calculate the distance between the two points for the x and y axis
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Initialize variables for updating the map viewState
const indexThumbthreshold = 0.05;
let initialPosition; // Longitude (X),  Latitude (Y) movement

const middleThumbthreshold = 0.1;
let initialPositionZoom; // Zoom (Z) movement
let cumulatedZ = 0; // Track zoom to adjust the visual help

const thumbRingthreshold = 0.1;
let initialPositionBearing;

const thumbPinkythreshold = 0.1;
let initialPositionPitch;

function Mediapipe() {
    const webcamRef = useRef();
    const canvasRef = useRef();
    const [detector, setDetector] = useState('');

    useEffect(() => {
        const createHandLandmarker = async () => {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
            );
            const handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numHands: 2,
            });
            setDetector(handLandmarker);
        };
        createHandLandmarker();
    }, []);

    useInterval(() => {
        detectHands();
    }, 10);

    const detectHands = async () => {
        if (detector === '') {
            console.log("Loading model...");
            return;
        }
        if (webcamRef.current?.video.readyState !== 4) {
            console.log("Video not ready...");
            return;
        }

        console.log("Starting detection...")
        const ctx = canvasRef.current.getContext('2d');

        let lastVideoTime = -1;
        let results = undefined;

        let startTimeMs = performance.now();

        if (lastVideoTime !== webcamRef.current.video.currentTime) {
            lastVideoTime = webcamRef.current.video.currentTime;
            results = await detector.detectForVideo(webcamRef.current.video, startTimeMs);
        }

        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // draw landmarks
        if (results?.landmarks && results?.landmarks.length > 0) {
            for (const landmarks of results.landmarks) {
                // Draw mirrored hands and connectors        
                ctx.translate(canvasRef.current.width, 0);
                ctx.scale(-1, 1);
                window.drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: `rgba(0, 0, 0, 0.1)`, lineWidth: 10 });

                const fingerLandmarks = [
                    landmarks[4], // Thumb 
                    landmarks[8], // Index finger
                    landmarks[12], // Middle finger
                    landmarks[16], // Ring finger
                    landmarks[20] // Pinky
                ];

                const landmarksStyle = {
                    color: `rgba(255, 0, 0, 0.5)`,
                    lineWidth: 5,
                    radius: 10
                }
                window.drawLandmarks(ctx, fingerLandmarks, landmarksStyle);
                ctx.translate(canvasRef.current.width, 0);
                ctx.scale(-1, 1);
            }

            // Use only one hand to control the map
            const drawLine = (point1, point2) => {
                ctx.beginPath();
                ctx.moveTo(point1.x * canvasRef.current.width, point1.y * canvasRef.current.height);
                ctx.lineTo(point2.x * canvasRef.current.width, point2.y * canvasRef.current.height);
                ctx.stroke();
                ctx.save();
            }

            const drawArc = (point, radius, startAngle, EndAngle) => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, radius, startAngle, EndAngle);
                ctx.stroke();
                ctx.save();
            }

            const drawCenterCross = () => {
                drawLine({ x: 0.5, y: 0.48 }, { x: 0.5, y: 0.52 });
                drawLine({ x: 0.49, y: 0.5 }, { x: 0.51, y: 0.5 });
            }

            if (results.landmarks.length === 1) {
                const indexFinger = results.landmarks[0][8];
                const thumbFinger = results.landmarks[0][4];

                // Calculate the distance between the two points for the x and y axis
                const indexThumbdistance = getDistance(indexFinger, thumbFinger);

                // If fingers are together, move the map
                if (indexThumbdistance < indexThumbthreshold) {

                    // Draw a center cross to indicate the map is being moved
                    drawCenterCross();

                    // Get current position of the two index fingers
                    const currentPosition = {
                        "x": (indexFinger.x + thumbFinger.x) / 2,
                        "y": (indexFinger.y + thumbFinger.y) / 2,
                    }

                    // Save the initial coordinates where the fingers are together
                    if (initialPosition === undefined) {
                        console.log("START TO MOVE THE MAP VERTICALLY AND HORIZONTALLY")
                        console.log("initialPosition", initialPosition)
                        initialPosition = {
                            "x": (indexFinger.x + thumbFinger.x) / 2,
                            "y": (indexFinger.y + thumbFinger.y) / 2,
                        }
                    } else {
                        console.log("MAP IS MOVING");
                    }

                    // Calculate the distance between the current position and the initial position
                    let alpha = 0.8;
                    let dx2 = initialPosition.x - (initialPosition.x * alpha + currentPosition.x * (1 - alpha));
                    let dy2 = initialPosition.y - (initialPosition.y * alpha + currentPosition.y * (1 - alpha));

                    // if absolute value of dx2 or dy2 is less than -1e-3 then do not move the map
                    dx2 = (Math.abs(dx2) < 1e-3) ? 0 : dx2;
                    dy2 = (Math.abs(dy2) < 1e-3) ? 0 : dy2;

                    // Update the map viewState
                    setViewState({
                        longitude: viewState.longitude - dx2,
                        latitude: viewState.latitude - dy2,
                        zoom: viewState.zoom,
                        pitch: viewState.pitch,
                        bearing: viewState.bearing
                    });

                    // Reset the initial position
                    initialPosition.x = currentPosition.x;
                    initialPosition.y = currentPosition.y;
                }
                else {
                    console.log("STOP TO MOVE THE MAP VERTICALLY AND HORIZONTALLY")
                    initialPosition = undefined;
                }

                // Control Zoom
                const middleFinger = results.landmarks[0][12];
                const middleThumbDistance = getDistance(middleFinger, thumbFinger);

                if (middleThumbDistance < middleThumbthreshold) {
                    const currentPositionZoom = {
                        "y": (thumbFinger.y + middleFinger.y) / 2,
                    }

                    // Draw a reference arc to indicate the map is being zoomed
                    drawArc({ x: 0.5 * canvasRef.current.width, y: 0.5 * canvasRef.current.height }, 100, Math.PI, 2 * Math.PI)

                    // Save the initial coordinates where the fingers are together
                    if (initialPositionZoom === undefined) {
                        console.log("START TO ZOOM THE MAP")
                        console.log("initialPosition", initialPositionZoom)
                        initialPositionZoom = {
                            "y": (thumbFinger.y + middleFinger.y) / 2,
                        }
                        cumulatedZ = 0;
                    } else {
                        console.log("MAP IS BEING ZOOMED");
                    }

                    // Calculate the distance between the current position and the initial position
                    let alpha = 0.8;
                    let dz = initialPositionZoom.y - (initialPositionZoom.y * alpha + currentPositionZoom.y * (1 - alpha));
                    dz = (Math.abs(dz) < 1e-3) ? 0 : dz;
                    console.log("dz", dz)

                    // Draw a circle with a radius that depends on the zoom
                    cumulatedZ += dz;
                    let diffRadius = 100 * (1 + cumulatedZ * 10);
                    drawArc({ x: 0.5 * canvasRef.current.width, y: 0.5 * canvasRef.current.height },
                        diffRadius < 0 ? 0 : diffRadius,
                        Math.PI, 2 * Math.PI)

                    // Update the map viewState
                    setViewState({
                        longitude: viewState.longitude,
                        latitude: viewState.latitude,
                        zoom: viewState.zoom + dz * 15,
                        pitch: viewState.pitch,
                        bearing: viewState.bearing
                    });

                    // Reset the initial position
                    initialPositionZoom.y = currentPositionZoom.y
                }
                else {
                    console.log("STOP TO ZOOM THE MAP")
                    initialPositionZoom = undefined;
                    cumulatedZ = 0;
                }

                // Control Bearing
                const ringFinger = results.landmarks[0][16];
                const thumbRingDistance = getDistance(thumbFinger, ringFinger);

                if (thumbRingDistance < thumbRingthreshold) {

                    // Get current position of the two index fingers
                    const currentPositionBearing = {
                        "x": (thumbFinger.x + ringFinger.x) / 2,
                        "y": (thumbFinger.y + ringFinger.y) / 2,
                    }

                    // Draw a reference arc to indicate the map is being rotated
                    drawArc({ x: 0.5 * canvasRef.current.width, y: 0.5 * canvasRef.current.height }, 50, -1.6 * Math.PI, -1.4 * Math.PI)

                    // Save the initial coordinates where the fingers are together
                    if (initialPositionBearing === undefined) {
                        console.log("START TO CHANGE BEARING")
                        console.log("initialPositionBearing", initialPositionBearing)
                        initialPositionBearing = {
                            "x": (thumbFinger.x + ringFinger.x) / 2,
                            "y": (thumbFinger.y + ringFinger.y) / 2,
                        }
                    } else {
                        console.log("BEARING IS CHANGING");
                    }

                    // Calculate the distance between the current position and the initial position
                    let dx3 = currentPositionBearing.x - initialPositionBearing.x;

                    // if absolute value of dx3 is less than -1e-3 then do not move the map
                    dx3 = (Math.abs(dx3) < 1e-3) ? 0 : dx3;

                    // Draw an arc segment that depends on the bearing
                    let diffAngle = -1.5 * Math.PI + dx3 * 10;
                    drawArc(
                        { x: 0.5 * canvasRef.current.width, y: 0.5 * canvasRef.current.height },
                        50,
                        (diffAngle > -1.5 * Math.PI) ? -1.5 * Math.PI : diffAngle,
                        (diffAngle < -1.5 * Math.PI) ? -1.5 * Math.PI : diffAngle,
                    )

                    // Update the map viewState
                    setViewState({
                        longitude: viewState.longitude,
                        latitude: viewState.latitude,
                        zoom: viewState.zoom,
                        pitch: viewState.pitch,
                        bearing: viewState.bearing + dx3 * 10
                    });

                }
                else {
                    console.log("STOP TO CHANGE BEARING")
                    initialPositionBearing = undefined;
                }

                // Control Pitch
                const pinkyFinger = results.landmarks[0][20];
                const thumbPinkyDistance = getDistance(thumbFinger, pinkyFinger);

                if (thumbPinkyDistance < thumbPinkythreshold) {
                    // Get current position of the two index fingers
                    const currentPositionPitch = {
                        "x": (thumbFinger.x + pinkyFinger.x) / 2,
                        "y": (thumbFinger.y + pinkyFinger.y) / 2,
                    }

                    // Draw a vertical line to indicate the map is being pitched
                    drawLine({ x: 0.5, y: 0.48 }, { x: 0.5, y: 0.52 });

                    // Save the initial coordinates where the fingers are together
                    if (initialPositionPitch === undefined) {
                        console.log("START TO CHANGE PITCH")
                        console.log("initialPosition", initialPositionPitch)
                        initialPositionPitch = {
                            "x": (thumbFinger.x + pinkyFinger.x) / 2,
                            "y": (thumbFinger.y + pinkyFinger.y) / 2,
                        }
                    } else {
                        console.log("PITCH IS CHANGING");
                    }

                    // Calculate the distance between the current position and the initial position
                    let dy3 = currentPositionPitch.y - initialPositionPitch.y;
                    // if absolute value of dy3 is less than -1e-3 then do not move the map
                    dy3 = (Math.abs(dy3) < 1e-3) ? 0 : dy3;

                    // Draw a vertical line that depends on the pitch
                    let diffPitch = 0.5 * (1 + dy3);
                    drawLine(
                        { x: 0.5, y: (diffPitch > 0.5) ? 0.5 : diffPitch },
                        { x: 0.5, y: (diffPitch < 0.5) ? 0.5 : diffPitch }
                    );

                    // Update the map viewState
                    setViewState({
                        longitude: viewState.longitude,
                        latitude: viewState.latitude,
                        zoom: viewState.zoom,
                        pitch: viewState.pitch + dy3 * 10,
                        bearing: viewState.bearing
                    });
                }
                else {
                    console.log("STOP TO CHANGE PITCH")
                    initialPositionPitch = undefined;
                }
            }
        }
    };

    return (
        // <div className="title">
        //     <p>Map Control with Hand Gestures 👌</p>
        //     {
        //         detector === '' ?
        //             <p style={{ color: '#ff0000' }}>Loading...</p> :
        //             <p style={{ color: '#00ff00' }}>Model Running </p>
        //     }
        // </div>

        <canvas
            ref={canvasRef}
            id='handsLandmarks'
            // increase canvas resolution with window size
            width={window.innerWidth}
            height={window.innerHeight}
        />
    )
}

export default Mediapipe;