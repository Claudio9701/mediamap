
import { useEffect } from 'react';
import { warpPerspective } from './ProjectionMapping.jsx';

// Roboflow settings
const PUBLISHABLE_ROBOFLOW_API_KEY = "rf_65Ue4jkP7ARYPi42T25B2cPbRmS2";
const PROJECT_URL = "lego-bricks-uwgtj" // "rock-paper-scissors-sxsw"
const MODEL_VERSION = "1"; // "11"

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
    // Check webcam data is available
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

      // console.log("ROBOFLOW MODEL DETECTIONS", detections);

      adjustCanvas(clientWidth, clientHeight);

      var videoCtx = webcamCanvasRef.current.getContext('2d');

      drawBoxes(detections, videoCtx);

      drawGeoPoint(detections);

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

      //centroid
      ctx.beginPath();
      ctx.arc(row.x, row.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "blue"
      ctx.fill();

      console.log(row.x, row.y)

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

  const drawGeoPoint = (detections) => {

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

      // Normalize x and y position using the webcam video size
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;
      console.log("DEBUG RAW POINT", row.x, row.y)
      const normalized_x = row.x - videoWidth / 2;
      const normalized_y = row.y - videoHeight / 2;
      console.log("DEBUG NORMALIZED POINT", normalized_x, normalized_y)

      // Transform normalized position using the "camera to surface" transformation matrix
      const canvas = webcamCanvasRef.current;
      const matrix = new DOMMatrix(getComputedStyle(canvas).transform);
      const matrixInverse = matrix.inverse();
      console.log("CANVAS MATRIX", matrix);
      const point = new DOMPoint(normalized_x, normalized_y, 0, 1); // Convert to homogeneous coordinates
      const transformedPoint = matrix.transformPoint(point); // Apply the transformation matrix

      // Apply the "projector to surface" transformation matrix
      const appContainer = webcamCanvasRef.current.parentElement.parentElement;
      const appContainerMatrix = new DOMMatrix(getComputedStyle(appContainer).transform);

      // Generate the "projection mapping" transformation matrix
      const projmatrix4 = matrix.multiply(appContainerMatrix);

      // Apply the "projection mapping" transformation matrix
      const appTransformedPoint1 = appContainerMatrix.transformPoint(transformedPoint);
      // const appTransformedPoint = appContainerMatrix.inverse().transformPoint(transformedPoint);

      // // Compute the last needed transformation matrix using the camera source points and the projected target points
      // const cameraSrcPoints = JSON.parse(localStorage.getItem("cameraCorners"));
      // const maptasticLayers = JSON.parse(localStorage.getItem("maptastic.layers"))
      // console.log("DEBUG maptasticLayers", maptasticLayers)
      // const projectedDstPoints = maptasticLayers[0]["targetPoints"]
      // console.log("DEBUG projectedDstPoints", projectedDstPoints)

      // const cameraToFocusMatrix = new DOMMatrix(warpPerspective(cameraSrcPoints, projectedDstPoints, [0, 0]));
      // console.log("DEBUG cameraToFocusMatrix", cameraToFocusMatrix);

      // // Apply the last transformation matrix
      // const appTransformedPoint = cameraToFocusMatrix.transformPoint(appTransformedPoint1);

      // Convert back to Cartesian coordinates
      const appTransformed_x = appTransformedPoint1.x / appTransformedPoint1.w;
      const appTransformed_y = appTransformedPoint1.y / appTransformedPoint1.w;

      // De-normalize the transformed position
      const appContainerRect = appContainer.getBoundingClientRect();
      const x = (appTransformed_x + appContainerRect.width / 2);
      const y = (appTransformed_y + appContainerRect.height / 2);
      console.log("DEBUG FINAL POINT", x, y)

      // Set pointer position
      let pointerPosition = {
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
        view: window
      };

      // Simulate a click event with the pointer position
      let evt = new PointerEvent('pointerdown', pointerPosition);
      document.getElementById('map-wrapper').dispatchEvent(evt);
      let evt2 = new PointerEvent('pointerup', pointerPosition);
      window.dispatchEvent(evt2);
    });
  }
}

export default Roboflow;