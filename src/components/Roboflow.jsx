import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';

// Roboflow settings
const PUBLISHABLE_ROBOFLOW_API_KEY = "rf_65Ue4jkP7ARYPi42T25B2cPbRmS2";
const PROJECT_URL = "lego-bricks-uwgtj";
const MODEL_VERSION = "1";

function Roboflow({ data, webcamCanvasRef, webcamRef }) {


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

      const detections = await model.detect(webcamRef.current.video);

      adjustCanvas(clientWidth, clientHeight);

      var videoCtx = webcamCanvasRef.current.getContext('2d');
      drawBoxes(detections, videoCtx);
    }
  };

  const adjustCanvas = (w, h) => {

    webcamCanvasRef.current.width = w;
    webcamCanvasRef.current.height = h;

    webcamCanvasRef.current.style.width = w;
    webcamCanvasRef.current.style.height = h;
  };

  const drawQuadrilateral = (points, ctx) => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();
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
      x = webcamCanvasRef.current.width - x - w;

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

  return (
    <div className="container">
      <Webcam
        ref={webcamRef}
        id='webcam'
        mirrored={true}
      />
      <canvas id='webcamCanvas' ref={webcamCanvasRef} />
    </div>
  )
}

export default Roboflow;