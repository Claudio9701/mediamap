import { useEffect } from 'react';

import { getPerspectiveTransform } from '../goodies.js';

export default function ProjectionMapping({ webcamRef, webcamCanvasRef, mapWrapperRef }) {

    if (
        typeof webcamRef.current !== "undefined" &&
        webcamRef.current !== null &&
        webcamRef.current.video.readyState === 4
    ) {
        const clientWidth = webcamRef.current.video.clientWidth;
        const clientHeight = webcamRef.current.video.clientHeight;

        adjustCanvas(clientWidth, clientHeight);

        var videoCtx = webcamCanvasRef.current.getContext('2d');

        videoCtx.clearRect(0, 0, webcamCanvasRef.current.width, webcamCanvasRef.current.height);

        // box
        var webcamCanvasCorners = [
            [0, 0], // top left
            [0, webcamCanvasRef.current.height], // bottom left
            [webcamCanvasRef.current.width, webcamCanvasRef.current.height], // bottom right
            [webcamCanvasRef.current.width, 0], // top right
        ]

        videoCtx.beginPath();
        videoCtx.lineWidth = 5;
        videoCtx.strokeStyle = "blue";
        videoCtx.rect(0, 0, webcamCanvasRef.current.width, webcamCanvasRef.current.height);
        videoCtx.stroke();

        // Draw pooltable borders
        var pooltableCorners = [
            [30, 15], // top left
            [14, 62], // bottom left
            [128, 65], // bottom right
            [115, 17], // top right
        ]
        for (let i = 0; i < pooltableCorners.length - 1; i++) {
            videoCtx.beginPath();
            videoCtx.lineWidth = 2;
            videoCtx.strokeStyle = "red";
            videoCtx.moveTo(pooltableCorners[i][0], pooltableCorners[i][1]);
            videoCtx.lineTo(pooltableCorners[i + 1][0], pooltableCorners[i + 1][1]);
            videoCtx.stroke();
        }

        videoCtx.beginPath();
        videoCtx.lineWidth = 2;
        videoCtx.strokeStyle = "red";
        videoCtx.moveTo(pooltableCorners[pooltableCorners.length - 1][0], pooltableCorners[pooltableCorners.length - 1][1]);
        videoCtx.lineTo(pooltableCorners[0][0], pooltableCorners[0][1]);
        videoCtx.stroke();

        // Add 0, 1 to all points to make them homogeneous
        const op = [
            [webcamCanvasCorners[0][0], webcamCanvasCorners[0][1], 0, 1],
            [webcamCanvasCorners[1][0], webcamCanvasCorners[1][1], 0, 1],
            [webcamCanvasCorners[2][0], webcamCanvasCorners[2][1], 0, 1],
            [webcamCanvasCorners[3][0], webcamCanvasCorners[3][1], 0, 1],
        ]
        const np = [
            [pooltableCorners[0][0], pooltableCorners[0][1], 0, 1],
            [pooltableCorners[1][0], pooltableCorners[1][1], 0, 1],
            [pooltableCorners[2][0], pooltableCorners[2][1], 0, 1],
            [pooltableCorners[3][0], pooltableCorners[3][1], 0, 1],
        ]
        // Calculate perspective transformation matrix from pooltable corners to canvas corners
        const M = getPerspectiveTransform(...op, ...np);
        console.log("M", M)
    }

    const adjustCanvas = (w, h) => {
        console.log("ADJUST CANVAS")
        webcamCanvasRef.current.width = w;
        webcamCanvasRef.current.height = h;

        webcamCanvasRef.current.style.width = w;
        webcamCanvasRef.current.style.height = h;
    };

    useEffect(() => {
        // Add projection mapping
        var maptastic = window.Maptastic(mapWrapperRef.current);
    }, []);

    return (
        <img
            id="warpedImage"
            src="/lego_20231024-093640.jpg"
            alt="warpedImage"
            style={{
                transform: 'matrix3d(' + M.join(',') + ')' // m is the 4x4 matrix
            }}
        />
    )
}
