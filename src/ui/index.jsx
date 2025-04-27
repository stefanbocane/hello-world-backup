import React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import addOnUISdk from "https://new.express.adobe.com/static/add-on-sdk/sdk.js";

// Wait for the Adobe Express UI SDK to be ready, then render the app
addOnUISdk.ready.then(async () => {
  console.log("addOnUISdk is ready for use.");

  // Get the UI runtime
  const { runtime } = addOnUISdk.instance;

  // Get the proxy for the document sandbox APIs
  const sandboxProxy = await runtime.apiProxy("documentSandbox");

  // Render the React application
  const root = createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <App sandboxProxy={sandboxProxy} />
    </React.StrictMode>
  );
}).catch(error => {
  console.error("Error initializing Adobe Express UI SDK:", error);
});
