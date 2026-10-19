import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "@fontsource-variable/sora";
import "@fontsource-variable/dancing-script";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "./styles/tokens.css";
import "./styles/app.css";
import App from "./App.jsx";
import { AppStateProvider } from "./context/AppState.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </HashRouter>
  </React.StrictMode>
);
