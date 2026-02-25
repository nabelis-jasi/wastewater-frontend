import { useState } from "react";

import React from "react";

// Path to the background image; the PNG placed in public root will be shown on the splash page.
// make sure the file name matches exactly.
// Use encoded URI to handle spaces in file name. if you rename the file, adjust accordingly.
const bgImagePath = "/wastewater%20image.png"; // using the PNG from public folder

export default function Splash({ onContinue }) {
  // typing text state
  // new header using text from user (start of splash page)
  const titleText = "Welcome to the Spatial Wastewater Intelligence Platform";
  const bodyText =
    "This project provides field operators, collectors, and developers with an interactive map and management tools for wastewater infrastructure. Navigate the dashboard to view, edit, and synchronize data efficiently.";

  // remove typing animation; show full text immediately
  const [typedTitle, setTypedTitle] = React.useState(titleText);
  const [typedBody, setTypedBody] = React.useState(bodyText);

  React.useEffect(() => {
    if (typedTitle === titleText) {
      let idx = 0;
      const interval2 = setInterval(() => {
        setTypedBody((prev) => prev + bodyText.charAt(idx));
        idx += 1;
        if (idx > bodyText.length) {
          clearInterval(interval2);
        }
      }, 30);
      return () => clearInterval(interval2);
    }
  }, [typedTitle]);

  return (
    <div className="splash-container">
      <div
        className="splash-bg"
        style={{ backgroundImage: `url(${bgImagePath})` }}
      >
        <div className="splash-overlay">
          <h1>{typedTitle}</h1>
          <p>{typedBody}</p>
        </div>
      </div>

      <button className="splash-button" onClick={onContinue}>
        Enter App
      </button>
    </div>
  );
}
