import { useState } from 'react';
import { getPerspectiveTransform } from '../goodies.js';

const warpPerspective = (src, dst, screenWidth, screenHeight) => {
    // Transform the src points considering to origin is at the center of an 640 by 480 image
    src = src.map(([x, y]) => [x - screenWidth / 2, y - screenHeight / 2]);
    dst = dst.map(([x, y]) => [x - screenWidth / 2, y - screenHeight / 2]);

    return getPerspectiveTransform(...src, ...dst);
}

const ProjectionMapping = ({ webcamRef, webcamCanvasRef, appWrapperRef, cameraToSurfaceMatrix, setCameraToSurfaceMatrix, calibrated, setCalibrated }) => {
    let originPoints = [];

    const updateTransform = () => {
        webcamRef.current.video.style.visibility = "hidden";
        webcamCanvasRef.current.style.transform = `matrix3d(${cameraToSurfaceMatrix.join(",")})`;
        handCanvasRef.current.style.transform = `matrix3d(${cameraToSurfaceMatrix.join(",")})`;
    }

    // Maptastic allow to apply the projection to surface transformation matrix interactively
    var maptastic = window.Maptastic(appWrapperRef.current);

    // Load camera to surface transformation matrix from LocalStorage if it exists
    const storedMatrix = JSON.parse(localStorage.getItem("cameraToSurfaceMatrix"));
    console.log("STOREDMATRIX", storedMatrix)
    if (storedMatrix !== null) {
        console.log("SETTING STOREDMATRIX")
        setCameraToSurfaceMatrix(storedMatrix);
        updateTransform();
        setCalibrated(true);
    } else {
        console.log("NOT SETTING STOREDMATRIX");
    }

    const createOriginalPoint = (event) => {
        console.log("EVENT", event)
        console.log()
        console.log("CALIBRATED", calibrated)
        if (!calibrated) {
            // Get clicked coordinates
            const x = event.nativeEvent.offsetX;
            const y = event.nativeEvent.offsetY;

            // Add coordinates to points array 
            if (originPoints.length < 4) {
                originPoints = [...originPoints, [x, y]];
                // Draw points on canvas
                const ctx = webcamCanvasRef.current.getContext("2d");
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = "red";
                ctx.fill();
            } else {
                // Console log webcam size
                console.log("WEBCAM SIZE", webcamRef.current.video.videoHeight, webcamRef.current.video.videoWidth)

                const videoWidth = webcamRef.current.video.videoWidth;
                const videoHeight = webcamRef.current.video.videoHeight;

                // Use the webcam dimensions to set the transformed points
                const transformedPoints = [
                    [0, 0], // top left
                    [videoWidth, 0], // top right
                    [0, videoHeight], // bottom left
                    [videoWidth, videoHeight], // bottom right
                ]
                // Calculate camera2surface transformation matrix
                setCameraToSurfaceMatrix(warpPerspective(originPoints, transformedPoints, videoWidth, videoHeight));
                updateTransform();
                // Save points and transformation matrix in LocalStorage
                localStorage.setItem("cameraToSurfaceMatrix", JSON.stringify(cameraToSurfaceMatrix));
            }
        }
    }
    webcamCanvasRef.current.onClick = createOriginalPoint;
};

export default ProjectionMapping;