import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';

// Roboflow settings
const PUBLISHABLE_ROBOFLOW_API_KEY = "rf_65Ue4jkP7ARYPi42T25B2cPbRmS2";
const PROJECT_URL = "microsoft-coco"; // "lego-bricks-uwgtj";
const MODEL_VERSION = "9"; // "1";

function Roboflow({ data, setGridData, webcamCanvasRef, webcamRef, layers }) {
  // data["features"].forEach(d => {
  //   d["properties"]["desc_zoni"] = "COMERCIAL";
  // });

  var inferRunning;
  var model;

  const startInfer = () => {
    inferRunning = true;
    window.roboflow
      .auth({
        publishable_key: PUBLISHABLE_ROBOFLOW_API_KEY,
      })
      .load({
        model: PROJECT_URL,
        version: MODEL_VERSION,
        onMetadata: function (m) {
          console.log("model loaded");
        },
      })
      .then((model) => {
        setInterval(() => {
          if (inferRunning) detect(model);
        }, 10);
      });
  };

  useEffect(startInfer, []);

  const detect = async (model) => {
    // Check data is available
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      const clientWidth = webcamRef.current.video.clientWidth;
      const clientHeight = webcamRef.current.video.clientHeight;

      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      const detections = await model.detect(webcamRef.current.video);

      console.log("ROBOFLOW MODEL DETECTIONS", detections);

      adjustCanvas(clientWidth, clientHeight);

      var videoCtx = webcamCanvasRef.current.getContext('2d');

      drawBoxes(detections, videoCtx);

      // drawVoxels(detections);

    }
  };

  const adjustCanvas = (w, h) => {

    webcamCanvasRef.current.width = w;
    webcamCanvasRef.current.height = h;

    webcamCanvasRef.current.style.width = w;
    webcamCanvasRef.current.style.height = h;
  };

  const drawBoxes = (detections, ctx) => {

    ctx.clearRect(0, 0, webcamCanvasRef.current.width, webcamCanvasRef.current.height);
    detections.forEach((row) => {
      if (true) {
        //video
        var temp = row.bbox;
        temp.class = row.class;
        temp.color = row.color;
        temp.confidence = row.confidence;
        row = temp;
      }

      if (row.confidence < 0) return;

      //dimensions
      var x = row.x - row.width / 2;
      var y = row.y - row.height / 2;
      var w = row.width;
      var h = row.height;

      var scale_w = webcamCanvasRef.current.width / webcamRef.current.video.videoWidth;
      var scale_h = webcamCanvasRef.current.height / webcamRef.current.video.videoHeight;

      // adjust dimensions
      x = x * scale_w;
      y = y * scale_h;
      w = w * scale_w;
      h = h * scale_h;

      // horizontal flip
      // x = webcamCanvasRef.current.width - x - w;

      //box
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = row.color;
      ctx.rect(x, y, w, h);
      ctx.stroke();

      //shade
      ctx.fillStyle = "black";
      ctx.globalAlpha = 0.2;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1.0;

      //label
      var fontColor = "black";
      var fontSize = 12;
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = "center";
      var classTxt = row.class;
      var confTxt = (row.confidence * 100).toFixed().toString() + "%";
      var msgTxt = classTxt + " " + confTxt;
      const textHeight = fontSize;
      var textWidth = ctx.measureText(msgTxt).width;

      if (textHeight <= h && textWidth <= w) {
        ctx.strokeStyle = row.color;
        ctx.fillStyle = row.color;
        ctx.fillRect(
          x - ctx.lineWidth / 2,
          y - textHeight - ctx.lineWidth,
          textWidth + 2,
          textHeight + 1
        );
        ctx.stroke();
        ctx.fillStyle = fontColor;
        ctx.fillText(msgTxt, x + textWidth / 2 + 1, y - 1);
      } else {
        textWidth = ctx.measureText(confTxt).width;
        ctx.strokeStyle = row.color;
        ctx.fillStyle = row.color;
        ctx.fillRect(
          x - ctx.lineWidth / 2,
          y - textHeight - ctx.lineWidth,
          textWidth + 2,
          textHeight + 1
        );
        ctx.stroke();
        ctx.fillStyle = fontColor;
        ctx.fillText(confTxt, x + textWidth / 2 + 1, y - 1);
      }
    });
  };

  const drawVoxels = (detections) => {
    detections.forEach((row) => {
      if (true) {
        //video
        var temp = row.bbox;
        temp.class = row.class;
        temp.color = row.color;
        temp.confidence = row.confidence;
        row = temp;
      }

      if (row.confidence < 0) return;

      // Dimensions
      var x = row.x - row.width / 2;
      var y = row.y - row.height / 2;
      var w = row.width;
      var h = row.height;

      // Apply projection mapping with camera2PoolMatrix
      // Example matrix:
      //   var M = [
      //     1.139231364547567,
      //     0.05052095703609813,
      //     0,
      //     -0.00013910960531570023,
      //     -0.01786082750951322,
      //     1.9089800815679838,
      //     0,
      //     0.0008452739495585134,
      //     0,
      //     0,
      //     1,
      //     0,
      //     -32.84749601640925,
      //     59.59938602956676,
      //     0,
      //     1
      // ];
      // if (camera2PoolMatrix === null) return;

      // let divisor = camera2PoolMatrix[6] * x + camera2PoolMatrix[7] * y + camera2PoolMatrix[8];

      // var x_proj = camera2PoolMatrix[0] * x + camera2PoolMatrix[1] * y + camera2PoolMatrix[2];
      // x_proj /= divisor;
      // x_proj -= 640;
      // var y_proj = camera2PoolMatrix[3] * x + camera2PoolMatrix[4] * y + camera2PoolMatrix[5];
      // y_proj /= divisor;
      // y_proj -= 480;

      // console.log("x_proj", x_proj, "y_proj", y_proj);

      // Simulate a click event with the pointer position
      let pointerPosition = {
        clientX: x,
        clientY: y,
      }

      if (layers !== undefined) {
        let evt = new PointerEvent('pointerdown', pointerPosition);
        document.getElementById("map").dispatchEvent(evt);
        let evt2 = new PointerEvent('pointerup', pointerPosition);
        window.dispatchEvent(evt2);
      }

    });
  }


  // return (
  //   <div className="container">
  //     <Webcam
  //       ref={webcamRef}
  //       id='webcam'
  //       mirrored={true}
  //     />
  //     <canvas id='webcamCanvas' ref={webcamCanvasRef} />
  //   </div>
  // )
}

export default Roboflow;