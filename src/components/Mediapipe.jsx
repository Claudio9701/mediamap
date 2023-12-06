import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';

import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
// This functions are causing errors when loading them on vercel/production
// import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';

import { useInterval } from '../goodies.js';

const getDistance = (point1, point2) => {
    // Calculate the distance between the two points for the x and y axis
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Initialize variables for updating the map viewState
const indexThumbthreshold = 0.5;
let initialPosition; // Longitude (X),  Latitude (Y) movement

const middleThumbthreshold = 0.1;
let initialPositionZoom; // Zoom (Z) movement
let cumulatedZ = 0; // Track zoom to adjust the visual help

const thumbRingthreshold = 0.1;
let initialPositionBearing;

const thumbPinkythreshold = 0.1;
let initialPositionPitch;

function Mediapipe({ webcamRef, handCanvasRef, webcamCanvasRef, interactiveCanvasID }) {
    const [detector, setDetector] = useState('');
    const [isPointerDown, setIsPointerDown] = useState(false);

    const stopDrawing = event => { console.log("STOP DRAWING", event); setIsPointerDown(false); }
    const startDrawing = event => {
        console.log("START DRAWING", event)
        // const ctx = webcamCanvasRef.current.getContext("2d");

        // ctx.beginPath();
        // ctx.arc(event.clientX, event.clientY, 5, 0, 2 * Math.PI);
        // ctx.fillStyle = "green";
        // ctx.fill();

        setIsPointerDown(true);
    }
    const drawLine = event => {
        if (isPointerDown) {
            console.log("DRAWING LINE", event)
            // // Draw a circle 
            // console.log("event.clientX, event.clientY", event.clientX, event.clientY)
            // const ctx = webcamCanvasRef.current.getContext("2d");

            // ctx.beginPath();
            // ctx.arc(event.clientX, event.clientY, 5, 0, 2 * Math.PI);
            // ctx.fillStyle = "blue";
            // ctx.fill();


        }
    }

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

        document.getElementById(interactiveCanvasID).addEventListener('pointerdown', startDrawing);
        document.getElementById(interactiveCanvasID).addEventListener('pointermove', drawLine);
        document.getElementById(interactiveCanvasID).addEventListener('pointerup', stopDrawing);

        // window.addEventListener('pointerdown', startDrawing);
        // window.addEventListener('pointermove', drawLine);
        // window.addEventListener('pointerup', stopDrawing);

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

        // console.log("Starting detection...")
        const ctx = handCanvasRef.current.getContext('2d');

        let lastVideoTime = -1;
        let results = undefined;

        let startTimeMs = performance.now();

        if (lastVideoTime !== webcamRef.current.video.currentTime) {
            lastVideoTime = webcamRef.current.video.currentTime;
            // console.log("real video size", webcamRef.current.video.videoWidth, webcamRef.current.video.videoHeight)
            results = await detector.detectForVideo(webcamRef.current.video, startTimeMs);
        }

        ctx.clearRect(0, 0, handCanvasRef.current.width, handCanvasRef.current.height);

        // draw landmarks
        if (results?.landmarks && results?.landmarks.length > 0) {
            for (const landmarks of results.landmarks) {
                // Draw mirrored hands and connectors        
                // ctx.translate(canvasRef.current.width, 0);
                // ctx.scale(-1, 1);
                window.drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: `rgba(0, 255, 0, 1)`, lineWidth: 1 });

                const fingerLandmarks = [
                    landmarks[4], // Thumb 
                    landmarks[8], // Index finger
                    landmarks[12], // Middle finger
                    landmarks[16], // Ring finger
                    landmarks[20] // Pinky
                ];

                const landmarksStyle = {
                    color: `rgba(255, 0, 0, 0.5)`,
                    lineWidth: 1,
                    radius: 1
                }
                window.drawLandmarks(ctx, fingerLandmarks, landmarksStyle);
                // ctx.translate(canvasRef.current.width, 0);
                // ctx.scale(-1, 1);
            }

            // Use only one hand to control the map
            const drawLine = (point1, point2) => {
                ctx.beginPath();
                ctx.moveTo(point1.x * handCanvasRef.current.width, point1.y * handCanvasRef.current.height);
                ctx.lineTo(point2.x * handCanvasRef.current.width, point2.y * handCanvasRef.current.height);
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
                const handBase = results.landmarks[0][4];
                const handRef = results.landmarks[0][3];

                // Calculate the distance between the two points for the x and y axis
                const indexThumbdistance = getDistance(indexFinger, thumbFinger);
                const handScale = getDistance(handBase, handRef);
                console.log("indexThumb: ", handScale / (indexThumbdistance + 0.001), " | threshold: ", indexThumbthreshold)
                // If fingers are together, move the map
                if (handScale / (indexThumbdistance + 0.001) > indexThumbthreshold) {

                    // Draw a center cross to indicate the map is being moved
                    drawCenterCross();

                    // Get current position of the two index fingers
                    const currentPosition = {
                        "x": (indexFinger.x + thumbFinger.x) / 2,
                        "y": (indexFinger.y + thumbFinger.y) / 2,
                    }

                    // Save the initial coordinates where the fingers are together
                    if (initialPosition === undefined) {
                        console.log("pointer down")
                        // console.log("initialPosition", initialPosition)
                        initialPosition = {
                            "x": (indexFinger.x + thumbFinger.x) / 2,
                            "y": (indexFinger.y + thumbFinger.y) / 2,
                        }
                        let pointerPosition = {
                            "isTrusted": "true",
                            "clientX": initialPosition.x * webcamCanvasRef.current.width * 2,
                            "clientY": initialPosition.y * webcamCanvasRef.current.height * 2,
                        }
                        console.log("INIT POS", initialPosition, "CANVAS SIZE", webcamCanvasRef.current.width, webcamCanvasRef.current.height, "POINTERPOS", pointerPosition)


                        // Simulate a pointer event with the pointer position
                        let evt = new PointerEvent('pointerdown', pointerPosition);
                        console.log("EVENT TESTING", evt)
                        console.log("PointerEvent DOWN", evt)
                        console.log("webcamCanvas", document.getElementById(interactiveCanvasID))
                        document.getElementById(interactiveCanvasID).dispatchEvent(evt);
                        // window.dispatchEvent(evt);
                        // let iframe = document.getElementById("iframeContent");
                        // // Get canvas with class="excalidraw__canvas"
                        // let canvas = iframe.contentWindow.document.getElementsByClassName("excalidraw__canvas")[0];
                        // // Send pointer event to the canvas
                        // canvas.dispatchEvent(evt);
                    } else {
                        console.log("pointer move");
                        // Calculate the distance between the current position and the initial position
                        let alpha = 0.8;
                        let dx2 = initialPosition.x - (initialPosition.x * alpha + currentPosition.x * (1 - alpha));
                        let dy2 = initialPosition.y - (initialPosition.y * alpha + currentPosition.y * (1 - alpha));

                        // if absolute value of dx2 or dy2 is less than -1e-3 then do not move the map
                        dx2 = (Math.abs(dx2) < 1e-3) ? 0 : dx2;
                        dy2 = (Math.abs(dy2) < 1e-3) ? 0 : dy2;

                        let pointerPosition = {
                            "isTrusted": "true",
                            "clientX": initialPosition.x * webcamCanvasRef.current.width * 2,
                            "clientY": initialPosition.y * webcamCanvasRef.current.height * 2,
                        }

                        // Simulate a pointer event with the pointer position
                        let evt = new PointerEvent('pointermove', pointerPosition);
                        document.getElementById(interactiveCanvasID).dispatchEvent(evt);
                        // window.dispatchEvent(evt);
                        // let iframe = document.getElementById("iframeContent");
                        // // Get canvas with class="excalidraw__canvas"
                        // let canvas = iframe.contentWindow.document.getElementsByClassName("excalidraw__canvas")[0];
                        // // Send pointer event to the canvas
                        // canvas.dispatchEvent(evt);

                        // Reset the initial position
                        initialPosition.x = currentPosition.x;
                        initialPosition.y = currentPosition.y;
                    }

                    // // Calculate the distance between the current position and the initial position
                    // let alpha = 0.8;
                    // let dx2 = initialPosition.x - (initialPosition.x * alpha + currentPosition.x * (1 - alpha));
                    // let dy2 = initialPosition.y - (initialPosition.y * alpha + currentPosition.y * (1 - alpha));

                    // // if absolute value of dx2 or dy2 is less than -1e-3 then do not move the map
                    // dx2 = (Math.abs(dx2) < 1e-3) ? 0 : dx2;
                    // dy2 = (Math.abs(dy2) < 1e-3) ? 0 : dy2;

                    // // Update the map viewState
                    // setViewState({
                    //     longitude: viewState.longitude - dx2,
                    //     latitude: viewState.latitude - dy2,
                    //     zoom: viewState.zoom,
                    //     pitch: viewState.pitch,
                    //     bearing: viewState.bearing
                    // });
                    // let pointerPosition = {
                    //     clientX: currentPosition.x,
                    //     clientY: currentPosition.y,
                    // }

                    // // Simulate a pointer event with the pointer position
                    // let evt = new PointerEvent('pointerdown', pointerPosition);
                    // document.getElementById("iframeContent").dispatchEvent(evt);
                    // let evt2 = new PointerEvent('pointerup', pointerPosition);
                    // window.dispatchEvent(evt2);

                    // // Reset the initial position
                    // initialPosition.x = currentPosition.x;
                    // initialPosition.y = currentPosition.y;
                }
                else if (initialPosition != undefined) {
                    console.log("pointer up")
                    let pointerPosition = {
                        "isTrusted": "true",
                        "clientX": initialPosition.x * webcamCanvasRef.current.width * 2,
                        "clientY": initialPosition.y * webcamCanvasRef.current.height * 2,
                    }
                    let evt2 = new PointerEvent('pointerup', pointerPosition);
                    document.getElementById(interactiveCanvasID).dispatchEvent(evt2);
                    // window.dispatchEvent(evt2);
                    // let iframe = document.getElementById("iframeContent");
                    // // Get canvas with class="excalidraw__canvas"
                    // let canvas = iframe.contentWindow.document.getElementsByClassName("excalidraw__canvas")[0];
                    // // Send pointer event to the canvas
                    // canvas.dispatchEvent(evt2);
                    initialPosition = undefined;
                }

                // // Control Zoom
                // const middleFinger = results.landmarks[0][12];
                // const middleThumbDistance = getDistance(middleFinger, thumbFinger);

                // if (middleThumbDistance < middleThumbthreshold) {
                //     const currentPositionZoom = {
                //         "y": (thumbFinger.y + middleFinger.y) / 2,
                //     }

                //     // Draw a reference arc to indicate the map is being zoomed
                //     drawArc({ x: 0.5 * canvasRef.current.width, y: 0.5 * canvasRef.current.height }, 100, Math.PI, 2 * Math.PI)

                //     // Save the initial coordinates where the fingers are together
                //     if (initialPositionZoom === undefined) {
                //         console.log("START TO ZOOM THE MAP")
                //         console.log("initialPosition", initialPositionZoom)
                //         initialPositionZoom = {
                //             "y": (thumbFinger.y + middleFinger.y) / 2,
                //         }
                //         cumulatedZ = 0;
                //     } else {
                //         console.log("MAP IS BEING ZOOMED");
                //     }

                //     // Calculate the distance between the current position and the initial position
                //     let alpha = 0.8;
                //     let dz = initialPositionZoom.y - (initialPositionZoom.y * alpha + currentPositionZoom.y * (1 - alpha));
                //     dz = (Math.abs(dz) < 1e-3) ? 0 : dz;
                //     console.log("dz", dz)

                //     // Draw a circle with a radius that depends on the zoom
                //     cumulatedZ += dz;
                //     let diffRadius = 100 * (1 + cumulatedZ * 10);
                //     drawArc({ x: 0.5 * canvasRef.current.width, y: 0.5 * canvasRef.current.height },
                //         diffRadius < 0 ? 0 : diffRadius,
                //         Math.PI, 2 * Math.PI)

                //     // Update the map viewState
                //     setViewState({
                //         longitude: viewState.longitude,
                //         latitude: viewState.latitude,
                //         zoom: viewState.zoom + dz * 15,
                //         pitch: viewState.pitch,
                //         bearing: viewState.bearing
                //     });

                //     // Reset the initial position
                //     initialPositionZoom.y = currentPositionZoom.y
                // }
                // else {
                //     console.log("STOP TO ZOOM THE MAP")
                //     initialPositionZoom = undefined;
                //     cumulatedZ = 0;
                // }

                // // Control Bearing
                // const ringFinger = results.landmarks[0][16];
                // const thumbRingDistance = getDistance(thumbFinger, ringFinger);

                // if (thumbRingDistance < thumbRingthreshold) {

                //     // Get current position of the two index fingers
                //     const currentPositionBearing = {
                //         "x": (thumbFinger.x + ringFinger.x) / 2,
                //         "y": (thumbFinger.y + ringFinger.y) / 2,
                //     }

                //     // Draw a reference arc to indicate the map is being rotated
                //     drawArc({ x: 0.5 * canvasRef.current.width, y: 0.5 * canvasRef.current.height }, 50, -1.6 * Math.PI, -1.4 * Math.PI)

                //     // Save the initial coordinates where the fingers are together
                //     if (initialPositionBearing === undefined) {
                //         console.log("START TO CHANGE BEARING")
                //         console.log("initialPositionBearing", initialPositionBearing)
                //         initialPositionBearing = {
                //             "x": (thumbFinger.x + ringFinger.x) / 2,
                //             "y": (thumbFinger.y + ringFinger.y) / 2,
                //         }
                //     } else {
                //         console.log("BEARING IS CHANGING");
                //     }

                //     // Calculate the distance between the current position and the initial position
                //     let dx3 = currentPositionBearing.x - initialPositionBearing.x;

                //     // if absolute value of dx3 is less than -1e-3 then do not move the map
                //     dx3 = (Math.abs(dx3) < 1e-3) ? 0 : dx3;

                //     // Draw an arc segment that depends on the bearing
                //     let diffAngle = -1.5 * Math.PI + dx3 * 10;
                //     drawArc(
                //         { x: 0.5 * canvasRef.current.width, y: 0.5 * canvasRef.current.height },
                //         50,
                //         (diffAngle > -1.5 * Math.PI) ? -1.5 * Math.PI : diffAngle,
                //         (diffAngle < -1.5 * Math.PI) ? -1.5 * Math.PI : diffAngle,
                //     )

                //     // Update the map viewState
                //     setViewState({
                //         longitude: viewState.longitude,
                //         latitude: viewState.latitude,
                //         zoom: viewState.zoom,
                //         pitch: viewState.pitch,
                //         bearing: viewState.bearing + dx3 * 10
                //     });

                // }
                // else {
                //     console.log("STOP TO CHANGE BEARING")
                //     initialPositionBearing = undefined;
                // }

                // // Control Pitch
                // const pinkyFinger = results.landmarks[0][20];
                // const thumbPinkyDistance = getDistance(thumbFinger, pinkyFinger);

                // if (thumbPinkyDistance < thumbPinkythreshold) {
                //     // Get current position of the two index fingers
                //     const currentPositionPitch = {
                //         "x": (thumbFinger.x + pinkyFinger.x) / 2,
                //         "y": (thumbFinger.y + pinkyFinger.y) / 2,
                //     }

                //     // Draw a vertical line to indicate the map is being pitched
                //     drawLine({ x: 0.5, y: 0.48 }, { x: 0.5, y: 0.52 });

                //     // Save the initial coordinates where the fingers are together
                //     if (initialPositionPitch === undefined) {
                //         console.log("START TO CHANGE PITCH")
                //         console.log("initialPosition", initialPositionPitch)
                //         initialPositionPitch = {
                //             "x": (thumbFinger.x + pinkyFinger.x) / 2,
                //             "y": (thumbFinger.y + pinkyFinger.y) / 2,
                //         }
                //     } else {
                //         console.log("PITCH IS CHANGING");
                //     }

                //     // Calculate the distance between the current position and the initial position
                //     let dy3 = currentPositionPitch.y - initialPositionPitch.y;
                //     // if absolute value of dy3 is less than -1e-3 then do not move the map
                //     dy3 = (Math.abs(dy3) < 1e-3) ? 0 : dy3;

                //     // Draw a vertical line that depends on the pitch
                //     let diffPitch = 0.5 * (1 + dy3);
                //     drawLine(
                //         { x: 0.5, y: (diffPitch > 0.5) ? 0.5 : diffPitch },
                //         { x: 0.5, y: (diffPitch < 0.5) ? 0.5 : diffPitch }
                //     );

                //     // Update the map viewState
                //     setViewState({
                //         longitude: viewState.longitude,
                //         latitude: viewState.latitude,
                //         zoom: viewState.zoom,
                //         pitch: viewState.pitch + dy3 * 10,
                //         bearing: viewState.bearing
                //     });
                // }
                // else {
                //     console.log("STOP TO CHANGE PITCH")
                //     initialPositionPitch = undefined;
                // }
            }
        }
    };

    return (
        <canvas
            ref={handCanvasRef}
            id='handsLandmarks'
            // increase canvas resolution with window size
            width={window.innerWidth}
            height={window.innerHeight}
            // Make canvas fill the whole screen
            style={{
                position: "absolute",
                zIndex: 110,
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
            }}
        />
    )
}

export default Mediapipe;