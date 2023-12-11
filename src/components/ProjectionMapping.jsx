import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { getPerspectiveTransform } from '../goodies.js';

const warpPerspective = (src, dst, size) => {
    // Transform the src points considering to origin is at the center of an size[0] by size[1] image
    src = src.map(([x, y]) => [x - size[0] / 2, y - size[1] / 2]);
    dst = dst.map(([x, y]) => [x - size[0] / 2, y - size[1] / 2]);

    return getPerspectiveTransform(...src, ...dst);
}

function ProjectionMapping({ appWrapperRef, webcamRef, webcamCanvasRef, calibrated, setCalibrated }) {
    const webcamContainerRef = useRef();
    const [points, setPoints] = useState([]);

    const updateTransform = (transform) => {
        // Apply transformation matrix to all HTML elements that need to be projected
        appWrapperRef.current.style.overflow = "hidden";
        webcamRef.current.video.style.transform = `matrix3d(${transform.join(",")})`;
        webcamRef.current.video.style.visibility = "hidden";
        webcamCanvasRef.current.style.transform = `matrix3d(${transform.join(",")})`;
        setCalibrated(true);
    };

    // Handle click event
    const handleClick = (event) => {
        // Get clicked coordinates
        const x = event.nativeEvent.offsetX;
        const y = event.nativeEvent.offsetY;

        if (!calibrated) {
            // Add coordinates to points array 
            if (points.length < 4) {
                setPoints(prevPoints => [...prevPoints, [x, y]]);
                // Draw points on canvas
                const ctx = webcamCanvasRef.current.getContext("2d");
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = "red";
                ctx.fill();
            }
            else {
                // Sort points based on y-coordinates (top to bottom)
                points.sort((a, b) => a[1] - b[1]);
                const topPoints = points.slice(0, 2);
                const bottomPoints = points.slice(2, 4);

                // Sort both based on x-coordinates (left to right)
                topPoints.sort((a, b) => a[0] - b[0]);
                bottomPoints.sort((a, b) => a[0] - b[0]);

                // Set sorted points
                let sortedPoints = [...topPoints, ...bottomPoints];

                // Set camera corners points
                const videoWidth = webcamRef.current.video.videoWidth;
                const videoHeight = webcamRef.current.video.videoHeight;
                const cameraCorners = [
                    [0, 0], // top left
                    [videoWidth, 0], // top right
                    [0, videoHeight], // bottom left
                    [videoWidth, videoHeight], // bottom right
                ]

                // Compute transformation matrix
                const M = warpPerspective(sortedPoints, cameraCorners, [videoWidth, videoHeight]);

                // Remove points from canvas
                const ctx = webcamCanvasRef.current.getContext("2d");
                ctx.clearRect(0, 0, webcamCanvasRef.current.width, webcamCanvasRef.current.height);

                // Save the points and transformation matrix to local storage
                localStorage.setItem("cameraPoints", JSON.stringify(sortedPoints));
                localStorage.setItem("cameraCorners", JSON.stringify(cameraCorners));
                localStorage.setItem("camera2PoolMatrix", JSON.stringify(M));

                // Update transform
                updateTransform(M);
            }
        }
        else {
            // Reset calibration
            setPoints([]);
            setCalibrated(false);
            localStorage.removeItem("cameraPoints");
            localStorage.removeItem("cameraCorners");
            localStorage.removeItem("camera2PoolMatrix");
            webcamRef.current.video.style.transform = `none`;
            webcamCanvasRef.current.style.transform = `none`;
        }
    };

    useEffect(() => {
        // Wait for the video to load and adjust the size of the webcam canvas to match the webcam video
        webcamRef.current.video.addEventListener('loadeddata', () => {

            webcamRef.current.video.style.width = webcamRef.current.video.videoWidth + "px";
            webcamRef.current.video.style.height = webcamRef.current.video.videoHeight + "px";

            webcamCanvasRef.current.width = webcamRef.current.video.videoWidth;
            webcamCanvasRef.current.height = webcamRef.current.video.videoHeight;

            appWrapperRef.current.style.width = webcamRef.current.video.videoWidth + "px";
            appWrapperRef.current.style.height = webcamRef.current.video.videoHeight + "px";

            // Initiliaze Projector to Surface Mapping
            var maptastic = window.Maptastic(appWrapperRef.current);
        });

        if (localStorage.getItem("camera2PoolMatrix") && localStorage.getItem("cameraPoints")) {
            console.log("Found camera2PoolMatrix and cameraPoints in local storage");
            // Get the transformation matrix from local storage
            const cameraPoints = JSON.parse(localStorage.getItem("cameraPoints"));
            const M = JSON.parse(localStorage.getItem("camera2PoolMatrix"));

            setPoints(cameraPoints);

            // Draw points on canvas
            for (let i = 0; i < cameraPoints.length; i++) {
                const ctx = webcamCanvasRef.current.getContext("2d");
                ctx.beginPath();
                ctx.arc(cameraPoints[i][0], cameraPoints[i][1], 5, 0, 2 * Math.PI);
                ctx.fillStyle = "red";
                ctx.fill();
            }

            console.log("Applying transformation matrix")

            // Update transform
            updateTransform(M);
        }
    }, [])

    return (
        <div ref={webcamContainerRef} className="container" style={{ display: "inline-block", overflow: "hidden" }}>
            <Webcam ref={webcamRef} id='webcam' mirrored={false} style={{ position: 'absolute', zIndex: 0 }} />
            <canvas ref={webcamCanvasRef} id='webcamCanvas' onClick={handleClick} style={{ position: 'relative', zIndex: 1 }}></canvas>
        </div>
    )
}

export default ProjectionMapping;