import React from "react";

export const Legend = () => {
    return (
        <div
            style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                padding: "10px",
                borderRadius: "5px",
                boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.2)",
                zIndex: "1",
            }}
        >
            <h3>Legend</h3>
            <ul style={{ textAlign: "left" }}>
                <li>
                    <span
                        style={{
                            display: "inline-block",
                            width: "20px",
                            height: "20px",
                            backgroundColor: "red",
                            marginRight: "5px",
                        }}
                    ></span>
                    Commercial
                </li>
                <li>
                    <span
                        style={{
                            display: "inline-block",
                            width: "20px",
                            height: "20px",
                            backgroundColor: "green",
                            marginRight: "5px",
                        }}
                    ></span>
                    Residential
                </li>
                <li>
                    <span
                        style={{
                            display: "inline-block",
                            width: "20px",
                            height: "20px",
                            backgroundColor: "white",
                            marginRight: "5px",
                            border: "1px solid black",
                        }}
                    ></span>
                    Other
                </li>
            </ul>
        </div >
    );
};

export default Legend;